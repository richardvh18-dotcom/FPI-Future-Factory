import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, appId } from "../config/firebase";

/**
 * useAdminAuth: Beheert de rollen binnen de app.
 * Rollen: 'admin', 'engineer', 'teamleader', 'qc', 'viewer'.
 */
export const useAdminAuth = () => {
  const [state, setState] = useState({
    user: null,
    isAdmin: false,
    role: "viewer",
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && !authUser.isAnonymous) {
        const masterAdminUIDs = ["pFlmcq8IgRNOBxwwV8tS5f8P5BI2"];
        let detectedRole = "viewer";

        if (masterAdminUIDs.includes(authUser.uid)) {
          detectedRole = "admin";
        } else {
          try {
            const roleDoc = await getDoc(
              doc(
                db,
                "artifacts",
                appId,
                "public",
                "data",
                "user_roles",
                authUser.uid
              )
            );
            if (roleDoc.exists()) {
              detectedRole = roleDoc.data().role || "viewer";
            } else {
              const emailDoc = await getDoc(
                doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  "user_roles",
                  authUser.email?.toLowerCase()
                )
              );
              if (emailDoc.exists()) {
                detectedRole = emailDoc.data().role || "viewer";
              }
            }
          } catch (e) {
            console.error("Fout bij ophalen rol:", e);
          }
        }

        setState({
          user: authUser,
          role: detectedRole,
          // QC heeft dezelfde rechten als users (geen Admin Hub toegang)
          isAdmin: ["admin", "engineer", "teamleader"].includes(detectedRole),
          loading: false,
        });
      } else {
        setState({
          user: authUser || null,
          isAdmin: false,
          role: "viewer",
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
};
