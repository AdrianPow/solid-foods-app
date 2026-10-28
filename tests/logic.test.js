import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../js/logic.js";
import { FOODS } from "../js/data/index.js";

const KNOWN = new Set(FOODS.map((f) => f.id));

function log(id, foodId, date, outcome, extra = {}) {
  return { id, foodId, date, outcome, reactions: [], served: "", notes: "", createdAt: 1, updatedAt: 1, ...extra };
}

test("ageInMonths counts whole months", () => {
  assert.equal(L.ageInMonths("2026-04-15", "2026-10-14"), 5);
  assert.equal(L.ageInMonths("2026-04-15", "2026-10-15"), 6);
  assert.equal(L.ageInMonths("2025-10-31", "2026-02-28"), 3);
  assert.equal(L.ageInMonths("2027-01-01", "2026-10-15"), null);
  assert.equal(L.ageInMonths("", "2026-10-15"), null);
});

test("stageForAge picks the current serving stage", () => {
  assert.equal(L.stageForAge(null), "6");
  assert.equal(L.stageForAge(4), "6");
  assert.equal(L.stageForAge(8), "6");
  assert.equal(L.stageForAge(9), "9");
  assert.equal(L.stageForAge(11), "9");
  assert.equal(L.stageForAge(18), "12");
});

test("isReadyAt respects minimum ages and avoided foods", () => {
  const honey = FOODS.find((f) => f.id === "honey");
  const avocado = FOODS.find((f) => f.id === "avocado");
  const shark = FOODS.find((f) => f.id === "shark");
  assert.equal(L.isReadyAt(avocado, 4), true);
  assert.equal(L.isReadyAt(honey, 11), false);
  assert.equal(L.isReadyAt(honey, 12), true);
  assert.equal(L.isReadyAt(shark, 30), false);
});

test("summarizeLogs derives status from the latest try and any reaction", () => {
  assert.equal(L.summarizeLogs([]).status, "new");
  const liked = L.summarizeLogs([log("a", "egg", "2026-10-01", "refused"), log("b", "egg", "2026-10-05", "loved")]);
  assert.equal(liked.status, "liked");
  assert.equal(liked.count, 2);
  assert.equal(liked.firstDate, "2026-10-01");
  assert.equal(liked.lastDate, "2026-10-05");
  const learning = L.summarizeLogs([log("a", "egg", "2026-10-05", "loved"), log("b", "egg", "2026-10-01", "disliked", { createdAt: 9 })]);
  assert.equal(learning.status, "liked", "order comes from the try date, not insertion order");
  const reaction = L.summarizeLogs([log("a", "egg", "2026-10-01", "liked", { reactions: ["rash"] }), log("b", "egg", "2026-10-05", "loved")]);
  assert.equal(reaction.status, "reaction");
});

test("allergenProgress marks introduced, due and reaction states", () => {
  const state = L.emptyState();
  state.logs.a = log("a", "eggs", "2026-10-20", "liked");
  state.logs.b = log("b", "peanut-butter", "2026-10-01", "liked");
  state.logs.c = log("c", "yogurt", "2026-10-20", "liked", { reactions: ["rash"] });
  const summaries = L.summarizeAll(state);
  const rows = Object.fromEntries(L.allergenProgress(FOODS, summaries, "2026-10-22").map((r) => [r.id, r]));
  assert.equal(rows.egg.state, "ok");
  assert.equal(rows.egg.daysSince, 2);
  assert.equal(rows.peanut.state, "due");
  assert.equal(rows.milk.state, "reaction");
  assert.equal(rows.sesame.state, "new");
});

test("triedBeforeFirstBirthday counts first tries before turning one", () => {
  const state = L.emptyState();
  state.logs.a = log("a", "avocado", "2026-03-01", "liked");
  state.logs.b = log("b", "banana", "2026-06-02", "liked");
  state.logs.c = log("c", "banana", "2026-01-02", "liked");
  const summaries = L.summarizeAll(state);
  assert.equal(L.triedBeforeFirstBirthday(summaries, "2025-06-01"), 2);
  assert.equal(L.triedBeforeFirstBirthday(summaries, ""), null);
});

test("matchesQuery searches names and other names, ignoring accents", () => {
  const zucchini = FOODS.find((f) => f.id === "zucchini");
  assert.ok(L.matchesQuery(zucchini, "courgette"));
  assert.ok(L.matchesQuery(zucchini, "  ZUCC "));
  const swiss = FOODS.find((f) => f.id === "swiss-cheese");
  assert.ok(L.matchesQuery(swiss, "gruyère"));
  assert.ok(!L.matchesQuery(zucchini, "apple"));
});

test("mergeBackup adds new entries, keeps newer edits and ignores junk", () => {
  const current = L.emptyState();
  current.logs.a = log("a", "avocado", "2026-10-01", "liked", { updatedAt: 5 });
  current.profile = { babyName: "Mila" };
  const backup = L.makeBackup({
    logs: {
      a: log("a", "avocado", "2026-10-01", "loved", { updatedAt: 9 }),
      b: log("b", "banana", "2026-10-02", "unsure"),
      bad: { id: "bad", foodId: "not-a-food", date: "2026-10-02", outcome: "liked" },
      worse: { id: "worse", foodId: "banana", date: "yesterday", outcome: "liked" },
    },
    queue: { mango: { foodId: "mango", addedAt: 3 } },
    profile: { babyName: "Someone else", birthDate: "2026-03-10" },
  });
  const { state, added, updated } = L.mergeBackup(current, backup, KNOWN);
  assert.equal(added, 1);
  assert.equal(updated, 1);
  assert.equal(state.logs.a.outcome, "loved");
  assert.ok(state.logs.b);
  assert.ok(!state.logs.bad && !state.logs.worse);
  assert.ok(state.queue.mango);
  assert.equal(state.profile.babyName, "Mila", "existing details win");
  assert.equal(state.profile.birthDate, "2026-03-10", "missing details are filled in");

  const again = L.mergeBackup(state, backup, KNOWN);
  assert.equal(again.added + again.updated, 0, "re-importing is a no-op");
});

test("mergeBackup rejects files that aren't backups", () => {
  assert.throws(() => L.mergeBackup(L.emptyState(), { hello: 1 }, KNOWN), /backup/);
});

test("cleanLog strips unexpected fields and bounds text", () => {
  const cleaned = L.cleanLog({ ...log("x", "kiwi", "2026-10-01", "liked"), notes: "n".repeat(5000), evil: "<script>" }, KNOWN);
  assert.equal(cleaned.notes.length, 2000);
  assert.equal(cleaned.evil, undefined);
});
