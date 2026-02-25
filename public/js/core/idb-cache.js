/**
 * IndexedDB Cache Layer
 * Provides robust local storage that doesn't have the 5-10MB limit of localStorage.
 * Used as offline fallback when cloud is unavailable.
 */

const DB_NAME = 'ankiflow-cache';
const DB_VERSION = 1;
const STORE_NAME = 'state';

let _db = null;

/**
 * Open (or create) the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            _db = event.target.result;
            
            // Handle connection closing unexpectedly
            _db.onclose = () => { _db = null; };
            _db.onerror = (e) => { console.warn('[IDB] Database error:', e); };
            
            resolve(_db);
        };

        request.onerror = (event) => {
            console.warn('[IDB] Failed to open:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Save data to IndexedDB
 * @param {string} key - Storage key
 * @param {any} value - Data to store (will be structuredClone'd)
 * @returns {Promise<void>}
 */
export async function idbSet(key, value) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('[IDB] Set failed:', e);
    }
}

/**
 * Read data from IndexedDB
 * @param {string} key - Storage key
 * @returns {Promise<any>}
 */
export async function idbGet(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('[IDB] Get failed:', e);
        return undefined;
    }
}

/**
 * Delete data from IndexedDB
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export async function idbDelete(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('[IDB] Delete failed:', e);
    }
}

/**
 * Clear all data from IndexedDB
 * @returns {Promise<void>}
 */
export async function idbClear() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('[IDB] Clear failed:', e);
    }
}
