import React, { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { ChevronDown, Layers, Box } from "lucide-react";

/**
 * ProductSearchView - v10.6
 * Overzicht van de catalogus met inklapbare groepen.
 * Update: Alles staat standaard op ingeklapt ({}) voor een rustig overzicht.
 */
const ProductSearchView = ({ products = [], onProductClick }) => {
  // We initialiseren de state als een leeg object {} zodat alle groepen standaard dicht zijn.
  const [expandedGroups, setExpandedGroups] = useState({});

  const groupedProducts = useMemo(() => {
    const groups = {};
    products.forEach((p) => {
      const typeStr = p.type || "Overig";
      const angleStr = p.angle ? `${p.angle}°` : "";
      const connStr = p.connection || "";
      const groupName = `${typeStr} ${angleStr} ${connStr}`
        .trim()
        .toUpperCase();

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(p);
    });

    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  }, [products]);

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 m-6 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in">
        <Box className="text-slate-200 mb-6" size={60} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] italic text-center">
          Geen producten gevonden in de catalogus.
          <br />
          Voeg nieuwe producten toe via het dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-4 pb-40 text-left">
      {Object.entries(groupedProducts).map(([groupName, items]) => {
        const isExpanded = !!expandedGroups[groupName];

        return (
          <div key={groupName} className="space-y-4 animate-in">
            <button
              onClick={() => toggleGroup(groupName)}
              className={`w-full flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 ${
                isExpanded
                  ? "bg-white border-slate-200 shadow-xl"
                  : "bg-white/50 border-transparent hover:bg-white hover:border-slate-200"
              }`}
            >
              <div className="flex items-center gap-6">
                <div
                  className={`p-3 rounded-2xl transition-all duration-500 shadow-sm ${
                    isExpanded
                      ? "bg-blue-600 text-white rotate-0"
                      : "bg-white text-slate-400 -rotate-90 border border-slate-100"
                  }`}
                >
                  <ChevronDown size={20} strokeWidth={3} />
                </div>

                <div className="flex flex-col text-left">
                  <h3 className="text-[15px] font-black text-slate-900 uppercase italic tracking-wider flex items-center gap-4">
                    {groupName}
                    <span
                      className={`text-[9px] px-3 py-1 rounded-full normal-case font-black not-italic transition-all border ${
                        isExpanded
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {items.length} items
                    </span>
                  </h3>
                </div>
              </div>

              <div className="h-px bg-slate-100 flex-1 mx-10 hidden lg:block opacity-60"></div>

              <Layers
                size={22}
                className={`transition-all duration-500 ${
                  isExpanded ? "text-blue-500 scale-110" : "text-slate-200"
                }`}
              />
            </button>

            {isExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2 animate-in slide-in-from-top-4">
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => onProductClick(product)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductSearchView;
