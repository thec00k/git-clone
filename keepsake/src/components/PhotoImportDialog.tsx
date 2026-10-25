import {useEffect, useRef, useState} from 'react';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {checkImportCapacity, checkStorageCapacity} from '../lib/importLimits';
import {LIMITS} from '../lib/limits';
import {loadImageFile} from '../lib/image';
import {BatchPhotoReview} from './BatchPhotoReview';

export function PhotoImportDialog({onClose}: {onClose: () => void}) {
  const {state, addArchivePhoto} = useApp();
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    alive = useRef(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [problem, setProblem] = useState(false),
    [reviewIds, setReviewIds] = useState<string[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [category, setCategory] = useState('all');
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
    // One photo the browser cannot use should not stop the rest of the batch: set it aside with a reason.
    const skipped: string[] = [];
    const list = chosen.filter(file => {
      if (file.size <= LIMITS.uploadBytes) return true;
      skipped.push(`${file.name} (over 25 MB)`);
      return false;
    });
    setBusy(true);
    setProblem(false);
    setMessage(`Preparing photo 1 of ${list.length}…`);
    const ids: string[] = [];
    let stopped = '';
    try {
      if (list.length) await checkImportCapacity(list, state.archive.length);
      for (const [i, file] of list.entries()) {
        if (!alive.current) return;
        setMessage(`Preparing photo ${i + 1} of ${list.length}…`);
        let photo;
        try {
          photo = await loadImageFile(file, state.profile.preserveOriginals !== false);
        } catch (error) {
          skipped.push(`${file.name} (${error instanceof Error ? error.message : 'could not be read'})`);
          continue;
        }
        if (!alive.current) return;
        await checkStorageCapacity(photo.src.length);
        ids.push(addArchivePhoto(photo.src, photo.aspect, [], photo.original));
      }
    } catch (error) {
      stopped = error instanceof Error ? error.message : 'Import could not finish.';
    }
    if (!alive.current) return;
    setBusy(false);
    const parts = [
      ids.length ? `Added ${ids.length} of ${chosen.length} photographs.` : 'No photographs were added.',
      skipped.length ? `Skipped: ${skipped.join(', ')}.` : '',
      stopped,
    ].filter(Boolean);
    setMessage(parts.join(' '));
    setProblem(!!skipped.length || !!stopped);
    if (ids.length) setReviewIds(ids);
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
