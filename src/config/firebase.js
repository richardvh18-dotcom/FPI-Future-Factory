import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const getFirebaseConfig = () => {
  if (typeof window !== "undefined" && window.__firebase_config) {
    try {
      return JSON.parse(window.__firebase_config);
    } catch (e) {}
  }
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
};

const app = initializeApp(getFirebaseConfig());
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const appId =
  typeof window !== "undefined" && window.__app_id
    ? window.__app_id
    : "fittings-app-v1";

export const logActivity = async (action, details = {}) => {
  try {
    const user = auth.currentUser;
    await addDoc(
      collection(db, "artifacts", appId, "public", "data", "activity_logs"),
      {
        action,
        details,
        userId: user?.uid || "system",
        userEmail: user?.email || "anonymous",
        timestamp: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

export default app;
