// The parts of the Firebase SDK the optional sync feature uses. Bundled into
// js/vendor/firebase.js by scripts/build-firebase.mjs.
export { initializeApp } from "firebase/app";
export { getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
export {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
} from "firebase/firestore";
