import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// DEZE UID KRIJGT ALTIJD TOEGANG (Jouw Admin Account)
const GOD_MODE_UID = "pFlmcq8IgRNOBxwwV8tS5f8P5BI2";

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null); // NIEUW: We slaan de specifieke rol op
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (currentUser) {
        setUser(currentUser);
        console.log("🔍 Auth Check voor UID:", currentUser.uid);

        // 1. GOD MODE CHECK
        if (currentUser.uid.trim() === GOD_MODE_UID.trim()) {
          console.log("⚡ God Modus Geactiveerd");
          setIsAdmin(true);
          setRole("admin"); // God Mode is altijd admin
          setLoading(false);
          return;
        }

        // 2. Reguliere Database Check
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("📄 Rol gevonden:", userData.role);

            setRole(userData.role); // Sla de rol op voor het dashboard

            if (userData.role === "admin" || userData.isAdmin === true) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } else {
            console.warn("⚠️ Geen profiel gevonden.");
            setIsAdmin(false);
            setRole("guest");
          }
        } catch (error) {
          console.error("❌ Fout bij ophalen admin rechten:", error);
          setIsAdmin(false);
          setRole("guest");
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  // Nu geven we ook 'role' terug!
  return { isAdmin, role, loading, user, logout };
};

export default useAdminAuth;
