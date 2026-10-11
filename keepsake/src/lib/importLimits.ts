import {LIMITS, checkArchiveRoom} from './limits.ts';
export const MAX_IMPORT_FILES = 100;
/** Pass archiveCount for imports into the photo archive so the 500-photo limit is checked up front. */
export async function checkImportCapacity(files: readonly File[], archiveCount?: number) {
  if (archiveCount !== undefined) checkArchiveRoom(archiveCount, files.length);
  if (files.length > MAX_IMPORT_FILES)
    throw new Error('Choose up to 100 files per import. Split larger folders into smaller batches.');
  const bytes = files.reduce((n, f) => n + f.size, 0);
  if (bytes > 200 * 1024 * 1024) throw new Error('Choose a smaller batch: 200 MB maximum per import.');
  if (files.some(f => f.size > LIMITS.uploadBytes)) throw new Error('Photos can be up to 25 MB each.');
  await checkStorageCapacity(bytes);
}
export async function checkStorageCapacity(bytes: number) {
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  if (estimate?.quota !== undefined && estimate.quota - (estimate.usage ?? 0) < bytes + 5 * 1024 * 1024)
    throw new Error(
      'There may not be enough browser storage. Download a room backup and free space before importing more photos.',
    );
}
