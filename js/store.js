// Where tracking data lives.
//
// LocalStore keeps everything in this browser's localStorage. Partners on
// different phones share by exporting a backup and importing it (merge).
//
// SharedStore is used when the page runs as a claude.ai Artifact with the
// `db` capability, and CloudStore when the app is hosted elsewhere with a
// Firebase project configured (js/sync-config.js). In both, every log entry
// is its own document, so two people logging at once never overwrite each
// other.

import { cleanLog, cleanProfile, emptyState, mergeBackup } from "./logic.js";

const STATE_KEY = "first-bites:v1";
const DEVICE_KEY = "first-bites:device-name";

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getDeviceName() {
  try {
    return localStorage.getItem(DEVICE_KEY) || "";
  } catch {
    return "";
  }
}

export function setDeviceName(name) {
  try {
    localStorage.setItem(DEVICE_KEY, name);
  } catch {
    // Storage unavailable (private mode); the name just won't persist.
  }
}

class Emitter {
  constructor() {
    this.listeners = new Set();
  }
  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }
  emit() {
    for (const fn of this.listeners) fn(this.state);
  }
}

function loadLocalState(knownFoodIds) {
  const saved = readJSON(STATE_KEY);
  const state = emptyState();
  if (!saved) return state;
  for (const raw of Object.values(saved.logs || {})) {
    const log = cleanLog(raw, knownFoodIds);
    if (log) state.logs[log.id] = log;
  }
  for (const [foodId, entry] of Object.entries(saved.queue || {})) {
    if (knownFoodIds.has(foodId)) state.queue[foodId] = { foodId, addedAt: Number(entry && entry.addedAt) || 0 };
  }
  state.profile = cleanProfile(saved.profile);
  return state;
}

// This device's saved log, read without opening a store.
export function readLocalState(knownFoodIds) {
  return loadLocalState(knownFoodIds);
}

// Drop tries from this device's own log, once they've moved to the shared log.
export function removeLocalLogs(ids, knownFoodIds) {
  const state = loadLocalState(knownFoodIds);
  for (const id of ids) delete state.logs[id];
  return writeJSON(STATE_KEY, state);
}

export class LocalStore extends Emitter {
  constructor(knownFoodIds) {
    super();
    this.mode = "local";
    this.canWrite = true;
    this.knownFoodIds = knownFoodIds;
    this.state = loadLocalState(knownFoodIds);
    this.persisted = writeJSON(STATE_KEY, this.state);
    // Keep several open tabs in step.
    this.onStorage = (e) => {
      if (e.key !== STATE_KEY) return;
      this.state = loadLocalState(knownFoodIds);
      this.emit();
    };
    window.addEventListener("storage", this.onStorage);
  }

  dispose() {
    window.removeEventListener("storage", this.onStorage);
  }

  commit(next) {
    this.state = next;
    this.persisted = writeJSON(STATE_KEY, next);
    this.emit();
  }

  async me() {
    return { id: null, name: getDeviceName() };
  }

  async profiles() {
    return {};
  }

  async saveLog(log) {
    const entry = { ...log, byName: log.byName ?? getDeviceName() };
    if (!entry.byName) delete entry.byName;
    this.commit({ ...this.state, logs: { ...this.state.logs, [log.id]: entry } });
  }

  async deleteLog(id) {
    const logs = { ...this.state.logs };
    delete logs[id];
    this.commit({ ...this.state, logs });
  }

  async setQueued(foodId, on) {
    const queue = { ...this.state.queue };
    if (on) queue[foodId] = { foodId, addedAt: Date.now() };
    else delete queue[foodId];
    this.commit({ ...this.state, queue });
  }

  async setProfile(patch) {
    this.commit({ ...this.state, profile: { ...this.state.profile, ...patch } });
  }

  async importBackup(backup) {
    const { state, added, updated } = mergeBackup(this.state, backup, this.knownFoodIds);
    this.commit(state);
    return { added, updated };
  }

  async clearAll() {
    this.commit(emptyState());
  }
}

// Messages for errors a viewer can do something about.
export function describeStoreError(err) {
  const code = err && err.code;
  if (code === "permission-denied") return "This account isn't allowed to use the shared log. Check the email addresses in your Firestore rules.";
  if (code === "unauthenticated") return "You've been signed out. Sign in again on the Baby tab to keep syncing.";
  if (code === "invalid_argument") return "You can view this tracker but not change it. Ask the owner to give you edit access.";
  if (code === "quota_exceeded") return "The shared tracker is full. Export a backup and delete old entries to make room.";
  if (code === "resource_exhausted") return "Too many changes at once. Wait a moment and try again.";
  if (code === "revoked" || code === "not_granted") return "Access to the shared tracker has ended for this page.";
  return (err && err.message) || "Couldn't save that change. Check your connection and try again.";
}

async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err && err.code === "unavailable") {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      return fn();
    }
    throw err;
  }
}

export class SharedStore extends Emitter {
  constructor(db, user, knownFoodIds) {
    super();
    this.mode = "shared";
    this.db = db;
    this.user = user;
    this.knownFoodIds = knownFoodIds;
    this.state = emptyState();
    this.loaded = { logs: false, queue: false, profile: false };
    this.error = null;
    this.canWrite = true;
    this.onError = () => {};
    this.profileWrite = Promise.resolve();
  }

  get ready() {
    return this.loaded.logs && this.loaded.queue && this.loaded.profile;
  }

  async start() {
    if (this.user) {
      const can = await this.user.can("data.write");
      if (can === false) this.canWrite = false;
      this.viewer = await this.user.me();
    }
    // A listener stops for good when it fails. Keep the error so the page
    // can say so, rather than show a log that has stopped updating.
    const fail = (err) => {
      this.error = err;
      this.emit();
    };
    this.db.collection("logs").onSnapshot((snap) => {
      const logs = {};
      for (const d of snap.docs) {
        const log = cleanLog({ ...d.data(), id: d.id }, this.knownFoodIds);
        if (log) logs[log.id] = log;
      }
      this.loaded.logs = true;
      this.state = { ...this.state, logs };
      this.emit();
    }, fail);
    this.db.collection("queue").onSnapshot((snap) => {
      const queue = {};
      for (const d of snap.docs) {
        if (this.knownFoodIds.has(d.id)) queue[d.id] = { foodId: d.id, addedAt: Number(d.data().addedAt) || 0 };
      }
      this.loaded.queue = true;
      this.state = { ...this.state, queue };
      this.emit();
    }, fail);
    this.db.doc("meta/profile").onSnapshot((snap) => {
      this.loaded.profile = true;
      this.state = { ...this.state, profile: snap.exists ? cleanProfile(snap.data()) : {} };
      this.emit();
    }, fail);
  }

  async me() {
    return this.viewer ? { id: this.viewer.id, name: this.viewer.name } : { id: null, name: "" };
  }

  // Resolve viewer ids stored on log entries to display names.
  async profiles(ids) {
    if (!this.user || !ids.length) return {};
    return this.user.profiles(ids);
  }

  async saveLog(log) {
    const entry = { ...log };
    if (!entry.by && this.viewer && this.viewer.id) entry.by = this.viewer.id;
    await withRetry(() => this.db.collection("logs").doc(log.id).set(entry));
  }

  async deleteLog(id) {
    await withRetry(() => this.db.collection("logs").doc(id).delete());
  }

  async setQueued(foodId, on) {
    const ref = this.db.collection("queue").doc(foodId);
    await withRetry(() => (on ? ref.set({ foodId, addedAt: Date.now() }) : ref.delete()));
  }

  // Profile edits go to one document, so queue them one at a time.
  async setProfile(patch) {
    const run = async () => {
      const next = { ...this.state.profile, ...patch };
      await withRetry(() => this.db.doc("meta/profile").set(next));
    };
    this.profileWrite = this.profileWrite.then(run, run);
    return this.profileWrite;
  }

  async importBackup(backup) {
    const { state, added, updated } = mergeBackup(this.state, backup, this.knownFoodIds);
    const changed = Object.values(state.logs).filter((l) => this.state.logs[l.id] !== l);
    for (const log of changed) {
      await withRetry(() => this.db.collection("logs").doc(log.id).set(log));
    }
    for (const foodId of Object.keys(state.queue)) {
      if (!this.state.queue[foodId]) await this.setQueued(foodId, true);
    }
    const profilePatch = {};
    for (const [k, v] of Object.entries(state.profile)) if (this.state.profile[k] !== v) profilePatch[k] = v;
    if (Object.keys(profilePatch).length) await this.setProfile(profilePatch);
    return { added, updated };
  }

  async clearAll() {
    for (const id of Object.keys(this.state.logs)) await this.deleteLog(id);
    for (const foodId of Object.keys(this.state.queue)) await this.setQueued(foodId, false);
    await withRetry(() => this.db.doc("meta/profile").delete());
  }
}

// Firestore-backed store for the GitHub Pages version. Writes go to the local
// offline cache first, so they show up immediately and sync when online;
// we don't wait for the server before returning.
export class CloudStore extends Emitter {
  constructor(cloud, user, knownFoodIds) {
    super();
    this.mode = "cloud";
    this.canWrite = true;
    this.cloud = cloud;
    this.user = user;
    this.knownFoodIds = knownFoodIds;
    this.state = emptyState();
    this.loaded = { logs: false, queue: false, profile: false };
    this.error = null;
    this.pendingWrites = false;
    this.onError = () => {};
    this.unsubs = [];
  }

  get ready() {
    return this.loaded.logs && this.loaded.queue && this.loaded.profile;
  }

  get email() {
    return this.user.email || "";
  }

  start() {
    const { fb, db } = this.cloud;
    // A listener stops for good when it fails (e.g. the rules turn this
    // account away). Keep the error so the page can say so and offer a retry.
    const fail = (err) => {
      this.error = err;
      this.emit();
    };
    this.unsubs.push(
      fb.onSnapshot(fb.collection(db, "logs"), { includeMetadataChanges: true }, (snap) => {
        this.pendingWrites = snap.metadata.hasPendingWrites;
        // When a write reaches the server only the metadata changes: pass on
        // the same state, so the page updates the sync note but not the list.
        if (this.loaded.logs && !snap.docChanges().length) {
          this.emit();
          return;
        }
        const logs = {};
        for (const d of snap.docs) {
          const log = cleanLog({ ...d.data(), id: d.id }, this.knownFoodIds);
          if (log) logs[log.id] = log;
        }
        this.loaded.logs = true;
        this.state = { ...this.state, logs };
        this.emit();
      }, fail),
      fb.onSnapshot(fb.collection(db, "queue"), (snap) => {
        const queue = {};
        for (const d of snap.docs) {
          if (this.knownFoodIds.has(d.id)) queue[d.id] = { foodId: d.id, addedAt: Number(d.data().addedAt) || 0 };
        }
        this.loaded.queue = true;
        this.state = { ...this.state, queue };
        this.emit();
      }, fail),
      fb.onSnapshot(fb.doc(db, "meta", "profile"), (snap) => {
        this.loaded.profile = true;
        this.state = { ...this.state, profile: snap.exists() ? cleanProfile(snap.data()) : {} };
        this.emit();
      }, fail),
    );
  }

  dispose() {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
  }

  restart() {
    this.dispose();
    this.error = null;
    this.loaded = { logs: false, queue: false, profile: false };
    this.start();
  }

  // Fire-and-forget: the offline cache applies the write right away.
  send(promise) {
    promise.catch((err) => this.onError(err));
  }

  displayName() {
    return getDeviceName() || this.email.split("@")[0];
  }

  async me() {
    return { id: this.user.uid, name: this.displayName() };
  }

  async profiles() {
    return {};
  }

  async saveLog(log) {
    const { fb, db } = this.cloud;
    const entry = JSON.parse(JSON.stringify({ ...log, by: log.by || this.user.uid, byName: log.byName || this.displayName() }));
    this.send(fb.setDoc(fb.doc(db, "logs", log.id), entry));
  }

  async deleteLog(id) {
    const { fb, db } = this.cloud;
    this.send(fb.deleteDoc(fb.doc(db, "logs", id)));
  }

  async setQueued(foodId, on) {
    const { fb, db } = this.cloud;
    const ref = fb.doc(db, "queue", foodId);
    this.send(on ? fb.setDoc(ref, { foodId, addedAt: Date.now() }) : fb.deleteDoc(ref));
  }

  async setProfile(patch) {
    const { fb, db } = this.cloud;
    this.send(fb.setDoc(fb.doc(db, "meta", "profile"), patch, { merge: true }));
  }

  // Firestore batches hold up to 500 writes.
  writeAll(ops) {
    const { fb, db } = this.cloud;
    for (let i = 0; i < ops.length; i += 450) {
      const batch = fb.writeBatch(db);
      for (const op of ops.slice(i, i + 450)) op(batch);
      this.send(batch.commit());
    }
  }

  async importBackup(backup) {
    const { fb, db } = this.cloud;
    const { state, added, updated } = mergeBackup(this.state, backup, this.knownFoodIds);
    const ops = [];
    for (const log of Object.values(state.logs)) {
      if (this.state.logs[log.id] !== log) ops.push((b) => b.set(fb.doc(db, "logs", log.id), JSON.parse(JSON.stringify(log))));
    }
    for (const foodId of Object.keys(state.queue)) {
      if (!this.state.queue[foodId]) ops.push((b) => b.set(fb.doc(db, "queue", foodId), { foodId, addedAt: state.queue[foodId].addedAt || Date.now() }));
    }
    const profilePatch = {};
    for (const [k, v] of Object.entries(state.profile)) if (this.state.profile[k] !== v) profilePatch[k] = v;
    if (Object.keys(profilePatch).length) ops.push((b) => b.set(fb.doc(db, "meta", "profile"), profilePatch, { merge: true }));
    this.writeAll(ops);
    return { added, updated };
  }

  async clearAll() {
    const { fb, db } = this.cloud;
    const ops = [
      ...Object.keys(this.state.logs).map((id) => (b) => b.delete(fb.doc(db, "logs", id))),
      ...Object.keys(this.state.queue).map((id) => (b) => b.delete(fb.doc(db, "queue", id))),
      (b) => b.delete(fb.doc(db, "meta", "profile")),
    ];
    this.writeAll(ops);
  }
}

// Pick the store for this page. Inside a claude.ai Artifact viewer with the
// db capability granted, the tracker is shared; anywhere else it is local.
export async function openStore(knownFoodIds) {
  const claude = typeof window !== "undefined" ? window.claude : undefined;
  if (claude && typeof claude.use === "function") {
    try {
      const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if (db) {
        const store = new SharedStore(db, user, knownFoodIds);
        await store.start();
        return store;
      }
    } catch {
      // Fall through to local storage.
    }
  }
  return new LocalStore(knownFoodIds);
}
