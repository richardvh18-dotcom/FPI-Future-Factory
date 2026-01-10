import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, appId } from "../config/firebase";

/**
 * useAdminAuth: Beheert de authenticatie en autorisatie van de gebruiker.
 * De standaardrol is nu 'operator' in plaats van 'viewer'.
 */
export const useAdminAuth = () => {
  const [state, setState] = useState({
    user: null,
    isAdmin: false,
    role: "operator", // Gewijzigd van viewer naar operator
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && !authUser.isAnonymous) {
        let detectedRole = "operator"; // Gewijzigd
        const emailId = authUser.email?.toLowerCase();
        const uid = authUser.uid;

        // 1. MASTER WHITELIST
        const isMaster =
          emailId === "richardvh18@gmail.com" ||
          uid === "pFlmcq8IgRNOBxwwV8tS5f8P5BI2";

        if (isMaster) {
          detectedRole = "admin";
        } else {
          // 2. DATABASE CHECK
          try {
            const emailDocRef = doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "user_roles",
              emailId
            );
            const emailSnap = await getDoc(emailDocRef);

            if (emailSnap.exists()) {
              detectedRole = emailSnap.data().role;
            } else {
              const uidDocRef = doc(
                db,
                "artifacts",
                appId,
                "public",
                "data",
                "user_roles",
                uid
              );
              const uidSnap = await getDoc(uidDocRef);
              if (uidSnap.exists()) {
                detectedRole = uidSnap.data().role;
              }
            }
          } catch (e) {
            console.error("Autorisatie check mislukt:", e);
          }
        }

        // De bevoegdheden voor isAdmin blijven gelijk (geen operator)
        const roleLower = (detectedRole || "operator").toLowerCase();
        const isAdmin = ["admin", "engineer", "teamleader"].includes(roleLower);

        setState({
          user: authUser,
          isAdmin,
          role: roleLower,
          loading: false,
        });
      } else {
        setState({
          user: null,
          isAdmin: false,
          role: "operator",
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
};
