import React from "react";
import { Layers, Package, Tag, Database, Activity, Hash } from "lucide-react";
import LibrarySection from "./LibrarySection";

const LibraryView = ({ libraryData, setLibraryData }) => {
  const addToLibrary = (key, value) => {
    if (!value.toString().trim()) return;
    let newValue = value.toString().trim();

    // Converteer naar nummer indien nodig
    if (key === "pns" || key === "diameters") {
      const num = Number(newValue);
      if (!isNaN(num)) newValue = num;
    }

    setLibraryData((prev) => {
      const updatedList = [...new Set([...(prev[key] || []), newValue])];
      if (key === "pns" || key === "diameters") {
        updatedList.sort((a, b) => a - b);
      } else {
        updatedList.sort();
      }
      return { ...prev, [key]: updatedList };
    });
  };

  const removeFromLibrary = (key, value) => {
    setLibraryData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((i) => i !== value),
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 w-full max-w-7xl mx-auto">
      <LibrarySection
        title="Moffen & Verbindingen"
        items={libraryData.connections}
        onAdd={(v) => addToLibrary("connections", v)}
        onRemove={(v) => removeFromLibrary("connections", v)}
        placeholder="Bijv. CB, TB, FL..."
        icon={<Layers size={18} className="text-blue-500" />}
      />
      <LibrarySection
        title="Product Categorieën"
        items={libraryData.product_names}
        onAdd={(v) => addToLibrary("product_names", v)}
        onRemove={(v) => removeFromLibrary("product_names", v)}
        placeholder="Bijv. Elbow, Tee, Flange..."
        icon={<Package size={18} className="text-purple-500" />}
      />
      <LibrarySection
        title="Labels"
        items={libraryData.labels}
        onAdd={(v) => addToLibrary("labels", v)}
        onRemove={(v) => removeFromLibrary("labels", v)}
        placeholder="Bijv. Standaard, Potable..."
        icon={<Tag size={18} className="text-orange-500" />}
      />
      <LibrarySection
        title="Extra Codes"
        items={libraryData.codes}
        onAdd={(v) => addToLibrary("codes", v)}
        onRemove={(v) => removeFromLibrary("codes", v)}
        placeholder="Bijv. DV, WRAS..."
        icon={<Database size={18} className="text-emerald-500" />}
      />
      <LibrarySection
        title="Drukklassen (PN)"
        items={libraryData.pns}
        onAdd={(v) => addToLibrary("pns", v)}
        onRemove={(v) => removeFromLibrary("pns", v)}
        placeholder="Bijv. 40, 50..."
        icon={<Activity size={18} className="text-red-500" />}
      />
      <LibrarySection
        title="Diameters (ID)"
        items={libraryData.diameters}
        onAdd={(v) => addToLibrary("diameters", v)}
        onRemove={(v) => removeFromLibrary("diameters", v)}
        placeholder="Bijv. 800, 1000..."
        icon={<Hash size={18} className="text-cyan-500" />}
      />
    </div>
  );
};

export default LibraryView;
