import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db, appId } from "../config/firebase";

export const useMessages = (user) => {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const messagesRef = collection(db, "artifacts", appId, "messages");

    // We luisteren naar berichten die:
    // 1. Direct aan de gebruiker zijn gericht (to == user.email)
    // 2. Aan 'all' zijn gericht
    // 3. Door de gebruiker zelf zijn verzonden (zodat ze in 'verzonden' kunnen staan)

    // Firestore heeft beperkingen met OR queries in snapshot listeners,
    // dus we halen ze op met een client-side filter of meerdere queries.
    // Voor eenvoud en performance in deze schaal halen we relevante berichten op.
    // Omdat 'OR' queries complex zijn, doen we het simpel: We luisteren naar ALLES
    // en filteren client-side (veiligheid moet via rules).
    // Beter: We luisteren naar 2 queries en mergen ze, maar voor nu is dit de 'chat-like' aanpak.

    const q = query(messagesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter voor huidige gebruiker
      const myMessages = allMessages.filter(
        (msg) =>
          msg.to === user.email || msg.to === "all" || msg.from === user.email
      );

      setMessages(myMessages);

      // Tel ongelezen berichten (alleen inkomend)
      const unread = myMessages.filter((msg) => {
        const isIncoming = msg.to === user.email || msg.to === "all";
        if (!isIncoming) return false;

        // Check of gelezen
        if (msg.readBy && Array.isArray(msg.readBy)) {
          return !msg.readBy.includes(user.email);
        }
        return !msg.read; // Fallback voor oude structuur
      }).length;

      setUnreadCount(unread);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- ACTIES ---

  const sendMessage = async (to, subject, body) => {
    if (!user) return;

    await addDoc(collection(db, "artifacts", appId, "messages"), {
      from: user.email,
      fromName: user.displayName || user.email.split("@")[0],
      to,
      subject,
      body,
      timestamp: serverTimestamp(),
      readBy: [], // Array van emails die het gelezen hebben
    });
  };

  const markAsRead = async (messageId, currentReadBy = []) => {
    if (!user) return;

    const msgRef = doc(db, "artifacts", appId, "messages", messageId);

    // Voeg gebruiker toe aan readBy array
    await updateDoc(msgRef, {
      readBy: arrayUnion(user.email),
      read: true, // Legacy support
    });
  };

  const deleteMessage = async (messageId) => {
    await deleteDoc(doc(db, "artifacts", appId, "messages", messageId));
  };

  return {
    messages,
    unreadCount,
    sendMessage,
    markAsRead,
    deleteMessage,
    loading,
  };
};
