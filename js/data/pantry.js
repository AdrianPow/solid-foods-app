import { food } from "./define.js";

const C = "pantry";

export default [
  food("olive-oil", "Olive oil", C, {
    s6: "Drizzle over vegetables, grains and mashes, or cook with it.",
    s9: "In cooking and drizzled over food.",
    s12: "In cooking and on food.",
    tips: ["Healthy fats help babies absorb vitamins A, D, E and K."],
  }),
  food("coconut-oil", "Coconut oil", C, {
    s6: "A little in cooking.",
    s9: "In cooking.",
    s12: "In cooking.",
    tips: ["High in saturated fat. Olive and canola oil are better everyday choices."],
  }),
  food("honey", "Honey", C, {
    age: 12,
    wait: "Never give honey before 12 months, raw, cooked or baked into foods. It can carry spores that cause infant botulism.",
    s12: "Small amounts drizzled on foods or mixed into yogurt.",
    tips: ["Honey counts as added sugar. Keep it occasional for toddlers."],
  }),
  food("maple-syrup", "Maple syrup", C, {
    age: 12,
    wait: "Experts recommend no added sugars before age 2. Sweeten with mashed fruit instead.",
    s12: "A tiny drizzle occasionally, if at all, before age 2.",
    tips: ["Use pure maple syrup, not pancake syrup."],
  }),
  food("salt", "Salt", C, {
    s6: "Avoid adding salt to baby's food. Season the family's portion after taking baby's out.",
    s9: "Keep salt to a minimum.",
    s12: "Small amounts in family cooking.",
    tips: [
      "Babies' kidneys cannot handle much sodium. Under 12 months the limit is less than 1 g of salt (0.4 g sodium) a day.",
      "Most salt comes from processed foods: bread, cheese, sauces, stock cubes and deli meats.",
    ],
  }),
  food("soy-sauce", "Soy sauce", C, {
    aka: ["tamari"],
    allergens: ["soy", "wheat"],
    age: 12,
    wait: "Soy sauce is extremely salty. Introduce soy through tofu or edamame instead.",
    s12: "A few drops of low-sodium soy sauce in shared dishes.",
    tips: ["Tamari is usually wheat-free. Coconut aminos are a lower-sodium substitute."],
  }),
  food("miso", "Miso", C, {
    allergens: ["soy"],
    s6: "A tiny amount stirred into soups or dressings for flavor.",
    s9: "Small amounts in soups.",
    s12: "Miso soup or in dressings.",
    tips: ["Miso is salty. A little goes a long way."],
  }),
  food("nutritional-yeast", "Nutritional yeast", C, {
    aka: ["nooch"],
    s6: "Sprinkled over vegetables, pasta or eggs for a cheesy flavor.",
    s9: "Sprinkled on foods or used to coat slippery foods.",
    s12: "Sprinkled on foods.",
    tips: ["Fortified varieties provide vitamin B12, useful for vegetarian families."],
  }),
  food("seaweed", "Seaweed", C, {
    aka: ["nori", "kelp", "wakame"],
    s6: "Crumbled nori sprinkled over rice or eggs.",
    s9: "Crumbled or finely torn nori.",
    s12: "Small strips of nori, or rice rolled in seaweed.",
    tips: [
      "Large sheets of nori stick to the roof of the mouth. Crumble it.",
      "Some seaweeds, especially kelp and hijiki, are very high in iodine or arsenic. Stick to small amounts of nori.",
    ],
  }),
  food("mayonnaise", "Mayonnaise", C, {
    aka: ["mayo"],
    allergens: ["egg"],
    s6: "Store-bought (pasteurized) mayo mixed with tuna or egg.",
    s9: "Mixed into fish or egg salads.",
    s12: "As a spread or dip.",
    tips: ["Avoid homemade mayo made with raw eggs."],
  }),
  food("ketchup", "Ketchup", C, {
    age: 12,
    wait: "Most ketchup is high in added sugar and salt.",
    s12: "A little no-sugar-added ketchup as a dip.",
    tips: ["Tomato paste or plain tomato sauce gives the same flavor without the sugar."],
  }),
  food("jam", "Jam", C, {
    aka: ["jelly", "preserves"],
    age: 12,
    wait: "Jam is mostly sugar. Mash fresh berries or stew fruit as a spread instead.",
    s12: "A thin layer of low-sugar jam on toast.",
    tips: ["Quick chia jam (mashed berries plus chia seeds) has no added sugar."],
  }),
  food("chocolate", "Chocolate", C, {
    aka: ["cocoa"],
    allergens: ["milk"],
    age: 12,
    wait: "Chocolate is high in sugar and contains caffeine.",
    s12: "Occasional treat only. Plain cocoa powder in baking is a lower-sugar option.",
    tips: ["Milk chocolate contains milk and many products contain nuts."],
  }),
];
