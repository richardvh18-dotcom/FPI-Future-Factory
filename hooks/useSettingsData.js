import { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db, appId } from "../config/firebase";

export const useSettingsData = (user) => {
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
    // AANPASSING: Gebruik snake_case namen zoals in de database
    subscribeToDoc("product_range", "productRange");
    subscribeToDoc("product_templates", "productTemplates");

    // Voor general_config gebruiken we de specifieke app_settings locatie als dat nodig is,
    // of de settings map. Uit voorzorg luisteren we hier naar settings/general_config.
    subscribeToDoc("general_config", "generalConfig");

    // --- 2. DATA (Collecties) ---
    subscribeToCollection("bore_dimensions", "boreDimensions");
    subscribeToCollection("tolerance_settings", "toleranceSettings");
    subscribeToCollection("standard_fitting_specs", "standardFittingSpecs");

    // Voor Bell Dimensions laden we beide varianten als één lijst (optioneel)
    // of we laten de componenten zelf kiezen. Voor nu laden we niets generieks
    // omdat DimensionsView dit zelf regelt op basis van CB/TB keuze.

    const timeout = setTimeout(() => {
      setSettings((prev) => ({ ...prev, loading: false }));
    }, 1000);

    return () => {
      listeners.forEach((unsub) => unsub());
      clearTimeout(timeout);
    };
  }, [user]);

  return settings;
};
