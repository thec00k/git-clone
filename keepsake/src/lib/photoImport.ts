import {LIMITS} from './limits.ts';
import {checkImportCapacity, checkStorageCapacity} from './importLimits.ts';
import {loadImageFile, type LoadedImage} from './image.ts';

/**
 * One device upload, from choosing files to the review stack. Archive Upload, Upload folder and the
 * scrapbook photo chooser all use this, so they count, skip and stop the same way.
 * idle -> preparing (done of total) -> stopping (optional) -> finished
 */
export type ImportState =
  | {step: 'idle'}
  | {step: 'preparing'; done: number; total: number}
  | {step: 'stopping'; done: number; total: number}
  | {step: 'finished'; result: ImportResult};

export interface ImportResult {
  /** Archive ids of the photos that were added, in file order. */
  ids: string[];
  /** Number of files the person chose. */
  chosen: number;
  /** "name (reason)" for each file that was left out. */
  skipped: string[];
  /** The person pressed Stop before the batch finished. */
  stopped: boolean;
  /** A limit that ended the whole batch early, such as a full archive. */
  problem: string;
}

export const importBusy = (s: ImportState) => s.step === 'preparing' || s.step === 'stopping';

/** Status line for the dialog and the review stack. isProblem shows it as an alert. */
export function describeImport(s: ImportState): {text: string; isProblem: boolean} {
  if (s.step === 'idle') return {text: '', isProblem: false};
  if (s.step === 'preparing')
    return {text: `Preparing photo ${Math.min(s.done + 1, s.total)} of ${s.total}…`, isProblem: false};
  if (s.step === 'stopping') return {text: 'Stopping after the current photo…', isProblem: false};
  const r = s.result;
  const text = [
    r.ids.length ? `Added ${r.ids.length} of ${r.chosen} photographs.` : 'No photographs were added.',
    r.skipped.length ? `Skipped: ${r.skipped.join(', ')}.` : '',
    r.stopped ? 'Import stopped.' : '',
    r.problem,
  ]
    .filter(Boolean)
    .join(' ');
  return {text, isProblem: !!r.skipped.length || !!r.problem};
}

/**
 * Reads the chosen files one at a time and hands each photo to `add`, which stores it in the archive
 * and returns its id. One unreadable or oversized photo is skipped by name; the rest still import.
 */
export async function importPhotos(
  chosen: readonly File[],
  opts: {
    archiveCount: number;
    preserveOriginals: boolean;
    add: (photo: LoadedImage) => string;
    shouldStop: () => boolean;
    onProgress: (done: number, total: number) => void;
    load?: (file: File, keepOriginal: boolean) => Promise<LoadedImage>;
  },
): Promise<ImportResult> {
  const load = opts.load ?? loadImageFile;
  const skipped: string[] = [];
  const list = chosen.filter(file => {
    if (file.size <= LIMITS.uploadBytes) return true;
    skipped.push(`${file.name} (over 25 MB)`);
    return false;
  });
  const ids: string[] = [];
  let problem = '',
    stopped = false;
  try {
    if (list.length) await checkImportCapacity(list, opts.archiveCount);
    for (const [i, file] of list.entries()) {
      if (opts.shouldStop()) {
        stopped = true;
        break;
      }
      opts.onProgress(i, list.length);
      let photo;
      try {
        photo = await load(file, opts.preserveOriginals);
      } catch (error) {
        skipped.push(`${file.name} (${error instanceof Error ? error.message : 'could not be read'})`);
        continue;
      }
      if (opts.shouldStop()) {
        stopped = true;
        break;
      }
      await checkStorageCapacity(photo.src.length);
      ids.push(opts.add(photo));
    }
  } catch (error) {
    problem = error instanceof Error ? error.message : 'Import could not finish.';
  }
  return {ids, chosen: chosen.length, skipped, stopped, problem};
}
