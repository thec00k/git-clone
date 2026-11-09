import {useEffect, useRef, useState} from 'react';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {describeImport, importBusy, importPhotos, type ImportState} from '../lib/photoImport';
import {BatchPhotoReview} from './BatchPhotoReview';

export function PhotoImportDialog({onClose}: {onClose: () => void}) {
  const {state, addArchivePhoto} = useApp();
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    alive = useRef(true);
  const [upload, setUpload] = useState<ImportState>({step: 'idle'}),
    [reviewIds, setReviewIds] = useState<string[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [category, setCategory] = useState('all');
  const busy = importBusy(upload),
    {text: message, isProblem: problem} = describeImport(upload);
  useFocusTrap(root, () => {
    if (!busy && !reviewIds.length) onClose();
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function files(input: FileList | null) {
    if (!input?.length) return;
    // The input is cleared right after this starts, which empties a live FileList.
    const chosen = Array.from(input);
    setUpload({step: 'preparing', done: 0, total: chosen.length});
    const result = await importPhotos(chosen, {
      archiveCount: state.archive.length,
      preserveOriginals: state.profile.preserveOriginals !== false,
      add: photo => addArchivePhoto(photo.src, photo.aspect, [], photo.original),
      shouldStop: () => !alive.current,
      onProgress: (done, total) => setUpload({step: 'preparing', done, total}),
    });
    if (!alive.current) return;
    setUpload({step: 'finished', result});
    if (result.ids.length) setReviewIds(result.ids);
  }
  if (reviewIds.length)
    return (
      <BatchPhotoReview
        photoIds={reviewIds}
        notice={message}
        noticeIsProblem={problem}
        defaultBookId={state.activeBookId ?? undefined}
        onClose={onClose}
      />
    );
  return (
    <div className="ks-import-backdrop">
      <section
        ref={root}
        className="ks-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-import-title"
      >
        <header>
          <h2 id="photo-import-title">Choose photographs</h2>
          <button disabled={busy} onClick={onClose} aria-label="Close photo chooser">
            ×
          </button>
        </header>
        <p>
          Upload a batch to review it as a stack, or choose photographs already in your archive. Your
          selections wait beside the scrapbook until you place them.
        </p>
        <button disabled={busy} onClick={() => input.current?.click()}>
          Upload from device
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="Select photos from device"
          onChange={e => {
            void files(e.target.files);
            e.target.value = '';
          }}
        />
        {problem ? (
          <p role="alert" className="ks-import-problem">
            {message}
          </p>
        ) : (
          <p role="status">{message}</p>
        )}
        <label>
          Archive category{' '}
          <select disabled={busy} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All photographs</option>
            {state.archiveTabs.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ks-import-grid">
          {state.archive
            .filter(p => category === 'all' || p.categories.includes(category))
            .map((p, i) => (
              <button
                key={p.id}
                disabled={busy}
                aria-label={`Select archive photograph ${i + 1}`}
                aria-pressed={selected.includes(p.id)}
                onClick={() =>
                  setSelected(old => (old.includes(p.id) ? old.filter(id => id !== p.id) : [...old, p.id]))
                }
              >
                <img src={p.src} alt="" loading="lazy" />
                {selected.includes(p.id) ? 'Selected' : 'Select'}
              </button>
            ))}
        </div>
        <footer>
          <button disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy || !selected.length} onClick={() => setReviewIds(selected)}>
            Review {selected.length || ''} photographs
          </button>
        </footer>
      </section>
    </div>
  );
}
