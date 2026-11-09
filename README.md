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
- **Tracker.** Tap the circle on any food tile and pick a face (loved it → wouldn't try) to log today's try in one tap, with **Undo** if you tap the wrong one. **Add details** covers the day (Today, Yesterday or another day), how it was served (with quick picks like *mashed* or *pre-loaded spoon*), any reaction signs and notes. Each tile shows its status (liked, still learning or reaction, each with its own symbol) and how many times it's been tried.
- **Your own foods.** Add anything that isn't listed, by tapping **Add a food** (or **Add "…"** when a search finds nothing). File it under any category, e.g. kangaroo under Meat & poultry, or under the new **Meals & mixed foods** for pouches and dishes. Say what's in it by picking listed foods: logging the meal then counts as a try of each one (and of its allergens), and their age, choking and allergen advice carries over. A reaction to a meal stays with the meal, with a note on each food in it. Tick any other allergens on the label, and keep the printed ingredients and notes. With sync on, both phones see your foods. Optionally, **read a label from a photo** to fill the form in (see below).
- **What's next.** Before 6 months, a countdown and a readiness checklist you both can tick. After that, ideas for what to offer next: allergens due again, the next allergen to introduce, your to-try list and iron-rich foods.
- **Progress.** A ring for foods tried against your goal (100 before the first birthday by default), the nine common allergens as a grid (with a nudge when one hasn't been offered in a week), a to-try list, progress by category, and recent tries grouped by day, showing who logged each one.
- **Guide.** Sections that fold open: readiness signs (as a shared checklist), safe set-up, gagging vs. choking, sizes and shapes by age, common choking hazards, allergen introduction, reaction signs, foods to avoid, iron, and how much to offer.
- **Search and filters** (search stays at the top as you scroll, with a bar to jump between categories; the rest is behind the Filters button) by name (including other names like *courgette* and *capsicum*), category, allergen, what's safe at your baby's age, iron-rich, choking hazards, and tried/liked/still learning/reaction/to-try.

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

### Reading food labels from a photo (optional)

With sync set up, the **Add a food** form can read a label from a photo: take a picture of the ingredients and allergen statement, and the name, brand, ingredients and allergens are filled in for you to check. It uses Google's Gemini through your own Firebase project, on the free plan (no billing account). It needs a one-time setup, about 10 minutes:

1. **Switch on AI Logic.** In the [Firebase console](https://console.firebase.google.com), open your project, go to **AI Services → AI Logic** and click **Get started**. When asked for a Gemini API provider, choose **Gemini Developer API** (the no-cost option) and finish the steps. This also switches on **App Check** for AI Logic, which only lets requests from your site through.
2. **Get a reCAPTCHA key** (App Check uses it to recognise your site). Go to the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin/create), sign in with the same Google account, and create a key: label it *First Bites*, choose **Score based (v3)**, and add the domain `<your-username>.github.io`. Copy the **site key** and the **secret key**.
3. **Register your site with App Check.** In the Firebase console, go to **Security → App Check → Apps**, find your web app, choose **reCAPTCHA**, paste the **secret key** and click **Save**.
4. **Tell the app the site key.** In [`js/sync-config.js`](js/sync-config.js), paste the **site key** between the quotes in `LABEL_READING`, and commit. (The site key isn't a secret; never paste the secret key here.)

Once the site has redeployed, open **Add a food** and tap **Read a label from a photo**.

Good to know:

- Always check what was read against the pack before saving. Allergens come from the label's "Contains" statement and a second check of the printed ingredients, but a photo can be misread.
- The free plan has daily limits, which are plenty for a few labels a day. If you hit one, the app says so; type the food in instead.
- The photo is sent to Google to be read and isn't kept by the app. On the free plan, Google may use what's sent to improve its products.
- If the reCAPTCHA site sends you to Google Cloud to create the key instead, create a score-based **Website** key for your domain there, register it in App Check as **reCAPTCHA Enterprise**, and add `provider: "recaptcha-enterprise"` next to the site key in `js/sync-config.js`.

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
| `js/cloud.js`, `js/sync-config.js` | Optional Firebase sync and label reading: loader and your project config |
| `js/label.js` | Reading a label from a photo: the request to the model and matching its answer to the food list |
| `js/data/*.js` | The food list (one file per category), guide text and icon map |
| `js/data/icons.js` | Generated food icons (`npm run build:icons`) |
| `js/vendor/` | Generated Firebase bundles (`npm run build:firebase`): `firebase.js` for syncing, `firebase-ai.js` for label reading, and the core they share |
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
