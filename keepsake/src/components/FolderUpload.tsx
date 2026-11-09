import {useEffect, useRef, useState} from 'react';
import {useApp} from '../store/appStore';
import {describeImport, importBusy, importPhotos, type ImportState} from '../lib/photoImport';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {BatchPhotoReview} from './BatchPhotoReview';
export function FolderUpload({onImported}: {onImported: (category: string) => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  return (
    <>
      <button className="ks-tool" onClick={() => input.current?.click()}>
        Upload folder
      </button>
      <input
        ref={input}
        type="file"
        multiple
        {...{webkitdirectory: '', directory: ''}}
        hidden
        aria-label="Upload a photo folder"
        onChange={e => {
          setFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {!!files.length && <FolderDialog files={files} onClose={() => setFiles([])} onImported={onImported} />}
    </>
  );
}
function FolderDialog({
  files,
  onClose,
  onImported,
}: {
  files: File[];
  onClose: () => void;
  onImported: (id: string) => void;
}) {
  const {state, addArchivePhoto, addArchiveTab} = useApp();
  const root = useRef<HTMLDivElement>(null);
  const [upload, setUpload] = useState<ImportState>({step: 'idle'});
  const busy = importBusy(upload),
    status = describeImport(upload).text;
  const stop = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stop.current = true;
    };
  }, []);
  const [name, setName] = useState(files[0]?.webkitRelativePath.split('/')[0] || 'New category');
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  useFocusTrap(root, () => {
    if (!busy && !reviewIds.length) onClose();
  });
  async function importFolder() {
    stop.current = false;
    setUpload({step: 'preparing', done: 0, total: files.length});
    let category = '';
    const result = await importPhotos(files, {
      archiveCount: state.archive.length,
      preserveOriginals: state.profile.preserveOriginals !== false,
      add: photo => {
        if (!category) category = addArchiveTab(name.trim());
        return addArchivePhoto(photo.src, photo.aspect, [category], photo.original);
      },
      shouldStop: () => stop.current,
      onProgress: (done, total) =>
        setUpload(s => (s.step === 'stopping' ? s : {step: 'preparing', done, total})),
    });
    if (!alive.current) return;
    setUpload({step: 'finished', result});
    if (category) {
      onImported(category);
      setImported(true);
      setReviewIds(result.ids);
    }
  }
  const [imported, setImported] = useState(false);
  if (reviewIds.length) return <BatchPhotoReview photoIds={reviewIds} notice={status} onClose={onClose} />;
  return (
    <div className="ks-import-backdrop">
      <div
        ref={root}
        className="ks-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-import-title"
      >
        <h2 id="folder-import-title">Import photo folder</h2>
        <p>
          Up to 100 files / 200 MB per import, 25 MB per image. {files.length} files selected. Images in
          subfolders join the same category.
        </p>
        <label>
          Category name{' '}
          <input
            aria-label="New folder category name"
            value={name}
            maxLength={80}
            disabled={busy || imported}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <p role="status">{status}</p>
        <footer>
          {busy && (
            <button
              onClick={() => {
                stop.current = true;
                setUpload(s => (s.step === 'preparing' ? {...s, step: 'stopping'} : s));
              }}
            >
              Stop import
            </button>
          )}
          <button disabled={busy} onClick={onClose}>
            {imported ? 'Done' : 'Cancel'}
          </button>
          {!imported && (
            <button disabled={busy || !name.trim()} onClick={() => void importFolder()}>
              Import folder
            </button>
          )}
        </footer>
        <p>
          Folder selection depends on your device. You can also use Upload to select multiple photographs.
        </p>
      </div>
    </div>
  );
}
