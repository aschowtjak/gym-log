/* Minimaler IndexedDB-Wrapper. Alle Daten bleiben auf dem Gerät. */
const DB = (function () {
  const NAME = 'gymlog';
  const VERSION = 2;
  const STORES = { exercises: 'id', plans: 'id', workouts: 'id', meta: 'key', profiles: 'id' };
  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        for (const [name, keyPath] of Object.entries(STORES)) {
          if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath });
        }
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  function run(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    open,
    all: (s) => run(s, 'readonly', (o) => o.getAll()),
    get: (s, k) => run(s, 'readonly', (o) => o.get(k)),
    put: (s, v) => run(s, 'readwrite', (o) => o.put(v)),
    del: (s, k) => run(s, 'readwrite', (o) => o.delete(k)),
    clear: (s) => run(s, 'readwrite', (o) => o.clear()),
    putAll: async (s, arr) => { for (const v of arr) await run(s, 'readwrite', (o) => o.put(v)); },
    stores: Object.keys(STORES),
  };
})();
