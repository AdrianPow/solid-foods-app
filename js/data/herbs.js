import { food } from "./define.js";

const C = "herbs";
const FLAVOR = "Herbs and spices add flavor without salt and help babies get used to a wide range of tastes.";

function herb(id, name, o) {
  return food(id, name, C, {
    s6: "Finely chopped fresh herb or a pinch of dried herb mixed into food.",
    s9: "Chopped into dishes.",
    s12: "Chopped into dishes.",
    ...o,
    tips: [...(o.tips || []), FLAVOR],
  });
}

function spice(id, name, o) {
  return food(id, name, C, {
    s6: "A small pinch mixed into foods.",
    s9: "A pinch mixed into foods.",
    s12: "In cooking, as for the rest of the family.",
    ...o,
    tips: [...(o.tips || []), FLAVOR],
  });
}

export default [
  herb("basil", "Basil", { s6: "Finely chopped fresh basil in tomato sauce, or blended into nut-free pesto." }),
  herb("cilantro", "Cilantro", { ss: "cilantro-coriander", aka: ["coriander leaves"] }),
  herb("parsley", "Parsley", {}),
  herb("mint", "Mint", { s6: "Finely chopped fresh mint stirred into yogurt or peas." }),
  herb("dill", "Dill", { s6: "Finely chopped dill in yogurt dips, eggs or fish." }),
  herb("oregano", "Oregano", {}),
  herb("rosemary", "Rosemary", { s6: "Very finely chopped leaves cooked into roast vegetables or meat.", tips: ["Strip the needle-like leaves from the stems and chop finely."] }),
  herb("thyme", "Thyme", { tips: ["Strip leaves from woody stems. Stems are not edible."] }),
  spice("garlic", "Garlic", {
    s6: "Cooked garlic mashed into dishes, or a roasted clove spread on toast.",
    tips: ["Roasted garlic is mellow and sweet."],
  }),
  spice("ginger", "Ginger", { s6: "A little grated fresh ginger or a pinch of ground ginger in foods." }),
  spice("cinnamon", "Cinnamon", { s6: "A pinch stirred into oatmeal, yogurt or fruit." }),
  spice("cumin", "Cumin", { s6: "A pinch in beans, lentils or vegetables." }),
  spice("turmeric", "Turmeric", { s6: "A pinch in lentils, rice or eggs.", tips: ["Stains everything. Bibs recommended."] }),
  spice("paprika", "Paprika", { aka: ["smoked paprika"] }),
  spice("black-pepper", "Black pepper", { aka: ["pepper"], s6: "A tiny pinch of ground pepper in foods." }),
  spice("nutmeg", "Nutmeg", { tips: ["Use only a pinch. Large amounts of nutmeg are toxic."] }),
  spice("cardamom", "Cardamom", { s6: "A pinch of ground cardamom in oatmeal or fruit. Remove whole pods." }),
  spice("curry-powder", "Curry powder", {
    aka: ["garam masala"],
    s6: "A small amount of mild curry powder in lentils, vegetables or meat.",
    tips: ["Some blends contain mustard or chili. Start mild."],
  }),
  spice("chili", "Chili pepper", {
    ss: "chili-pepper",
    aka: ["chilli", "cayenne", "jalapeno", "hot sauce"],
    s6: "If your family eats spicy food, a tiny amount in shared dishes is fine. Start very mild.",
    s9: "Small amounts of mild heat in family dishes.",
    tips: ["Wash your hands after handling fresh chilies before touching baby's face or food."],
  }),
  spice("vanilla", "Vanilla", {
    s6: "Vanilla bean seeds or a few drops of extract cooked into oatmeal or baked goods.",
    tips: ["Extract contains alcohol, so add it to foods that get cooked."],
  }),
  spice("allspice", "Allspice", { aka: ["pimento"], s6: "A pinch in stews, jerk dishes or baked fruit." }),
  herb("bay-leaf", "Bay leaf", {
    aka: ["bay leaves", "curry leaves"],
    s6: "Simmer whole leaves in soups and stews for flavor, then remove them.",
    s9: "Cooked into dishes and removed before serving.",
    s12: "Cooked into dishes and removed before serving.",
    tips: ["Always take out whole bay leaves before serving. They stay stiff and sharp."],
  }),
  herb("chives", "Chives", { s6: "Finely snipped chives stirred into eggs, potatoes or yogurt." }),
  spice("cloves", "Cloves", { s6: "A pinch of ground cloves in baked fruit or oatmeal.", tips: ["Remove whole cloves before serving. They are hard and sharp."] }),
  spice("coriander-seed", "Coriander seed", { aka: ["ground coriander"], s6: "A pinch of ground coriander in lentils, curries or roasted vegetables." }),
  spice("fennel-seed", "Fennel seed", { s6: "A pinch of ground fennel seed in sauces, meatballs or lentils.", tips: ["Grind whole seeds or use them where they can be strained out."] }),
  spice("fenugreek", "Fenugreek", { aka: ["methi"], s6: "A pinch of ground fenugreek or a few chopped cooked leaves in dal or curry.", tips: ["Fenugreek can make sweat and pee smell like maple syrup. Harmless."] }),
  herb("lemongrass", "Lemongrass", {
    s6: "Bruised stalks simmered in soups and curries for flavor, then removed.",
    s9: "Finely minced tender inner core cooked into dishes.",
    s12: "Finely minced or removed after cooking.",
    tips: ["The outer stalk is woody and fibrous. Remove pieces before serving."],
  }),
  herb("marjoram", "Marjoram", {}),
  spice("mustard-seed", "Mustard seed", { s6: "A pinch of ground mustard in sauces, or whole seeds tempered in oil for dal.", tips: ["Mustard is a listed allergen in the UK, EU and Canada."] }),
  spice("saffron", "Saffron", { s6: "A few threads soaked in warm water and stirred into rice or sauces.", tips: ["A little goes a long way. Large amounts are not safe."] }),
  herb("sage", "Sage", { s6: "Finely chopped or a pinch of dried sage in squash, meat or beans." }),
  spice("star-anise", "Star anise", {
    s6: "A whole pod simmered in broth or stewed fruit for flavor, then removed.",
    tips: ["Only use Chinese star anise for cooking. Japanese star anise is toxic and looks almost the same.", "Remove whole pods before serving."],
  }),
  spice("sumac", "Sumac", { s6: "A pinch over hummus, eggs or roasted vegetables for a lemony tang." }),
  herb("tarragon", "Tarragon", { s6: "Finely chopped tarragon in eggs, chicken or yogurt dips." }),
];
