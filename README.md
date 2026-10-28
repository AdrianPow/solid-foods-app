# First Bites

A starting-solids reference and tracker for two parents. Look up how to serve
a food at your baby's age, then log each try: when, how it went, how it was
served, and any reaction.

## What it does

- **231 foods** in 11 categories, each with:
  - the earliest age to offer it, or why to wait or avoid it
  - how to serve it at 6–8 months, 9–11 months and 12 months +
  - common allergens, choking risk, and whether it's iron-rich
  - safety and nutrition tips
  - a link to the food's page on [Solid Starts](https://solidstarts.com/foods/) for their full guide, photos and videos
- **Tracker.** Tap the circle on any food tile to log a try: the date, how it went (loved it → wouldn't try), how it was served, any reaction signs, and notes. Each tile shows its status and how many times it's been tried.
- **Progress.** Foods tried against your goal (100 before the first birthday by default), the nine common allergens (with a nudge when one hasn't been offered in a week), a to-try list, progress by category, and recent tries showing who logged each one.
- **Guide.** Readiness signs, safe set-up, gagging vs. choking, sizes and shapes by age, common choking hazards, allergen introduction, reaction signs, foods to avoid, iron, and how much to offer.
- **Search and filters** by name (including other names like *courgette* and *capsicum*), category, allergen, what's safe at your baby's age, iron-rich, choking hazards, and tried/liked/still learning/reaction/to-try.

## About the food information

The food notes in `js/data/` were written for this app. They are general
guidance based on widely published advice from pediatric and public-health
bodies (AAP, NHS, FDA and others). The app does not copy Solid Starts' content:
that's their copyrighted work, and this repository is public. Each food links
to the matching Solid Starts page instead.

This is not medical advice. Talk to your pediatrician about readiness, allergy
risk (especially with severe eczema or an existing food allergy) and any concerns.

## Using it

### Option 1: shared tracker on claude.ai (both parents see the same log)

`npm run build:artifact` builds `dist/first-bites.html`, a single page that
can be published as a claude.ai Artifact. When it runs there with the `db` and
`user` capabilities, the tracker is stored in the artifact's shared database:
everyone with edit access sees the same log, live, with names next to each
entry. Invite your partner from the artifact's Share menu as an **Editor**.

### Option 2: GitHub Pages (one log per phone, shared by backup)

1. Merge to `main`.
2. In the repository, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` runs the tests and publishes the site to `https://<your-username>.github.io/solid-foods-app/`.
4. Open that address on each phone and add it to the home screen (iPhone: Safari → Share → Add to Home Screen; Android: browser menu → Install app). It works offline.

In this mode each phone keeps its own log in the browser. To share, tap **Baby → Export backup**, send the file to your partner, and they tap **Import backup**. Imports merge entries by id, so you can swap backups in either direction without losing anything.

### Run it locally

```sh
npm start        # serves the app at http://localhost:8080
npm test         # data and logic tests (Node 20+)
```

No build step is needed for the app itself; it is plain HTML, CSS and ES modules.

## Project layout

| Path | What's there |
| --- | --- |
| `index.html`, `css/styles.css` | Page shell and styles (light and dark) |
| `js/app.js` | Screens, routing and event handling |
| `js/logic.js` | Pure functions: ages, statuses, allergen progress, backup merge |
| `js/store.js` | Storage: browser storage, or the shared claude.ai database |
| `js/data/*.js` | The food list, one file per category, plus the guide text |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |
| `scripts/build-artifact.mjs` | Builds the single-page claude.ai version |
| `tests/` | `node --test` suites |

### Adding or editing a food

Each entry in `js/data/<category>.js` is a call to `food()`:

```js
food("avocado", "Avocado", "fruit", {
  aka: ["alligator pear"],           // other names for search
  age: 6,                            // earliest age in months (null = avoid)
  wait: "",                          // why to wait, when age > 6 or null
  allergens: [],                     // milk, egg, peanut, treenut, sesame, soy, wheat, fish, shellfish
  choking: "low",                    // low | prep | high
  iron: false,
  s6: "…", s9: "…", s12: "…",        // how to serve at each stage
  tips: ["…"],
  ss: "avocado",                     // Solid Starts slug (defaults to the id; null for no link)
})
```

Keep ids stable: logged tries reference them. Run `npm test` after editing to check the data.
