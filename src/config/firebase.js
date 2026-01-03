import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Originele configuratie
const firebaseConfig = {
  apiKey: "AIzaSyBcH_2W25I-pcxSubuJNBkw7Tw7F_4_LXc",
  authDomain: "fittings-a5cc6.firebaseapp.com",
  projectId: "fittings-a5cc6",
  storageBucket: "fittings-a5cc6.firebasestorage.app",
  messagingSenderId: "682365512086",
  appId: "1:682365512086:web:75481bcb79ac6dea9455b7",
};

// Initialiseer Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log(
    "Firebase succesvol geïnitialiseerd met Project ID:",
    firebaseConfig.projectId
  );
} catch (error) {
  console.error("Firebase initialisatie fout:", error);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "fittings-app-v1"; // Interne ID voor data-structuur

// Centrale logging functie
export const logActivity = async (user, action, details) => {
  if (!user) return;
  try {
    await addDoc(collection(db, "artifacts", appId, "activity_logs"), {
      userId: user.uid,
      userEmail: user.email,
      action: action,
      details: details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn(
      "Kon activiteit niet loggen (mogelijk rechten probleem):",
      error
    );
  }
};

export const getProvisioningAuth = () => getAuth(app);
