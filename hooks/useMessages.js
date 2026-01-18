import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "../config/firebase";

/**
 * useMessages: Beheert de real-time stroom van berichten.
 * Gebruikt lowercase filtering voor maximale betrouwbaarheid.
 */
export const useMessages = (user) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Stop als er geen gebruiker of e-mail bekend is
    if (!user || !user.email) {
      setLoading(false);
      return;
    }

    const myEmail = user.email.toLowerCase();

    // RULE 1: Correct pad naar publieke data
    const colRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "messages"
    );

    // We luisteren naar ALLE berichten en filteren in de browser (Rule 2 conform)
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const allMsgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Sorteer op tijd (meest recente eerst)
        allMsgs.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });

        setMessages(allMsgs);

        // Bereken ongelezen berichten voor de huidige gebruiker
        const unread = allMsgs.filter((m) => {
          const recipient = (m.to || "").toLowerCase();
          const sender = (m.from || "").toLowerCase();
          // Bericht is voor mij of iedereen, is nog niet gelezen, en niet door mijzelf gestuurd
          return (
            (recipient === myEmail || recipient === "all") &&
            !m.read &&
            sender !== myEmail
          );
        }).length;

        setUnreadCount(unread);
        setLoading(false);
      },
      (error) => {
        console.error("Fout bij ophalen berichten:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, user?.email]);

  /**
   * Verzendt bericht en forceert lowercase voor adressen.
   */
  const sendMessage = async (messageData) => {
    try {
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "messages"
      );
      await addDoc(colRef, {
        ...messageData,
        to: messageData.to.toLowerCase(),
        from: messageData.from.toLowerCase(),
        timestamp: serverTimestamp(),
        read: false,
      });
      return { success: true };
    } catch (error) {
      console.error("Verzenden mislukt:", error);
      throw error;
    }
  };

  const markAsRead = async (msgId) => {
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "messages",
        msgId
      );
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error("Fout bij markeren als gelezen:", error);
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "messages", msgId)
      );
    } catch (error) {
      console.error("Fout bij verwijderen bericht:", error);
    }
  };

  return {
    messages,
    sendMessage,
    markAsRead,
    deleteMessage,
    unreadCount,
    loading,
  };
};
