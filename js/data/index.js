import fruits from "./fruits.js";
import vegetables from "./vegetables.js";
import grains from "./grains.js";
import legumes from "./legumes.js";
import meat from "./meat.js";
import fish from "./fish.js";
import dairy from "./dairy.js";
import nuts from "./nuts.js";
import herbs from "./herbs.js";
import pantry from "./pantry.js";
import drinks from "./drinks.js";
import { CATEGORY_ICONS, FOOD_ICONS } from "./food-icons.js";

export const FOODS = [
  ...fruits,
  ...vegetables,
  ...grains,
  ...legumes,
  ...meat,
  ...fish,
  ...dairy,
  ...nuts,
  ...herbs,
  ...pantry,
  ...drinks,
]
  .map((f) => ({ ...f, icon: f.icon || FOOD_ICONS[f.id] || CATEGORY_ICONS[f.cat] }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const FOODS_BY_ID = new Map(FOODS.map((f) => [f.id, f]));
