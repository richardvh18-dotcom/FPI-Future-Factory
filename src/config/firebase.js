import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Configuratie voor project: fittings-a5cc6
const firebaseConfig = {
  apiKey: "AIzaSyBcH_2W25I-pcxSubuJNBkw7Tw7F_4_LXc",
  authDomain: "fittings-a5cc6.firebaseapp.com",
  projectId: "fittings-a5cc6",
  storageBucket: "fittings-a5cc6.firebasestorage.app",
  messagingSenderId: "682365512086",
  appId: "1:682365512086:web:75481bcb79ac6dea9455b7",
};

// Initialiseer Firebase met foutafhandeling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase verbonden met:", firebaseConfig.projectId);
} catch (error) {
  console.error("❌ Firebase initialisatie fout:", error);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "fittings-app-v1"; // Interne ID voor data-structuur

/**
 * Logt een activiteit naar de 'logs' collectie in Firestore.
 * Wordt gebruikt voor audit trails (wie heeft wat gedaan).
 */
export const logActivity = async (user, action, details) => {
  if (!user || !db) return;
  
  try {
    await addDoc(collection(db, "artifacts", appId, "public", "data", "logs"), {
      timestamp: serverTimestamp(),
      user: user.email || "Unknown",
      userId: user.uid || "Unknown",
      action: action,
      details: details,
    });
    console.log(`[LOG] ${user.email} - ${action}`);
  } catch (e) {
    console.error("Error adding log: ", e);
  }
};