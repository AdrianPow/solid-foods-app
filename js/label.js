// Reading a food label from a photo: what the model is asked for, and how
// its answer is matched to the food list. The call itself is in cloud.js.
// No DOM access here, so the tests can run it.

import { ALLERGENS, CATEGORIES } from "./data/meta.js";
import { normalizeText } from "./logic.js";

export const LABEL_MODEL = "gemini-3.8-flash";

export const LABEL_PROMPT = `This photo shows the packaging of a food for a baby or young child, often an Australian product. Read only what is printed; never guess.

- readable: false if the photo doesn't show enough of a food label to read.
- name: the product as a parent would say it, e.g. "Potato & beef purée". Leave out slogans and age claims.
- brand: the brand name.
- category: "mixed" for meals, pouches and anything made of several main foods. Otherwise the one category the food belongs to.
- ingredientsText: the ingredient list exactly as printed.
- ingredients: the foods in it as plain everyday words, most first, e.g. ["potato", "beef", "carrot"]. Leave out water, vitamins, minerals, thickeners, acidity regulators and other additives.
- contains: allergens the label says the food contains, from a "Contains:" statement or allergens in bold in the ingredients. Crustaceans and molluscs count as shellfish. Almonds, cashews, hazelnuts and other tree nuts count as treenut.
- mayContain: allergens in a "may contain" or "may be present" statement.
- otherAllergens: anything else in the allergen statements that doesn't fit the list, e.g. lupin.`;

// The answer's shape, built with the SDK's Schema helpers.
export function labelSchema(Schema) {
  const allergen = () => Schema.array({ items: Schema.enumString({ enum: ALLERGENS.map((a) => a.id) }) });
  return Schema.object({
    properties: {
      readable: Schema.boolean(),
      name: Schema.string(),
      brand: Schema.string(),
      category: Schema.enumString({ enum: CATEGORIES.map((c) => c.id) }),
      ingredientsText: Schema.string(),
      ingredients: Schema.array({ items: Schema.string() }),
      contains: allergen(),
      mayContain: allergen(),
      otherAllergens: Schema.array({ items: Schema.string() }),
    },
    optionalProperties: ["name", "brand", "category", "ingredientsText", "ingredients", "contains", "mayContain", "otherAllergens"],
  });
}

// Words in an ingredient list that point to one of the nine allergens: a
// second check, in case the model misses one the label shows.
const ALLERGEN_WORDS = {
  milk: ["milk", "milkfat", "buttermilk", "cream", "butter", "cheese", "cheddar", "parmesan", "mozzarella", "ricotta", "paneer", "kefir", "yoghurt", "yogurt", "whey", "casein", "caseinate", "lactose", "ghee"],
  egg: ["egg", "eggs", "albumin"],
  peanut: ["peanut", "peanuts"],
  treenut: ["almond", "almonds", "cashew", "cashews", "hazelnut", "hazelnuts", "walnut", "walnuts", "pecan", "pecans", "pistachio", "pistachios", "macadamia", "macadamias", "brazil nut", "pine nut", "pine nuts", "tree nut", "tree nuts"],
  sesame: ["sesame", "tahini"],
  soy: ["soy", "soya", "soybean", "soybeans", "edamame", "tofu"],
  wheat: ["wheat", "semolina", "spelt", "durum", "couscous"],
  fish: ["fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "sardines", "hake", "pollock", "barramundi", "snapper", "trout"],
  shellfish: ["prawn", "prawns", "shrimp", "crab", "lobster", "crustacean", "crustaceans", "mollusc", "molluscs", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops", "squid", "calamari"],
};

// Phrases with a dairy word in them that aren't dairy. They're taken out
// before looking for milk, so "peanut butter" doesn't tick it.
const NOT_MILK = [
  "peanut butter", "almond butter", "cashew butter", "hazelnut butter", "nut butter", "seed butter", "sunflower butter", "cocoa butter", "coconut butter", "shea butter", "apple butter",
  "butter bean", "coconut milk", "coconut cream", "almond milk", "oat milk", "soy milk", "soya milk", "rice milk", "cream of tartar",
];

// Simple plurals, so "carrots" finds Carrot and "tomatoes" finds Tomato.
function variants(text) {
  const words = text.split(" ");
  return [...new Set([text, words.map((w) => w.replace(/oes$/, "o").replace(/ies$/, "y").replace(/([^s])s$/, "$1")).join(" ")])];
}

export function spotAllergens(text) {
  const found = (words, list) => variants(words).some((v) => list.some((w) => ` ${v} `.includes(` ${w} `)));
  const words = normalizeText(text || "");
  let notDairy = variants(words)[variants(words).length - 1];
  for (const phrase of NOT_MILK) notDairy = notDairy.split(phrase).join(" ");
  return ALLERGENS.map((a) => a.id).filter((id) => found(id === "milk" ? notDairy.replace(/ +/g, " ").trim() : words, ALLERGEN_WORDS[id]));
}

// Label words that are left out without a mention.
const NOT_FOODS = new Set(["water"]);
// Listed foods that a label often has a little of. They're noted on the food
// rather than counted as a food tried.
const NOTED_FOODS = new Set(["salt", "sugar"]);
// Ingredients that would match a listed food by name but aren't that food.
const NOT_A_MATCH = ["cocoa butter", "shea butter"];

// Match the label's ingredients ("beef mince", "sweet potato") to listed
// foods. The longest food name found inside an ingredient wins, so "sweet
// potato" finds Sweet potato rather than Potato. Plurals match either way
// round ("pea protein" finds Peas). Salt and sugar come back in `noted`.
export function matchIngredients(names, foods) {
  const index = foods.map((f) => ({ food: f, keys: [...new Set([f.name, ...(f.aka || [])].map(normalizeText).filter(Boolean).flatMap(variants))] }));
  const matched = [];
  const unmatched = [];
  const noted = [];
  for (const raw of names || []) {
    const text = normalizeText(raw);
    if (!text || NOT_FOODS.has(text)) continue;
    if (NOTED_FOODS.has(text)) {
      if (!noted.includes(text)) noted.push(text);
      continue;
    }
    let best = null;
    let bestLength = 0;
    for (const candidate of variants(text)) {
      if (NOT_A_MATCH.some((phrase) => ` ${candidate} `.includes(` ${phrase} `))) continue;
      for (const { food, keys } of index) {
        for (const key of keys) {
          if (key.length > bestLength && ` ${candidate} `.includes(` ${key} `)) {
            best = food;
            bestLength = key.length;
          }
        }
      }
    }
    if (!best) unmatched.push(String(raw).trim());
    else if (NOT_FOODS.has(best.id)) continue;
    else if (NOTED_FOODS.has(best.id)) {
      if (!noted.includes(best.id)) noted.push(best.id);
    } else if (!matched.includes(best.id)) matched.push(best.id);
  }
  return { matched, unmatched, noted };
}

const ALLERGEN_IDS = new Set(ALLERGENS.map((a) => a.id));
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()) : []);
const allergenIds = (value) => [...new Set(strings(value).filter((a) => ALLERGEN_IDS.has(a)))];

// Turn the model's answer into what the add-a-food form needs.
export function parseLabel(answer, foods) {
  const a = answer && typeof answer === "object" ? answer : {};
  const text = typeof a.ingredientsText === "string" ? a.ingredientsText.trim().slice(0, 2000) : "";
  const { matched, unmatched, noted } = matchIngredients(strings(a.ingredients).slice(0, 30), foods);
  const contains = allergenIds(a.contains);
  // Allergen words in the printed ingredients that the model didn't list.
  const spotted = spotAllergens(text).filter((id) => !contains.includes(id));
  return {
    readable: a.readable !== false,
    name: typeof a.name === "string" ? a.name.trim().slice(0, 60) : "",
    brand: typeof a.brand === "string" ? a.brand.trim().slice(0, 60) : "",
    category: CATEGORY_IDS.has(a.category) ? a.category : "",
    ingredientsText: text,
    ingredientIds: matched,
    unmatched,
    noted,
    contains: [...contains, ...spotted],
    spotted,
    mayContain: allergenIds(a.mayContain).filter((id) => !contains.includes(id) && !spotted.includes(id)),
    otherAllergens: strings(a.otherAllergens).slice(0, 10),
  };
}
