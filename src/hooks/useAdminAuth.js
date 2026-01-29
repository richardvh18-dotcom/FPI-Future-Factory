import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export const useAdminAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false); // NIEUW

  const auth = getAuth();
  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let userData = null;
          const uidRef = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "user_roles",
            firebaseUser.uid
          );
          const uidSnap = await getDoc(uidRef);

          if (uidSnap.exists()) {
            userData = uidSnap.data();
          } else {
            const emailIdRef = doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "user_roles",
              firebaseUser.email
            );
            const emailIdSnap = await getDoc(emailIdRef);
            if (emailIdSnap.exists()) userData = emailIdSnap.data();
          }

          if (userData) {
            const customUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData,
            };

            setUser(customUser);
            setRole((userData.role || "guest").toLowerCase());
            setIsAdmin(userData.role?.toLowerCase() === "admin");

            // CHECK VOOR GEFORCEERDE WACHTWOORD WIJZIGING
            setMustChangePassword(userData.mustChangePassword === true);
          } else {
            setUser({ ...firebaseUser, role: "guest" });
            setRole("guest");
            setIsAdmin(false);
            setMustChangePassword(false);
          }
        } catch (error) {
          setUser(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setMustChangePassword(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appId, auth]);

  return { user, role, isAdmin, mustChangePassword, loading };
};
