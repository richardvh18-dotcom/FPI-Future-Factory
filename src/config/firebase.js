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
 * CONFIGURATIE VIA OMGEVINGSVARIABELEN
 * Deze waarden worden ingelezen uit het .env bestand in de root van je project.
 * Zorg dat de variabelen daar beginnen met REACT_APP_ (voor Create React App).
 */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Debug log (veilig: toont alleen of de config geladen is, niet de keys zelf)
if (process.env.NODE_ENV === "development") {
  console.log("Firebase Config Status:", {
    project: firebaseConfig.projectId,
    loaded: !!firebaseConfig.apiKey,
  });
}

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);

// Exporteer de services voor gebruik in de rest van de app
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * HET DATABASE PAD PAD (FIXED)
 * Ondanks dat we een nieuw project gebruiken, wijzen we de appId
 * handmatig toe aan 'fittings-app-v1' omdat je data onder dat pad staat.
 */
export const appId = "fittings-app-v1";

/**
 * Functie voor het loggen van activiteiten (Audit Trail)
 * Schrijft naar: artifacts/fittings-app-v1/audit_logs
 */
export const logActivity = async (action, details, userId = "system") => {
  try {
    await addDoc(collection(db, "artifacts", appId, "audit_logs"), {
      action,
      details,
      userId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Audit Log Fout:", error);
  }
};

export default app;
