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

import { cleanCustomFood, cleanLog, cleanProfile, countEntries, emptyState, isKnownFoodId, localLeftovers, mergeBackup } from "./logic.js";

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

function cleanLocalState(saved, knownFoodIds) {
  const state = emptyState();
  if (!saved || typeof saved !== "object") return state;
  for (const raw of Object.values(saved.logs || {})) {
    const log = cleanLog(raw, knownFoodIds);
    if (log) state.logs[log.id] = log;
  }
  for (const [foodId, entry] of Object.entries(saved.queue || {})) {
    if (isKnownFoodId(foodId, knownFoodIds)) state.queue[foodId] = { foodId, addedAt: Number(entry && entry.addedAt) || 0 };
  }
  for (const raw of Object.values(saved.foods || {})) {
    const food = cleanCustomFood(raw, knownFoodIds);
    if (food) state.foods[food.id] = food;
  }
  state.profile = cleanProfile(saved.profile);
  return state;
}

// Saved entries this copy of the app can't read: a try of a food that a
// newer version added, say. They go back into storage with every save, so
// opening an older copy of the app never deletes them.
function unreadEntries(saved, state) {
  const raw = (key) => (saved && saved[key] && typeof saved[key] === "object" ? saved[key] : {});
  const unread = (key, isRead) => Object.fromEntries(Object.entries(raw(key)).filter(([k, v]) => !isRead(k, v)));
  return {
    logs: unread("logs", (k, v) => !!v && !!state.logs[v.id]),
    queue: unread("queue", (k) => !!state.queue[k]),
    foods: unread("foods", (k, v) => !!v && !!state.foods[v.id]),
  };
}

const NOTHING_UNREAD = { logs: {}, queue: {}, foods: {} };

function loadLocal(knownFoodIds) {
  const saved = readJSON(STATE_KEY);
  const state = cleanLocalState(saved, knownFoodIds);
  return { state, unread: unreadEntries(saved, state) };
}

function saveLocal(state, unread) {
  return writeJSON(STATE_KEY, {
    ...state,
    logs: { ...unread.logs, ...state.logs },
    queue: { ...unread.queue, ...state.queue },
    foods: { ...unread.foods, ...(state.foods || {}) },
  });
}

// Can this browser keep anything? (Private modes and full storage can't.)
function storageWorks() {
  try {
    localStorage.setItem(`${STATE_KEY}:probe`, "1");
    localStorage.removeItem(`${STATE_KEY}:probe`);
    return true;
  } catch {
    return false;
  }
}

// This device's saved log, read without opening a store.
export function readLocalState(knownFoodIds) {
  return loadLocal(knownFoodIds).state;
}

// Replace this device's saved log, e.g. to put back one that was discarded.
export function writeLocalState(state, knownFoodIds) {
  return saveLocal(state, loadLocal(knownFoodIds).unread);
}

// Drop entries from this device's own log by id: something deleted from the
// shared log shouldn't come back from a copy kept here.
function forgetLocal(knownFoodIds, { logs = [], queue = [], foods = [] }) {
  const { state, unread } = loadLocal(knownFoodIds);
  const before = JSON.stringify(state);
  for (const id of logs) delete state.logs[id];
  for (const id of queue) delete state.queue[id];
  for (const id of foods) delete state.foods[id];
  if (JSON.stringify(state) !== before) saveLocal(state, unread);
}

// While signed in, this device's own log only holds what the shared log
// doesn't have yet. Drop the entries the shared log has, and return what is
// left (see localLeftovers). Only call this with a shared state the server
// has confirmed: until then this device's copy is the only safe one.
export function pruneLocalState(shared, knownFoodIds) {
  const { state, unread } = loadLocal(knownFoodIds);
  const left = localLeftovers(state, shared);
  const before = countEntries(state);
  const after = countEntries(left);
  if (Object.keys(before).some((key) => after[key] < before[key])) saveLocal(left, unread);
  return left;
}

export class LocalStore extends Emitter {
  constructor(knownFoodIds) {
    super();
    this.mode = "local";
    this.canWrite = true;
    this.knownFoodIds = knownFoodIds;
    // Nothing is written until something changes: what's saved stays as it
    // is, including entries this copy of the app can't read.
    ({ state: this.state, unread: this.unread } = loadLocal(knownFoodIds));
    this.persisted = storageWorks();
    // Keep several open tabs in step.
    this.onStorage = (e) => {
      if (e.key !== STATE_KEY) return;
      ({ state: this.state, unread: this.unread } = loadLocal(knownFoodIds));
      this.emit();
    };
    window.addEventListener("storage", this.onStorage);
  }

  dispose() {
    window.removeEventListener("storage", this.onStorage);
  }

  commit(next) {
    this.state = next;
    this.persisted = saveLocal(next, this.unread);
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

  async saveFood(food) {
    const entry = { ...food, byName: food.byName ?? getDeviceName() };
    if (!entry.byName) delete entry.byName;
    this.commit({ ...this.state, foods: { ...this.state.foods, [food.id]: entry } });
  }

  async deleteFood(id) {
    const { logIds } = linkedTo(this.state, id);
    const foods = { ...this.state.foods };
    const logs = { ...this.state.logs };
    const queue = { ...this.state.queue };
    delete foods[id];
    delete queue[id];
    for (const logId of logIds) delete logs[logId];
    this.commit({ ...this.state, foods, logs, queue });
  }

  async importBackup(backup) {
    const { state, ...counts } = mergeBackup(this.state, backup, this.knownFoodIds);
    this.commit(state);
    return counts;
  }

  async clearAll() {
    this.unread = NOTHING_UNREAD;
    this.commit(emptyState());
  }
}

// Messages for errors a viewer can do something about.
export function describeStoreError(err) {
  const code = err && err.code;
  if (code === "permission-denied") return "This account isn't allowed to use the shared log. Check that your Firestore rules list this account.";
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
    this.loaded = { logs: false, queue: false, profile: false, foods: false };
    this.error = null;
    this.canWrite = true;
    this.onError = () => {};
    this.profileWrite = Promise.resolve();
  }

  get ready() {
    return Object.values(this.loaded).every(Boolean);
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
        if (isKnownFoodId(d.id, this.knownFoodIds)) queue[d.id] = { foodId: d.id, addedAt: Number(d.data().addedAt) || 0 };
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
    this.db.collection("foods").onSnapshot((snap) => {
      const foods = {};
      for (const d of snap.docs) {
        const food = cleanCustomFood({ ...d.data(), id: d.id }, this.knownFoodIds);
        if (food) foods[food.id] = food;
      }
      this.loaded.foods = true;
      this.state = { ...this.state, foods };
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

  async saveFood(food) {
    const entry = { ...food };
    if (!entry.by && this.viewer && this.viewer.id) entry.by = this.viewer.id;
    await withRetry(() => this.db.collection("foods").doc(food.id).set(entry));
  }

  async deleteFood(id) {
    const { logIds, queued } = linkedTo(this.state, id);
    for (const logId of logIds) await this.deleteLog(logId);
    if (queued) await this.setQueued(id, false);
    await withRetry(() => this.db.collection("foods").doc(id).delete());
  }

  async importBackup(backup) {
    const { state, ...counts } = mergeBackup(this.state, backup, this.knownFoodIds);
    for (const food of Object.values(state.foods)) {
      if (this.state.foods[food.id] !== food) await withRetry(() => this.db.collection("foods").doc(food.id).set(food));
    }
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
    return counts;
  }

  async clearAll() {
    for (const id of Object.keys(this.state.logs)) await this.deleteLog(id);
    for (const foodId of Object.keys(this.state.queue)) await this.setQueued(foodId, false);
    for (const id of Object.keys(this.state.foods)) await withRetry(() => this.db.collection("foods").doc(id).delete());
    await withRetry(() => this.db.doc("meta/profile").delete());
  }
}

// The tries and to-try entry that go with a family food, so deleting the
// food takes them too.
function linkedTo(state, foodId) {
  return {
    logIds: Object.values(state.logs).filter((l) => l.foodId === foodId).map((l) => l.id),
    queued: !!state.queue[foodId],
  };
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
    this.loaded = { logs: false, queue: false, profile: false, foods: false };
    this.error = null;
    // For each part of the log: does this device hold changes the server
    // hasn't taken yet, and has the server been heard from at all?
    this.sync = { logs: null, queue: null, profile: null, foods: null };
    this.onError = () => {};
    this.unsubs = [];
  }

  get ready() {
    return Object.values(this.loaded).every(Boolean);
  }

  // Changes made on this device that haven't reached the server.
  get pendingWrites() {
    return Object.values(this.sync).some((part) => !!part && part.pending);
  }

  // Everything in `state` is on the server: nothing from this device is
  // still waiting, and nothing is showing from the offline cache alone.
  get confirmed() {
    return this.ready && !this.error && Object.values(this.sync).every((part) => !!part && !part.pending && !part.fromCache);
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
    // Each listener also hears about sync status (includeMetadataChanges).
    // When a write reaches the server only the status changes: the same
    // state is passed on, so the page updates its sync notes but not lists.
    const listen = (key, ref, read) =>
      fb.onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          this.sync[key] = { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache };
          const statusOnly = this.loaded[key] && typeof snap.docChanges === "function" && !snap.docChanges().length;
          if (!statusOnly) {
            const value = read(snap);
            // The profile is one document, so compare what it holds.
            if (!this.loaded[key] || key !== "profile" || JSON.stringify(value) !== JSON.stringify(this.state.profile)) this.state = { ...this.state, [key]: value };
          }
          this.loaded[key] = true;
          this.emit();
        },
        fail,
      );
    this.unsubs.push(
      listen("logs", fb.collection(db, "logs"), (snap) => {
        const logs = {};
        for (const d of snap.docs) {
          const log = cleanLog({ ...d.data(), id: d.id }, this.knownFoodIds);
          if (log) logs[log.id] = log;
        }
        return logs;
      }),
      listen("queue", fb.collection(db, "queue"), (snap) => {
        const queue = {};
        for (const d of snap.docs) {
          if (isKnownFoodId(d.id, this.knownFoodIds)) queue[d.id] = { foodId: d.id, addedAt: Number(d.data().addedAt) || 0 };
        }
        return queue;
      }),
      listen("profile", fb.doc(db, "meta", "profile"), (snap) => (snap.exists() ? cleanProfile(snap.data()) : {})),
      listen("foods", fb.collection(db, "foods"), (snap) => {
        const foods = {};
        for (const d of snap.docs) {
          const food = cleanCustomFood({ ...d.data(), id: d.id }, this.knownFoodIds);
          if (food) foods[food.id] = food;
        }
        return foods;
      }),
    );
  }

  dispose() {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
  }

  restart() {
    this.dispose();
    this.error = null;
    this.loaded = { logs: false, queue: false, profile: false, foods: false };
    this.sync = { logs: null, queue: null, profile: null, foods: null };
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
    forgetLocal(this.knownFoodIds, { logs: [id] });
    this.send(fb.deleteDoc(fb.doc(db, "logs", id)));
  }

  async setQueued(foodId, on) {
    const { fb, db } = this.cloud;
    const ref = fb.doc(db, "queue", foodId);
    if (!on) forgetLocal(this.knownFoodIds, { queue: [foodId] });
    this.send(on ? fb.setDoc(ref, { foodId, addedAt: Date.now() }) : fb.deleteDoc(ref));
  }

  async setProfile(patch) {
    const { fb, db } = this.cloud;
    this.send(fb.setDoc(fb.doc(db, "meta", "profile"), patch, { merge: true }));
  }

  async saveFood(food) {
    const { fb, db } = this.cloud;
    const entry = JSON.parse(JSON.stringify({ ...food, by: food.by || this.user.uid, byName: food.byName || this.displayName() }));
    this.send(fb.setDoc(fb.doc(db, "foods", food.id), entry));
  }

  // The food, its tries and its to-try entry go together, in one batch.
  async deleteFood(id) {
    const { fb, db } = this.cloud;
    const { logIds, queued } = linkedTo(this.state, id);
    forgetLocal(this.knownFoodIds, { logs: logIds, queue: [id], foods: [id] });
    this.writeAll([
      ...logIds.map((logId) => (b) => b.delete(fb.doc(db, "logs", logId))),
      ...(queued ? [(b) => b.delete(fb.doc(db, "queue", id))] : []),
      (b) => b.delete(fb.doc(db, "foods", id)),
    ]);
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
    const { state, ...counts } = mergeBackup(this.state, backup, this.knownFoodIds);
    const ops = [];
    for (const food of Object.values(state.foods)) {
      if (this.state.foods[food.id] !== food) ops.push((b) => b.set(fb.doc(db, "foods", food.id), JSON.parse(JSON.stringify(food))));
    }
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
    return counts;
  }

  async clearAll() {
    const { fb, db } = this.cloud;
    forgetLocal(this.knownFoodIds, { logs: Object.keys(this.state.logs), queue: Object.keys(this.state.queue), foods: Object.keys(this.state.foods) });
    const ops = [
      ...Object.keys(this.state.logs).map((id) => (b) => b.delete(fb.doc(db, "logs", id))),
      ...Object.keys(this.state.queue).map((id) => (b) => b.delete(fb.doc(db, "queue", id))),
      ...Object.keys(this.state.foods).map((id) => (b) => b.delete(fb.doc(db, "foods", id))),
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
