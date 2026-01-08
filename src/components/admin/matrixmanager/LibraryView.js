import React from "react";
// Importeer iconen individueel. Als een icoon niet bestaat, geeft dit een duidelijke fout of we vallen terug op een standaard.
import {
  Layers,
  Package,
  Tag,
  Database,
  Activity,
  Hash,
  PlusCircle,
} from "lucide-react";
import LibrarySection from "./LibrarySection";

/**
 * LibraryView: Beheert de centrale bibliotheek met alle dropdown-waarden.
 * Bevat extra beveiliging tegen 'undefined' componenten.
 */
const LibraryView = ({ libraryData, setLibraryData, setHasUnsavedChanges }) => {
  // Veiligheidsfunctie voor iconen om 'undefined' crashes te voorkomen
  const SafeIcon = (IconComponent, color) => {
    if (!IconComponent)
      return <PlusCircle size={18} className="text-slate-400" />;
    return <IconComponent size={18} className={color} />;
  };

  const addToLibrary = (key, value) => {
    if (!value || !value.toString().trim()) return;
    let newValue = value.toString().trim();

    if (key === "pns" || key === "diameters") {
      const num = Number(newValue);
      if (!isNaN(num)) newValue = num;
    }

    setLibraryData((prev) => {
      // Data herstel: ondersteun zowel 'codes' als 'extraCodes'
      const targetKey =
        key === "extraCodes" && !prev.extraCodes && prev.codes ? "codes" : key;
      const currentList = Array.isArray(prev[targetKey]) ? prev[targetKey] : [];

      if (currentList.includes(newValue)) return prev;

      const updatedList = [...currentList, newValue];

      if (key === "pns" || key === "diameters") {
        updatedList.sort((a, b) => a - b);
      } else {
        updatedList.sort();
      }

      return { ...prev, [targetKey]: updatedList };
    });

    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const removeFromLibrary = (key, value) => {
    setLibraryData((prev) => {
      const targetKey =
        key === "extraCodes" && !prev.extraCodes && prev.codes ? "codes" : key;
      const currentList = Array.isArray(prev[targetKey]) ? prev[targetKey] : [];
      return {
        ...prev,
        [targetKey]: currentList.filter((i) => i !== value),
      };
    });

    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  };

  // Zorg dat we nooit 'undefined' data naar de secties sturen
  const data = {
    connections: libraryData?.connections || [],
    product_names: libraryData?.product_names || [],
    labels: libraryData?.labels || [],
    extraCodes: libraryData?.extraCodes || libraryData?.codes || [],
    pns: libraryData?.pns || [],
    diameters: libraryData?.diameters || [],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 w-full max-w-7xl mx-auto pb-24 px-4">
      <LibrarySection
        title="Moffen & Verbindingen"
        items={data.connections}
        onAdd={(v) => addToLibrary("connections", v)}
        onRemove={(v) => removeFromLibrary("connections", v)}
        placeholder="Bijv. CB, TB, FL..."
        icon={SafeIcon(Layers, "text-blue-500")}
      />

      <LibrarySection
        title="Product Categorieën"
        items={data.product_names}
        onAdd={(v) => addToLibrary("product_names", v)}
        onRemove={(v) => removeFromLibrary("product_names", v)}
        placeholder="Bijv. Elbow, Tee..."
        icon={SafeIcon(Package, "text-purple-500")}
      />

      <LibrarySection
        title="Labels"
        items={data.labels}
        onAdd={(v) => addToLibrary("labels", v)}
        onRemove={(v) => removeFromLibrary("labels", v)}
        placeholder="Bijv. Standaard..."
        icon={SafeIcon(Tag, "text-orange-500")}
      />

      <LibrarySection
        title="Extra Codes"
        items={data.extraCodes}
        onAdd={(v) => addToLibrary("extraCodes", v)}
        onRemove={(v) => removeFromLibrary("extraCodes", v)}
        placeholder="Bijv. SDR11, WRAS..."
        icon={SafeIcon(Database, "text-emerald-500")}
      />

      <LibrarySection
        title="Drukklassen (PN)"
        items={data.pns}
        onAdd={(v) => addToLibrary("pns", v)}
        onRemove={(v) => removeFromLibrary("pns", v)}
        placeholder="Bijv. 10, 16..."
        icon={SafeIcon(Activity, "text-red-500")}
      />

      <LibrarySection
        title="Diameters (ID)"
        items={data.diameters}
        onAdd={(v) => addToLibrary("diameters", v)}
        onRemove={(v) => removeFromLibrary("diameters", v)}
        placeholder="Bijv. 80, 100..."
        icon={SafeIcon(Hash, "text-cyan-500")}
      />
    </div>
  );
};

export default LibraryView;
