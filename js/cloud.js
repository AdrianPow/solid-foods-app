// Loads Firebase only when js/sync-config.js has a config, and wraps the few
// calls the app needs: sign-in state, sign in/out, password reset.

// Kept in variables so bundlers leave them alone: the SDK files are only
// downloaded when syncing is configured, and the label reader only when
// someone reads a label.
const SDK_PATH = "./vendor/firebase.js";
const AI_SDK_PATH = "./vendor/firebase-ai.js";

// The config file is edited by hand, so load it on its own: a typo there
// should turn syncing off with a message, not stop the whole app loading.
// Resolves { config } when sync is set up, { config: null } when it is
// switched off, or { error } when the file can't be used.
export async function readSyncConfig() {
  let mod;
  try {
    mod = await import("./sync-config.js");
  } catch {
    return { config: null, error: "js/sync-config.js has a mistake in it. It should contain only the settings between { and } from Firebase." };
  }
  const config = mod.FIREBASE_CONFIG;
  if (config == null) return { config: null };
  if (typeof config !== "object" || !config.apiKey || !config.projectId) {
    return { config: null, error: "js/sync-config.js is missing the apiKey or projectId from Firebase." };
  }
  // Label reading is on once a reCAPTCHA site key is filled in.
  const reading = mod.LABEL_READING;
  const labels =
    reading && typeof reading.recaptchaSiteKey === "string" && reading.recaptchaSiteKey.trim()
      ? { recaptchaSiteKey: reading.recaptchaSiteKey.trim(), provider: reading.provider === "recaptcha-enterprise" ? "recaptcha-enterprise" : "recaptcha-v3", model: reading.model || null }
      : null;
  return { config, labels };
}

let FIREBASE_CONFIG = null;
let loading = null;

export function loadCloud(config) {
  if (config) FIREBASE_CONFIG = config;
  if (!FIREBASE_CONFIG) return Promise.reject(new Error("Syncing isn't set up."));
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
      app,
      onUser: (callback) => fb.onAuthStateChanged(auth, callback),
      signIn: (email, password) => fb.signInWithEmailAndPassword(auth, email, password),
      signOut: () => fb.signOut(auth),
      resetPassword: (email) => fb.sendPasswordResetEmail(auth, email),
    };
  })();
  loading.catch(() => (loading = null));
  return loading;
}

// Reading a food label from a photo, with Gemini through Firebase AI Logic.
// App Check (with a reCAPTCHA key) proves the requests come from this site.
let labelModel = null;
let appCheckOn = false;

export async function readLabelImage(cloud, settings, { prompt, schema, model }, base64) {
  labelModel ||= (async () => {
    const ai = await import(AI_SDK_PATH);
    if (!appCheckOn) {
      const Provider = settings.provider === "recaptcha-enterprise" ? ai.ReCaptchaEnterpriseProvider : ai.ReCaptchaV3Provider;
      ai.initializeAppCheck(cloud.app, { provider: new Provider(settings.recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
      appCheckOn = true;
    }
    const service = ai.getAI(cloud.app, { backend: new ai.GoogleAIBackend() });
    return ai.getGenerativeModel(service, {
      model: settings.model || model,
      generationConfig: { responseMimeType: "application/json", responseSchema: schema(ai.Schema) },
    });
  })();
  labelModel.catch(() => (labelModel = null));
  const gemini = await labelModel;
  const result = await gemini.generateContent([prompt, { inlineData: { data: base64, mimeType: "image/jpeg" } }]);
  return JSON.parse(result.response.text());
}

// Messages for what can go wrong reading a label.
export function describeLabelError(err) {
  const code = String((err && err.code) || "");
  const message = String((err && err.message) || "");
  const status = err && err.customErrorData && err.customErrorData.status;
  if (code === "unreadable") return "Couldn't find a label to read in that photo. Try again closer up, in good light, or type it in.";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "You're offline. Type it in, or read the label when you're back online.";
  if (code.includes("api-not-enabled")) return "Label reading isn't switched on in Firebase yet (AI Logic). See “Reading food labels from a photo” in the README.";
  if (code.startsWith("appCheck/") || /app ?check/i.test(message) || status === 401 || status === 403) {
    return "This site isn't set up for label reading yet (App Check). See “Reading food labels from a photo” in the README.";
  }
  if (status === 429 || /quota|resource.?exhausted|rate limit/i.test(message)) return "That's all the label reads the free plan allows for now. Try again later, or type it in.";
  if (err instanceof SyntaxError) return "Couldn't make sense of that photo. Try again, or type it in.";
  return "Couldn't read the label. Try again, or type it in.";
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
