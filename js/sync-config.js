// Optional: sync the tracker between phones when the app runs on GitHub
// Pages (or any web host). Paste the config from your Firebase project here
// (Project settings > Your apps > Web app > SDK setup and configuration).
// See "Syncing between your phones" in README.md for the full steps.
//
// This config is not a secret: it only identifies your project. Access to the
// data is controlled by the Firestore security rules (see firestore.rules),
// which only let your two accounts in.
//
// Leave it as null to keep each phone's log on that phone.
export const FIREBASE_CONFIG = <script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAtxTfXP4_lvB5aOVJnspeZwxb9shzy1-0",
    authDomain: "first-bites-app-01.firebaseapp.com",
    projectId: "first-bites-app-01",
    storageBucket: "first-bites-app-01.firebasestorage.app",
    messagingSenderId: "284763479349",
    appId: "1:284763479349:web:159149d5bcdf5f3f17407c"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>;
