// A small stand-in for the parts of the Firestore SDK that js/store.js uses,
// for the tests. Like the real one with its offline cache: a write shows up
// in listeners straight away, marked as pending, and its promise settles
// only when the "server" takes it (flush) or turns it away (reject), at
// which point a rejected write disappears again.
export function fakeFirestore() {
  const serverDocs = new Map(); // path -> data
  let queue = []; // writes waiting for the server: { ops, resolve, reject }
  let online = true;
  const listeners = new Set();

  const apply = (docs, op) => {
    if (op.data === null) docs.delete(op.path);
    else docs.set(op.path, op.merge ? { ...(docs.get(op.path) || {}), ...op.data } : op.data);
  };
  const localDocs = () => {
    const docs = new Map(serverDocs);
    for (const write of queue) for (const op of write.ops) apply(docs, op);
    return docs;
  };
  const isPending = (path) => queue.some((write) => write.ops.some((op) => op.path === path));

  const snapshot = (listener) => {
    const docs = localDocs();
    const { ref } = listener;
    if (ref.type === "doc") {
      const data = docs.get(ref.path);
      return { exists: () => data !== undefined, data: () => data, metadata: { hasPendingWrites: isPending(ref.path), fromCache: !online } };
    }
    const mine = [...docs].filter(([path]) => path.startsWith(`${ref.name}/`));
    const shown = JSON.stringify(mine);
    const changed = shown !== listener.shown;
    listener.shown = shown;
    return {
      docs: mine.map(([path, data]) => ({ id: path.slice(ref.name.length + 1), data: () => data })),
      docChanges: () => (changed ? [{}] : []),
      // As in Firestore: a pending delete leaves nothing in the list to flag.
      metadata: { hasPendingWrites: mine.some(([path]) => isPending(path)), fromCache: !online },
    };
  };
  const notify = () => {
    for (const listener of listeners) listener.next(snapshot(listener));
  };
  const write = (ops) => {
    const promise = new Promise((resolve, reject) => queue.push({ ops, resolve, reject }));
    notify();
    return promise;
  };

  const fb = {
    collection: (db, name) => ({ type: "collection", name }),
    doc: (db, ...segments) => ({ type: "doc", path: segments.join("/") }),
    onSnapshot(ref, options, next, error) {
      const listener = { ref, next, error };
      listeners.add(listener);
      next(snapshot(listener));
      return () => listeners.delete(listener);
    },
    setDoc: (ref, data, options = {}) => write([{ path: ref.path, data, merge: !!options.merge }]),
    deleteDoc: (ref) => write([{ path: ref.path, data: null }]),
    writeBatch() {
      const ops = [];
      return {
        set: (ref, data, options = {}) => ops.push({ path: ref.path, data, merge: !!options.merge }),
        delete: (ref) => ops.push({ path: ref.path, data: null }),
        commit: () => write(ops),
      };
    },
  };

  const server = {
    docs: serverDocs,
    seed(path, data) {
      serverDocs.set(path, data);
      notify();
    },
    // The server takes every waiting write.
    async flush() {
      const sent = queue;
      queue = [];
      for (const item of sent) for (const op of item.ops) apply(serverDocs, op);
      notify();
      for (const item of sent) item.resolve();
      await Promise.resolve();
    },
    // The server turns every waiting write away (the rules, say).
    async reject(code = "permission-denied") {
      const sent = queue;
      queue = [];
      notify();
      for (const item of sent) item.reject(Object.assign(new Error(code), { code }));
      await Promise.resolve();
    },
    setOnline(value) {
      online = value;
      notify();
    },
    // A listener is cut off, as when the rules stop letting this account in.
    fail(code = "permission-denied") {
      for (const listener of listeners) listener.error(Object.assign(new Error(code), { code }));
    },
  };

  return { fb, db: {}, server };
}

// localStorage for the tests. `broken` makes every write fail, like a
// private window or full storage.
export function fakeStorage() {
  const items = new Map();
  return {
    items,
    broken: false,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem(key, value) {
      if (this.broken) throw new Error("QuotaExceededError");
      items.set(key, String(value));
    },
    removeItem: (key) => items.delete(key),
  };
}
