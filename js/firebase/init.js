// Lightweight Firebase init using CDN ESM modules (optional)
// Usage: pass a firebaseConfig object. If not provided, throws.

export function initFirebase(firebaseConfig) {
  if (!firebaseConfig) throw new Error('Firebase config is required');

  // Lazy import CDN modules at runtime
  const api = {};
  // We return sync functions that wrap dynamic imports; to keep simple for now, import synchronously via top-level await isn't supported in all browsers.
  // So we performed static assignments by pre-imported URLs using dynamic import caching.
  // Consumers should call the methods only after first call completes.

  let _db = null;

  function ensureLoaded() {
    if (_db) return Promise.resolve({ db: _db, api });
    return Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'),
    ]).then(([appMod, dbMod]) => {
      const app = appMod.initializeApp(firebaseConfig);
      _db = dbMod.getDatabase(app);
      api.ref = dbMod.ref;
      api.get = dbMod.get;
      api.set = dbMod.set;
      api.update = dbMod.update;
      api.remove = dbMod.remove;
      return { db: _db, api };
    });
  }

  // Expose a thin facade that auto-loads on first call
  return {
    get db() { throw new Error('Call through methods that ensure loading'); },
    get api() { return api; },
    ensureLoaded,
  };
}




