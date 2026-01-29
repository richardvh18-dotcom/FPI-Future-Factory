import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { VERIFICATION_STATUS } from "../data/constants";

// Bepaal de App ID (nodig voor het juiste pad)
const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";
const DATA_PATH = ["artifacts", appId, "public", "data"];

// --- ID Generatie ---

export const generateProductId = (type, dn, pn, angle = null) => {
  const safeType = (type || "").replace(/\s+/g, "-").toUpperCase();
  const safeDn = dn || "0";
  const safePn = pn || "0";

  let id = `${safeType}-${safeDn}-${safePn}`;
  if (angle) {
    id += `-${angle}`;
  }
  return id;
};

export const generateProductCode = generateProductId;

export const formatProductForSave = (data) => {
  return JSON.parse(JSON.stringify(data));
};

export const validateProductData = (data) => {
  if (!data.type || !data.dn || !data.pn) return false;
  return true;
};

// --- CRUD Operations (Met Correcte Paden) ---

export const fetchProducts = async () => {
  try {
    // PAD FIX: Gebruik de specifieke artifacts locatie
    const q = query(
      collection(db, ...DATA_PATH, "products"),
      orderBy("lastUpdated", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products: ", error);
    throw error;
  }
};

export const addProduct = async (productData) => {
  try {
    const cleanData = formatProductForSave({
      ...productData,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    });

    // PAD FIX
    const docRef = await addDoc(
      collection(db, ...DATA_PATH, "products"),
      cleanData
    );
    return docRef.id;
  } catch (error) {
    console.error("Error adding product: ", error);
    throw error;
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    // PAD FIX
    const productRef = doc(db, ...DATA_PATH, "products", productId);
    const cleanData = formatProductForSave({
      ...productData,
      lastUpdated: serverTimestamp(),
    });

    await updateDoc(productRef, cleanData);
  } catch (error) {
    console.error("Error updating product: ", error);
    throw error;
  }
};

export const deleteProduct = async (productId) => {
  try {
    // PAD FIX
    await deleteDoc(doc(db, ...DATA_PATH, "products", productId));
  } catch (error) {
    console.error("Error deleting product: ", error);
    throw error;
  }
};

// --- Vier-ogen Verificatie ---

export const verifyProduct = async (
  productId,
  currentUser,
  currentProductData
) => {
  if (!currentUser || !currentUser.uid) {
    return { success: false, message: "Geen gebruiker ingelogd" };
  }

  if (currentProductData.lastModifiedBy === currentUser.uid) {
    return {
      success: false,
      message:
        "Vier-ogen principe: Je mag je eigen wijzigingen niet verifiëren.",
    };
  }

  // PAD FIX
  const productRef = doc(db, ...DATA_PATH, "products", productId);

  try {
    await updateDoc(productRef, {
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      verifiedBy: {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email || "Onbekend",
        timestamp: serverTimestamp(),
      },
      active: true,
      lastUpdated: serverTimestamp(),
    });
    return { success: true, message: "Product succesvol geverifieerd." };
  } catch (error) {
    console.error("Fout bij verifiëren:", error);
    return { success: false, message: error.message };
  }
};
