// Loads Firebase only when js/sync-config.js has a config, and wraps the few
// calls the app needs: sign-in state, sign in/out, password reset.

import { FIREBASE_CONFIG } from "./sync-config.js";

// Kept in a variable so bundlers leave it alone: the SDK is a separate file
// that is only downloaded when syncing is configured.
const SDK_PATH = "./vendor/firebase.js";

export const cloudConfigured = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

let loading = null;

export function loadCloud() {
  if (!cloudConfigured) return Promise.reject(new Error("Syncing isn't set up."));
  loading ||= (async () => {
    const fb = await import(SDK_PATH);
    const app = fb.initializeApp(FIREBASE_CONFIG);
    const auth = fb.getAuth(app);
    let db;
    try {
      // Offline cache: tries logged without a connection sync when it returns.
      db = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) });
    } catch {
      db = fb.getFirestore(app);
    }
    return {
      fb,
      db,
      onUser: (callback) => fb.onAuthStateChanged(auth, callback),
      signIn: (email, password) => fb.signInWithEmailAndPassword(auth, email, password),
      signOut: () => fb.signOut(auth),
      resetPassword: (email) => fb.sendPasswordResetEmail(auth, email),
    };
  })();
  loading.catch(() => (loading = null));
  return loading;
}

export function describeAuthError(err) {
  const code = (err && err.code) || "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(code)) {
    return "That email and password don't match. Check them, or reset your password.";
  }
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/missing-password") return "Enter your password.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a few minutes and try again.";
  if (code === "auth/network-request-failed") return "No connection. Check your internet and try again.";
  if (code === "auth/user-disabled") return "This account has been turned off in Firebase.";
  return (err && err.message) || "Couldn't sign in. Try again.";
}
