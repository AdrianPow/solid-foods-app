// Optional: sync the tracker between phones when the app runs on GitHub
// Pages (or any web host). See "Syncing between your phones" in README.md.
//
// Paste only the settings object from Firebase (Project settings > Your apps
// > Web app > SDK setup and configuration): the part between the { } after
// "const firebaseConfig =". Don't paste the <script> tags or import lines.
//
// This config is not a secret: it only identifies your project. Access to the
// data is controlled by the Firestore security rules (see firestore.rules),
// which only let your two accounts in.
//
// Set it to null to keep each phone's log on that phone.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAtxTfXP4_lvB5aOVJnspeZwxb9shzy1-0",
  authDomain: "first-bites-app-01.firebaseapp.com",
  projectId: "first-bites-app-01",
  storageBucket: "first-bites-app-01.firebasestorage.app",
  messagingSenderId: "284763479349",
  appId: "1:284763479349:web:159149d5bcdf5f3f17407c",
};

// Optional: read food labels from a photo when adding a food. See "Reading
// food labels from a photo" in README.md. Paste the site key between the
// quotes to switch it on; leave it empty to keep it off.
// (A site key isn't a secret: it's meant to be in the page.)
export const LABEL_READING = {
  recaptchaSiteKey: "6LdwMBwuAAAAADhMs9_i3zOuN2ejrwWf_A4twuRN",
  // The kind of key: "recaptcha-enterprise" for one made in Google Cloud's
  // Fraud Defense (what Firebase offers now), "recaptcha-v3" for an older
  // reCAPTCHA v3 key registered with its secret key.
  provider: "recaptcha-enterprise",
  // Optional: the Gemini model to read labels with, e.g.
  //   model: "gemini-3.5-flash-lite",
  // Leave it out to use the app's own choice (LABEL_MODEL in js/label.js).
};
