import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, appId } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";

export const useAdminAuth = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Haal de rol op uit de 'user_roles' collectie
          // Let op: Dit vereist dat je Firestore rules hebt die 'read' toestaan voor de eigenaar
          const roleRef = doc(
            db,
            "artifacts",
            appId,
            "user_roles",
            currentUser.email.toLowerCase()
          );
          const roleSnap = await getDoc(roleRef);

          if (roleSnap.exists()) {
            const data = roleSnap.data();
            // Check of de rol admin of editor is
            setIsAdmin(data.role === "admin" || data.role === "editor");
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Fout bij ophalen gebruikersrol:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isAdmin, loading };
};
