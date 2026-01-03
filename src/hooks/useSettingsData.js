import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, appId } from "../config/firebase";

export const useSettingsData = (user) => {
  const [settings, setSettings] = useState({
    productRange: [],
    standardFittingSpecs: [],
    toleranceSettings: [],
    productTemplates: [],
    generalConfig: [],
    boreDimensions: [],
    bellDimensions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    // PAD CORRECTIE: We gebruiken nu de OUDE structuur (Collecties in root data map)
    // In plaats van: .../data/settings/doc
    // Gebruiken we: .../data/collectionName

    console.log("Start fetching settings (Old Structure - Collections)...");

    const listeners = [];

    const subscribeToCollection = (collectionName, stateKey) => {
      // Let op: pad is artifacts/{appId}/public/data/{collectionName}
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
        (error) => {
          console.error(`Error fetching collection ${collectionName}:`, error);
          setSettings((prev) => ({ ...prev, error }));
        }
      );
      listeners.push(unsub);
    };

    // Mappings gebaseerd op je useFirestoreData.js upload
    subscribeToCollection("productRange", "productRange");
    subscribeToCollection("productTemplates", "productTemplates");
    subscribeToCollection("generalConfig", "generalConfig");
    subscribeToCollection("boreDimensions", "boreDimensions");
    subscribeToCollection("toleranceSettings", "toleranceSettings");
    subscribeToCollection("standardFittingSpecs", "standardFittingSpecs");
    subscribeToCollection("bellDimensions", "bellDimensions");

    // Timeout om loading state te killen als collections leeg zijn
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
