import { useState, useEffect } from "react";
import { collection, query, onSnapshot, limit } from "firebase/firestore";
import { db, appId } from "../config/firebase";

// AANPASSING: Limiet verhoogd naar 500 voor betere filter-vulling bij start
const PAGE_SIZE = 500;

export const useProductsData = (initialLimit = PAGE_SIZE) => {
  const [data, setData] = useState({
    products: [],
    moffen: [],
    loading: true,
    error: null,
    hasMore: true,
  });

  const [currentLimit, setCurrentLimit] = useState(initialLimit);

  useEffect(() => {
    // Probeer de collectie 'products'
    const productsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "products"
    );

    // AANPASSING: 'orderBy("name")' verwijderd.
    // Dit zorgt ervoor dat producten zonder 'name' veld NIET onzichtbaar worden.
    // We sorteren ze later wel in de client.
    const q = query(productsRef, limit(currentLimit));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedProducts = [];
        const fetchedMoffen = [];

        snapshot.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() };
          fetchedProducts.push(item);

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

        // Client-side sorteren op naam (zodat de lijst wel netjes alfabetisch is)
        fetchedProducts.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        // Check of we aan het einde zijn (als we minder items kregen dan de limiet)
        // Dit is een simpele check; snapshot.docs.length < currentLimit werkt meestal
        const hasMoreData = snapshot.docs.length >= currentLimit;

        setData({
          products: fetchedProducts,
          moffen: fetchedMoffen,
          loading: false,
          error: null,
          hasMore: hasMoreData,
        });
      },
      (error) => {
        console.error("Fout bij ophalen producten:", error);
        // Permissie fouten loggen we specifiek
        if (error.code === "permission-denied") {
          console.error("Geen rechten! Check je Firestore Rules.");
        }
        setData((prev) => ({ ...prev, loading: false, error: error }));
      }
    );

    return () => unsubscribe();
  }, [currentLimit]);

  const loadMore = () => {
    setCurrentLimit((prev) => prev + PAGE_SIZE);
  };

  return { ...data, loadMore };
};
