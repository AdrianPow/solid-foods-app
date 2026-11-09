// The parts of the Firebase SDK used to read food labels from a photo
// (Firebase AI Logic with the Gemini Developer API, protected by App Check).
// Bundled into js/vendor/firebase-ai.js, which shares its Firebase core with
// js/vendor/firebase.js and is only downloaded when someone reads a label.
export { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
export { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from "firebase/app-check";
