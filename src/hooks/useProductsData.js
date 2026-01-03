import { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, appId } from "../config/firebase";

export const useProductsData = () => {
  const [data, setData] = useState({
    products: [],
    moffen: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    // PAD: artifacts/{appId}/public/data/products
    // Dit matcht met de oude useProducts.js
    const productsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "products"
    );

    const q = query(productsRef); // Eventueel orderBy toevoegen als dat nodig is

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedProducts = [];
        const fetchedMoffen = [];

        snapshot.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() };
          fetchedProducts.push(item);

          // Behoud logica voor moffen filteren, handig voor de UI
          const type = item.type ? item.type.toLowerCase() : "";
          const name = item.name ? item.name.toLowerCase() : "";

          if (
            type.includes("mof") ||
            name.includes("mof") ||
            type.includes("socket")
          ) {
            fetchedMoffen.push(item);
          }
        });

        // Sorteer op naam (client-side om index errors te voorkomen)
        fetchedProducts.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        setData({
          products: fetchedProducts,
          moffen: fetchedMoffen,
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error("Fout bij ophalen producten:", error);
        setData((prev) => ({ ...prev, loading: false, error: error }));
      }
    );

    return () => unsubscribe();
  }, []);

  return data;
};
