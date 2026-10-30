# First Bites

A starting-solids reference and tracker for two parents. Look up how to serve
a food at your baby's age, then log each try: when, how it went, how it was
served, and any reaction.

## What it does

- **366 foods** in 11 categories, each with an icon and:
  - the earliest age to offer it, or why to wait or avoid it
  - how to serve it at 6–8 months, 9–11 months and 12 months +
  - common allergens, choking risk, and whether it's iron-rich
  - safety and nutrition tips
  - a link to the food's page on [Solid Starts](https://solidstarts.com/foods/) for their full guide, photos and videos (356 foods have one)
- **Tracker.** Tap the circle on any food tile and pick a face (loved it → wouldn't try) to log today's try in one tap. **Add details** covers the date, how it was served, any reaction signs and notes. Each tile shows its status (liked, still learning or reaction, each with its own symbol) and how many times it's been tried.
- **Progress.** Foods tried against your goal (100 before the first birthday by default), the nine common allergens (with a nudge when one hasn't been offered in a week), a to-try list, progress by category, and recent tries showing who logged each one.
- **Guide.** Readiness signs, safe set-up, gagging vs. choking, sizes and shapes by age, common choking hazards, allergen introduction, reaction signs, foods to avoid, iron, and how much to offer.
- **Search and filters** (behind the Filters button) by name (including other names like *courgette* and *capsicum*), category, allergen, what's safe at your baby's age, iron-rich, choking hazards, and tried/liked/still learning/reaction/to-try.

## About the food information

The food notes in `js/data/` were written for this app. They are general
guidance based on widely published advice from pediatric and public-health
bodies (AAP, NHS, FDA and others). The app does not copy Solid Starts' content:
it's their copyrighted work, their terms of use don't allow automated
collection of it, and this repository is public. Each food links to the
matching Solid Starts page instead. `npm run check:links` checks those links
against the sitemap Solid Starts publishes for search engines.

This is not medical advice. Talk to your pediatrician about readiness, allergy
risk (especially with severe eczema or an existing food allergy) and any concerns.

## Using it

There are three ways to run it. All use the same code.

| | Who can open it | Do both phones share one log? | Setup |
| --- | --- | --- | --- |
| GitHub Pages + Firebase sync | Anyone with the link can open the app; only your two accounts can see or change the log | Yes, live, works offline | About 15 minutes, free |
| GitHub Pages on its own | Anyone with the link | No, each phone has its own log (swap backups to merge) | About 5 minutes |
| claude.ai Artifact | Only people you share it with | Yes, live | Both of you need claude.ai accounts |

### Publish on GitHub Pages

1. In the repository, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
2. The workflow in `.github/workflows/pages.yml` runs the tests and publishes the site to `https://<your-username>.github.io/solid-foods-app/` on every push to the repository's default branch. You can also run it by hand from the **Actions** tab (**Test and deploy → Run workflow**).
3. Open that address on each phone and add it to the home screen. On Android, tap **Install** on the banner in the app (or **Install First Bites** on the Baby tab); on iPhone, use Safari → Share → **Add to Home Screen**. It works offline.

**About privacy:** on GitHub's Free and Pro plans, a GitHub Pages site is always public. Only GitHub Enterprise can limit who opens it. The app asks search engines not to list it, but anyone with the link can open the food guide. Your baby's log is never part of the site: it stays on each phone, or, with sync set up, in your own Firebase database, which only your two accounts can read.

### Syncing between your phones (Firebase)

Firebase is Google's app database service. The free plan is plenty for this app.

1. **Create a project.** Go to <https://console.firebase.google.com>, click **Create a project**, name it (e.g. `first-bites`), and turn off Google Analytics (not needed).
2. **Add a database.** Under **Build → Firestore Database**, click **Create database**, pick a location near you, and start in **production mode**.
3. **Lock it to the two of you.** Open the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules), replace the two example email addresses with yours and your partner's, and click **Publish**.
4. **Create your logins.** Under **Build → Authentication**, click **Get started**, enable **Email/Password**, then on the **Users** tab click **Add user** once for each of you. To stop anyone else making an account, go to **Settings → User actions** and untick **Enable create (sign-up)**.
5. **Allow your site.** In **Authentication → Settings → Authorized domains**, add `<your-username>.github.io`.
6. **Connect the app.** In **Project settings → General → Your apps**, click the web icon (`</>`), register an app (no hosting needed), and copy the `firebaseConfig` object. Paste it into [`js/sync-config.js`](js/sync-config.js) in place of `null`, for example:

   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "AIza…",
     authDomain: "first-bites-1234.firebaseapp.com",
     projectId: "first-bites-1234",
     storageBucket: "first-bites-1234.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123",
   };
   ```

   This config isn't a secret (it only names your project), so it's fine in a public repository. The rules from step 3 are what keep the data private.
7. Commit the change to the default branch. Once the site redeploys, open the **Baby** tab on each phone and sign in. If a phone already has tries saved from before, tap **Move them to the shared log**.

After that, a try logged on either phone shows up on the other within seconds. Logging works offline too, and catches up when the phone reconnects.

### claude.ai Artifact

`npm run build:artifact` builds `dist/first-bites.html`, a single page that can
be published as a claude.ai Artifact. There the tracker uses the artifact's
own shared database: invite your partner from the artifact's Share menu as an
**Editor**.

### Run it locally

```sh
npm start        # serves the app at http://localhost:8080
npm test         # data and logic tests (Node 20+)
```

The app itself needs no build step: it is plain HTML, CSS and ES modules.

## Project layout

| Path | What's there |
| --- | --- |
| `index.html`, `css/styles.css` | Page shell and styles (light and dark) |
| `js/app.js` | Screens, routing and event handling |
| `js/logic.js` | Pure functions: ages, statuses, allergen progress, backup merge |
| `js/store.js` | Storage: this device, the claude.ai shared database, or Firebase |
| `js/cloud.js`, `js/sync-config.js` | Optional Firebase sync: loader and your project config |
| `js/data/*.js` | The food list (one file per category), guide text and icon map |
| `js/data/icons.js` | Generated food icons (`npm run build:icons`) |
| `js/vendor/firebase.js` | Generated Firebase bundle (`npm run build:firebase`) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |
| `firestore.rules` | Security rules template for Firebase |
| `scripts/` | Build scripts for the icons, Firebase bundle and Artifact page, and the link checker |
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

Then give it an icon in `js/data/food-icons.js`. Use any name from the [Fluent Emoji Flat set](https://icon-sets.iconify.design/fluent-emoji-flat/), or define a recolored variant in `scripts/build-icons.mjs`, and run `npm run build:icons`.

Keep ids stable: logged tries reference them. Run `npm test` after editing to check the data.

Third-party licenses (food icons, Firebase) are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
