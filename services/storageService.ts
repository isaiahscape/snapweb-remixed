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

export function exportSinglePresetAsJSON(preset: CustomPreset): string {
  return JSON.stringify({
    appName: 'Snapseed for Web',
    type: 'preset',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    preset
  }, null, 2);
}

export async function importPresetsFromJSON(jsonString: string): Promise<{ count: number; presets: CustomPreset[] }> {
  try {
    const data = JSON.parse(jsonString);
    let rawList: any[] = [];

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data.presets && Array.isArray(data.presets)) {
      rawList = data.presets;
    } else if (data.preset && typeof data.preset === 'object') {
      rawList = [data.preset];
    } else if (data.adjustments && (data.name || typeof data.brightness === 'number' || typeof data.contrast === 'number')) {
      rawList = [data];
    } else if (typeof data.brightness === 'number' || typeof data.contrast === 'number' || data.curves || data.colorGrade) {
      // Direct raw state object
      rawList = [{
        name: data.name || 'Imported Look',
        description: data.description || 'Imported photo adjustments',
        adjustments: data
      }];
    }

    if (rawList.length === 0) {
      throw new Error('No valid preset adjustments found in this file.');
    }

    const savedPresets: CustomPreset[] = [];
    for (const p of rawList) {
      const adjustments = p.adjustments || p;
      if (adjustments && typeof adjustments === 'object') {
        const item: CustomPreset = {
          id: 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          name: p.name || 'Custom Look',
          description: p.description || 'Imported photo filter',
          createdAt: Date.now(),
          gradient: p.gradient || 'from-cyan-400 via-blue-500 to-indigo-600',
          adjustments
        };
        await saveCustomPreset(item);
        savedPresets.push(item);
      }
    }

    return { count: savedPresets.length, presets: savedPresets };
  } catch (err: any) {
    throw new Error('Failed to parse preset file: ' + (err.message || 'Invalid JSON'));
  }
}

