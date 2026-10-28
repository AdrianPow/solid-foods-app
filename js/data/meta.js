// Shared vocabularies for the food guide. Keep ids stable: tracked logs
// reference food ids, and filters reference these ids.

export const CATEGORIES = [
  { id: "fruit", label: "Fruits" },
  { id: "veg", label: "Vegetables" },
  { id: "grain", label: "Grains & starches" },
  { id: "legume", label: "Beans, lentils & soy" },
  { id: "meat", label: "Meat & poultry" },
  { id: "fish", label: "Fish & seafood" },
  { id: "dairy", label: "Eggs & dairy" },
  { id: "nuts", label: "Nuts & seeds" },
  { id: "herbs", label: "Herbs & spices" },
  { id: "pantry", label: "Oils, sauces & extras" },
  { id: "drinks", label: "Drinks" },
];

// The nine most common food allergens (US FDA list; the UK/EU list adds
// a few more such as mustard, celery and molluscs, noted per food).
export const ALLERGENS = [
  { id: "milk", label: "Milk" },
  { id: "egg", label: "Egg" },
  { id: "peanut", label: "Peanut" },
  { id: "treenut", label: "Tree nuts" },
  { id: "sesame", label: "Sesame" },
  { id: "soy", label: "Soy" },
  { id: "wheat", label: "Wheat" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
];

// Serving stages. `from` is inclusive, in months of age.
export const STAGES = [
  { id: "6", label: "6–8 months", short: "6–8 mo", from: 6 },
  { id: "9", label: "9–11 months", short: "9–11 mo", from: 9 },
  { id: "12", label: "12 months +", short: "12 mo +", from: 12 },
];

export const CHOKING = {
  low: { label: "Low choking risk", short: "Low risk" },
  prep: { label: "Choking risk unless prepared safely", short: "Prep needed" },
  high: { label: "Common choking hazard", short: "Choking hazard" },
};

export const OUTCOMES = [
  { id: "loved", label: "Loved it", tone: "good" },
  { id: "liked", label: "Liked it", tone: "good" },
  { id: "unsure", label: "Not sure", tone: "neutral" },
  { id: "disliked", label: "Didn't like it", tone: "meh" },
  { id: "refused", label: "Wouldn't try", tone: "meh" },
];

export const REACTIONS = [
  { id: "rash", label: "Rash or hives" },
  { id: "swelling", label: "Swelling (lips, eyes, face)" },
  { id: "vomiting", label: "Vomiting" },
  { id: "tummy", label: "Diarrhea or tummy upset" },
  { id: "breathing", label: "Coughing, wheezing or breathing trouble" },
  { id: "other", label: "Something else (see notes)" },
];

// Introduced allergens should stay in the diet. Flag one as "due" when it
// hasn't been offered for this many days.
export const ALLERGEN_DUE_DAYS = 7;

// A common family goal: try 100 different foods before the first birthday.
export const DEFAULT_GOAL = 100;
