import { food } from "./define.js";

const C = "drinks";

export default [
  food("water", "Water", C, {
    ss: null,
    s6: "Small sips from an open cup or straw cup with meals, about 4–8 oz (120–240 ml) a day in total.",
    s9: "Sips from an open cup or straw cup with meals.",
    s12: "Offer water throughout the day.",
    tips: [
      "Before 6 months, babies don't need water. Breast milk or formula covers hydration.",
      "Open cups build drinking skills. Expect spills.",
    ],
  }),
  food("cows-milk", "Cow's milk", C, {
    aka: ["milk", "whole milk"],
    allergens: ["milk"],
    ss: "milk",
    age: 12,
    wait: "Before 12 months, cow's milk should not replace breast milk or formula as a drink. Using it in cooking (oatmeal, sauces) is fine from 6 months.",
    s12: "Whole (full-fat) milk in an open or straw cup, up to about 16–24 oz (480–720 ml) a day.",
    tips: [
      "Too much milk can crowd out iron-rich foods and lead to iron deficiency.",
      "Avoid raw (unpasteurized) milk.",
    ],
  }),
  food("goat-milk", "Goat milk", C, {
    allergens: ["milk"],
    age: 12,
    wait: "Like cow's milk, goat milk should not replace breast milk or formula before 12 months. It is fine in cooking.",
    s12: "Pasteurized whole goat milk, if you prefer it to cow's milk.",
    tips: ["Goat milk is not a safe swap for children with cow's milk allergy."],
  }),
  food("soy-milk", "Soy milk", C, {
    allergens: ["soy"],
    age: 12,
    wait: "Plant milks do not replace breast milk or formula before 12 months. Using soy milk in cooking is fine.",
    s12: "Unsweetened, calcium- and vitamin D-fortified soy milk is the most nutritionally similar plant milk to cow's milk.",
    tips: ["If your toddler does not drink cow's milk, talk to your doctor about the best alternative."],
  }),
  food("oat-milk", "Oat milk", C, {
    age: 12,
    wait: "Plant milks do not replace breast milk or formula before 12 months. Using it in cooking is fine.",
    s12: "Fine in cooking or as an occasional drink. It is low in protein, so it is not a main milk for toddlers.",
    tips: ["Choose unsweetened and fortified."],
  }),
  food("almond-milk", "Almond milk", C, {
    allergens: ["treenut"],
    age: 12,
    wait: "Plant milks do not replace breast milk or formula before 12 months. Using it in cooking is fine.",
    s12: "Fine in cooking or as an occasional drink. It is very low in protein and calories, so it is not a main milk for toddlers.",
    tips: ["Choose unsweetened and fortified."],
  }),
  food("rice-milk", "Rice milk", C, {
    age: 60,
    wait: "UK health authorities advise against rice milk as a drink under 5 years because of arsenic.",
    ss: null,
    tips: ["Other plant milks are better choices for young children."],
  }),
  food("coconut-milk", "Coconut milk", C, {
    s6: "Canned coconut milk in curries, soups, oatmeal and smoothies.",
    s9: "In cooking.",
    s12: "In cooking. Coconut milk drinks are low in protein, so not a main milk.",
    tips: ["Canned coconut milk is great in cooking. Carton coconut drinks are a different, thinner product."],
  }),
  food("juice", "Juice", C, {
    aka: ["fruit juice", "apple juice", "orange juice"],
    age: 12,
    wait: "Pediatric guidance is no juice before 12 months. Whole fruit is better.",
    s12: "If offered, at most 4 oz (120 ml) of 100% juice a day for ages 1–3, in an open cup with a meal.",
    tips: ["A splash of prune or pear juice may be suggested by your doctor for constipation."],
  }),
  food("smoothie", "Smoothie", C, {
    ss: null,
    s6: "Thick smoothies (fruit, yogurt, nut butter) from an open cup or on a spoon.",
    s9: "From an open cup or straw cup.",
    s12: "From a cup. A handy way to add greens and seeds.",
    tips: ["Smoothies are filling. Offer them with a meal, not instead of one."],
  }),
  food("tea-coffee", "Tea & coffee", C, {
    aka: ["caffeine", "soda"],
    age: null,
    wait: "Caffeinated drinks are not recommended for young children.",
    ss: "tea",
    tips: ["Herbal teas are not recommended either; some herbs are unsafe for babies."],
  }),
  food("coconut-water", "Coconut water", C, {
    age: 12,
    wait: "Coconut water has natural sugar, like juice. Before 12 months, stick to breast milk, formula and water.",
    s12: "Small amounts occasionally, in an open cup.",
    tips: ["Plain water is the best everyday drink."],
  }),
  food("kombucha", "Kombucha", C, {
    age: null,
    wait: "Kombucha can contain small amounts of alcohol and caffeine, and unpasteurized versions carry a food safety risk. It's not recommended for young children.",
    tips: ["Offer water or milk instead."],
  }),
];
