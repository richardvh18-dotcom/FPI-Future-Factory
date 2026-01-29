import { useState, useEffect } from "react";
import { db } from "../config/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export const useMessages = (user) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  useEffect(() => {
    if (!user || !user.email) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messagesRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "messages"
    );

    // We queryen op 'to' == user.email.
    const q = query(
      messagesRef,
      where("to", "==", user.email.toLowerCase()) // Zorg dat we lowercase vergelijken
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Zorg voor een fallback datum object
          timestamp: doc.data().timestamp?.toDate
            ? doc.data().timestamp.toDate()
            : new Date(),
        }));

        // Client-side sorteren op datum (nieuwste eerst)
        msgs.sort((a, b) => b.timestamp - a.timestamp);

        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error("Fout bij ophalen berichten:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, appId]);

  return { messages, loading };
};
