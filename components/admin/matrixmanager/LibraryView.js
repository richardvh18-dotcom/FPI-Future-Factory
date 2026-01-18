import React from "react";
import {
  Layers,
  Package,
  Tag,
  Database,
  Activity,
  Hash,
  RotateCw,
  Target,
} from "lucide-react";
import LibrarySection from "./LibrarySection";

/**
 * LibraryView: Beheert de dropdown-opties in de database.
 * UPDATE: 'Bore Dimensions' categorie toegevoegd voor centraal beheer van boringen.
 */
const LibraryView = ({ libraryData, setLibraryData, setHasUnsavedChanges }) => {
  const addToLibrary = (key, value) => {
    if (!value || !value.toString().trim()) return;
    let newValue = value.toString().trim();

    // PN, Diameters en Graden opslaan als getallen indien mogelijk
    if (key === "pns" || key === "diameters" || key === "angles") {
      const num = Number(newValue);
      if (!isNaN(num)) newValue = num;
    }

    setLibraryData((prev) => {
      const currentList = Array.isArray(prev[key]) ? prev[key] : [];
      if (currentList.includes(newValue)) return prev;

      const updatedList = [...currentList, newValue];

      // Sortering (nummers vs tekst)
      if (key === "pns" || key === "diameters" || key === "angles") {
        updatedList.sort((a, b) => a - b);
      } else {
        updatedList.sort();
      }

      return { ...prev, [key]: updatedList };
    });

    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const removeFromLibrary = (key, value) => {
    setLibraryData((prev) => {
      const currentList = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: currentList.filter((i) => i !== value),
      };
    });

    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  };

  // VEILIGE DATA MAPPING
  const data = {
    connections: libraryData?.connections || [],
    product_names: libraryData?.product_names || [],
    labels: libraryData?.labels || [],
    extraCodes: libraryData?.extraCodes || [],
    pns: libraryData?.pns || [],
    diameters: libraryData?.diameters || [],
    angles: libraryData?.angles || [],
    borings: libraryData?.borings || libraryData?.extraCodes || [], // Mapping voor boringen
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 text-left pb-20">
      <LibrarySection
        title="Moffen & Verbindingen"
        items={data.connections}
        onAdd={(v) => addToLibrary("connections", v)}
        onRemove={(v) => removeFromLibrary("connections", v)}
        placeholder="Bijv. CB, TB..."
        icon={<Layers size={18} className="text-blue-500" />}
      />

      <LibrarySection
        title="Product Categorieën"
        items={data.product_names}
        onAdd={(v) => addToLibrary("product_names", v)}
        onRemove={(v) => removeFromLibrary("product_names", v)}
        placeholder="Bijv. Elbow, Tee..."
        icon={<Package size={18} className="text-purple-500" />}
      />

      <LibrarySection
        title="Labels"
        items={data.labels}
        onAdd={(v) => addToLibrary("labels", v)}
        onRemove={(v) => removeFromLibrary("labels", v)}
        placeholder="Bijv. Potable, WRAS..."
        icon={<Tag size={18} className="text-orange-500" />}
      />

      <LibrarySection
        title="Graden (Hoeken)"
        items={data.angles}
        onAdd={(v) => addToLibrary("angles", v)}
        onRemove={(v) => removeFromLibrary("angles", v)}
        placeholder="Bijv. 45, 90..."
        icon={<RotateCw size={18} className="text-amber-500" />}
      />

      {/* NIEUW: BORE DIMENSIONS CATEGORIE */}
      <LibrarySection
        title="Bore Dimensions (Boring)"
        items={data.borings}
        onAdd={(v) => addToLibrary("borings", v)}
        onRemove={(v) => removeFromLibrary("borings", v)}
        placeholder="Bijv. DIN PN10, ANSI 150..."
        icon={<Target size={18} className="text-indigo-500" />}
      />

      <LibrarySection
        title="Drukklassen (PN)"
        items={data.pns}
        onAdd={(v) => addToLibrary("pns", v)}
        onRemove={(v) => removeFromLibrary("pns", v)}
        placeholder="Bijv. 10, 16..."
        icon={<Activity size={18} className="text-red-500" />}
      />

      <LibrarySection
        title="Diameters (ID)"
        items={data.diameters}
        onAdd={(v) => addToLibrary("diameters", v)}
        onRemove={(v) => removeFromLibrary("diameters", v)}
        placeholder="Bijv. 80, 100..."
        icon={<Hash size={18} className="text-cyan-500" />}
      />

      <LibrarySection
        title="Extra Codes"
        items={data.extraCodes}
        onAdd={(v) => addToLibrary("extraCodes", v)}
        onRemove={(v) => removeFromLibrary("extraCodes", v)}
        placeholder="Bijv. SDR11..."
        icon={<Database size={18} className="text-emerald-500" />}
      />
    </div>
  );
};

export default LibraryView;
