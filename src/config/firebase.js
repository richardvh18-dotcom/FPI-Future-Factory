import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

/**
 * Firebase Configuratie
 * Gebruikt de omgevingsvariabelen van de preview-omgeving.
 */
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== "undefined") {
    return JSON.parse(__firebase_config);
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
export const appId = "fittings-app-v1";

/**
 * logActivity: Slaat acties van gebruikers op in de audit logs.
 * Wordt gebruikt voor kwaliteitsbewaking en het volgen van wijzigingen.
 */
export const logActivity = async (action, details = {}) => {
  try {
    const user = auth.currentUser;
    const logRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "activity_logs"
    );

    await addDoc(logRef, {
      action,
      details,
      userId: user?.uid || "system",
      userEmail: user?.email || "anonymous",
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // We loggen naar de console, maar blokkeren de UI niet als het loggen mislukt
    console.error("Audit log error:", error);
  }
};

export default app;
