import { ImageState, CustomPreset } from '../types';

export interface RecentEditRecord {
  id: string;
  name: string;
  lastModified: number;
  thumbnailDataUrl: string;
  imageDataUrl: string;
  mimeType: string;
  isRaw: boolean;
  imageState: ImageState;
  fileInfo: {
    name: string;
    size: number;
    type: string;
    width: number;
    height: number;
    exif?: Record<string, any>;
  };
  appliedLookId?: string | null;
}

const DB_NAME = 'snapweb_db';
const DB_VERSION = 2;
const RECENT_STORE_NAME = 'recent_edits';
const PRESETS_STORE_NAME = 'custom_presets';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(RECENT_STORE_NAME)) {
        const store = db.createObjectStore(RECENT_STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      }
      if (!db.objectStoreNames.contains(PRESETS_STORE_NAME)) {
        const presetStore = db.createObjectStore(PRESETS_STORE_NAME, { keyPath: 'id' });
        presetStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecentEdit(record: RecentEditRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECENT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(RECENT_STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRecentEdits(limit = 12): Promise<RecentEditRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECENT_STORE_NAME, 'readonly');
    const store = tx.objectStore(RECENT_STORE_NAME);
    const index = store.index('lastModified');
    const request = index.openCursor(null, 'prev');
    const results: RecentEditRecord[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecentEdit(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECENT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(RECENT_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllRecentEdits(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECENT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(RECENT_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomPreset(preset: CustomPreset): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESETS_STORE_NAME);
    const request = store.put(preset);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCustomPresets(): Promise<CustomPreset[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESETS_STORE_NAME, 'readonly');
    const store = tx.objectStore(PRESETS_STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev');
    const results: CustomPreset[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteCustomPreset(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESETS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function exportPresetsAsJSON(): Promise<string> {
  const presets = await getCustomPresets();
  return JSON.stringify({
    appName: 'Snapseed for Web',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    presets
  }, null, 2);
}

export async function importPresetsFromJSON(jsonString: string): Promise<number> {
  try {
    const data = JSON.parse(jsonString);
    const presets: CustomPreset[] = Array.isArray(data) ? data : data.presets || [];
    if (!Array.isArray(presets) || presets.length === 0) {
      throw new Error('No valid presets found in JSON file.');
    }

    let count = 0;
    for (const p of presets) {
      if (p.name && p.adjustments) {
        await saveCustomPreset({
          id: p.id || 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: p.name,
          description: p.description || '',
          createdAt: p.createdAt || Date.now(),
          gradient: p.gradient || 'from-indigo-500 via-purple-500 to-pink-500',
          adjustments: p.adjustments
        });
        count++;
      }
    }
    return count;
  } catch (err: any) {
    throw new Error('Failed to parse preset pack: ' + (err.message || 'Invalid JSON'));
  }
}

