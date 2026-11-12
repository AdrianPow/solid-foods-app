import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { FOODS } from "../js/data/index.js";
import * as L from "../js/logic.js";
import { CloudStore, LocalStore, pruneLocalState, readLocalState, writeLocalState } from "../js/store.js";
import { fakeFirestore, fakeStorage } from "./fake-firestore.js";

const KNOWN = new Set(FOODS.map((f) => f.id));
const KEY = "first-bites:v1";
const USER = { uid: "u1", email: "mum@example.com" };

const log = (id, foodId = "banana", extra = {}) => ({ id, foodId, date: "2026-11-01", outcome: "liked", reactions: [], served: "", notes: "", createdAt: 1, updatedAt: 1, ...extra });
const pouch = { id: "my-pouch-ab12cd", name: "Pouch", cat: "mixed", ingredients: ["potato"], allergens: [], mayContain: [], brand: "", notes: "", label: "", createdAt: 1, updatedAt: 1 };

let storage;
beforeEach(() => {
  storage = fakeStorage();
  globalThis.localStorage = storage;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
});

const saved = () => JSON.parse(storage.getItem(KEY));
const save = (state) => storage.setItem(KEY, JSON.stringify({ ...L.emptyState(), ...state }));

function cloudStore() {
  const cloud = fakeFirestore();
  const store = new CloudStore(cloud, USER, KNOWN);
  const errors = [];
  store.onError = (err) => errors.push(err.code);
  store.start();
  return { store, server: cloud.server, errors };
}

// ---------- this device's own log ----------

test("opening the local log doesn't rewrite what's saved", () => {
  save({ logs: { a: log("a") } });
  storage.setItem(KEY, storage.getItem(KEY).replace('"logs":{', '"logs":{"junk":{"id":"junk"},'));
  const before = storage.getItem(KEY);
  const store = new LocalStore(KNOWN);
  assert.deepEqual(Object.keys(store.state.logs), ["a"]);
  assert.equal(storage.getItem(KEY), before, "nothing is rewritten until something changes");
  assert.equal(store.persisted, true);
});

test("entries this copy of the app can't read survive a save", async () => {
  const fromNewerVersion = log("n", "a-food-added-next-year");
  save({ logs: { a: log("a"), n: fromNewerVersion }, queue: { "another-new-food": { foodId: "another-new-food", addedAt: 1 } } });
  const store = new LocalStore(KNOWN);
  assert.deepEqual(Object.keys(store.state.logs), ["a"], "unreadable tries aren't shown");
  await store.saveLog(log("b"));
  await store.deleteLog("a");
  assert.deepEqual(Object.keys(saved().logs).sort(), ["b", "n"], "but they stay in storage");
  assert.deepEqual(saved().logs.n, fromNewerVersion);
  assert.ok(saved().queue["another-new-food"]);
  await store.clearAll();
  assert.deepEqual(saved().logs, {}, "Delete all data clears them too");
});

test("a browser that can't save is reported", async () => {
  storage.broken = true;
  const store = new LocalStore(KNOWN);
  assert.equal(store.persisted, false);
  await store.saveLog(log("a"));
  assert.ok(store.state.logs.a, "the try still shows for now");
  assert.equal(store.persisted, false);
});

// ---------- the shared log ----------

test("sync status changes pass on the same state", async () => {
  const { store, server } = cloudStore();
  assert.equal(store.ready, true);
  await store.saveLog(log("a"));
  const state = store.state;
  assert.ok(state.logs.a, "a write shows straight away");
  assert.equal(state.logs.a.by, "u1");
  await server.flush();
  assert.equal(store.state, state, "the server taking it changes the status only");
});

test("pending changes are tracked for every part of the log", async () => {
  for (const change of [(s) => s.saveLog(log("a")), (s) => s.saveFood(pouch), (s) => s.setQueued("banana", true), (s) => s.setProfile({ babyName: "Ada" })]) {
    const { store, server } = cloudStore();
    assert.equal(store.pendingWrites, false);
    assert.equal(store.confirmed, true);
    await change(store);
    assert.equal(store.pendingWrites, true);
    assert.equal(store.confirmed, false);
    await server.flush();
    assert.equal(store.pendingWrites, false);
    assert.equal(store.confirmed, true);
  }
});

test("nothing is confirmed while offline, or after the log fails to load", () => {
  const { store, server } = cloudStore();
  server.setOnline(false);
  assert.equal(store.confirmed, false, "the offline cache alone isn't confirmation");
  server.setOnline(true);
  assert.equal(store.confirmed, true);
  server.fail();
  assert.equal(store.error.code, "permission-denied");
  assert.equal(store.confirmed, false);
});

test("a rejected write is reported and disappears again", async () => {
  const { store, server, errors } = cloudStore();
  await store.saveLog(log("a"));
  await server.reject();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, ["permission-denied"]);
  assert.equal(store.state.logs.a, undefined);
});

test("importing reports what came in besides tries", async () => {
  const { store } = cloudStore();
  const counts = await store.importBackup(L.makeBackup({ logs: { a: log("a") }, queue: { banana: { foodId: "banana", addedAt: 1 } }, profile: { babyName: "Ada" }, foods: { [pouch.id]: pouch } }));
  assert.deepEqual(counts, { added: 1, updated: 0, foods: 1, queued: 1, details: 1 });
});

// ---------- moving this device's log into the shared log ----------

// What js/app.js does: work out what this device has that the shared log
// doesn't, dropping this device's copies only once the server has them.
const leftovers = (store) => (store.confirmed ? pruneLocalState(store.state, KNOWN) : L.localLeftovers(readLocalState(KNOWN), store.state));
const count = (state) => L.countEntries(state);

test("this device keeps its tries until the server has taken them", async () => {
  save({ logs: { a: log("a"), b: log("b") }, foods: { [pouch.id]: pouch }, queue: { banana: { foodId: "banana", addedAt: 1 } } });
  const { store, server } = cloudStore();
  assert.deepEqual(count(leftovers(store)), { tries: 2, foods: 1, queued: 1, details: 0 });

  await store.importBackup(L.makeBackup(leftovers(store)));
  assert.equal(store.confirmed, false);
  assert.deepEqual(count(leftovers(store)), { tries: 0, foods: 0, queued: 0, details: 0 }, "nothing left to offer");
  assert.deepEqual(Object.keys(saved().logs).sort(), ["a", "b"], "but this device still has its copies");

  await server.flush();
  assert.equal(store.confirmed, true);
  leftovers(store);
  assert.deepEqual(saved().logs, {}, "dropped once the server confirms");
  assert.deepEqual(saved().foods, {});
  assert.deepEqual(saved().queue, {});
  assert.ok(server.docs.has("logs/a") && server.docs.has(`foods/${pouch.id}`) && server.docs.has("queue/banana"));
});

test("a move the server turns away loses nothing", async () => {
  save({ logs: { a: log("a") } });
  const { store, server, errors } = cloudStore();
  await store.importBackup(L.makeBackup(leftovers(store)));
  await server.reject();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, ["permission-denied"]);
  assert.deepEqual(Object.keys(saved().logs), ["a"], "still on this device");
  assert.deepEqual(count(leftovers(store)).tries, 1, "and offered again");
});

test("only what the shared log lacks is left on this device", () => {
  save({ logs: { a: log("a"), b: log("b") }, foods: { [pouch.id]: pouch }, queue: { banana: { foodId: "banana", addedAt: 1 } }, profile: { babyName: "Ada", birthDate: "2026-05-01" } });
  const { store, server } = cloudStore();
  server.seed("logs/a", log("a"));
  server.seed("meta/profile", { babyName: "Ada B" });
  const left = leftovers(store);
  assert.deepEqual(Object.keys(left.logs), ["b"]);
  assert.deepEqual(left.profile, { birthDate: "2026-05-01" }, "the shared log's own details win");
  assert.deepEqual(Object.keys(saved().logs), ["b"]);
  assert.deepEqual(saved().profile, { birthDate: "2026-05-01" });
});

test("deleting from the shared log also drops this device's copy", async () => {
  save({ logs: { a: log("a"), p: log("p", pouch.id) }, foods: { [pouch.id]: pouch }, queue: { banana: { foodId: "banana", addedAt: 1 } } });
  const { store } = cloudStore();
  await store.importBackup(L.makeBackup(readLocalState(KNOWN)));
  await store.deleteLog("a");
  await store.setQueued("banana", false);
  await store.deleteFood(pouch.id);
  assert.deepEqual(saved().logs, {}, "so a deleted try can't be offered for moving again");
  assert.deepEqual(saved().foods, {});
  assert.deepEqual(saved().queue, {});
  assert.deepEqual(count(leftovers(store)), { tries: 0, foods: 0, queued: 0, details: 0 });
});

test("a discarded log can be put back", () => {
  const state = { ...L.emptyState(), logs: { a: log("a") } };
  writeLocalState(state, KNOWN);
  assert.deepEqual(readLocalState(KNOWN).logs, state.logs);
  writeLocalState(L.emptyState(), KNOWN);
  assert.deepEqual(readLocalState(KNOWN).logs, {});
});
