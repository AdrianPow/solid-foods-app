import { test } from "node:test";
import assert from "node:assert/strict";
import { FOODS } from "../js/data/index.js";
import { ALLERGENS, ALLERGEN_STARTERS, CATEGORIES, CHOKING } from "../js/data/meta.js";
import { GUIDE } from "../js/data/guide.js";
import { ICONS } from "../js/data/icons.js";
import { FOOD_ICONS } from "../js/data/food-icons.js";

const categoryIds = new Set(CATEGORIES.map((c) => c.id));
const allergenIds = new Set(ALLERGENS.map((a) => a.id));

test("food ids are unique and URL-safe", () => {
  const seen = new Set();
  for (const f of FOODS) {
    assert.match(f.id, /^[a-z0-9-]+$/, f.id);
    assert.ok(!seen.has(f.id), `duplicate id ${f.id}`);
    seen.add(f.id);
  }
});

test("every food has a valid category, choking level and allergens", () => {
  for (const f of FOODS) {
    assert.ok(categoryIds.has(f.cat), `${f.id}: category ${f.cat}`);
    assert.ok(f.choking in CHOKING, `${f.id}: choking ${f.choking}`);
    for (const a of f.allergens) assert.ok(allergenIds.has(a), `${f.id}: allergen ${a}`);
    assert.ok(ICONS[f.icon], `${f.id}: icon "${f.icon}" exists`);
  }
});

test("serving text exists for every stage a food is allowed at", () => {
  for (const f of FOODS) {
    if (f.age == null) {
      assert.ok(f.wait, `${f.id}: avoided foods explain why`);
      continue;
    }
    if (f.age > 6) assert.ok(f.wait, `${f.id}: foods that wait explain why`);
    for (const [stage, from] of [["6", 6], ["9", 9], ["12", 12]]) {
      const next = stage === "6" ? 9 : stage === "9" ? 12 : Infinity;
      if (f.age < next && f.age <= 12) assert.ok(f.serve[stage], `${f.id}: serve text for ${stage}+ (from ${from})`);
    }
  }
});

test("safety essentials are encoded", () => {
  const byId = Object.fromEntries(FOODS.map((f) => [f.id, f]));
  assert.equal(byId.honey.age, 12);
  assert.equal(byId["cows-milk"].age, 12);
  assert.equal(byId.juice.age, 12);
  assert.equal(byId.popcorn.age, 48);
  assert.equal(byId.swordfish.age, null);
  for (const id of ["grape", "blueberry", "apple", "carrot", "peanut", "hot-dog", "popcorn"]) {
    assert.equal(byId[id].choking, "high", `${id} is a common choking hazard`);
  }
  assert.deepEqual(byId.eggs.allergens, ["egg"]);
  assert.deepEqual(byId.peanut.allergens, ["peanut"]);
});

test("every allergen has at least one food that can be offered at 6 months", () => {
  for (const a of ALLERGENS) {
    assert.ok(FOODS.some((f) => f.allergens.includes(a.id) && f.age === 6), a.id);
  }
});

test("every allergen has first-food ideas", () => {
  for (const a of ALLERGENS) assert.ok(ALLERGEN_STARTERS[a.id], a.id);
  assert.deepEqual(Object.keys(ALLERGEN_STARTERS).sort(), ALLERGENS.map((a) => a.id).sort());
});

test("every food has its own icon mapping, and no mapping is stale", () => {
  const ids = new Set(FOODS.map((f) => f.id));
  for (const f of FOODS) assert.ok(FOOD_ICONS[f.id], `${f.id} has an entry in food-icons.js`);
  for (const id of Object.keys(FOOD_ICONS)) assert.ok(ids.has(id), `food-icons.js entry ${id} matches a food`);
});

test("Solid Starts links are slugs, not URLs", () => {
  for (const f of FOODS) if (f.ss) assert.match(f.ss, /^[a-z0-9-]+$/, f.id);
});

test("guide sections have content", () => {
  for (const s of GUIDE) {
    assert.ok(s.id && s.title && s.intro, s.id);
  }
});

test("sync config is either off (null) or a Firebase settings object", async () => {
  // A syntax error here would stop the published app from syncing, so catch
  // it before deploying.
  const { FIREBASE_CONFIG } = await import("../js/sync-config.js");
  if (FIREBASE_CONFIG === null) return;
  assert.equal(typeof FIREBASE_CONFIG, "object");
  for (const key of ["apiKey", "authDomain", "projectId", "appId"]) {
    assert.equal(typeof FIREBASE_CONFIG[key], "string", `FIREBASE_CONFIG.${key}`);
    assert.ok(FIREBASE_CONFIG[key].length > 0, `FIREBASE_CONFIG.${key} is filled in`);
  }
});
