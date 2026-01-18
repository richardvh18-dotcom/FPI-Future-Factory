import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, appId } from "../config/firebase";

/**
 * useInventory.js - Nieuw in Fase 2
 * Haalt gereedschappen en locatiegegevens op.
 */
const useInventory = (shouldFetch = true) => {
  const [moffen, setMoffen] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldFetch) return;

    setLoading(true);
    // Let op: In AdminLocationsView werd dit 'moffen' genoemd, maar in de DB heet de collectie waarschijnlijk 'moffen' of 'inventory'
    // Op basis van AdminLocationsView code: collection(..., "moffen")
    const q = collection(db, "artifacts", appId, "public", "data", "moffen");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMoffen(list);
        setLoading(false);
      },
      (err) => {
        console.error("Fout bij laden inventory:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shouldFetch]);

  return { moffen, loading };
};

export default useInventory;
