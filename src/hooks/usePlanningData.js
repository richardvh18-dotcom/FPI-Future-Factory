import { useState, useEffect } from "react";
import { db } from "../config/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export const usePlanningData = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  useEffect(() => {
    // LET OP: Hier gebruiken we nu 'digital_planning' in plaats van 'planning'
    const planningRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "digital_planning"
    );

    // Sorteer op leverdatum (oudste eerst = hoogste prioriteit) of creatie datum
    const q = query(planningRef, orderBy("deliveryDate", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const orderList = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Zorg dat datums altijd Date objecten zijn voor de sortering/weergave
              deliveryDate: data.deliveryDate?.toDate
                ? data.deliveryDate.toDate()
                : new Date(data.deliveryDate),
              createdAt: data.createdAt?.toDate
                ? data.createdAt.toDate()
                : new Date(),
            };
          });

          setOrders(orderList);
          setLoading(false);
        } catch (err) {
          console.error("Fout bij verwerken planning data:", err);
          setError(err);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Fout bij ophalen planning:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId]);

  return { orders, loading, error };
};
