// Which icon each food shows on its tile. Keys refer to js/data/icons.js,
// which `npm run build:icons` generates from the Fluent Emoji Flat set
// (plus the recolored variants defined in scripts/build-icons.mjs).
// A food missing from this list falls back to its category's icon.

export const CATEGORY_ICONS = {
  mixed: "pot-of-food",
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
  artichoke: "artichoke", arugula: "green-salad", asparagus: "asparagus", "baby-corn": "ear-of-corn",
  bamboo: "pine-decoration", beet: "beet", "bell-pepper": "bell-pepper", "bitter-melon": "cucumber",
  "bok-choy": "celery", broccoli: "broccoli", "broccoli-rabe": "broccoli", broccolini: "broccoli",
  "brussels-sprouts": "cabbage", "butternut-squash": "butternut", cabbage: "cabbage", carrot: "carrot",
  cassava: "potato", cauliflower: "cauliflower", celeriac: "potato-light", celery: "celery",
  chayote: "chayote", "collard-greens": "leafy-dark", corn: "ear-of-corn", cucumber: "cucumber",
  daikon: "daikon", eggplant: "eggplant", endive: "endive", fennel: "fennel", "green-beans": "pea-pod",
  "hearts-of-palm": "hearts-of-palm", jicama: "potato-light", kale: "kale", kohlrabi: "kohlrabi",
  leek: "leek", lettuce: "leafy-green", "lotus-root": "lotus", mushroom: "brown-mushroom",
  "mustard-greens": "leafy-green", nopales: "cactus", okra: "okra", onion: "onion", parsnip: "parsnip",
  peas: "pea-pod", plantain: "plantain", potato: "potato", pumpkin: "pumpkin", radish: "radish",
  rhubarb: "rhubarb", romanesco: "romanesco", rutabaga: "rutabaga", scallion: "chives", shallot: "shallot",
  "snap-peas": "pea-pod", spinach: "leafy-dark", sunchoke: "ginger-root", "sweet-potato": "roasted-sweet-potato",
  "swiss-chard": "leafy-green", taro: "taro", tomatillo: "tomatillo", tomato: "tomato", turnip: "turnip",
  "water-chestnut": "turnip", watercress: "shamrock", yam: "yam", zucchini: "zucchini",

  // Grains & starches
  amaranth: "amaranth", bagel: "bagel", barley: "sheaf-of-rice", bread: "bread", buckwheat: "sheaf-brown",
  bulgur: "bulgur", "cereal-os": "bowl-tan", chips: "chips", couscous: "couscous",
  crackers: "cracker", crumpet: "pancakes", dumpling: "dumpling", "english-muffin": "bread",
  farro: "sheaf-of-rice", "french-toast": "bread", gnocchi: "dumpling", granola: "bowl-tan",
  hominy: "ear-of-corn", "infant-cereal": "bowl-with-spoon", matzah: "flatbread", millet: "millet",
  muffin: "muffin", oatmeal: "bowl-tan", orzo: "spaghetti", pancakes: "pancakes", pasta: "spaghetti",
  pizza: "pizza", polenta: "ear-of-corn", popcorn: "popcorn", pretzels: "pretzel", puffs: "puffs",
  quinoa: "quinoa", ravioli: "dumpling", rice: "cooked-rice", "rice-cakes": "rice-cracker",
  "rice-noodles": "steaming-bowl", rye: "baguette-bread", seitan: "seitan", semolina: "bowl-with-spoon",
  sorghum: "sheaf-of-rice", spelt: "sheaf-of-rice", teff: "sheaf-brown", tortilla: "flatbread",
  waffle: "waffle", "wheat-biscuits": "bowl-with-spoon", "wild-rice": "wild-rice",

  // Beans, lentils & soy
  "adzuki-bean": "beans-red", "black-beans": "beans-black", "black-eyed-peas": "beans-white",
  chickpea: "beans-tan", edamame: "pea-pod", "fava-beans": "pea-pod", hummus: "bowl-tan",
  "kidney-beans": "beans-red", lentil: "beans-orange", "lima-beans": "beans-lime", "mung-beans": "beans-green",
  natto: "beans", "pinto-beans": "beans-pinto", "split-peas": "beans-yellow", tempeh: "tempeh",
  tofu: "white-block", "urad-dal": "beans-black", "white-beans": "beans-white",

  // Meat & poultry
  bacon: "bacon", beef: "cut-of-meat", bison: "bison", "bone-marrow": "bone",
  broth: "pot-of-food", chicken: "poultry-leg", chorizo: "hot-dog", "deli-meat": "ham", duck: "poultry-leg",
  "goat-meat": "meat-on-bone", "ground-beef": "hamburger", ham: "ham", "hot-dog": "hot-dog",
  lamb: "meat-on-bone", liver: "liver", pepperoni: "ham", pork: "pork", rabbit: "meat-on-bone",
  sausage: "hot-dog", turkey: "poultry-leg", veal: "veal", venison: "venison",

  // Fish & seafood
  anchovies: "silver-fish", "arctic-char": "salmon-fish", barramundi: "fish", catfish: "fish-brown", clams: "oyster",
  cod: "fish-white", crab: "crab", crawfish: "lobster", flounder: "fish-sand", haddock: "fish-white", hake: "fish-white",
  halibut: "fish-sand", herring: "silver-fish", lobster: "lobster", mackerel: "silver-fish",
  "mahi-mahi": "tropical-fish", mussels: "mussel", octopus: "octopus", oysters: "oyster", pollock: "fish-white",
  salmon: "salmon-fish", sardines: "silver-fish", scallops: "oyster", "sea-bass": "fish", shark: "shark",
  shrimp: "shrimp", "smoked-salmon": "salmon-fish", snapper: "red-fish", squid: "squid",
  swordfish: "fish-gray", tilapia: "fish", trout: "salmon-fish", tuna: "fish-navy",

  // Eggs & dairy
  brie: "cheese-round", burrata: "burrata", butter: "butter", buttermilk: "glass-of-milk",
  cheddar: "cheddar", "cottage-cheese": "bowl-with-spoon", cream: "glass-of-milk", "cream-cheese": "white-block",
  "duck-eggs": "duck-egg", eggs: "egg", feta: "white-block", "goat-cheese": "cheese-white",
  gouda: "cheese-gold", halloumi: "halloumi", "ice-cream": "ice-cream", kefir: "glass-of-milk",
  labneh: "jar-cream", manchego: "cheese-gold", mascarpone: "jar-cream",
  "monterey-jack": "cheese-pale", mozzarella: "cheese-white", paneer: "white-block", parmesan: "cheese-pale",
  "plant-yogurt": "bowl-green", provolone: "cheese-pale", "quail-egg": "quail-egg",
  "queso-fresco": "cheese-white", ricotta: "bowl-with-spoon", skyr: "bowl-with-spoon",
  "sour-cream": "jar-cream", "string-cheese": "string-cheese", "swiss-cheese": "cheese-wedge",
  yogurt: "bowl-with-spoon",

  // Nuts & seeds
  almond: "almond", "brazil-nut": "brazil-nut", cashew: "nut-cream", chestnut: "chestnut", chia: "beans-black",
  flaxseed: "seeds-brown", hazelnut: "chestnut", "hemp-seed": "seeds-hemp", macadamia: "nut-cream",
  peanut: "peanuts", "peanut-butter": "jar-brown", pecan: "pecan", "pine-nut": "nut-cream",
  pistachio: "pistachio", "poppy-seed": "seeds-poppy", "pumpkin-seed": "beans-green", sesame: "jar-cream",
  "sunflower-seed": "sunflower", walnut: "walnut",

  // Herbs & spices
  allspice: "spice-brown", basil: "potted-plant", "bay-leaf": "leaf-fluttering-in-wind", "black-pepper": "pepper",
  cardamom: "cardamom", chili: "hot-pepper", chives: "chives", cilantro: "shamrock", cinnamon: "cinnamon",
  cloves: "spice-dark", "coriander-seed": "spice-tan", cumin: "spice-brown", "curry-powder": "spice-yellow",
  dill: "herb-blue", "fennel-seed": "spice-green", fenugreek: "spice-yellow", garlic: "garlic", ginger: "ginger-root",
  lemongrass: "lemongrass", marjoram: "herb", mint: "mint", "mustard-seed": "spice-yellow", nutmeg: "nutmeg",
  oregano: "herb", paprika: "spice-red", parsley: "four-leaf-clover", rosemary: "evergreen-tree", saffron: "spice-red", sage: "sage",
  "star-anise": "star-anise", sumac: "spice-red", tarragon: "herb", thyme: "herb", turmeric: "spice-yellow",
  vanilla: "vanilla",

  // Oils, sauces & extras
  agave: "cactus", "avocado-oil": "avocado", "barbecue-sauce": "jar-red", "canola-oil": "jar-yellow",
  capers: "olive", chocolate: "chocolate-bar", "coconut-oil": "coconut", honey: "honey-pot", jam: "jar-red",
  ketchup: "jar-red", kimchi: "jar-red", "maple-syrup": "maple-leaf", marshmallow: "marshmallow",
  mayonnaise: "jar-cream", miso: "jar-brown", molasses: "jar-brown", mustard: "jar-yellow",
  "nutritional-yeast": "spice-yellow", "olive-oil": "amphora", pickles: "pickle", salt: "salt",
  sauerkraut: "jar-cream", seaweed: "seaweed", "soy-sauce": "soy-sauce", sugar: "sugar",
  "sunflower-oil": "sunflower", vinegar: "jar", "yeast-extract": "jar-brown",

  // Drinks
  "almond-milk": "milk-almond", "coconut-milk": "coconut", "coconut-water": "coconut",
  "cows-milk": "glass-of-milk", "goat-milk": "glass-of-milk", juice: "beverage-box", kombucha: "kombucha",
  "oat-milk": "milk-oat", "rice-milk": "glass-of-milk", smoothie: "cup-with-straw", "soy-milk": "milk-soy",
  "tea-coffee": "hot-beverage", water: "tumbler-glass",
};
