import { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../config/firebase";

export const useSettingsData = (user) => {
  // Gebruik de globale appId variabele voor veiligheid in deze omgeving,
  // of fallback naar een default als de import uit config niet zou werken.
  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  const [settings, setSettings] = useState({
    productRange: {},
    standardFittingSpecs: [],
    toleranceSettings: [],
    productTemplates: {},
    generalConfig: {},
    boreDimensions: [],
    bellDimensions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const listeners = [];

    // Helper voor Documenten (Settings)
    const subscribeToDoc = (docName, stateKey) => {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "settings",
        docName
      );

      const unsub = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setSettings((prev) => ({ ...prev, [stateKey]: docSnap.data() }));
          } else {
            console.warn(`⚠️ Document '${docName}' niet gevonden in settings.`);
          }
        },
        (error) => {
          console.error(`Error fetching document ${docName}:`, error);
        }
      );
      listeners.push(unsub);
    };

    // Helper voor Collecties (Data lijsten)
    const subscribeToCollection = (collectionName, stateKey) => {
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        collectionName
      );

      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSettings((prev) => ({ ...prev, [stateKey]: items }));
        },
        (error) =>
          console.error(`Error fetching collection ${collectionName}:`, error)
      );
      listeners.push(unsub);
    };

    // --- 1. SETTINGS (Documenten) ---
    subscribeToDoc("product_range", "productRange");
    subscribeToDoc("product_templates", "productTemplates");
    subscribeToDoc("general_config", "generalConfig");

    // --- 2. DATA (Collecties) ---
    subscribeToCollection("bore_dimensions", "boreDimensions");
    subscribeToCollection("tolerance_settings", "toleranceSettings");
    subscribeToCollection("standard_fitting_specs", "standardFittingSpecs");

    const timeout = setTimeout(() => {
      setSettings((prev) => ({ ...prev, loading: false }));
    }, 1000);

    return () => {
      listeners.forEach((unsub) => unsub());
      clearTimeout(timeout);
    };
  }, [user, appId]);

  return settings;
};
