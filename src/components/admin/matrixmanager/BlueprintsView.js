import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  Layers,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const BlueprintsView = ({
  blueprints,
  setBlueprints,
  libraryData,
  setHasUnsavedChanges,
}) => {
  const [editingBlueprint, setEditingBlueprint] = useState(null);
  const [bpType, setBpType] = useState("");
  const [bpConn, setBpConn] = useState("");

  // Update sleutel en naam wanneer selecties veranderen
  useEffect(() => {
    if (editingBlueprint && (bpType || bpConn)) {
      const newKey = `${bpType}_${bpConn}`;
      const newName = bpType;

      setEditingBlueprint((prev) => ({
        ...prev,
        key: newKey,
        name: newName,
      }));
    }
  }, [bpType, bpConn]);

  const selectBlueprintForEdit = (key, bpData) => {
    // Zorg voor een diepe kopie van de fields array om mutatie problemen te voorkomen
    setEditingBlueprint({ ...bpData, fields: [...(bpData.fields || [])], key });

    let foundType = "";
    let foundConn = "";

    if (libraryData.product_names) {
      foundType =
        libraryData.product_names.find((p) => key.startsWith(p)) || "";
    }
    if (key.startsWith("Algemeen")) foundType = "Algemeen";

    if (libraryData.connections) {
      foundConn =
        libraryData.connections.find((c) => key.includes(c) && c !== "") || "";
    }

    if (!foundType || !foundConn) {
      const parts = key.split("_");
      if (parts.length === 2) {
        if (!foundType) foundType = parts[0];
        if (!foundConn) foundConn = parts[1];
      }
    }

    setBpType(foundType);
    setBpConn(foundConn);
  };

  const handleSaveBlueprint = (bp) => {
    if (!bp.name || !bp.key) return alert("Selecteer een Product en Mof.");
    setBlueprints((prev) => ({
      ...prev,
      [bp.key]: { name: bp.name, fields: bp.fields || [] },
    }));
    setEditingBlueprint(null);
    setBpType("");
    setBpConn("");
    setHasUnsavedChanges(true);
  };

  const deleteBlueprint = (key) => {
    if (!window.confirm("Verwijderen?")) return;
    setBlueprints((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
    setHasUnsavedChanges(true);
  };

  // --- NIEUWE FUNCTIE: Veld verplaatsen ---
  const moveField = (index, direction) => {
    if (!editingBlueprint || !editingBlueprint.fields) return;

    const newFields = [...editingBlueprint.fields];
    const newIndex = index + direction;

    // Check of we binnen de grenzen blijven
    if (newIndex < 0 || newIndex >= newFields.length) return;

    // Wissel items om
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[index],
    ];

    setEditingBlueprint((prev) => ({ ...prev, fields: newFields }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 w-full max-w-6xl mx-auto">
      {/* LINKER KOLOM: LIJST */}
      <div className="lg:col-span-1 space-y-4">
        <div
          onClick={() => {
            setEditingBlueprint({ key: "", name: "", fields: [] });
            setBpType("");
            setBpConn("");
          }}
          className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors text-slate-400 font-bold text-sm"
        >
          <Plus size={18} /> Nieuwe Blauwdruk
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
          {Object.entries(blueprints).map(([key, bp]) => (
            <div
              key={key}
              onClick={() => selectBlueprintForEdit(key, bp)}
              className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${
                editingBlueprint?.key === key
                  ? "border-blue-500 shadow-md ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {bp.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 break-all">
                    {key}
                  </p>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECHTER KOLOM: EDITOR */}
      <div className="lg:col-span-2">
        {editingBlueprint ? (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {editingBlueprint.key
                  ? "Blauwdruk Bewerken"
                  : "Nieuwe Blauwdruk"}
              </h3>
              {editingBlueprint.key && (
                <button
                  onClick={() => deleteBlueprint(editingBlueprint.key)}
                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Verwijder blauwdruk"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* SELECTIES */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    1. Type
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    value={bpType}
                    onChange={(e) => setBpType(e.target.value)}
                  >
                    <option value="">- Kies Type -</option>
                    <option value="Algemeen">Algemeen</option>
                    {libraryData.product_names
                      .filter((p) => p !== "Algemeen")
                      .map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    2. Mof
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    value={bpConn}
                    onChange={(e) => setBpConn(e.target.value)}
                  >
                    <option value="">- Kies Mof -</option>
                    {libraryData.connections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* READONLY INFO */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    Gegenereerde Naam
                  </label>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-200">
                    {editingBlueprint.name || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    Gegenereerde Sleutel
                  </label>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm font-mono text-emerald-600 border border-slate-200 break-all">
                    {editingBlueprint.key || "-"}
                  </div>
                </div>
              </div>

              {/* VELDEN EDITOR (MET RANGSCHIKKEN) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                  Velden (Specificaties)
                </label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[100px]">
                  {/* NIEUWE VELDEN LIJST */}
                  <div className="space-y-2 mb-4">
                    {(editingBlueprint.fields || []).map((field, index) => (
                      <div
                        key={`${field}-${index}`}
                        className="bg-white border border-slate-200 p-2 rounded-lg flex items-center justify-between shadow-sm group hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Sorteer Knoppen */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveField(index, -1)}
                              disabled={index === 0}
                              className="text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => moveField(index, 1)}
                              disabled={
                                index === editingBlueprint.fields.length - 1
                              }
                              className="text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          <span className="text-sm font-bold text-slate-700 font-mono">
                            {field}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            setEditingBlueprint((p) => ({
                              ...p,
                              fields: p.fields.filter((_, i) => i !== index),
                            }))
                          }
                          className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}

                    {(editingBlueprint.fields || []).length === 0 && (
                      <div className="text-center py-4 text-slate-400 text-xs italic">
                        Nog geen velden toegevoegd.
                      </div>
                    )}
                  </div>

                  {/* Veld Toevoegen */}
                  <div className="flex gap-2 border-t border-slate-200 pt-4">
                    <input
                      id="newFieldInput"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Nieuw veld (bijv. B1, L, Z)..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !editingBlueprint.fields?.includes(val)) {
                            setEditingBlueprint((p) => ({
                              ...p,
                              fields: [...(p.fields || []), val],
                            }));
                            e.target.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("newFieldInput");
                        const val = input.value.trim();
                        if (val && !editingBlueprint.fields?.includes(val)) {
                          setEditingBlueprint((p) => ({
                            ...p,
                            fields: [...(p.fields || []), val],
                          }));
                          input.value = "";
                        }
                      }}
                      className="bg-slate-900 text-white px-4 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      + Toevoegen
                    </button>
                  </div>
                </div>
              </div>

              {/* OPSLAAN KNOP */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleSaveBlueprint(editingBlueprint)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-sm"
                >
                  Opslaan & Sluiten
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl min-h-[400px] bg-slate-50/50">
            <Layers size={64} className="mb-4 opacity-20" />
            <p className="font-bold text-lg text-slate-400">
              Selecteer een blauwdruk
            </p>
            <p className="text-xs">
              Klik links om te bewerken of maak een nieuwe aan
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlueprintsView;
