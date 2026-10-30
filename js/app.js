import { FOODS, FOODS_BY_ID } from "./data/index.js";
import { ALLERGENS, ALLERGEN_DUE_DAYS, ALLERGEN_STARTERS, CATEGORIES, CHOKING, DEFAULT_GOAL, OUTCOMES, REACTIONS, STAGES } from "./data/meta.js";
import { GUIDE } from "./data/guide.js";
import { ICONS, ICON_VIEWBOX } from "./data/icons.js";
import * as L from "./logic.js";
import { CloudStore, LocalStore, describeStoreError, getDeviceName, openStore, readLocalState, removeLocalLogs, setDeviceName } from "./store.js";
import { describeAuthError, loadCloud, readSyncConfig } from "./cloud.js";

const KNOWN_IDS = new Set(FOODS.map((f) => f.id));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const ALLERGEN_LABEL = Object.fromEntries(ALLERGENS.map((a) => [a.id, a.label]));
const ALLERGEN_SHORT = { milk: "Milk", egg: "Egg", peanut: "Peanut", treenut: "Nut", sesame: "Sesame", soy: "Soy", wheat: "Wheat", fish: "Fish", shellfish: "Shellfish" };
const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.id, o.label]));
const REACTION_LABEL = Object.fromEntries(REACTIONS.map((r) => [r.id, r.label]));
const STATUS_LABEL = { new: "Not tried yet", liked: "Liked", learning: "Still learning", reaction: "Reaction noted" };
const VIEWS = ["foods", "progress", "guide", "setup"];

const app = {
  store: null,
  state: L.emptyState(),
  summaries: new Map(),
  view: "foods",
  names: {},
  filters: { q: "", status: "all", cat: "all", allergen: "all", flag: "all", sort: "category" },
  openFoodId: null,
  pushedFood: false,
  cloud: { status: "off" },
  cloudApi: null,
  syncConfig: null,
  syncConfigError: "",
  stage: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const main = $("#view");
const sheet = $("#food-sheet");
const logDialog = $("#log-dialog");
const filterSheet = $("#filter-sheet");

// ---------- helpers ----------

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const dateFmtYear = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (y === new Date().getFullYear() ? dateFmt : dateFmtYear).format(date);
}

function relDays(n) {
  if (n == null) return "";
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

function plural(n, word, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

function babyMonths() {
  return L.ageInMonths(app.state.profile.birthDate);
}

function babyName() {
  return app.state.profile.babyName || "";
}

function goal() {
  return app.state.profile.goal || DEFAULT_GOAL;
}

function canWrite() {
  return !!app.store && app.store.canWrite;
}

function loading() {
  return !app.store || (app.store.mode !== "local" && !app.store.ready && !app.store.error);
}

// Why the shared log couldn't be read, or "" if it's fine.
function loadError() {
  const err = app.store && app.store.error;
  if (!err) return "";
  if (["permission-denied", "unauthenticated", "revoked", "not_granted"].includes(err.code)) return describeStoreError(err);
  return "Check your connection, then try again.";
}

// Sync is set up for this app (or meant to be), but this phone is using its
// own log.
function phoneOnly() {
  return !!(app.syncConfig || app.syncConfigError) && !!app.store && app.store.mode === "local";
}

// Tries saved on this phone while signed out, not yet in the shared log.
function unsyncedLocalIds() {
  if (!app.store || app.store.mode !== "cloud" || !app.store.ready) return [];
  return Object.keys(readLocalState(KNOWN_IDS).logs).filter((id) => !app.state.logs[id]);
}

function ageTag(food) {
  if (food.age == null) return "Avoid";
  if (food.age >= 24) return `${food.age / 12}y`;
  return `${food.age}m`;
}

function isWaiting(food) {
  return !L.isReadyAt(food, babyMonths());
}

// One hidden sprite holds every icon; tiles reference it with <use>.
function mountIconSprite() {
  if (document.getElementById("icon-sprite")) return;
  const symbols = Object.entries(ICONS)
    .map(([key, body]) => `<symbol id="ic-${key}" viewBox="${ICON_VIEWBOX}">${body}</symbol>`)
    .join("");
  const holder = document.createElement("div");
  holder.innerHTML = `<svg id="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${symbols}</svg>`;
  document.body.prepend(holder.firstChild);
}

function iconHTML(food, cls = "food-icon") {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#ic-${food.icon}"></use></svg>`;
}

function whoLogged(log) {
  if (log.by && app.names[log.by]) return app.names[log.by];
  return log.byName || "";
}

// Shown as a popover where supported, so it sits above an open food page or
// form instead of behind it.
let toastTimer;
function toast(message) {
  const el = $("#toast");
  const popover = typeof el.showPopover === "function";
  el.textContent = message;
  el.hidden = false;
  if (popover) {
    if (el.matches(":popover-open")) el.hidePopover();
    el.showPopover();
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (popover && el.matches(":popover-open")) el.hidePopover();
    el.hidden = true;
  }, 3200);
}

const ICON = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11v16l-5.5-4-5.5 4z"/></svg>',
  hazard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17.4v.1"/></svg>',
};

// A different symbol for each status, so they don't rely on color alone.
const MARK = {
  new: '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="mark-ring" cx="13" cy="13" r="11"/><path class="mark-plus" d="M13 9v8M9 13h8"/></svg>',
  liked: '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="mark-fill" cx="13" cy="13" r="12"/><path class="mark-glyph" d="M7.5 13.5l3.5 3.5 7.5-8"/></svg>',
  learning: '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="mark-fill" cx="13" cy="13" r="12"/><g class="mark-glyph mark-cycle" transform="translate(13 13) scale(.52) translate(-12.5 -12.5)"><path d="M23 4v6h-6"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/></g></svg>',
  reaction: '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="mark-fill" cx="13" cy="13" r="12"/><path class="mark-glyph" d="M13 7v7.5M13 18.6v.2"/></svg>',
};
const STATUS_SHORT = { liked: "Liked", learning: "Still learning", reaction: "Reaction" };

// ---------- chrome ----------

function renderChrome() {
  for (const tab of document.querySelectorAll(".tab")) {
    if (tab.dataset.view === app.view) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  const chip = $("#baby-chip");
  const name = babyName();
  const months = babyMonths();
  const tried = app.summaries.size;
  if (name || months != null) {
    chip.innerHTML = `<strong>${esc(name || "Baby")}</strong>${months != null ? `<span class="num">${esc(L.formatAge(months))}</span>` : ""}<span class="num muted">· ${tried} tried</span>`;
    chip.setAttribute("aria-label", `${name || "Baby"}: ${months != null ? L.formatAge(months) + ", " : ""}${tried} foods tried. Edit baby details.`);
  } else {
    chip.innerHTML = "<strong>Add baby</strong>";
    chip.setAttribute("aria-label", "Add your baby's details");
  }
}

// ---------- foods view ----------

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "Not tried" },
  { id: "tried", label: "Tried" },
  { id: "liked", label: "Liked" },
  { id: "learning", label: "Still learning" },
  { id: "reaction", label: "Reaction" },
  { id: "queued", label: "To try next" },
];

function statusOf(food) {
  const s = app.summaries.get(food.id);
  return s ? s.status : "new";
}

function matchesStatus(food, status) {
  const st = statusOf(food);
  switch (status) {
    case "new":
      return st === "new";
    case "tried":
      return st !== "new";
    case "queued":
      return !!app.state.queue[food.id];
    case "all":
      return true;
    default:
      return st === status;
  }
}

function matchesFilters(food, { skipStatus = false } = {}) {
  const f = app.filters;
  if (!skipStatus && !matchesStatus(food, f.status)) return false;
  if (f.cat !== "all" && food.cat !== f.cat) return false;
  if (f.allergen === "any" && !food.allergens.length) return false;
  if (f.allergen !== "all" && f.allergen !== "any" && !food.allergens.includes(f.allergen)) return false;
  if (f.flag === "ready" && isWaiting(food)) return false;
  if (f.flag === "wait" && !isWaiting(food)) return false;
  if (f.flag === "iron" && !food.iron) return false;
  if (f.flag === "hazard" && food.choking !== "high") return false;
  return L.matchesQuery(food, f.q);
}

function readyFilterLabel() {
  const months = babyMonths();
  return months != null && months >= 6 ? `Ready at ${L.formatAge(months)}` : "Ready from 6 months";
}

// Problems with the log come first. Ask for a birth date only once we know
// there isn't one: synced details can arrive a moment after the page draws.
function statusNoticesHTML() {
  const notices = [];
  const error = loadError();
  if (error) {
    notices.push(`<div class="notice notice-bad" role="alert"><p><strong>Your shared log didn't load.</strong> ${esc(error)}</p><button type="button" class="btn btn-small" data-action="retry-store">Try again</button></div>`);
  } else if (phoneOnly() && app.syncConfigError) {
    notices.push(`<div class="notice notice-bad"><p><strong>Syncing is off.</strong> The sync settings have a problem, so tries are saved on this phone only.</p><a class="btn btn-small" href="#setup">Details</a></div>`);
  } else if (phoneOnly() && app.cloud.status === "error") {
    notices.push(`<div class="notice notice-bad"><p><strong>Sync isn't connected.</strong> ${esc(app.cloud.message)} Tries are saved on this phone until it reconnects.</p><button type="button" class="btn btn-small" data-action="retry-cloud">Try again</button></div>`);
  } else if (phoneOnly() && app.cloud.status === "signed-out") {
    notices.push(`<div class="notice"><p><strong>You're signed out.</strong> Sign in to see your shared log. Until then, tries are saved on this phone only.</p><a class="btn btn-small btn-primary" href="#setup">Sign in</a></div>`);
  }
  const unsynced = unsyncedLocalIds().length;
  if (unsynced) {
    notices.push(`<div class="notice"><p>This phone has ${plural(unsynced, "try", "tries")} logged while you were signed out.</p><button type="button" class="btn btn-small btn-primary" data-action="copy-local">Move to shared log</button></div>`);
  }
  const settling = loading() || app.cloud.status === "loading";
  if (!notices.length && !settling && !phoneOnly() && !app.state.profile.birthDate) {
    notices.push(`<div class="notice"><p>Add your baby's birth date to see the right serving stage for their age.</p><a class="btn btn-small" href="#setup">Add baby details</a></div>`);
  }
  return notices.join("");
}

function renderFoods() {
  main.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Foods</h1>
        <p class="muted">${FOODS.length} foods with age-by-age serving tips. Tap a tile for details, or its circle to log a try.</p>
      </div>
    </div>
    <div id="status-notices">${statusNoticesHTML()}</div>
    <div id="install-notice">${installNoticeHTML()}</div>
    <div class="filters">
      <div class="search-row">
        <label class="search">
          ${ICON.search}
          <span class="visually-hidden">Search foods</span>
          <input id="food-search" type="search" autocomplete="off" placeholder="Search foods, e.g. avocado" value="${esc(app.filters.q)}">
        </label>
        <button type="button" class="filter-btn" id="filter-btn" data-action="open-filters" aria-haspopup="dialog">${ICON.filter}<span class="filter-count" id="filter-count" hidden></span></button>
      </div>
      <div class="chip-row" id="status-chips" role="group" aria-label="Filter by what you've tried"></div>
      <div class="active-filters" id="active-filters" hidden></div>
    </div>
    <div id="food-results"></div>`;
  $("#status-chips").addEventListener("scroll", (e) => updateChipFade(e.currentTarget), { passive: true });
  renderFoodResults();
}

function renderStatusChips() {
  const row = $("#status-chips");
  if (!row) return;
  const base = FOODS.filter((food) => matchesFilters(food, { skipStatus: true }));
  row.innerHTML = STATUS_FILTERS.map((s) => {
    const n = base.filter((food) => matchesStatus(food, s.id)).length;
    return `<button type="button" class="chip" data-status="${s.id}" aria-pressed="${app.filters.status === s.id}">${esc(s.label)} <span class="count">${n}</span></button>`;
  }).join("");
  updateChipFade(row);
}

// Fade whichever edge of the status row has more chips beyond it.
function updateChipFade(row) {
  const max = row.scrollWidth - row.clientWidth;
  row.classList.toggle("fade-start", row.scrollLeft > 2);
  row.classList.toggle("fade-end", row.scrollLeft < max - 2);
}

// ---------- filter sheet ----------

const FILTER_KEYS = ["cat", "allergen", "flag"];

function filterGroups() {
  return [
    { key: "cat", legend: "Category", options: [["all", "All"], ...CATEGORIES.map((c) => [c.id, c.label])] },
    { key: "allergen", legend: "Contains", options: [["all", "Any food"], ["any", "Any common allergen"], ...ALLERGENS.map((a) => [a.id, a.label])] },
    { key: "flag", legend: "Age and safety", options: [["all", "All ages"], ["ready", readyFilterLabel()], ["wait", "Not yet / avoid"], ["iron", "Iron-rich"], ["hazard", "Common choking hazards"]] },
    { key: "sort", legend: "Order", options: [["category", "By category"], ["az", "A–Z"], ["recent", "Recently tried"]] },
  ];
}

// How an active filter reads on its removable chip.
function filterLabel(key) {
  const value = app.filters[key];
  if (key === "allergen") return value === "any" ? "Any allergen" : `Contains ${ALLERGEN_LABEL[value].toLowerCase()}`;
  const group = filterGroups().find((g) => g.key === key);
  return group.options.find(([v]) => v === value)[1];
}

function renderFilterBar() {
  const active = FILTER_KEYS.filter((k) => app.filters[k] !== "all");
  const count = $("#filter-count");
  if (!count) return;
  count.textContent = active.length;
  count.hidden = !active.length;
  $("#filter-btn").setAttribute("aria-label", active.length ? `Filters (${active.length} on)` : "Filters");
  const box = $("#active-filters");
  box.hidden = !active.length;
  box.innerHTML = active
    .map((k) => `<button type="button" class="chip chip-on" data-action="clear-filter" data-key="${k}" aria-label="Remove filter: ${esc(filterLabel(k))}">${esc(filterLabel(k))}${ICON.close}</button>`)
    .join("");
}

function renderFilterSheet() {
  filterSheet.innerHTML = `
    <header class="sheet-head">
      <div class="sheet-title"><h2 id="filter-title" tabindex="-1">Filters</h2></div>
      <button type="button" class="sheet-close" data-action="close-filters" aria-label="Close">${ICON.close}</button>
    </header>
    <div class="form">
      ${filterGroups()
        .map(
          (g) => `<fieldset class="field">
            <legend>${esc(g.legend)}</legend>
            <div class="choice-row">${g.options.map(([value, label]) => `<label class="choice"><input type="radio" name="f-${g.key}" value="${value}"${app.filters[g.key] === value ? " checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div>
          </fieldset>`,
        )
        .join("")}
    </div>
    <footer class="form-foot">
      <div class="form-actions">
        <button type="button" class="btn btn-quiet" data-action="reset-filters">Clear filters</button>
        <button type="button" class="btn btn-primary" data-action="close-filters" id="filter-done"></button>
      </div>
    </footer>`;
  updateFilterDone();
}

function updateFilterDone() {
  const done = $("#filter-done", filterSheet);
  if (done) done.textContent = `Show ${plural(FOODS.filter((food) => matchesFilters(food)).length, "food")}`;
}

function openFilters() {
  renderFilterSheet();
  filterSheet.showModal();
  $("#filter-title", filterSheet).focus();
}

// Compact tile: icon, name, and small badges that flow after the name. The
// age only shows when a food isn't ready yet.
function tileHTML(food) {
  const s = app.summaries.get(food.id);
  const status = s ? s.status : "new";
  const waiting = isWaiting(food);
  const tags = [];
  if (food.age == null) tags.push('<span class="tag tag-bad" title="Avoid for young children">Avoid</span>');
  else if (waiting) tags.push(`<span class="tag tag-wait" title="${esc(L.formatAgeRule(food))}">${ageTag(food)}</span>`);
  if (food.choking === "high") tags.push(`<span class="tag tag-icon" title="Common choking hazard: prepare carefully">${ICON.hazard}</span>`);
  if (food.iron) tags.push('<span class="tag" title="Iron-rich">Fe</span>');
  if (food.allergens.length) {
    const more = food.allergens.length > 1 ? ` +${food.allergens.length - 1}` : "";
    tags.push(`<span class="tag tag-solid" title="Common allergens: ${esc(food.allergens.map((a) => ALLERGEN_LABEL[a]).join(", "))}">${esc(ALLERGEN_SHORT[food.allergens[0]])}${more}</span>`);
  }
  if (app.state.queue[food.id]) tags.push(`<span class="tag tag-icon" title="On your to-try list">${ICON.bookmark}</span>`);
  const markLabel = s
    ? `${food.name}: tried ${plural(s.count, "time")}, ${STATUS_LABEL[status].toLowerCase()}. Log another try`
    : `Log a first try of ${food.name}`;
  const ageTitle = food.age == null ? "Not recommended for young children" : `${L.formatAgeRule(food)}${waiting ? " (not yet for your baby)" : ""}`;
  const extras = [food.choking === "high" && "Common choking hazard", food.iron && "Iron-rich", food.allergens.length && `Contains ${food.allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}`].filter(Boolean);
  const mark = MARK[status] + (s && s.count > 1 ? `<span class="tile-count">${s.count}</span>` : "");
  return `<div class="tile st-${status}" data-cat="${food.cat}">
    <button type="button" class="tile-open" data-open="${food.id}" aria-label="${esc([food.name, ageTitle, ...extras, STATUS_LABEL[status]].join(". "))}.">
      ${iconHTML(food, "tile-icon")}
      <span class="tile-name">${esc(food.name)}${tags.length ? `<span class="tile-tags" aria-hidden="true">${tags.join("")}</span>` : ""}</span>
    </button>
    ${canWrite() ? `<button type="button" class="tile-check" data-action="log" data-food="${food.id}" aria-label="${esc(markLabel)}">${mark}</button>` : `<span class="tile-check" aria-hidden="true">${mark}</span>`}
  </div>`;
}

function legendHTML() {
  if (!app.summaries.size) return "";
  return `<span class="legend" aria-hidden="true">${Object.entries(STATUS_SHORT)
    .map(([status, label]) => `<span class="st-${status}">${MARK[status]}${label}</span>`)
    .join("")}</span>`;
}

function sortFoods(list) {
  if (app.filters.sort === "recent") {
    return [...list].sort((a, b) => {
      const da = app.summaries.get(a.id)?.lastDate || "";
      const db = app.summaries.get(b.id)?.lastDate || "";
      if (da !== db) return da < db ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }
  return list;
}

function renderFoodResults() {
  const box = $("#food-results");
  if (!box) return;
  renderStatusChips();
  const list = sortFoods(FOODS.filter((food) => matchesFilters(food)));
  const tried = list.filter((food) => app.summaries.has(food.id)).length;
  renderFilterBar();
  const line = `<p class="result-line"><span class="num">${plural(list.length, "food")} · ${tried} tried</span>${loading() ? "<span>Loading your tracker…</span>" : legendHTML()}</p>`;
  if (!list.length) {
    box.innerHTML = `${line}<div class="empty"><strong>No foods match</strong>Try a different search, or clear the filters.<div style="margin-top:12px"><button type="button" class="btn btn-small" data-action="clear-filters">Clear filters</button></div></div>`;
    return;
  }
  if (app.filters.sort !== "category") {
    box.innerHTML = `${line}<div class="grid">${list.map(tileHTML).join("")}</div>`;
    return;
  }
  const groups = CATEGORIES.map((c) => ({ ...c, foods: list.filter((food) => food.cat === c.id) })).filter((g) => g.foods.length);
  box.innerHTML =
    line +
    groups
      .map((g) => {
        const gTried = g.foods.filter((food) => app.summaries.has(food.id)).length;
        return `<section class="group" aria-labelledby="group-${g.id}">
          <div class="group-head"><h2 id="group-${g.id}">${esc(g.label)}</h2><span class="num">${gTried}/${g.foods.length} tried</span></div>
          <div class="grid">${g.foods.map(tileHTML).join("")}</div>
        </section>`;
      })
      .join("");
}

// ---------- food sheet ----------

function factsHTML(food) {
  const facts = [];
  if (food.age == null) facts.push('<span class="fact fact-bad">Avoid for young children</span>');
  else facts.push(`<span class="fact${isWaiting(food) ? " fact-warn" : " fact-good"}">${esc(L.formatAgeRule(food))}</span>`);
  const choke = CHOKING[food.choking];
  facts.push(`<span class="fact ${food.choking === "high" ? "fact-bad" : food.choking === "prep" ? "fact-warn" : ""}">${esc(choke.label)}</span>`);
  if (food.iron) facts.push('<span class="fact fact-iron">Iron-rich</span>');
  for (const a of food.allergens) facts.push(`<span class="fact fact-warn">Allergen: ${esc(ALLERGEN_LABEL[a])}</span>`);
  return `<div class="facts">${facts.join("")}</div>`;
}

// One line near the top of a food's page: how it's going so far.
function statusLineHTML(food) {
  const s = app.summaries.get(food.id);
  if (!s) return loading() ? "<p>Loading your log…</p>" : loadError() ? "<p>Your log didn't load.</p>" : "";
  const pastReaction = s.status !== "reaction" && s.lastReactionDate;
  return `<span class="status-pill st-${s.status}">${MARK[s.status]}${esc(STATUS_LABEL[s.status])}</span>
    <span>Tried ${plural(s.count, "time")}, last on ${esc(fmtDate(s.lastDate))}</span>
    ${pastReaction ? `<span class="reaction-note">Reaction noted on ${esc(fmtDate(s.lastReactionDate))}</span>` : ""}`;
}

function historyHTML(food) {
  const logs = L.logsForFood(app.state, food.id).reverse();
  if (!logs.length) return "";
  return `<h3>Our tries</h3><ul class="history">${logs
    .map((log) => {
      const who = whoLogged(log);
      const details = [log.served && `Served: ${esc(log.served)}`, log.notes && esc(log.notes), who && `Logged by ${esc(who)}`].filter(Boolean);
      const reactions = (log.reactions || []).map((r) => REACTION_LABEL[r] || r);
      return `<li>
        <span class="when">${esc(fmtDate(log.date))} · ${esc(OUTCOME_LABEL[log.outcome])}</span>
        ${canWrite() ? `<button type="button" class="btn btn-small btn-quiet" data-action="edit-log" data-food="${food.id}" data-log="${esc(log.id)}">Edit</button>` : "<span></span>"}
        ${reactions.length ? `<p class="detail reaction-line">Reaction: ${esc(reactions.join(", "))}</p>` : ""}
        ${details.length ? `<p class="detail">${details.join(" · ")}</p>` : ""}
      </li>`;
    })
    .join("")}</ul>`;
}

// Pinned to the bottom of a food's page, so logging is always one tap away.
function sheetFootHTML(food) {
  if (!canWrite()) return "";
  const queued = !!app.state.queue[food.id];
  // Foods to avoid don't belong on a to-try list (unless already there).
  const queueButton =
    food.age != null || queued
      ? `<button type="button" class="btn" id="sheet-queue" data-action="queue" data-food="${food.id}" aria-pressed="${queued}">${ICON.bookmark}<span>${queued ? "On to-try list" : "To-try list"}</span></button>`
      : "";
  return `<footer class="sheet-foot">
    <button type="button" class="btn btn-primary" data-action="log" data-food="${food.id}">${ICON.plus}<span id="sheet-log-label">${app.summaries.has(food.id) ? "Log another try" : "Log a try"}</span></button>
    ${queueButton}
  </footer>`;
}

// Redraw the parts of an open food page that depend on the log.
function refreshSheetLog(food) {
  const status = $("#sheet-status", sheet);
  status.innerHTML = statusLineHTML(food);
  status.hidden = !status.innerHTML.trim();
  const history = $("#sheet-log", sheet);
  history.innerHTML = historyHTML(food);
  history.hidden = !history.innerHTML;
  const label = $("#sheet-log-label", sheet);
  if (label) label.textContent = app.summaries.has(food.id) ? "Log another try" : "Log a try";
  const queue = $("#sheet-queue", sheet);
  if (queue) {
    const queued = !!app.state.queue[food.id];
    queue.setAttribute("aria-pressed", String(queued));
    $("span", queue).textContent = queued ? "On to-try list" : "To-try list";
  }
}

function serveHTML(food) {
  if (food.age == null) return "";
  const months = babyMonths();
  const nowStage = L.stageForAge(months);
  const stage = app.stage || nowStage;
  const tabs = STAGES.map(
    (s) =>
      `<button type="button" role="tab" class="stage-btn" data-stage="${s.id}" aria-selected="${s.id === stage}" aria-controls="serve-panel">${esc(s.short)}${months != null && months >= 6 && s.id === nowStage ? '<span class="now">Now</span>' : ""}</button>`,
  ).join("");
  const st = STAGES.find((s) => s.id === stage);
  const next = STAGES[STAGES.indexOf(st) + 1];
  const tooEarly = food.age >= (next ? next.from : Infinity);
  let text = food.serve[stage];
  if (tooEarly || !text) text = `<strong>Not yet.</strong> ${esc(L.formatAgeRule(food))}.`;
  else text = esc(text);
  return `<section>
    <h3>How to serve it</h3>
    <div class="stages" role="tablist" aria-label="Age">${tabs}</div>
    <p class="serve-text" id="serve-panel" role="tabpanel">${text}</p>
  </section>`;
}

function renderSheet() {
  const food = FOODS_BY_ID.get(app.openFoodId);
  if (!food) return;
  const ssUrl = food.ss ? `https://solidstarts.com/foods/${encodeURIComponent(food.ss)}/` : null;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:solidstarts.com ${food.name} for babies`)}`;
  sheet.innerHTML = `
    <header class="sheet-head">
      <div class="big-tile" data-cat="${food.cat}" aria-hidden="true">${iconHTML(food)}</div>
      <div class="sheet-title">
        <p class="eyebrow">${esc(CAT_LABEL[food.cat])}</p>
        <h2 id="sheet-title" tabindex="-1">${esc(food.name)}</h2>
        ${food.aka.length ? `<p class="muted">Also: ${esc(food.aka.join(", "))}</p>` : ""}
      </div>
      <button type="button" class="sheet-close" data-action="close-sheet" aria-label="Close">${ICON.close}</button>
    </header>
    <div class="sheet-body">
      ${factsHTML(food)}
      ${food.wait ? `<div class="wait-box"><strong>${food.age == null ? "Avoid." : `Wait until ${esc(L.formatAgeRule(food).replace("From ", ""))}.`}</strong> ${esc(food.wait)}</div>` : ""}
      <div class="log-status" id="sheet-status" aria-label="Our log"></div>
      ${serveHTML(food)}
      ${food.tips.length ? `<section><h3>Good to know</h3><ul class="tips">${food.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
      <section id="sheet-log" aria-label="Our tries"></section>
      <div class="source-links">
        ${ssUrl ? `<a href="${ssUrl}" target="_blank" rel="noopener">Full guide on Solid Starts ↗</a>` : `<a href="${searchUrl}" target="_blank" rel="noopener">Search Solid Starts for ${esc(food.name.toLowerCase())} ↗</a>`}
      </div>
      <p class="disclaimer">General guidance only. Every baby is different; check with your pediatrician, especially about allergies.</p>
    </div>
    ${sheetFootHTML(food)}`;
  refreshSheetLog(food);
}

function showSheet(id) {
  if (app.openFoodId !== id) app.stage = null;
  app.openFoodId = id;
  renderSheet();
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
  $("#sheet-title", sheet).focus();
}

function hideSheet() {
  app.openFoodId = null;
  if (sheet.open) sheet.close();
}

function openFood(id) {
  app.pushedFood = true;
  location.hash = `food-${id}`;
}

function closeFood() {
  if (app.pushedFood && location.hash.startsWith("#food-")) {
    app.pushedFood = false;
    history.back();
  } else {
    location.replace(`#${app.view}`);
  }
}

// ---------- log dialog ----------

// A heads-up when logging a food that isn't recommended yet at this age.
function logWarningHTML(food) {
  if (food.age != null && !isWaiting(food)) return "";
  const reason = food.wait ? ` ${esc(food.wait)}` : "";
  if (food.age == null) return `<div class="wait-box"><strong>${esc(food.name)} is best avoided for young children.</strong>${reason}</div>`;
  const months = babyMonths();
  const age = months != null ? ` ${esc(babyName() || "Your baby")} is ${esc(L.formatAgeLong(months))}.` : "";
  return `<div class="wait-box"><strong>${esc(food.name)} isn't recommended until ${esc(L.formatAgeRule(food).replace("From ", ""))}.</strong>${age}${reason}</div>`;
}

// What the form holds now, to tell whether closing it would lose anything.
function logFormSnapshot() {
  const form = $("#log-form", logDialog);
  if (!form) return "";
  return JSON.stringify([...new FormData(form).entries(), $("#log-has-reaction", form).checked]);
}

function setLogDiscardBar(show) {
  $("#log-discard", logDialog).hidden = !show;
  $("#log-actions", logDialog).hidden = show;
  if (show) $("#log-error", logDialog).hidden = true;
  $(show ? '[data-action="keep-editing"]' : '[type="submit"]', logDialog).focus();
}

// Close the form, but ask first if that would throw away what was entered.
function requestCloseLog() {
  if (!logDialog.open) return;
  if (logFormSnapshot() === logDialog.dataset.initial) logDialog.close();
  else setLogDiscardBar(true);
}

function phoneOnlyNoteHTML() {
  if (!phoneOnly() || app.cloud.status === "loading") return "";
  return `<p class="form-note">${app.cloud.status === "signed-out" ? "You're signed out" : "Sync isn't connected"}, so this try will be saved on this phone only.</p>`;
}

// The quick way to log: one tap on a face saves today's try. Details open
// the full form in the same dialog.
function openQuickLog(foodId) {
  if (!canWrite()) return;
  const food = FOODS_BY_ID.get(foodId);
  logDialog.innerHTML = `
    <header class="sheet-head">
      <div class="big-tile big-tile-small" data-cat="${food.cat}" aria-hidden="true">${iconHTML(food)}</div>
      <div class="sheet-title"><p class="eyebrow">Log a try</p><h2 id="log-title" tabindex="-1">${esc(food.name)}</h2></div>
      <button type="button" class="sheet-close" data-action="close-log" aria-label="Close">${ICON.close}</button>
    </header>
    <div class="form">
      ${logWarningHTML(food)}
      ${phoneOnlyNoteHTML()}
      <fieldset class="field">
        <legend>How did it go today?</legend>
        <div class="face-row">
          ${OUTCOMES.map((o) => `<button type="button" class="face-btn" data-action="quick-save" data-outcome="${o.id}"><svg class="face-icon" aria-hidden="true" focusable="false"><use href="#ic-${o.icon}"></use></svg><span>${esc(o.label)}</span></button>`).join("")}
        </div>
      </fieldset>
      <div class="quick-more">
        <button type="button" class="btn btn-small" data-action="log-details">Add date, notes or how it was served</button>
        <button type="button" class="btn btn-small btn-danger" data-action="log-reaction">Noticed a reaction?</button>
      </div>
    </div>`;
  logDialog.dataset.food = foodId;
  logDialog.dataset.log = "";
  logDialog.dataset.initial = logFormSnapshot();
  if (!logDialog.open) logDialog.showModal();
  $("#log-title", logDialog).focus();
}

async function quickSave(button) {
  const foodId = logDialog.dataset.food;
  const outcome = button.dataset.outcome;
  const now = Date.now();
  for (const b of logDialog.querySelectorAll(".face-btn")) b.disabled = true;
  try {
    await app.store.saveLog({ id: L.newId(), foodId, date: L.todayISO(), outcome, reactions: [], served: "", notes: "", createdAt: now, updatedAt: now });
    logDialog.close();
    toast(`Saved: ${FOODS_BY_ID.get(foodId).name}, ${OUTCOME_LABEL[outcome].toLowerCase()}`);
  } catch (err) {
    for (const b of logDialog.querySelectorAll(".face-btn")) b.disabled = false;
    toast(describeStoreError(err));
  }
}

function openLogDialog(foodId, logId, { reaction = false } = {}) {
  if (!canWrite()) return;
  const food = FOODS_BY_ID.get(foodId);
  const existing = logId ? app.state.logs[logId] : null;
  const log = existing || { date: L.todayISO(), outcome: "", reactions: [], served: "", notes: "" };
  const hasReaction = reaction || (log.reactions || []).length > 0;
  logDialog.innerHTML = `
    <form class="log-form" id="log-form" novalidate>
      <header class="sheet-head">
        <div class="big-tile big-tile-small" data-cat="${food.cat}" aria-hidden="true">${iconHTML(food)}</div>
        <div class="sheet-title"><p class="eyebrow">${existing ? "Edit try" : "Log a try"}</p><h2 id="log-title" tabindex="-1">${esc(food.name)}</h2></div>
        <button type="button" class="sheet-close" data-action="close-log" aria-label="Close">${ICON.close}</button>
      </header>
      <div class="form">
        ${existing ? "" : logWarningHTML(food)}
        ${phoneOnlyNoteHTML()}
        <div class="field">
          <label for="log-date">Date</label>
          <input class="input" type="date" id="log-date" name="date" required max="${L.todayISO()}" value="${esc(log.date)}">
        </div>
        <fieldset class="field">
          <legend>How did it go?</legend>
          <div class="choice-row">
            ${OUTCOMES.map((o) => `<label class="choice"><input type="radio" name="outcome" value="${o.id}"${log.outcome === o.id ? " checked" : ""} required><span>${esc(o.label)}</span></label>`).join("")}
          </div>
        </fieldset>
        <div class="field">
          <label for="log-served">How was it served? <span class="muted">(optional)</span></label>
          <input class="input" id="log-served" name="served" maxlength="300" value="${esc(log.served)}" placeholder="e.g. steamed spears, mashed, on toast">
        </div>
        <fieldset class="field">
          <legend>Any signs of a reaction?</legend>
          <label class="check"><input type="checkbox" id="log-has-reaction"${hasReaction ? " checked" : ""}><span>Yes, we noticed something</span></label>
          <div class="checks" id="reaction-list"${hasReaction ? "" : " hidden"}>
            ${REACTIONS.map((r) => `<label class="check"><input type="checkbox" name="reactions" value="${r.id}"${(log.reactions || []).includes(r.id) ? " checked" : ""}><span>${esc(r.label)}</span></label>`).join("")}
            <p class="alert"><strong>Call emergency services</strong> for trouble breathing, swelling of the tongue or throat, repeated vomiting, or if baby seems pale, floppy or unusually sleepy. For milder symptoms, stop offering the food and call your pediatrician.</p>
          </div>
        </fieldset>
        <div class="field">
          <label for="log-notes">Notes <span class="muted">(optional)</span></label>
          <textarea class="input" id="log-notes" name="notes" maxlength="2000" placeholder="Faces, gagging, how much they ate, what to try next time…">${esc(log.notes)}</textarea>
        </div>
      </div>
      <footer class="form-foot">
        <p class="alert" id="log-error" role="alert" hidden></p>
        <div class="form-actions" id="log-actions">
          ${existing ? `<button type="button" class="btn btn-danger" data-action="delete-log" data-log="${esc(existing.id)}">Delete</button><span class="spacer"></span>` : ""}
          <button type="button" class="btn btn-quiet" data-action="close-log">Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? "Save changes" : "Save try"}</button>
        </div>
        <div class="discard-bar" id="log-discard" hidden>
          <p><strong>Discard ${existing ? "your changes" : "this try"}?</strong> What you've entered won't be saved.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-quiet" data-action="keep-editing">Keep editing</button>
            <button type="button" class="btn btn-danger" data-action="discard-log">Discard</button>
          </div>
        </div>
      </footer>
    </form>`;
  logDialog.dataset.food = foodId;
  logDialog.dataset.log = existing ? existing.id : "";
  logDialog.dataset.initial = logFormSnapshot();
  if (!logDialog.open) logDialog.showModal();
  $("#log-title", logDialog).focus();
}

// Show the error in the pinned footer and bring the field to fix into view.
function showLogError(message, field) {
  const el = $("#log-error", logDialog);
  if (!el) return toast(message);
  el.textContent = message;
  el.hidden = false;
  if (field) {
    field.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    field.focus({ preventScroll: true });
  }
}

async function submitLog(form) {
  const data = new FormData(form);
  const outcome = data.get("outcome");
  const date = data.get("date");
  const dateInput = $("#log-date", form);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return showLogError("Pick the date of this try.", dateInput);
  if (date > L.todayISO()) return showLogError("That date is in the future.", dateInput);
  if (!outcome) return showLogError("Choose how it went.", $('[name="outcome"]', form));
  const hasReaction = $("#log-has-reaction", form).checked;
  let reactions = hasReaction ? data.getAll("reactions") : [];
  if (hasReaction && !reactions.length) reactions = ["other"];
  const foodId = logDialog.dataset.food;
  const existing = logDialog.dataset.log ? app.state.logs[logDialog.dataset.log] : null;
  const now = Date.now();
  const log = {
    ...(existing || {}),
    id: existing ? existing.id : L.newId(),
    foodId,
    date,
    outcome,
    reactions,
    served: String(data.get("served") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await app.store.saveLog(log);
    logDialog.close();
    const food = FOODS_BY_ID.get(foodId);
    toast(reactions.length ? `Saved ${food.name} with a reaction noted` : `Saved: ${food.name}, ${OUTCOME_LABEL[outcome].toLowerCase()}`);
  } catch (err) {
    showLogError(describeStoreError(err));
  } finally {
    submit.disabled = false;
  }
}

let deleteArmed = null;
async function deleteLog(button) {
  const id = button.dataset.log;
  if (deleteArmed !== id) {
    deleteArmed = id;
    button.textContent = "Tap again to delete";
    setTimeout(() => {
      if (deleteArmed === id) {
        deleteArmed = null;
        if (button.isConnected) button.textContent = "Delete";
      }
    }, 4000);
    return;
  }
  deleteArmed = null;
  try {
    await app.store.deleteLog(id);
    logDialog.close();
    toast("Deleted that try");
  } catch (err) {
    showLogError(describeStoreError(err));
  }
}

async function toggleQueue(foodId) {
  const on = !app.state.queue[foodId];
  try {
    await app.store.setQueued(foodId, on);
    toast(on ? `Added ${FOODS_BY_ID.get(foodId).name} to your to-try list` : "Removed from your to-try list");
  } catch (err) {
    toast(describeStoreError(err));
  }
}

// ---------- progress view ----------

function renderProgress() {
  const name = babyName();
  const months = babyMonths();
  const tried = app.summaries.size;
  const target = goal();
  const pct = Math.min(100, Math.round((tried / target) * 100));
  const all = [...app.summaries.values()];
  const totalTries = all.reduce((n, s) => n + s.count, 0);
  const liked = all.filter((s) => s.status === "liked").length;
  const learning = all.filter((s) => s.status === "learning").length;
  const reactions = all.filter((s) => s.status === "reaction").length;
  const beforeOne = L.triedBeforeFirstBirthday(app.summaries, app.state.profile.birthDate);
  const allergens = L.allergenProgress(FOODS, app.summaries);
  const introduced = allergens.filter((a) => a.state !== "new").length;
  const due = allergens.filter((a) => a.state === "due").length;
  const cats = L.categoryProgress(FOODS, app.summaries);
  const queue = Object.values(app.state.queue)
    .sort((a, b) => a.addedAt - b.addedAt)
    .map((q) => FOODS_BY_ID.get(q.foodId))
    .filter(Boolean);
  const recent = Object.values(app.state.logs)
    .sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1))
    .slice(0, 20);

  const allergenRows = allergens
    .map((a) => {
      const stateLabel = { new: "Not yet", ok: "In the diet", due: "Offer again", reaction: "Reaction" }[a.state];
      let sub;
      if (a.state === "new") {
        sub = `Try: ${ALLERGEN_STARTERS[a.id]}`;
      } else {
        sub = `Last offered ${relDays(a.daysSince)} · ${a.tried.map((f) => f.name).join(", ")}`;
      }
      return `<li><button type="button" data-goto-allergen="${a.id}" aria-label="Show foods with ${esc(a.label.toLowerCase())}">
        <span class="name">${esc(a.label)}</span><span class="state state-${a.state}">${stateLabel}</span><span class="sub">${esc(sub)}</span>
      </button></li>`;
    })
    .join("");

  const activity = recent.length
    ? `<ul class="activity">${recent
        .map((log) => {
          const food = FOODS_BY_ID.get(log.foodId);
          const who = whoLogged(log);
          const bits = [OUTCOME_LABEL[log.outcome], log.reactions?.length ? "reaction noted" : "", log.served, who && `by ${who}`].filter(Boolean);
          return `<li>
            <button type="button" class="mini-tile" data-cat="${food.cat}" data-open="${food.id}" aria-label="Open ${esc(food.name)}">${iconHTML(food)}</button>
            <div class="what"><a href="#food-${food.id}" data-open="${food.id}">${esc(food.name)}</a><div class="sub">${esc(bits.join(" · "))}</div></div>
            <span class="date">${esc(fmtDate(log.date))}</span>
          </li>`;
        })
        .join("")}</ul>`
    : `<div class="empty"><strong>Nothing logged yet</strong>Open any food and tap “Log a try” after a meal. Your history will show up here for both of you.</div>`;

  main.innerHTML = `
    <div class="page-head">
      <div>
        <h1>${name ? `${esc(name)}'s progress` : "Progress"}</h1>
        <p class="muted">${months != null ? `${esc(name || "Baby")} is ${esc(L.formatAgeLong(months))} old. ` : ""}${loading() ? "Loading your tracker…" : loadError() ? "" : `${plural(totalTries, "try", "tries")} logged so far.`}</p>
      </div>
    </div>
    ${statusNoticesHTML()}
    <div class="dash">
      <section class="panel">
        <div class="panel-head"><h2>Foods tried</h2><a href="#setup" class="muted" style="font-size:var(--step--1)">Goal: ${target}</a></div>
        <div class="hero-count"><span class="big">${tried}</span><span class="muted">of ${target} foods${pct >= 100 ? " · goal reached!" : ""}</span></div>
        <div class="meter" role="img" aria-label="${tried} of ${target} foods tried"><span style="width:${pct}%"></span></div>
        ${beforeOne != null && months != null && months >= 12 && months < 24 ? `<p class="muted"><span class="num">${beforeOne}</span> first tried before the first birthday.</p>` : ""}
        <div class="stat-row">
          <div class="stat"><b>${liked}</b><span>Liked</span></div>
          <div class="stat"><b>${learning}</b><span>Still learning</span></div>
          <div class="stat"><b>${reactions}</b><span>${reactions === 1 ? "Reaction" : "Reactions"}</span></div>
          <div class="stat"><b>${introduced}/9</b><span>Allergens</span></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Common allergens</h2><span class="muted" style="font-size:var(--step--1)">${due ? `${due} to offer again` : `Keep each in the diet weekly`}</span></div>
        <ul class="allergen-list">${allergenRows}</ul>
        <p class="muted" style="font-size:var(--step--1)">“Offer again” means it hasn't been logged in over ${ALLERGEN_DUE_DAYS} days.</p>
      </section>
      <section class="panel">
        <h2>To try next</h2>
        ${queue.length ? `<div class="queue-list">${queue.map((f) => `<a class="queue-item" href="#food-${f.id}" data-open="${f.id}"><span class="mini-tile" data-cat="${f.cat}" aria-hidden="true">${iconHTML(f)}</span>${esc(f.name)}</a>`).join("")}</div>` : `<p class="muted">Add foods to this list from any food's page, so you both know what's coming up.</p>`}
      </section>
      <section class="panel">
        <h2>By category</h2>
        <div class="bars">${cats
          .map((c) => `<div class="bar-row" data-cat="${c.id}"><span>${esc(c.label)}</span><div class="meter" aria-hidden="true"><span style="width:${c.total ? Math.round((c.tried / c.total) * 100) : 0}%"></span></div><span class="num">${c.tried}/${c.total}</span></div>`)
          .join("")}</div>
      </section>
      <section class="panel span-2">
        <h2>Recent tries</h2>
        ${activity}
      </section>
    </div>`;
}

// ---------- guide view ----------

function renderGuide() {
  main.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Starting solids guide</h1>
        <p class="muted">The essentials, in one place. Read it together before the first meal.</p>
      </div>
    </div>
    <div class="guide-layout">
      <nav class="toc" aria-label="Guide sections"><ol>${GUIDE.map((s) => `<li><a href="#guide" data-jump="guide-${s.id}">${esc(s.title)}</a></li>`).join("")}<li><a href="#guide" data-jump="guide-sources">Sources</a></li></ol></nav>
      <div class="guide-sections">
        ${GUIDE.map(
          (s) => `<section class="guide-section" id="guide-${s.id}">
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.intro)}</p>
            ${s.items ? `<ul class="guide-items">${s.items.map((i) => `<li>${i.title ? `<strong>${esc(i.title)}</strong>` : ""}${esc(i.text)}</li>`).join("")}</ul>` : ""}
            ${s.note ? `<p class="guide-note">${esc(s.note)}</p>` : ""}
          </section>`,
        ).join("")}
        <section class="guide-section" id="guide-sources">
          <h2>Sources and further reading</h2>
          <p>The food notes in this app are general guidance written for this app, based on widely published advice from pediatric and public-health bodies. For each food, follow the link to Solid Starts for their detailed guide, photos and videos.</p>
          <ul class="guide-items">
            <li><strong>Solid Starts First Foods database</strong><a href="https://solidstarts.com/foods/" target="_blank" rel="noopener">solidstarts.com/foods ↗</a></li>
            <li><strong>American Academy of Pediatrics</strong><a href="https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx" target="_blank" rel="noopener">Starting solid foods ↗</a></li>
            <li><strong>NHS Start for Life</strong><a href="https://www.nhs.uk/start-for-life/baby/weaning/" target="_blank" rel="noopener">Weaning ↗</a></li>
            <li><strong>US FDA</strong><a href="https://www.fda.gov/food/consumers/advice-about-eating-fish" target="_blank" rel="noopener">Advice about eating fish ↗</a></li>
          </ul>
          <p class="guide-note">Food icons: Fluent Emoji by Microsoft (MIT License), some recolored.</p>
          <p class="guide-note">This app is not medical advice. Talk to your pediatrician about your baby's readiness, allergy risk and any concerns.</p>
        </section>
      </div>
    </div>`;
}

// ---------- setup view ----------

function syncHTML() {
  const store = app.store;
  if (!store) return `<div class="sync-state"><span class="sync-dot"></span><p>Connecting…</p></div>`;
  if (store.mode === "shared") {
    const who = store.viewer && store.viewer.name;
    return `<div class="sync-state"><span class="sync-dot is-shared"></span><div>
      <p><strong>Shared tracker.</strong> Everyone with edit access to this page sees the same log, updated live. ${who ? `You're signed in as ${esc(who)}.` : ""}</p>
      ${store.canWrite ? "" : `<p class="muted">You have view-only access. Ask the owner to make you an editor so you can log tries too.</p>`}
      <p class="muted">To add your partner, use the Share menu on this page and invite them by email as an editor.</p>
    </div></div>`;
  }
  if (store.mode === "cloud") {
    const unsynced = unsyncedLocalIds().length;
    const error = loadError();
    if (error) {
      return `<div class="sync-state"><span class="sync-dot"></span><div>
        <p><strong>Your shared log didn't load.</strong> ${esc(error)} Signed in as ${esc(store.email)}.</p>
        <div class="button-row">
          <button type="button" class="btn btn-small btn-primary" data-action="retry-store">Try again</button>
          <button type="button" class="btn btn-small" data-action="sign-out">Sign out</button>
        </div>
      </div></div>`;
    }
    return `<div class="sync-state"><span class="sync-dot is-shared"></span><div>
      <p><strong>Synced between your phones.</strong> Signed in as ${esc(store.email)}. Tries either of you log show up on both phones within seconds.</p>
      <p class="muted">${store.pendingWrites ? "Some changes are waiting for a connection and will sync automatically." : "It works offline too, and catches up when you're back online."}</p>
      ${unsynced ? `<p>This phone also has ${plural(unsynced, "try", "tries")} logged while you were signed out.</p>` : ""}
      <div class="button-row">
        ${unsynced ? `<button type="button" class="btn btn-small btn-primary" data-action="copy-local">Move them to the shared log</button>` : ""}
        <button type="button" class="btn btn-small" data-action="sign-out">Sign out</button>
      </div>
    </div></div>`;
  }
  if (app.syncConfigError && !window.claude) {
    return `<div class="sync-state"><span class="sync-dot"></span><div>
      <p><strong>Syncing is off.</strong> ${esc(app.syncConfigError)}</p>
      <p class="muted">Tries are being saved on this phone for now.</p>
    </div></div>`;
  }
  if (app.syncConfig && !window.claude) {
    if (app.cloud.status === "loading") return `<div class="sync-state"><span class="sync-dot"></span><p>Connecting to sync…</p></div>`;
    if (app.cloud.status === "error") {
      return `<div class="sync-state"><span class="sync-dot"></span><div>
        <p><strong>Syncing isn't available right now.</strong> ${esc(app.cloud.message)}</p>
        <p class="muted">Tries are being saved on this phone until it can connect.</p>
        <div class="button-row"><button type="button" class="btn btn-small" data-action="retry-cloud">Try again</button></div>
      </div></div>`;
    }
    return `<div class="sync-state"><span class="sync-dot"></span><div>
      <p><strong>Sign in to sync with your partner.</strong> Until you do, tries are saved on this phone only.</p>
      <form class="form form-inline" id="signin-form" novalidate>
        <div class="field"><label for="signin-email">Email</label><input class="input" id="signin-email" name="email" type="email" autocomplete="username" required></div>
        <div class="field"><label for="signin-password">Password</label><input class="input" id="signin-password" name="password" type="password" autocomplete="current-password" required></div>
        <p class="alert" id="signin-error" role="alert" hidden></p>
        <div class="button-row">
          <button type="submit" class="btn btn-primary">Sign in</button>
          <button type="button" class="btn btn-quiet" data-action="reset-password">Forgot password?</button>
        </div>
      </form>
    </div></div>`;
  }
  return `<div class="sync-state"><span class="sync-dot"></span><div>
      <p><strong>Saved on this device.</strong> ${store.persisted ? "Your log stays in this browser, even offline." : "This browser is blocking storage (private mode?), so your log will be lost when you close it."}</p>
      <p class="muted">To share with your partner's phone:</p>
      <ol class="steps muted">
        <li>Tap <strong>Export backup</strong> below and send the file to them.</li>
        <li>They open First Bites and tap <strong>Import backup</strong>.</li>
        <li>Imports merge entries, so you can swap backups back and forth without losing anything.</li>
      </ol>
      <p class="muted">For automatic syncing between phones, see “Syncing between your phones” in the app's README.</p>
    </div></div>`;
}

function renderSetup() {
  const p = app.state.profile;
  const local = app.store && app.store.mode === "local";
  const ownDevice = app.store && app.store.mode !== "shared";
  const disabled = canWrite() ? "" : " disabled";
  main.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Baby &amp; sharing</h1>
        <p class="muted">Details here tailor the serving tips to your baby's age.</p>
      </div>
    </div>
    <div class="setup">
      <section class="panel">
        <h2>Your baby</h2>
        <div class="field-row">
          <div class="field">
            <label for="baby-name">Name</label>
            <input class="input" id="baby-name" data-profile="babyName" maxlength="60" value="${esc(p.babyName)}" autocomplete="off"${disabled}>
          </div>
          <div class="field">
            <label for="baby-birth">Birth date</label>
            <input class="input" id="baby-birth" type="date" data-profile="birthDate" max="${L.todayISO()}" value="${esc(p.birthDate)}"${disabled}>
          </div>
        </div>
        <div class="field">
          <label for="baby-goal">Foods goal</label>
          <input class="input" id="baby-goal" type="number" min="1" max="1000" inputmode="numeric" data-profile="goal" value="${esc(p.goal || DEFAULT_GOAL)}" style="max-width:10rem"${disabled}>
          <span class="hint">Many families aim for 100 different foods before the first birthday.</span>
        </div>
        ${ownDevice ? `<div class="field">
          <label for="device-name">Your name on this device</label>
          <input class="input" id="device-name" maxlength="60" value="${esc(getDeviceName())}" placeholder="e.g. Mum, Dad, Alex" autocomplete="off">
          <span class="hint">Shown next to the tries you log, so you can tell who logged what.</span>
        </div>` : ""}
      </section>
      <section class="panel">
        <h2>Sharing with your partner</h2>
        <div id="sync-box">${syncHTML()}</div>
      </section>
      <section class="panel">
        <h2>Backup</h2>
        <p class="muted">A backup holds your baby's details, every logged try and your to-try list.</p>
        <div class="button-row">
          <button type="button" class="btn" data-action="export">Export backup</button>
          ${canWrite() ? `<label class="btn" for="import-file">Import backup</label><input type="file" id="import-file" accept="application/json,.json" class="visually-hidden">
          <button type="button" class="btn btn-quiet" data-action="paste-toggle">Paste backup text</button>` : ""}
        </div>
        <p class="alert" id="backup-error" role="alert" hidden></p>
        <div class="field" id="paste-box" hidden>
          <label for="paste-text">Paste the backup text</label>
          <textarea class="input" id="paste-text" placeholder='{"app":"first-bites", …}'></textarea>
          <div class="button-row"><button type="button" class="btn btn-primary btn-small" data-action="paste-import">Import</button></div>
        </div>
        <div class="field" id="export-box" hidden>
          <label for="export-text">Backup text (copy it and send it to your partner)</label>
          <textarea class="input" id="export-text" readonly></textarea>
        </div>
      </section>
      ${ownDevice && !install.standalone ? `<section class="panel">
        <h2>Install on your phone</h2>
        <div id="install-box">${installHTML()}</div>
      </section>` : ""}
      ${canWrite() ? `<section class="panel">
        <h2>Start over</h2>
        <p class="muted">Deletes every logged try, the to-try list and your baby's details${local ? " from this phone" : " for both of you"}.</p>
        <div class="button-row"><button type="button" class="btn btn-danger" data-action="clear-all" aria-expanded="false" aria-controls="clear-box">Delete all data…</button></div>
        <div class="danger-box" id="clear-box" hidden>
          <p id="clear-what"></p>
          <div class="button-row"><button type="button" class="btn btn-small" data-action="export">Export a backup first</button></div>
          <div class="field">
            <label for="clear-confirm">Type DELETE to confirm</label>
            <input class="input" id="clear-confirm" autocomplete="off" autocapitalize="characters" spellcheck="false" style="max-width:14rem">
          </div>
          <div class="button-row">
            <button type="button" class="btn btn-danger" data-action="clear-all-confirm" disabled>Delete everything</button>
            <button type="button" class="btn btn-quiet" data-action="clear-cancel">Cancel</button>
          </div>
        </div>
      </section>` : ""}
    </div>`;
}

function refreshSetup() {
  const box = $("#sync-box");
  // Don't wipe the sign-in form while someone is typing in it.
  const typing = box && box.contains(document.activeElement) && $("#signin-form", box) && app.store.mode === "local";
  if (box && !typing) box.innerHTML = syncHTML();
  for (const input of document.querySelectorAll("[data-profile]")) {
    if (document.activeElement === input) continue;
    const key = input.dataset.profile;
    const value = app.state.profile[key];
    input.value = value ?? (key === "goal" ? DEFAULT_GOAL : "");
  }
}

async function saveProfileField(input) {
  const key = input.dataset.profile;
  let value = input.value.trim();
  if (key === "goal") {
    value = parseInt(value, 10);
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      input.value = goal();
      return;
    }
  }
  if (key === "birthDate" && value && (value > L.todayISO() || !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
    toast("Pick a birth date in the past.");
    return;
  }
  if (app.state.profile[key] === value) return;
  try {
    await app.store.setProfile({ [key]: value });
    toast("Saved");
  } catch (err) {
    toast(describeStoreError(err));
  }
}

async function exportBackup() {
  const backup = L.makeBackup(app.state);
  const text = JSON.stringify(backup, null, 2);
  const filename = `first-bites-backup-${L.todayISO()}.json`;
  const claude = window.claude;
  if (claude && typeof claude.use === "function") {
    const downloads = await claude.use("downloads").catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename, data: text });
        toast("Backup saved");
        return;
      } catch (err) {
        if (err && err.code === "declined") return;
      }
    }
    showExportText(text);
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded");
  } catch {
    showExportText(text);
  }
}

async function showExportText(text) {
  const box = $("#export-box");
  const area = $("#export-text");
  if (!box || !area) return;
  area.value = text;
  box.hidden = false;
  area.focus();
  area.select();
  try {
    await navigator.clipboard.writeText(text);
    toast("Backup copied to the clipboard");
  } catch {
    toast("Copy the backup text below");
  }
}

function showBackupError(message) {
  const el = $("#backup-error");
  if (!el) return toast(message);
  el.textContent = message;
  el.hidden = !message;
}

// Returns true when the backup was read and merged.
async function importText(text) {
  showBackupError("");
  if (!text.trim()) {
    showBackupError("Paste the backup text first.");
    return false;
  }
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    showBackupError("That doesn't look like a First Bites backup. Choose the .json file you exported, or paste its full text.");
    return false;
  }
  try {
    const { added, updated } = await app.store.importBackup(backup);
    toast(added || updated ? `Imported ${plural(added, "new try", "new tries")}${updated ? `, updated ${updated}` : ""}` : "Already up to date: nothing new in that backup");
    return true;
  } catch (err) {
    showBackupError(err && err.code ? describeStoreError(err) : err.message);
    return false;
  }
}

function importFile(file) {
  showBackupError("");
  if (file.size > 5_000_000) return showBackupError("That file is too big to be a First Bites backup.");
  file.text().then(importText, () => showBackupError("Couldn't read that file. Try exporting the backup again."));
}

function toggleClearBox(open) {
  const box = $("#clear-box");
  if (!box) return;
  box.hidden = !open;
  $('[data-action="clear-all"]').setAttribute("aria-expanded", String(open));
  $("#clear-confirm").value = "";
  $('[data-action="clear-all-confirm"]').disabled = true;
  if (!open) return;
  const tries = Object.keys(app.state.logs).length;
  const queued = Object.keys(app.state.queue).length;
  const what = [plural(tries, "logged try", "logged tries"), queued ? `${plural(queued, "food")} on the to-try list` : "", "your baby's details"].filter(Boolean);
  const where = app.store.mode === "local" ? "from this phone" : "from the shared log, so they'll disappear from your partner's phone too";
  $("#clear-what").innerHTML = `<strong>This can't be undone.</strong> It deletes ${esc(what.slice(0, -1).join(", "))} and ${esc(what[what.length - 1])} ${esc(where)}.`;
  $("#clear-confirm").focus();
}

async function clearAll() {
  if ($("#clear-confirm").value.trim().toUpperCase() !== "DELETE") return;
  try {
    await app.store.clearAll();
    toggleClearBox(false);
    toast("All data deleted");
  } catch (err) {
    toast(describeStoreError(err));
  }
}

// ---------- routing & refresh ----------

function renderView() {
  if (app.view === "foods") renderFoods();
  else if (app.view === "progress") renderProgress();
  else if (app.view === "guide") renderGuide();
  else renderSetup();
}

function route() {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith("food-")) {
    const id = hash.slice(5);
    if (FOODS_BY_ID.has(id)) {
      if (!main.hasChildNodes()) {
        renderChrome();
        renderView();
      }
      showSheet(id);
      return;
    }
  }
  hideSheet();
  const view = VIEWS.includes(hash) ? hash : "foods";
  if (view !== app.view || !main.hasChildNodes()) {
    app.view = view;
    renderChrome();
    renderView();
    window.scrollTo(0, 0);
  }
}

function refresh() {
  renderChrome();
  if (app.view === "foods") {
    const notices = $("#status-notices");
    if (notices) notices.innerHTML = statusNoticesHTML();
    renderFoodResults();
    if (filterSheet.open) updateFilterDone();
  } else if (app.view === "progress") renderProgress();
  else if (app.view === "setup") refreshSetup();
  if (app.openFoodId && sheet.open) refreshSheetLog(FOODS_BY_ID.get(app.openFoodId));
}

// Resolve the people named on shared log entries.
async function resolveNames() {
  if (!app.store || app.store.mode !== "shared") return;
  const ids = [...new Set(Object.values(app.state.logs).map((l) => l.by).filter(Boolean))];
  const missing = ids.filter((id) => !(id in app.names));
  if (!missing.length) return;
  const profiles = await app.store.profiles(ids);
  let changed = false;
  for (const id of ids) {
    const name = (profiles[id] && profiles[id].name) || "";
    if (app.names[id] !== name) {
      app.names[id] = name;
      changed = true;
    }
  }
  if (changed) refresh();
}

// ---------- events ----------

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action],[data-open],[data-status],[data-stage],[data-goto-allergen],[data-jump]");
  if (!t) return;
  if (t.dataset.open) {
    e.preventDefault();
    if (logDialog.open) logDialog.close();
    openFood(t.dataset.open);
    return;
  }
  if (t.dataset.status) {
    app.filters.status = t.dataset.status;
    renderFoodResults();
    return;
  }
  if (t.dataset.stage) {
    app.stage = t.dataset.stage;
    renderSheet();
    $(`[data-stage="${app.stage}"]`, sheet)?.focus();
    return;
  }
  if (t.dataset.gotoAllergen) {
    app.filters = { ...app.filters, allergen: t.dataset.gotoAllergen, status: "all", cat: "all", flag: "all", q: "" };
    if (app.view === "foods") renderFoods();
    location.hash = "foods";
    return;
  }
  if (t.dataset.jump) {
    e.preventDefault();
    document.getElementById(t.dataset.jump)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return;
  }
  switch (t.dataset.action) {
    case "log":
      openQuickLog(t.dataset.food);
      break;
    case "quick-save":
      quickSave(t);
      break;
    case "log-details":
      openLogDialog(logDialog.dataset.food);
      break;
    case "log-reaction":
      openLogDialog(logDialog.dataset.food, null, { reaction: true });
      break;
    case "open-filters":
      openFilters();
      break;
    case "close-filters":
      filterSheet.close();
      break;
    case "reset-filters":
      for (const key of FILTER_KEYS) app.filters[key] = "all";
      renderFilterSheet();
      renderFoodResults();
      break;
    case "clear-filter":
      app.filters[t.dataset.key] = "all";
      renderFoodResults();
      ($("#active-filters button") || $("#filter-btn")).focus();
      break;
    case "edit-log":
      openLogDialog(t.dataset.food, t.dataset.log);
      break;
    case "close-log":
      requestCloseLog();
      break;
    case "keep-editing":
      setLogDiscardBar(false);
      break;
    case "discard-log":
      logDialog.close();
      break;
    case "delete-log":
      deleteLog(t);
      break;
    case "queue":
      toggleQueue(t.dataset.food);
      break;
    case "close-sheet":
      closeFood();
      break;
    case "clear-filters":
      app.filters = { ...app.filters, q: "", status: "all", cat: "all", allergen: "all", flag: "all" };
      renderFoods();
      break;
    case "export":
      exportBackup();
      break;
    case "paste-toggle":
      $("#paste-box").hidden = !$("#paste-box").hidden;
      if (!$("#paste-box").hidden) $("#paste-text").focus();
      break;
    case "paste-import":
      importText($("#paste-text").value).then((ok) => ok && ($("#paste-text").value = ""));
      break;
    case "clear-all":
      toggleClearBox($("#clear-box").hidden);
      break;
    case "clear-cancel":
      toggleClearBox(false);
      break;
    case "clear-all-confirm":
      clearAll();
      break;
    case "sign-out":
      app.cloudApi?.signOut().then(() => toast("Signed out. New tries will be saved on this phone only."));
      break;
    case "reset-password":
      resetPassword();
      break;
    case "copy-local":
      copyLocalToCloud();
      break;
    case "retry-cloud":
      startCloud();
      break;
    case "retry-store":
      if (app.store.restart) {
        app.store.restart();
        refresh();
      } else location.reload();
      break;
    case "install":
      promptInstall();
      break;
    case "install-dismiss":
      try {
        localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
      } catch {
        // Storage blocked: the notice just comes back next time.
      }
      refreshInstallUI();
      break;
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "food-search") {
    app.filters.q = e.target.value;
    renderFoodResults();
  } else if (e.target.id === "clear-confirm") {
    $('[data-action="clear-all-confirm"]').disabled = e.target.value.trim().toUpperCase() !== "DELETE";
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.name && t.name.startsWith("f-")) {
    app.filters[t.name.slice(2)] = t.value;
    renderFoodResults();
    updateFilterDone();
    return;
  }
  if (t.dataset.profile) {
    saveProfileField(t);
  } else if (t.id === "device-name") {
    setDeviceName(t.value.trim());
    toast("Saved");
  } else if (t.id === "log-has-reaction") {
    $("#reaction-list", logDialog).hidden = !t.checked;
  } else if (t.id === "import-file") {
    const file = t.files && t.files[0];
    if (file) importFile(file);
    t.value = "";
  } else if (t.form && t.form.id === "log-form") {
    $("#log-error", logDialog).hidden = true;
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id === "log-form") {
    e.preventDefault();
    submitLog(e.target);
  } else if (e.target.id === "signin-form") {
    e.preventDefault();
    signIn(e.target);
  }
});

sheet.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeFood();
});

sheet.addEventListener("click", (e) => {
  if (e.target === sheet) closeFood();
});

// Escape, the Android back gesture and taps outside the form all ask before
// throwing away what's been entered.
logDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  requestCloseLog();
});

logDialog.addEventListener("click", (e) => {
  if (e.target === logDialog) requestCloseLog();
});

filterSheet.addEventListener("click", (e) => {
  if (e.target === filterSheet) filterSheet.close();
});

window.addEventListener("hashchange", route);

// ---------- boot ----------

// ---------- install to home screen ----------

// Chrome offers installing through the beforeinstallprompt event. Keep it and
// show our own button, since the browser menu option moves between versions.
const install = {
  prompt: null,
  standalone: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
};
const INSTALL_DISMISSED_KEY = "first-bites:install-dismissed";

function installDismissed() {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

// Steps for the browser in use, for when it doesn't offer its own prompt.
function installSteps() {
  const ua = navigator.userAgent;
  const android = /android/i.test(ua);
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "Tap the Share button (the square with an arrow), then <strong>Add to Home Screen</strong>.";
  }
  if (/firefox|fxios/i.test(ua)) {
    return android
      ? "Tap the menu button (⋮), then <strong>Add app to Home screen</strong> or <strong>Add to Home screen</strong>."
      : "Firefox on a computer can't install apps like this. Bookmark this page, or open it in Chrome or Edge to install it.";
  }
  if (/samsungbrowser/i.test(ua)) return "Tap the menu button (☰), then <strong>Add page to</strong> and <strong>Home screen</strong>.";
  if (android) {
    return "Tap the menu button (⋮), then <strong>Add to home screen</strong> or <strong>Install app</strong>. If neither is there, open this page in Firefox and add it from its menu.";
  }
  return "Click the install icon at the right of the address bar, or open the browser menu and choose <strong>Install First Bites</strong>.";
}

function installHTML() {
  if (install.prompt) {
    return `<p class="muted">Add First Bites to your home screen. It opens like a normal app and works offline.</p>
      <div class="button-row"><button type="button" class="btn btn-primary" data-action="install">Install First Bites</button></div>`;
  }
  return `<p class="muted">${installSteps()} It opens like a normal app and works offline.</p>`;
}

function installNoticeHTML() {
  if (!install.prompt || install.standalone || installDismissed()) return "";
  return `<div class="notice"><p>Install First Bites on your home screen for one-tap access, even offline.</p>
    <div class="button-row"><button type="button" class="btn btn-small btn-primary" data-action="install">Install</button><button type="button" class="btn btn-small btn-quiet" data-action="install-dismiss">Not now</button></div></div>`;
}

function refreshInstallUI() {
  const box = $("#install-box");
  if (box) box.innerHTML = installHTML();
  const notice = $("#install-notice");
  if (notice) notice.innerHTML = installNoticeHTML();
}

async function promptInstall() {
  const event = install.prompt;
  if (!event) return;
  install.prompt = null;
  event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") toast("Installing First Bites…");
  refreshInstallUI();
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  install.prompt = e;
  refreshInstallUI();
});

window.addEventListener("appinstalled", () => {
  install.prompt = null;
  refreshInstallUI();
  toast("Installed. Open First Bites from your home screen.");
});

function registerServiceWorker() {
  if (window.claude || !("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  // When a newer version of the app takes over, reload once so this page
  // isn't left running the old files.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Switch the app to a different store (e.g. after signing in to sync).
function attachStore(store) {
  if (app.unsubscribe) app.unsubscribe();
  if (app.store && app.store !== store && app.store.dispose) app.store.dispose();
  app.store = store;
  store.onError = (err) => toast(describeStoreError(err));
  if (store.start && store.mode === "cloud") store.start();
  app.unsubscribe = store.subscribe((state) => {
    // Same data with a new sync status (e.g. a write reached the server):
    // only the Baby tab's sync note needs redrawing.
    if (state === app.state && !store.error) {
      if (app.view === "setup") refreshSetup();
      return;
    }
    app.state = state;
    app.summaries = L.summarizeAll(state);
    refresh();
    resolveNames();
  });
  if (app.view === "setup") renderSetup();
}

// Firebase sync for the GitHub Pages version (see js/sync-config.js).
async function startCloud() {
  app.cloud = { status: "loading" };
  if (app.view === "setup") refreshSetup();
  try {
    const cloud = await loadCloud(app.syncConfig);
    app.cloudApi = cloud;
    cloud.onUser((user) => {
      if (user) {
        if (!(app.store.mode === "cloud" && app.store.user.uid === user.uid)) attachStore(new CloudStore(cloud, user, KNOWN_IDS));
        app.cloud = { status: "signed-in" };
      } else {
        if (app.store.mode === "cloud") attachStore(new LocalStore(KNOWN_IDS));
        app.cloud = { status: "signed-out" };
      }
      refresh();
    });
  } catch (err) {
    app.cloud = { status: "error", message: navigator.onLine ? "The sync service couldn't be loaded." : "You're offline." };
    refresh();
  }
}

async function signIn(form) {
  const email = form.email.value.trim();
  const password = form.password.value;
  const error = $("#signin-error");
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  error.hidden = true;
  try {
    await app.cloudApi.signIn(email, password);
    toast("Signed in. Your log now syncs.");
  } catch (err) {
    error.textContent = describeAuthError(err);
    error.hidden = false;
  } finally {
    submit.disabled = false;
  }
}

async function resetPassword() {
  const email = ($("#signin-email") || {}).value?.trim();
  const error = $("#signin-error");
  if (!email) {
    error.textContent = "Enter your email above, then tap Forgot password again.";
    error.hidden = false;
    return;
  }
  try {
    await app.cloudApi.resetPassword(email);
    toast("Check your email for a link to reset your password.");
  } catch (err) {
    error.textContent = describeAuthError(err);
    error.hidden = false;
  }
}

// Move tries logged while signed out into the shared log. They leave this
// phone's own log, so they're only offered once.
async function copyLocalToCloud() {
  if (!unsyncedLocalIds().length) return;
  const local = readLocalState(KNOWN_IDS);
  try {
    const { added } = await app.store.importBackup(L.makeBackup(local));
    removeLocalLogs(Object.keys(local.logs), KNOWN_IDS);
    toast(`Moved ${plural(added, "try", "tries")} to the shared log`);
    refresh();
  } catch (err) {
    toast(describeStoreError(err));
  }
}

async function boot() {
  mountIconSprite();
  route();
  const store = await openStore(KNOWN_IDS);
  // Read the sync settings before showing this phone's log, so the page
  // knows synced details are on their way and doesn't flash prompts.
  if (store.mode === "local" && !window.claude) {
    const { config, error } = await readSyncConfig();
    app.syncConfig = config;
    app.syncConfigError = error || "";
    if (error) console.error(error);
    if (config) app.cloud = { status: "loading" };
  }
  attachStore(store);
  if (app.syncConfig) startCloud();
  registerServiceWorker();
}

boot();
