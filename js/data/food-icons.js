// Which icon each food shows on its tile. Keys refer to js/data/icons.js,
// which `npm run build:icons` generates from the Fluent Emoji Flat set
// (plus the recolored variants defined in scripts/build-icons.mjs).
// A food missing from this list falls back to its category's icon.

export const CATEGORY_ICONS = {
  fruit: "red-apple",
  veg: "leafy-green",
  grain: "sheaf-of-rice",
  legume: "beans",
  meat: "cut-of-meat",
  fish: "fish",
  dairy: "cheese-wedge",
  nuts: "chestnut",
  herbs: "herb",
  pantry: "jar",
  drinks: "glass-of-milk",
};

export const FOOD_ICONS = {
  // Fruits
  acai: "acai", apple: "red-apple", apricot: "apricot", "asian-pear": "asian-pear", avocado: "avocado",
  banana: "banana", blackberry: "blackberry", blueberry: "blueberries", cantaloupe: "cantaloupe",
  cherry: "cherries", clementine: "tangerine", coconut: "coconut", cranberry: "cranberry", currants: "currant",
  date: "date", "dragon-fruit": "dragon-fruit", feijoa: "feijoa", fig: "fig", "goji-berry": "goji",
  gooseberry: "gooseberry", grape: "grapes", grapefruit: "grapefruit", guava: "green-apple", honeydew: "melon",
  jackfruit: "jackfruit", kiwi: "kiwi-fruit", kumquat: "tangerine", lemon: "lemon", lime: "lime",
  longan: "longan", lychee: "lychee", mango: "mango", mangosteen: "mangosteen", nectarine: "nectarine",
  olives: "olive", orange: "tangerine", papaya: "papaya", "passion-fruit": "passion-fruit", peach: "peach",
  pear: "pear", persimmon: "persimmon", pineapple: "pineapple", plum: "plum", pomegranate: "pomegranate",
  pomelo: "pomelo", prune: "prune", quince: "quince", raisin: "raisin", rambutan: "rambutan",
  raspberry: "raspberry", "star-fruit": "star-fruit", strawberry: "strawberry", tamarind: "tamarind",
  watermelon: "watermelon",

  // Vegetables
  artichoke: "artichoke", arugula: "leafy-green", asparagus: "seedling", "baby-corn": "ear-of-corn",
  bamboo: "seedling", beet: "beet", "bell-pepper": "bell-pepper", "bitter-melon": "cucumber",
  "bok-choy": "leafy-green", broccoli: "broccoli", "broccoli-rabe": "leafy-green", broccolini: "broccoli",
  "brussels-sprouts": "cabbage", "butternut-squash": "butternut", cabbage: "cabbage", carrot: "carrot",
  cassava: "potato", cauliflower: "cauliflower", celeriac: "potato-light", celery: "celery",
  chayote: "chayote", "collard-greens": "leafy-green", corn: "ear-of-corn", cucumber: "cucumber",
  daikon: "daikon", eggplant: "eggplant", endive: "endive", fennel: "fennel", "green-beans": "pea-pod",
  "hearts-of-palm": "palm-tree", jicama: "potato-light", kale: "leafy-green", kohlrabi: "kohlrabi",
  leek: "onion", lettuce: "leafy-green", "lotus-root": "lotus", mushroom: "brown-mushroom",
  "mustard-greens": "leafy-green", nopales: "cactus", okra: "okra", onion: "onion", parsnip: "parsnip",
  peas: "pea-pod", plantain: "plantain", potato: "potato", pumpkin: "pumpkin", radish: "radish",
  rhubarb: "rhubarb", romanesco: "romanesco", rutabaga: "rutabaga", scallion: "herb", shallot: "shallot",
  "snap-peas": "pea-pod", spinach: "leafy-green", sunchoke: "ginger-root", "sweet-potato": "roasted-sweet-potato",
  "swiss-chard": "leafy-green", taro: "taro", tomatillo: "tomatillo", tomato: "tomato", turnip: "turnip",
  "water-chestnut": "turnip", watercress: "leafy-green", yam: "yam", zucchini: "zucchini",

  // Grains & starches
  amaranth: "sheaf-of-rice", bagel: "bagel", barley: "sheaf-of-rice", bread: "bread", buckwheat: "sheaf-of-rice",
  bulgur: "sheaf-of-rice", "cereal-os": "bowl-with-spoon", chips: "rice-cracker", couscous: "couscous",
  crackers: "rice-cracker", crumpet: "pancakes", dumpling: "dumpling", "english-muffin": "bread",
  farro: "sheaf-of-rice", "french-toast": "bread", gnocchi: "dumpling", granola: "bowl-with-spoon",
  hominy: "ear-of-corn", "infant-cereal": "bowl-with-spoon", matzah: "flatbread", millet: "sheaf-of-rice",
  muffin: "cupcake", oatmeal: "bowl-with-spoon", orzo: "spaghetti", pancakes: "pancakes", pasta: "spaghetti",
  pizza: "pizza", polenta: "ear-of-corn", popcorn: "popcorn", pretzels: "pretzel", puffs: "puffs",
  quinoa: "quinoa", ravioli: "dumpling", rice: "cooked-rice", "rice-cakes": "rice-cracker",
  "rice-noodles": "steaming-bowl", rye: "baguette-bread", seitan: "seitan", semolina: "bowl-with-spoon",
  sorghum: "sheaf-of-rice", spelt: "sheaf-of-rice", teff: "sheaf-of-rice", tortilla: "flatbread",
  waffle: "waffle", "wheat-biscuits": "bowl-with-spoon", "wild-rice": "wild-rice",

  // Beans, lentils & soy
  "adzuki-bean": "beans-red", "black-beans": "beans-black", "black-eyed-peas": "beans-white",
  chickpea: "beans-tan", edamame: "pea-pod", "fava-beans": "pea-pod", hummus: "falafel",
  "kidney-beans": "beans-red", lentil: "beans-orange", "lima-beans": "beans-lime", "mung-beans": "beans-green",
  natto: "beans", "pinto-beans": "beans-pinto", "split-peas": "beans-yellow", tempeh: "tempeh",
  tofu: "white-block", "urad-dal": "beans-black", "white-beans": "beans-white",

  // Meat & poultry
  bacon: "bacon", beef: "cut-of-meat", bison: "cut-of-meat", "bone-marrow": "meat-on-bone",
  broth: "pot-of-food", chicken: "poultry-leg", chorizo: "hot-dog", "deli-meat": "ham", duck: "poultry-leg",
  "goat-meat": "meat-on-bone", "ground-beef": "hamburger", ham: "ham", "hot-dog": "hot-dog",
  lamb: "meat-on-bone", liver: "liver", pepperoni: "ham", pork: "pork", rabbit: "meat-on-bone",
  sausage: "hot-dog", turkey: "poultry-leg", veal: "cut-of-meat", venison: "cut-of-meat",

  // Fish & seafood
  anchovies: "silver-fish", "arctic-char": "salmon-fish", barramundi: "fish", catfish: "fish", clams: "oyster",
  cod: "fish", crab: "crab", crawfish: "lobster", flounder: "fish", haddock: "fish", hake: "fish",
  halibut: "fish", herring: "silver-fish", lobster: "lobster", mackerel: "silver-fish",
  "mahi-mahi": "tropical-fish", mussels: "mussel", octopus: "octopus", oysters: "oyster", pollock: "fish",
  salmon: "salmon-fish", sardines: "silver-fish", scallops: "oyster", "sea-bass": "fish", shark: "shark",
  shrimp: "shrimp", "smoked-salmon": "salmon-fish", snapper: "red-fish", squid: "squid",
  swordfish: "fish-gray", tilapia: "fish", trout: "salmon-fish", tuna: "fish",

  // Eggs & dairy
  brie: "cheese-white", burrata: "cheese-white", butter: "butter", buttermilk: "glass-of-milk",
  cheddar: "cheddar", "cottage-cheese": "bowl-with-spoon", cream: "glass-of-milk", "cream-cheese": "white-block",
  "duck-eggs": "duck-egg", eggs: "egg", feta: "cheese-white", "goat-cheese": "cheese-white",
  gouda: "cheese-wedge", halloumi: "cheese-white", "ice-cream": "ice-cream", kefir: "glass-of-milk",
  labneh: "bowl-with-spoon", manchego: "cheese-wedge", mascarpone: "bowl-with-spoon",
  "monterey-jack": "cheese-wedge", mozzarella: "cheese-white", paneer: "white-block", parmesan: "cheese-wedge",
  "plant-yogurt": "bowl-with-spoon", provolone: "cheese-wedge", "quail-egg": "quail-egg",
  "queso-fresco": "cheese-white", ricotta: "bowl-with-spoon", skyr: "bowl-with-spoon",
  "sour-cream": "bowl-with-spoon", "string-cheese": "cheese-white", "swiss-cheese": "cheese-wedge",
  yogurt: "bowl-with-spoon",

  // Nuts & seeds
  almond: "almond", "brazil-nut": "chestnut", cashew: "nut-cream", chestnut: "chestnut", chia: "seedling",
  flaxseed: "seedling", hazelnut: "chestnut", "hemp-seed": "seedling", macadamia: "nut-cream",
  peanut: "peanuts", "peanut-butter": "jar-brown", pecan: "chestnut", "pine-nut": "nut-cream",
  pistachio: "pistachio", "poppy-seed": "seedling", "pumpkin-seed": "seedling", sesame: "jar-cream",
  "sunflower-seed": "sunflower", walnut: "chestnut",

  // Herbs & spices
  allspice: "spice-brown", basil: "herb", "bay-leaf": "leaf-fluttering-in-wind", "black-pepper": "pepper",
  cardamom: "spice-brown", chili: "hot-pepper", chives: "herb", cilantro: "herb", cinnamon: "spice-brown",
  cloves: "spice-brown", "coriander-seed": "spice-brown", cumin: "spice-brown", "curry-powder": "spice-yellow",
  dill: "herb", "fennel-seed": "spice-brown", fenugreek: "spice-yellow", garlic: "garlic", ginger: "ginger-root",
  lemongrass: "herb", marjoram: "herb", mint: "herb", "mustard-seed": "spice-yellow", nutmeg: "spice-brown",
  oregano: "herb", paprika: "spice-red", parsley: "herb", rosemary: "herb", saffron: "spice-red", sage: "herb",
  "star-anise": "spice-brown", sumac: "spice-red", tarragon: "herb", thyme: "herb", turmeric: "spice-yellow",
  vanilla: "spice-brown",

  // Oils, sauces & extras
  agave: "cactus", "avocado-oil": "avocado", "barbecue-sauce": "jar-red", "canola-oil": "jar-yellow",
  capers: "olive", chocolate: "chocolate-bar", "coconut-oil": "coconut", honey: "honey-pot", jam: "jar-red",
  ketchup: "jar-red", kimchi: "jar-red", "maple-syrup": "maple-leaf", marshmallow: "marshmallow",
  mayonnaise: "jar-cream", miso: "jar-brown", molasses: "jar-brown", mustard: "jar-yellow",
  "nutritional-yeast": "spice-yellow", "olive-oil": "amphora", pickles: "pickle", salt: "salt",
  sauerkraut: "jar-cream", seaweed: "rice-ball", "soy-sauce": "soy-sauce", sugar: "sugar",
  "sunflower-oil": "sunflower", vinegar: "jar", "yeast-extract": "jar-brown",

  // Drinks
  "almond-milk": "glass-of-milk", "coconut-milk": "coconut", "coconut-water": "coconut",
  "cows-milk": "glass-of-milk", "goat-milk": "glass-of-milk", juice: "beverage-box", kombucha: "kombucha",
  "oat-milk": "glass-of-milk", "rice-milk": "glass-of-milk", smoothie: "cup-with-straw", "soy-milk": "glass-of-milk",
  "tea-coffee": "hot-beverage", water: "tumbler-glass",
};
