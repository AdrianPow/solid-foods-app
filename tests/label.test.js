import { test } from "node:test";
import assert from "node:assert/strict";
import { FOODS } from "../js/data/index.js";
import { labelSchema, matchIngredients, parseLabel, spotAllergens } from "../js/label.js";

test("label ingredients are matched to listed foods", () => {
  const { matched, unmatched } = matchIngredients(["Beef mince", "sweet potato", "Carrots", "tomatoes", "water", "thickener (maize starch)", "onion powder"], FOODS);
  assert.deepEqual(matched.slice(0, 4), ["ground-beef", "sweet-potato", "carrot", "tomato"], "beef mince is ground beef");
  assert.ok(!matched.includes("potato"), "sweet potato isn't potato");
  assert.ok(!unmatched.includes("water"), "water is skipped");
});

test("allergen words in the printed ingredients are spotted", () => {
  assert.deepEqual(spotAllergens("Pumpkin (40%), wholemeal WHEAT flour, skim milk powder, whey, almonds"), ["milk", "treenut", "wheat"]);
  assert.deepEqual(spotAllergens("Apple, pear, banana"), []);
  assert.deepEqual(spotAllergens("Contains: crustacean"), ["shellfish"]);
});

test("parseLabel merges the model's answer with a second allergen check", () => {
  const read = parseLabel(
    {
      readable: true,
      name: "Potato & Beef Purée",
      brand: "Little Spoon",
      category: "mixed",
      ingredientsText: "Potato (55%), beef (25%), water, butter, onion",
      ingredients: ["potato", "beef", "water", "butter", "onion"],
      contains: ["soy", "lupin"],
      mayContain: ["egg", "soy"],
      otherAllergens: ["lupin"],
    },
    FOODS,
  );
  assert.equal(read.name, "Potato & Beef Purée");
  assert.deepEqual(read.ingredientIds, ["potato", "beef", "butter", "onion"]);
  assert.deepEqual(read.contains, ["soy", "milk"], "butter in the text adds milk; unknown ids are dropped");
  assert.deepEqual(read.spotted, ["milk"]);
  assert.deepEqual(read.mayContain, ["egg"], "already-contained allergens aren't repeated");
  assert.deepEqual(read.otherAllergens, ["lupin"]);
  assert.equal(parseLabel({ readable: false }, FOODS).readable, false);
  assert.equal(parseLabel({ category: "snacks" }, FOODS).category, "");
});

test("the label schema builds with the SDK's helpers", () => {
  const calls = [];
  const fake = new Proxy({}, { get: (_, kind) => (params) => (calls.push(kind), { kind, ...params }) });
  const schema = labelSchema(fake);
  assert.equal(schema.kind, "object");
  assert.ok(schema.properties.contains.items.enum.includes("shellfish"));
  assert.ok(schema.properties.category.enum.includes("mixed"));
});
