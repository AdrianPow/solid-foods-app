// Pure functions shared by the UI and the tests. No DOM access here.

import { ALLERGENS, ALLERGEN_DUE_DAYS, CATEGORIES, OUTCOMES, STAGES } from "./data/meta.js";

const ALLERGEN_IDS = new Set(ALLERGENS.map((a) => a.id));
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

const DAY_MS = 24 * 60 * 60 * 1000;

export function emptyState() {
  return { logs: {}, queue: {}, profile: {}, foods: {} };
}

// ---------- foods the family adds ----------

// Their ids start with "my-", so they can't clash with the built-in foods.
const CUSTOM_ID = /^my-[a-z0-9-]{1,60}$/;

export function isCustomId(id) {
  return typeof id === "string" && CUSTOM_ID.test(id);
}

export function newCustomId(name) {
  const slug = normalizeText(name).replace(/ /g, "-").slice(0, 30) || "food";
  return `my-${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

// Is this food id one a log or to-try entry may point at?
export function isKnownFoodId(id, knownFoodIds) {
  return typeof id === "string" && (!knownFoodIds || knownFoodIds.has(id) || isCustomId(id));
}

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const allergenList = (value) => (Array.isArray(value) ? [...new Set(value.filter((a) => ALLERGEN_IDS.has(a)))] : []);

// Validate a food the family added, from storage or a backup.
export function cleanCustomFood(raw, knownFoodIds) {
  if (!raw || typeof raw !== "object" || !isCustomId(raw.id)) return null;
  const name = text(raw.name, 60);
  if (!name || !CATEGORY_IDS.has(raw.cat)) return null;
  const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients.filter((id) => typeof id === "string" && !isCustomId(id) && (!knownFoodIds || knownFoodIds.has(id))) : [];
  const food = {
    id: raw.id,
    name,
    cat: raw.cat,
    ingredients: [...new Set(ingredients)].slice(0, 30),
    allergens: allergenList(raw.allergens),
    mayContain: allergenList(raw.mayContain),
    brand: text(raw.brand, 60),
    notes: text(raw.notes, 1000),
    label: text(raw.label, 2000),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  };
  if (typeof raw.by === "string" && raw.by) food.by = raw.by.slice(0, 200);
  if (typeof raw.byName === "string" && raw.byName) food.byName = raw.byName.slice(0, 60);
  return food;
}

const CHOKING_RANK = { low: 0, prep: 1, high: 2 };

// Turn a family food into the same shape as a built-in one. Age, choking
// risk, iron and allergens come from what's in it, so a pouch with honey
// says "From 12 months" and one with egg counts as egg.
export function expandCustomFood(custom, foodsById, categoryIcons) {
  const parts = custom.ingredients.map((id) => foodsById.get(id)).filter(Boolean);
  const avoid = parts.filter((f) => f.age == null);
  const oldest = parts.filter((f) => f.age != null).sort((a, b) => b.age - a.age);
  const age = avoid.length ? null : Math.max(6, ...parts.map((f) => f.age));
  let wait = "";
  if (avoid.length) wait = `Contains ${avoid.map((f) => f.name.toLowerCase()).join(" and ")}, which is best avoided for young children.`;
  else if (age > 6) {
    const late = oldest.filter((f) => f.age === age).map((f) => f.name.toLowerCase());
    wait = `Contains ${late.join(" and ")}, which isn't recommended until ${formatAgeRule({ age }).replace("From ", "")}.`;
  }
  const choking = parts.length ? parts.reduce((worst, f) => (CHOKING_RANK[f.choking] > CHOKING_RANK[worst] ? f.choking : worst), "low") : null;
  const allergens = ALLERGENS.map((a) => a.id).filter((a) => custom.allergens.includes(a) || parts.some((f) => f.allergens.includes(a)));
  return {
    id: custom.id,
    name: custom.name,
    cat: custom.cat,
    aka: custom.brand ? [custom.brand] : [],
    age,
    wait,
    allergens,
    choking,
    iron: parts.some((f) => f.iron),
    serve: { 6: "", 9: "", 12: "" },
    tips: [],
    ss: null,
    icon: parts.length === 1 ? parts[0].icon : categoryIcons[custom.cat],
    custom: true,
    ingredients: custom.ingredients,
    mayContain: custom.mayContain.filter((a) => !allergens.includes(a)),
    brand: custom.brand,
    notes: custom.notes,
    label: custom.label,
    source: custom,
  };
}

// Foods tried toward the goal: a family food made of listed foods counts as
// those foods, not as one more.
export function countsAsFood(food) {
  return !!food && !isMeal(food);
}

// A family food made of listed foods.
function isMeal(food) {
  return !!food && !!food.custom && food.ingredients.length > 0;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

// The date n days before today, in the phone's own time zone.
export function daysAgoISO(n, now = new Date()) {
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (y < 1900) return null;
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
}

export function daysBetween(fromISO, toISO) {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISO);
  if (!a || !b) return null;
  return Math.round((b - a) / DAY_MS);
}

// Whole months between birth date and `today`, or null if unknown.
export function ageInMonths(birthISO, todayIso = todayISO()) {
  const birth = parseISODate(birthISO);
  const now = parseISODate(todayIso);
  if (!birth || !now || now < birth) return null;
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function formatAge(months) {
  if (months == null) return "";
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

// The same age for use in a sentence: "4 months", "1 year 3 months".
export function formatAgeLong(months) {
  if (months == null) return "";
  const unit = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (months < 24) return unit(months, "month");
  const rest = months % 12;
  return rest ? `${unit(Math.floor(months / 12), "year")} ${unit(rest, "month")}` : unit(months / 12, "year");
}

// The serving stage to show by default for a baby of this age.
export function stageForAge(months) {
  if (months == null) return STAGES[0].id;
  let stage = STAGES[0];
  for (const s of STAGES) if (months >= s.from) stage = s;
  return stage.id;
}

export function formatAgeRule(food) {
  if (food.age == null) return "Avoid";
  if (food.age >= 24 && food.age % 12 === 0) return `From ${food.age / 12} years`;
  return `From ${food.age} months`;
}

// Can a baby of this age have this food yet? Babies under 6 months see the
// foods they can start with.
export function isReadyAt(food, months) {
  if (food.age == null) return false;
  return food.age <= Math.max(months ?? 6, 6);
}

const OUTCOME_TONE = Object.fromEntries(OUTCOMES.map((o) => [o.id, o.tone]));

function compareLogs(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.createdAt || 0) - (b.createdAt || 0);
}

export function logsForFood(state, foodId) {
  return Object.values(state.logs)
    .filter((l) => l.foodId === foodId)
    .sort(compareLogs);
}

// status: "new" | "liked" | "learning" | "reaction". The latest try decides
// it, so a food offered again without symptoms moves on from "reaction"; the
// earlier reaction stays in reactionCount and lastReactionDate. Tries that
// came from a meal (viaMeal) count too, but a reaction to a meal stays with
// the meal: here it's only listed in mealReactions. lastCleanDate is the
// latest try with no reaction of either kind.
export function summarizeLogs(logs) {
  if (!logs.length) return { count: 0, status: "new" };
  const sorted = [...logs].sort(compareLogs);
  const last = sorted[sorted.length - 1];
  const reactions = sorted.filter((l) => (l.reactions || []).length > 0);
  const clean = sorted.filter((l) => !(l.reactions || []).length && !l.mealReaction);
  const lastTone = OUTCOME_TONE[last.outcome];
  let status = lastTone === "good" ? "liked" : "learning";
  if ((last.reactions || []).length) status = "reaction";
  return {
    count: sorted.length,
    status,
    firstDate: sorted[0].date,
    lastDate: last.date,
    lastOutcome: last.outcome,
    reactionCount: reactions.length,
    lastReactionDate: reactions.length ? reactions[reactions.length - 1].date : null,
    lastCleanDate: clean.length ? clean[clean.length - 1].date : null,
    mealCount: sorted.filter((l) => l.viaMeal).length,
    mealReactions: sorted.filter((l) => l.mealReaction).map((l) => ({ mealId: l.viaMeal, date: l.date })),
    lovedCount: sorted.filter((l) => l.outcome === "loved").length,
  };
}

export function summarizeAll(state) {
  const foods = state.foods || {};
  const grouped = new Map();
  const add = (id, log) => {
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(log);
  };
  for (const log of Object.values(state.logs)) {
    if (!isCustomId(log.foodId)) {
      add(log.foodId, log);
      continue;
    }
    const food = foods[log.foodId];
    if (!food) continue; // tries of a food that has since been deleted
    add(log.foodId, log);
    // A meal is also a try of each thing in it.
    for (const id of food.ingredients) add(id, { ...log, reactions: [], viaMeal: log.foodId, mealReaction: (log.reactions || []).length > 0 });
  }
  const out = new Map();
  for (const [foodId, logs] of grouped) out.set(foodId, summarizeLogs(logs));
  return out;
}

// Where each allergen stands. The most recent tries decide: a reaction to a
// food with the allergen shows as "reaction" until any food with it is tried
// again without one (the earlier reaction stays in lastReactionDate). A
// reaction to a meal could be to anything in it, so it never decides the
// state: it's reported in mealReactionDate as a caution.
export function allergenProgress(foods, summaries, todayIso = todayISO()) {
  const later = (a, b) => (b && (!a || b > a) ? b : a);
  return ALLERGENS.map((a) => {
    const related = foods.filter((f) => f.allergens.includes(a.id));
    const tried = related.filter((f) => summaries.has(f.id));
    let lastDate = null;
    let lastCleanDate = null;
    let lastReactionDate = null;
    let mealReactionDate = null;
    for (const f of tried) {
      const s = summaries.get(f.id);
      lastDate = later(lastDate, s.lastDate);
      lastCleanDate = later(lastCleanDate, s.lastCleanDate);
      if (isMeal(f)) mealReactionDate = later(mealReactionDate, s.lastReactionDate);
      else lastReactionDate = later(lastReactionDate, s.lastReactionDate);
      for (const r of s.mealReactions || []) mealReactionDate = later(mealReactionDate, r.date);
    }
    const daysSince = lastDate ? daysBetween(lastDate, todayIso) : null;
    let state = "new";
    // A clean try on the same day as a reaction doesn't clear it.
    if (lastReactionDate && !(lastCleanDate > lastReactionDate)) state = "reaction";
    else if (lastDate) state = daysSince > ALLERGEN_DUE_DAYS ? "due" : "ok";
    return { ...a, foods: related, tried, lastDate, daysSince, state, lastReactionDate, mealReactionDate };
  });
}

// Up to `limit` ideas for what to offer next: allergens that are due again,
// then one new allergen (from 6 months), the to-try list, and iron-rich foods.
export function suggestNext({ foods, summaries, queue, months, today = todayISO(), firstFoods, ironStarters, limit = 4 }) {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const out = [];
  const add = (id, kind, extra = {}) => {
    if (out.length < limit && byId.has(id) && !out.some((s) => s.id === id)) out.push({ id, kind, ...extra });
  };
  const allergens = allergenProgress(foods, summaries, today);
  for (const a of allergens.filter((x) => x.state === "due").sort((x, y) => y.daysSince - x.daysSince)) {
    const latest = [...a.tried].sort((x, y) => (summaries.get(x.id).lastDate < summaries.get(y.id).lastDate ? 1 : -1))[0];
    add(latest.id, "due", { allergen: a.id, daysSince: a.daysSince });
  }
  if (months == null || months >= 6) {
    const fresh = allergens.find((a) => a.state === "new");
    if (fresh) add(firstFoods[fresh.id], "allergen", { allergen: fresh.id });
  }
  for (const q of Object.values(queue).sort((a, b) => a.addedAt - b.addedAt)) add(q.foodId, "queued");
  for (const id of ironStarters) {
    const food = byId.get(id);
    if (food && !summaries.has(id) && isReadyAt(food, months)) add(id, "iron");
  }
  return out;
}

export function categoryProgress(foods, summaries) {
  return CATEGORIES.map((c) => {
    const inCat = foods.filter((f) => f.cat === c.id);
    return { ...c, total: inCat.length, tried: inCat.filter((f) => summaries.has(f.id)).length };
  });
}

// Count of distinct foods first tried before the baby's first birthday.
export function triedBeforeFirstBirthday(summaries, birthISO) {
  const birth = parseISODate(birthISO);
  if (!birth) return null;
  const firstBirthday = toISODate(new Date(birth.getFullYear() + 1, birth.getMonth(), birth.getDate()));
  let n = 0;
  for (const s of summaries.values()) if (s.firstDate < firstBirthday) n += 1;
  return n;
}

export function normalizeText(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesQuery(food, query) {
  const q = normalizeText(query);
  if (!q) return true;
  const haystack = normalizeText([food.name, ...food.aka].join(" "));
  return q.split(" ").every((word) => haystack.includes(word));
}

export function newId() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const OUTCOME_IDS = new Set(OUTCOMES.map((o) => o.id));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Ids are also document names in the shared log, so keep them to plain
// characters (no "/" paths, no reserved "__name__" forms).
const ENTRY_ID = /^(?!__)[A-Za-z0-9_-]{1,100}$/;

// Validate and clean a log entry from an untrusted source (import file,
// shared store). Returns null when it can't be used.
export function cleanLog(raw, knownFoodIds) {
  if (!raw || typeof raw !== "object") return null;
  const { id, foodId, date, outcome } = raw;
  if (typeof id !== "string" || !ENTRY_ID.test(id)) return null;
  if (!isKnownFoodId(foodId, knownFoodIds)) return null;
  if (!parseISODate(date)) return null;
  if (!OUTCOME_IDS.has(outcome)) return null;
  const log = {
    id,
    foodId,
    date,
    outcome,
    reactions: Array.isArray(raw.reactions) ? raw.reactions.filter((r) => typeof r === "string").slice(0, 10) : [],
    served: typeof raw.served === "string" ? raw.served.slice(0, 300) : "",
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 2000) : "",
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  };
  if (typeof raw.by === "string" && raw.by) log.by = raw.by.slice(0, 200);
  if (typeof raw.byName === "string" && raw.byName) log.byName = raw.byName.slice(0, 60);
  return log;
}

export function cleanProfile(raw) {
  const p = {};
  if (!raw || typeof raw !== "object") return p;
  if (typeof raw.babyName === "string") p.babyName = raw.babyName.slice(0, 60);
  if (typeof raw.birthDate === "string" && (raw.birthDate === "" || ISO_DATE.test(raw.birthDate))) p.birthDate = raw.birthDate;
  if (Number.isInteger(raw.goal) && raw.goal > 0 && raw.goal <= 1000) p.goal = raw.goal;
  if (Array.isArray(raw.readySigns)) p.readySigns = raw.readySigns.filter((x) => typeof x === "string" && x.length <= 40).slice(0, 20);
  return p;
}

// Merge an exported backup into the current state. Entries are matched by
// id; when both sides have the same entry, the more recently edited wins.
// Returns { state, added, updated } for tries, plus how many family foods
// (foods), to-try entries (queued) and baby details (details) came in.
export function mergeBackup(current, backup, knownFoodIds) {
  if (!backup || typeof backup !== "object" || backup.app !== "first-bites") {
    throw new Error("This file isn't a First Bites backup.");
  }
  const logs = { ...current.logs };
  let added = 0;
  let updated = 0;
  for (const raw of Object.values(backup.logs || {})) {
    const log = cleanLog(raw, knownFoodIds);
    if (!log) continue;
    const existing = logs[log.id];
    if (!existing) {
      logs[log.id] = log;
      added += 1;
    } else if ((log.updatedAt || 0) > (existing.updatedAt || 0)) {
      logs[log.id] = log;
      updated += 1;
    }
  }
  const queue = { ...current.queue };
  let queued = 0;
  for (const [foodId, entry] of Object.entries(backup.queue || {})) {
    if (!isKnownFoodId(foodId, knownFoodIds) || queue[foodId]) continue;
    queue[foodId] = { foodId, addedAt: Number(entry && entry.addedAt) || 0 };
    queued += 1;
  }
  const foods = { ...(current.foods || {}) };
  let foodCount = 0;
  for (const raw of Object.values(backup.foods || {})) {
    const food = cleanCustomFood(raw, knownFoodIds);
    if (food && (!foods[food.id] || (food.updatedAt || 0) > (foods[food.id].updatedAt || 0))) {
      foods[food.id] = food;
      foodCount += 1;
    }
  }
  const incoming = cleanProfile(backup.profile);
  const profile = { ...current.profile };
  let details = 0;
  for (const key of Object.keys(incoming)) {
    if (!isBlank(profile[key]) || isBlank(incoming[key])) continue;
    profile[key] = incoming[key];
    details += 1;
  }
  return { state: { logs, queue, profile, foods }, added, updated, foods: foodCount, queued, details };
}

const isBlank = (value) => value === undefined || value === "" || (Array.isArray(value) && !value.length);

// What this phone's own log holds that the shared log doesn't: tries, family
// foods and to-try entries saved while signed out, and baby details the
// shared log has no value for. Same shape as a state.
export function localLeftovers(local, shared) {
  const missing = (mine, theirs) => Object.fromEntries(Object.entries(mine || {}).filter(([id]) => !(theirs || {})[id]));
  const profile = {};
  for (const [key, value] of Object.entries(local.profile || {})) {
    if (!isBlank(value) && isBlank((shared.profile || {})[key])) profile[key] = value;
  }
  return { logs: missing(local.logs, shared.logs), queue: missing(local.queue, shared.queue), profile, foods: missing(local.foods, shared.foods) };
}

export function countEntries(state) {
  return {
    tries: Object.keys(state.logs || {}).length,
    foods: Object.keys(state.foods || {}).length,
    queued: Object.keys(state.queue || {}).length,
    details: Object.keys(state.profile || {}).length,
  };
}

export function makeBackup(state, now = new Date()) {
  return {
    app: "first-bites",
    version: 1,
    exportedAt: now.toISOString(),
    profile: state.profile,
    logs: state.logs,
    queue: state.queue,
    foods: state.foods || {},
  };
}
