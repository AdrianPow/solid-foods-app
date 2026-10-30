// Pure functions shared by the UI and the tests. No DOM access here.

import { ALLERGENS, ALLERGEN_DUE_DAYS, CATEGORIES, OUTCOMES, STAGES } from "./data/meta.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function emptyState() {
  return { logs: {}, queue: {}, profile: {} };
}

export function todayISO(now = new Date()) {
  return toISODate(now);
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
// earlier reaction stays in reactionCount and lastReactionDate.
export function summarizeLogs(logs) {
  if (!logs.length) return { count: 0, status: "new" };
  const sorted = [...logs].sort(compareLogs);
  const last = sorted[sorted.length - 1];
  const reactions = sorted.filter((l) => (l.reactions || []).length > 0);
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
    lovedCount: sorted.filter((l) => l.outcome === "loved").length,
  };
}

export function summarizeAll(state) {
  const grouped = new Map();
  for (const log of Object.values(state.logs)) {
    if (!grouped.has(log.foodId)) grouped.set(log.foodId, []);
    grouped.get(log.foodId).push(log);
  }
  const out = new Map();
  for (const [foodId, logs] of grouped) out.set(foodId, summarizeLogs(logs));
  return out;
}

export function allergenProgress(foods, summaries, todayIso = todayISO()) {
  return ALLERGENS.map((a) => {
    const related = foods.filter((f) => f.allergens.includes(a.id));
    const tried = related.filter((f) => summaries.has(f.id));
    const lastDate = tried.reduce((max, f) => {
      const d = summaries.get(f.id).lastDate;
      return !max || d > max ? d : max;
    }, null);
    const reaction = tried.some((f) => summaries.get(f.id).status === "reaction");
    const daysSince = lastDate ? daysBetween(lastDate, todayIso) : null;
    let state = "new";
    if (reaction) state = "reaction";
    else if (lastDate) state = daysSince > ALLERGEN_DUE_DAYS ? "due" : "ok";
    return { ...a, foods: related, tried, lastDate, daysSince, state };
  });
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

// Validate and clean a log entry from an untrusted source (import file,
// shared store). Returns null when it can't be used.
export function cleanLog(raw, knownFoodIds) {
  if (!raw || typeof raw !== "object") return null;
  const { id, foodId, date, outcome } = raw;
  if (typeof id !== "string" || !id || id.length > 100) return null;
  if (typeof foodId !== "string" || (knownFoodIds && !knownFoodIds.has(foodId))) return null;
  if (typeof date !== "string" || !ISO_DATE.test(date)) return null;
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
  return p;
}

// Merge an exported backup into the current state. Entries are matched by
// id; when both sides have the same entry, the more recently edited wins.
// Returns { state, added, updated }.
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
  for (const [foodId, entry] of Object.entries(backup.queue || {})) {
    if (knownFoodIds && !knownFoodIds.has(foodId)) continue;
    if (!queue[foodId]) queue[foodId] = { foodId, addedAt: Number(entry && entry.addedAt) || 0 };
  }
  const incoming = cleanProfile(backup.profile);
  const profile = { ...current.profile };
  for (const key of Object.keys(incoming)) {
    if (profile[key] === undefined || profile[key] === "") profile[key] = incoming[key];
  }
  return { state: { logs, queue, profile }, added, updated };
}

export function makeBackup(state, now = new Date()) {
  return {
    app: "first-bites",
    version: 1,
    exportedAt: now.toISOString(),
    profile: state.profile,
    logs: state.logs,
    queue: state.queue,
  };
}
