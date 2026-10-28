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
  herb("cilantro", "Cilantro", { aka: ["coriander leaves"] }),
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
    aka: ["chilli", "cayenne", "jalapeno", "hot sauce"],
    s6: "If your family eats spicy food, a tiny amount in shared dishes is fine. Start very mild.",
    s9: "Small amounts of mild heat in family dishes.",
    tips: ["Wash your hands after handling fresh chilies before touching baby's face or food."],
  }),
  spice("vanilla", "Vanilla", {
    s6: "Vanilla bean seeds or a few drops of extract cooked into oatmeal or baked goods.",
    tips: ["Extract contains alcohol, so add it to foods that get cooked."],
  }),
];
