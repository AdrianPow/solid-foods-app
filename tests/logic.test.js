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
  const reaction = L.summarizeLogs([log("a", "egg", "2026-10-01", "liked"), log("b", "egg", "2026-10-05", "loved", { reactions: ["rash"] })]);
  assert.equal(reaction.status, "reaction");
  assert.equal(reaction.lastReactionDate, "2026-10-05");
  const recovered = L.summarizeLogs([log("a", "egg", "2026-10-01", "liked", { reactions: ["rash"] }), log("b", "egg", "2026-10-05", "loved")]);
  assert.equal(recovered.status, "liked", "a later try without symptoms moves on from the reaction");
  assert.equal(recovered.reactionCount, 1);
  assert.equal(recovered.lastReactionDate, "2026-10-01");
});

test("daysAgoISO counts back calendar days", () => {
  assert.equal(L.daysAgoISO(1, new Date(2026, 2, 1, 9)), "2026-02-28");
  assert.equal(L.daysAgoISO(0, new Date(2026, 9, 30, 23, 59)), "2026-10-30");
});

test("formatAgeLong spells out ages for sentences", () => {
  assert.equal(L.formatAgeLong(1), "1 month");
  assert.equal(L.formatAgeLong(4), "4 months");
  assert.equal(L.formatAgeLong(24), "2 years");
  assert.equal(L.formatAgeLong(25), "2 years 1 month");
  assert.equal(L.formatAgeLong(null), "");
});

test("allergenProgress marks introduced, due and reaction states", () => {
  const state = L.emptyState();
  state.logs.a = log("a", "eggs", "2026-10-20", "liked");
  state.logs.b = log("b", "peanut-butter", "2026-10-01", "liked");
  state.logs.c = log("c", "yogurt", "2026-10-20", "liked", { reactions: ["rash"] });
  state.logs.d = log("d", "salmon", "2026-10-10", "liked", { reactions: ["rash"] });
  state.logs.e = log("e", "salmon", "2026-10-21", "liked");
  const summaries = L.summarizeAll(state);
  const rows = Object.fromEntries(L.allergenProgress(FOODS, summaries, "2026-10-22").map((r) => [r.id, r]));
  assert.equal(rows.egg.state, "ok");
  assert.equal(rows.egg.daysSince, 2);
  assert.equal(rows.peanut.state, "due");
  assert.equal(rows.milk.state, "reaction");
  assert.equal(rows.fish.state, "ok", "fish was offered again without symptoms");
  assert.equal(rows.sesame.state, "new");
});

test("suggestNext puts due allergens first, then one new allergen, the to-try list and iron", () => {
  const firstFoods = { milk: "yogurt", egg: "eggs", peanut: "peanut-butter", treenut: "almond", sesame: "sesame", soy: "tofu", wheat: "pasta", fish: "salmon", shellfish: "shrimp" };
  const state = L.emptyState();
  state.logs.a = log("a", "peanut-butter", "2026-10-01", "liked");
  state.logs.b = log("b", "yogurt", "2026-10-20", "liked");
  state.queue.mango = { foodId: "mango", addedAt: 1 };
  const summaries = L.summarizeAll(state);
  const args = { foods: FOODS, summaries, queue: state.queue, today: "2026-10-22", firstFoods, ironStarters: ["infant-cereal", "beef"] };
  const ideas = L.suggestNext({ ...args, months: 7 });
  assert.deepEqual(ideas.map((i) => [i.id, i.kind]), [["peanut-butter", "due"], ["eggs", "allergen"], ["mango", "queued"], ["infant-cereal", "iron"]]);
  assert.equal(ideas[0].daysSince, 21);
  const early = L.suggestNext({ ...args, months: 4 });
  assert.ok(!early.some((i) => i.kind === "allergen"), "no new allergens before 6 months");
});

test("cleanProfile keeps the readiness checklist", () => {
  assert.deepEqual(L.cleanProfile({ readySigns: ["sits", 3, "mouth"] }).readySigns, ["sits", "mouth"]);
  assert.equal(L.cleanProfile({ readySigns: "sits" }).readySigns, undefined);
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

// ---------- foods the family adds ----------

const BY_ID = new Map(FOODS.map((f) => [f.id, f]));
const CAT_ICONS = { mixed: "pot-of-food", meat: "cut-of-meat", fruit: "red-apple" };
const custom = (extra) => L.cleanCustomFood({ id: "my-potato-beef-ab12cd", name: "Potato & beef purée", cat: "mixed", ingredients: ["potato", "beef"], allergens: [], createdAt: 1, updatedAt: 1, ...extra }, KNOWN);

test("cleanCustomFood keeps valid family foods and drops bad fields", () => {
  const food = L.cleanCustomFood({ id: "my-pouch-1", name: "  Pouch  ", cat: "mixed", ingredients: ["potato", "unicorn", "potato", "my-other"], allergens: ["milk", "lupin"], mayContain: ["egg"], brand: "Acme", extra: 1 }, KNOWN);
  assert.deepEqual(food.ingredients, ["potato"]);
  assert.deepEqual(food.allergens, ["milk"]);
  assert.deepEqual(food.mayContain, ["egg"]);
  assert.equal(food.name, "Pouch");
  assert.equal(food.extra, undefined);
  assert.equal(L.cleanCustomFood({ id: "avocado", name: "x", cat: "fruit" }, KNOWN), null, "ids must start with my-");
  assert.equal(L.cleanCustomFood({ id: "my-x", name: "", cat: "fruit" }, KNOWN), null, "needs a name");
  assert.equal(L.cleanCustomFood({ id: "my-x", name: "x", cat: "snacks" }, KNOWN), null, "needs a real category");
  assert.ok(L.isCustomId(L.newCustomId("Kangaroo mince!")));
});

test("expandCustomFood takes age, choking, iron, allergens and icon from what's in it", () => {
  const pouch = L.expandCustomFood(custom({ allergens: ["milk"] }), BY_ID, CAT_ICONS);
  assert.equal(pouch.age, 6);
  assert.equal(pouch.iron, true, "beef is iron-rich");
  assert.deepEqual(pouch.allergens, ["milk"]);
  assert.equal(pouch.icon, "pot-of-food", "a mix uses its category icon");
  const honeyYogurt = L.expandCustomFood(custom({ ingredients: ["yogurt", "honey"] }), BY_ID, CAT_ICONS);
  assert.equal(honeyYogurt.age, 12);
  assert.match(honeyYogurt.wait, /honey/);
  assert.deepEqual(honeyYogurt.allergens, ["milk"], "yogurt brings milk");
  const roo = L.expandCustomFood(custom({ name: "Kangaroo", cat: "meat", ingredients: [] }), BY_ID, CAT_ICONS);
  assert.equal(roo.age, 6);
  assert.equal(roo.choking, null, "unknown without ingredients");
  assert.equal(roo.icon, "cut-of-meat");
  assert.equal(L.countsAsFood(roo), true);
  assert.equal(L.countsAsFood(pouch), false, "a mix counts as its ingredients");
});

test("a meal counts as a try of each ingredient, but its reaction stays with the meal", () => {
  const state = L.emptyState();
  const meal = custom();
  state.foods[meal.id] = meal;
  state.logs.a = log("a", meal.id, "2026-11-01", "loved");
  state.logs.b = log("b", meal.id, "2026-11-03", "liked", { reactions: ["rash"] });
  state.logs.c = log("c", "potato", "2026-10-20", "liked");
  state.logs.d = log("d", "my-deleted-food", "2026-11-02", "liked");
  const s = L.summarizeAll(state);
  assert.equal(s.get(meal.id).status, "reaction");
  assert.equal(s.get("potato").count, 3);
  assert.equal(s.get("potato").mealCount, 2);
  assert.equal(s.get("potato").status, "liked", "the meal's reaction doesn't mark potato");
  assert.deepEqual(s.get("beef").mealReactions, [{ mealId: meal.id, date: "2026-11-03" }]);
  assert.equal(s.has("my-deleted-food"), false, "tries of a deleted food are ignored");
});

test("logs, to-try entries and backups accept family foods", () => {
  assert.ok(L.cleanLog(log("a", "my-pouch-1", "2026-11-01", "liked"), KNOWN));
  assert.equal(L.cleanLog(log("a", "unicorn", "2026-11-01", "liked"), KNOWN), null);
  const meal = custom();
  const backup = L.makeBackup({ ...L.emptyState(), foods: { [meal.id]: meal }, logs: { a: log("a", meal.id, "2026-11-01", "liked") }, queue: { [meal.id]: { foodId: meal.id, addedAt: 1 } } });
  const { state, added } = L.mergeBackup(L.emptyState(), backup, KNOWN);
  assert.equal(added, 1);
  assert.equal(state.foods[meal.id].name, "Potato & beef purée");
  assert.ok(state.queue[meal.id]);
  const newer = L.mergeBackup(state, { app: "first-bites", foods: { [meal.id]: { ...meal, name: "Renamed", updatedAt: 5 } } }, KNOWN);
  assert.equal(newer.state.foods[meal.id].name, "Renamed", "the newer edit wins");
});

// ---------- allergens across foods and meals ----------

const plain = (id, allergens) => ({ id, allergens });
const state = (logs, foods = {}) => ({ logs: Object.fromEntries(logs.map((l) => [l.id, l])), foods });
const stateOf = (foods, summaries, allergen, today = "2026-11-12") => L.allergenProgress(foods, summaries, today).find((a) => a.id === allergen);

test("a clean try of another food with the allergen clears a reaction, and keeps its date", () => {
  const foods = [plain("cheddar", ["milk"]), plain("yogurt", ["milk"])];
  const reacted = log("1", "cheddar", "2026-11-01", "liked", { reactions: ["rash"] });
  let milk = stateOf(foods, L.summarizeAll(state([reacted])), "milk");
  assert.equal(milk.state, "reaction");

  milk = stateOf(foods, L.summarizeAll(state([reacted, log("2", "yogurt", "2026-11-10", "liked")])), "milk");
  assert.equal(milk.state, "ok", "yogurt went fine since");
  assert.equal(milk.lastReactionDate, "2026-11-01", "the earlier reaction is still reported");

  milk = stateOf(foods, L.summarizeAll(state([reacted, log("2", "yogurt", "2026-11-01", "liked")])), "milk");
  assert.equal(milk.state, "reaction", "a clean try the same day doesn't clear it");

  milk = stateOf(foods, L.summarizeAll(state([reacted, log("2", "yogurt", "2026-11-02", "liked")])), "milk", "2026-11-20");
  assert.equal(milk.state, "due", "and it's nudged again once a week has passed");
});

test("a reaction to a meal is a caution for its allergens, not a verdict", () => {
  const byId = new Map(FOODS.map((f) => [f.id, f]));
  const mix = L.cleanCustomFood({ id: "my-mix-ab12cd", name: "Egg & yogurt mix", cat: "mixed", ingredients: ["eggs", "yogurt"], allergens: ["sesame"], createdAt: 1, updatedAt: 1 }, KNOWN);
  const foods = [L.expandCustomFood(mix, byId, {}), ...FOODS];
  const mealReaction = log("1", mix.id, "2026-11-05", "liked", { reactions: ["rash"] });
  let summaries = L.summarizeAll(state([mealReaction], { [mix.id]: mix }));
  for (const id of ["egg", "milk", "sesame"]) {
    const a = stateOf(foods, summaries, id);
    assert.equal(a.state, "ok", `${id} isn't marked as a reaction`);
    assert.equal(a.mealReactionDate, "2026-11-05", `${id} carries the caution`);
    assert.equal(a.lastReactionDate, null);
  }
  // A reaction to egg on its own isn't cleared by a meal that also had one.
  summaries = L.summarizeAll(state([log("0", "eggs", "2026-11-01", "liked", { reactions: ["rash"] }), mealReaction], { [mix.id]: mix }));
  assert.equal(stateOf(foods, summaries, "egg").state, "reaction");
  assert.equal(stateOf(foods, summaries, "milk").state, "ok");
});

// ---------- entries from outside ----------

test("cleanLog only takes real dates and plain ids", () => {
  const ok = (extra) => L.cleanLog({ ...log("a", "banana", "2026-10-01", "liked"), ...extra }, KNOWN);
  assert.ok(ok({}));
  assert.ok(ok({ id: "0b9f3c1e-8a55-4c0e-9a39-1a2b3c4d5e6f" }), "ids the app makes");
  assert.ok(ok({ id: "id-mh2k3l-9x8y7z6w" }));
  assert.equal(ok({ date: "2026-13-45" }), null, "not a date");
  assert.equal(ok({ date: "2026-02-30" }), null);
  assert.equal(ok({ id: "logs/a/b" }), null, "an id can't be a path in the shared log");
  assert.equal(ok({ id: "__proto__" }), null);
  assert.equal(ok({ id: "a b" }), null);
  assert.equal(L.ageInMonths("0024-05-01", "2026-10-15"), null, "a year typed halfway isn't a birth date");
});

test("mergeBackup counts family foods, to-try entries and baby details too", () => {
  const food = L.cleanCustomFood({ id: "my-pouch-ab12cd", name: "Pouch", cat: "mixed", ingredients: ["potato"], createdAt: 1, updatedAt: 1 }, KNOWN);
  const backup = L.makeBackup({ logs: {}, queue: { banana: { foodId: "banana", addedAt: 1 }, kiwi: { foodId: "kiwi", addedAt: 2 } }, profile: { babyName: "Ada", readySigns: [] }, foods: { [food.id]: food } });
  const current = { ...L.emptyState(), queue: { kiwi: { foodId: "kiwi", addedAt: 9 } } };
  const first = L.mergeBackup(current, backup, KNOWN);
  assert.deepEqual([first.added, first.updated, first.foods, first.queued, first.details], [0, 0, 1, 1, 1]);
  const again = L.mergeBackup(first.state, backup, KNOWN);
  assert.deepEqual([again.foods, again.queued, again.details], [0, 0, 0], "nothing new the second time");
});

test("localLeftovers is what this phone has that the shared log doesn't", () => {
  const local = { logs: { a: log("a", "banana", "2026-10-01", "liked"), b: log("b", "kiwi", "2026-10-02", "liked") }, queue: { banana: { foodId: "banana", addedAt: 1 } }, profile: { babyName: "Ada", birthDate: "2026-04-01", readySigns: [] }, foods: {} };
  const shared = { logs: { a: local.logs.a }, queue: {}, profile: { babyName: "Ada B", birthDate: "" }, foods: {} };
  const left = L.localLeftovers(local, shared);
  assert.deepEqual(Object.keys(left.logs), ["b"]);
  assert.deepEqual(Object.keys(left.queue), ["banana"]);
  assert.deepEqual(left.profile, { birthDate: "2026-04-01" }, "only details the shared log has no value for");
  assert.deepEqual(L.countEntries(left), { tries: 1, foods: 0, queued: 1, details: 1 });
  assert.deepEqual(L.countEntries(L.localLeftovers(left, { ...shared, logs: local.logs, queue: local.queue, profile: local.profile })), { tries: 0, foods: 0, queued: 0, details: 0 });
});
