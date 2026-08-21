/*
 * Minimal IndexedDB persistence for a single scrapbook.
 * IndexedDB (rather than localStorage) avoids quota problems now that photo
 * data URLs are persisted so a book survives a refresh.
 */
import type { Scrapbook } from "../types/scrapbook";

const DB_NAME = "keepsake";
const STORE = "books";
const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadScrapbook(): Promise<Scrapbook | null> {
  try {
    const db = await openDb();
    return await new Promise<Scrapbook | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Scrapbook) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveScrapbook(book: Scrapbook): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(book, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
