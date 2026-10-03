/**
 * Offline Action Queue & Multi-Device Sync Engine using IndexedDB
 */

export interface QueuedAction {
  id: string;
  action_type: 'CREATE_CUSTOMER' | 'UPDATE_CUSTOMER' | 'QUICK_STATUS' | 'ADD_NOTE' | 'SCHEDULE_CALL' | 'RECORD_PAYMENT';
  payload: any;
  timestamp: number;
  retry_count: number;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
}

const DB_NAME = 'wwi_offline_db';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineAction(actionType: QueuedAction['action_type'], payload: any): Promise<QueuedAction> {
  const db = await openDB();
  const action: QueuedAction = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action_type: actionType,
    payload,
    timestamp: Date.now(),
    retry_count: 0,
    status: 'pending'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(action);
    req.onsuccess = () => resolve(action);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeQueuedAction(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to remove queued action', e);
  }
}

export async function clearAllQueuedActions(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to clear queue', e);
  }
}
