import React, { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Save,
  X,
  Edit3,
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  Database,
  Info,
  Type,
  AlertCircle,
} from "lucide-react";

/**
 * BlueprintsView: Beheert de technische velden per product-mof combinatie.
 * Gekoppeld aan: /artifacts/fittings-app-v1/public/data/settings/general_config voor de opties.
 * Data zelf wordt opgeslagen in: public/data/settings/product_templates
 */
const BlueprintsView = ({
  blueprints,
  setBlueprints,
  libraryData,
  setHasUnsavedChanges,
}) => {
  const [selectedBlueprintKey, setSelectedBlueprintKey] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const [newBlueprint, setNewBlueprint] = useState({
    productType: "",
    connectionType: "",
    extraCode: "",
    fields: [],
  });
  const [newField, setNewField] = useState("");

  // --- DATA KOPPELING MET GENERAL_CONFIG ---
  // We halen de types en moffen direct uit de libraryData (die uit general_config komt)
  const availableTypes = useMemo(() => {
    const types = libraryData?.product_names || [];
    return [...types].sort();
  }, [libraryData]);

  const availableConnections = useMemo(() => {
    const conns = libraryData?.connections || [];
    return [...conns].sort();
  }, [libraryData]);

  const availableExtraCodes = useMemo(() => {
    const codes = libraryData?.extraCodes || libraryData?.codes || [];
    return [...codes].sort();
  }, [libraryData]);

  // Hulpfunctie om sleutel te genereren
  const generateKey = (type, conn, code) => {
    let key = `${type}_${conn}`;
    if (code && code !== "-") key += `_${code}`;
    return key;
  };

  // Groepeer blauwdrukken op Product Type (bijv. Elbow, Pipe)
  const groupedBlueprints = useMemo(() => {
    const groups = {};
    const keys = Object.keys(blueprints || {}).sort();

    keys.forEach((key) => {
      if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase()))
        return;

      const type = key.split("_")[0];
      if (!groups[type]) groups[type] = [];
      groups[type].push(key);
    });
    return groups;
  }, [blueprints, searchTerm]);

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleSelect = (key) => {
    const parts = key.split("_");
    const type = parts[0];
    const conn = parts[1];
    const code = parts.slice(2).join("_");

    setSelectedBlueprintKey(key);
    setNewBlueprint({
      productType: type,
      connectionType: conn,
      extraCode: code || "",
      fields: blueprints[key].fields || [],
    });
  };

  const handleAddField = () => {
    const field = newField.trim().toUpperCase();
    if (field && !newBlueprint.fields.includes(field)) {
      setNewBlueprint({
        ...newBlueprint,
        fields: [...newBlueprint.fields, field],
      });
      setNewField("");
    }
  };

  const handleRemoveField = (fieldToRemove) => {
    setNewBlueprint({
      ...newBlueprint,
      fields: newBlueprint.fields.filter((f) => f !== fieldToRemove),
    });
  };

  const handleSaveToLocalState = () => {
    if (!newBlueprint.productType || !newBlueprint.connectionType) {
      alert("Selecteer een Product Type en Mof.");
      return;
    }

    const key = generateKey(
      newBlueprint.productType,
      newBlueprint.connectionType,
      newBlueprint.extraCode
    );

    const updatedBlueprints = {
      ...blueprints,
      [key]: {
        fields: newBlueprint.fields,
      },
    };

    setBlueprints(updatedBlueprints);
    setHasUnsavedChanges(true);
    setSelectedBlueprintKey(key);
  };

  const handleDelete = (key) => {
    if (window.confirm(`Blauwdruk '${key}' verwijderen?`)) {
      const updatedBlueprints = { ...blueprints };
      delete updatedBlueprints[key];
      setBlueprints(updatedBlueprints);
      setHasUnsavedChanges(true);
      if (selectedBlueprintKey === key) resetForm();
    }
  };

  const resetForm = () => {
    setSelectedBlueprintKey(null);
    setNewBlueprint({
      productType: "",
      connectionType: "",
      extraCode: "",
      fields: [],
    });
    setNewField("");
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)] animate-in fade-in duration-500 text-left">
      {/* LINKER KOLOM: LIJST */}
      <div className="w-1/3 bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Layers size={18} className="text-purple-600" />
                Templates
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">
                Product-Mof Combinaties
              </p>
            </div>
            <button
              onClick={resetForm}
              className="bg-purple-600 text-white p-2.5 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
              title="Nieuwe blauwdruk"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
              size={16}
            />
            <input
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-purple-400 transition-all"
              placeholder="Zoek in bestaande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-white">
          {Object.keys(groupedBlueprints).length === 0 ? (
            <div className="py-20 text-center text-slate-300 italic text-xs">
              Geen blauwdrukken geconfigureerd.
            </div>
          ) : (
            Object.entries(groupedBlueprints).map(([group, items]) => (
              <div
                key={group}
                className="border border-slate-100 rounded-[20px] overflow-hidden bg-slate-50/30"
              >
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-black text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    {group}
                    <span className="bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-md ml-1">
                      {items.length}
                    </span>
                  </span>
                  {expandedGroups[group] ? (
                    <ChevronDown size={14} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-400" />
                  )}
                </button>

                {(expandedGroups[group] || searchTerm) && (
                  <div className="bg-white p-2 space-y-1">
                    {items.map((key) => (
                      <div
                        key={key}
                        onClick={() => handleSelect(key)}
                        className={`p-3 pl-4 rounded-xl cursor-pointer text-[10px] font-bold transition-all flex justify-between items-center group ${
                          selectedBlueprintKey === key
                            ? "bg-purple-600 text-white shadow-lg"
                            : "hover:bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span className="truncate font-mono">{key}</span>
                        <Trash2
                          size={14}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 ${
                            selectedBlueprintKey === key ? "text-white" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(key);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RECHTER KOLOM: EDITOR */}
      <div className="flex-1 bg-white rounded-[40px] border border-slate-200 shadow-sm p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center gap-2">
                  <Database size={12} />{" "}
                  {selectedBlueprintKey ? "Bewerken" : "Nieuwe Configuratie"}
                </span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
                {selectedBlueprintKey || "Blauwdruk Designer"}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                Koppel technische velden aan producten uit de bibliotheek
              </p>
            </div>
            {selectedBlueprintKey && (
              <button
                onClick={resetForm}
                className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* DROP DOWNS GEKOPPELD AAN GENERAL_CONFIG */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                1. Product Type (Bron: Bibliotheek)
              </label>
              <select
                className={`w-full border-2 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all ${
                  selectedBlueprintKey
                    ? "bg-slate-100 border-slate-200 text-slate-400"
                    : "bg-slate-50 border-slate-100 focus:border-purple-500"
                }`}
                value={newBlueprint.productType}
                onChange={(e) =>
                  setNewBlueprint({
                    ...newBlueprint,
                    productType: e.target.value,
                  })
                }
                disabled={!!selectedBlueprintKey}
              >
                <option value="">- Kies Type -</option>
                {availableTypes.length === 0 && (
                  <option disabled>Geen data in bibliotheek...</option>
                )}
                {availableTypes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                2. Connectie / Mof (Bron: Bibliotheek)
              </label>
              <select
                className={`w-full border-2 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all ${
                  selectedBlueprintKey
                    ? "bg-slate-100 border-slate-200 text-slate-400"
                    : "bg-slate-50 border-slate-100 focus:border-purple-500"
                }`}
                value={newBlueprint.connectionType}
                onChange={(e) =>
                  setNewBlueprint({
                    ...newBlueprint,
                    connectionType: e.target.value,
                  })
                }
                disabled={!!selectedBlueprintKey}
              >
                <option value="">- Kies Mof -</option>
                {availableConnections.length === 0 && (
                  <option disabled>Geen data in bibliotheek...</option>
                )}
                {availableConnections.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-10">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
              3. Extra Code (Optioneel)
            </label>
            <select
              className={`w-full border-2 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all ${
                selectedBlueprintKey
                  ? "bg-slate-100 border-slate-200 text-slate-400"
                  : "bg-slate-50 border-slate-100 focus:border-purple-500"
              }`}
              value={newBlueprint.extraCode}
              onChange={(e) =>
                setNewBlueprint({ ...newBlueprint, extraCode: e.target.value })
              }
              disabled={!!selectedBlueprintKey}
            >
              <option value="-">- Standaard (Geen code) -</option>
              {availableExtraCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 mb-10">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Type size={14} /> Gedefinieerde Velden (
                {newBlueprint.fields.length})
              </h4>
            </div>

            <div className="flex gap-3 mb-6">
              <input
                className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-purple-500 outline-none transition-all placeholder:text-slate-300"
                placeholder="Nieuw veld (B1, L, Z, Radius)..."
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddField()}
              />
              <button
                onClick={handleAddField}
                disabled={!newField}
                className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-purple-600 transition-all disabled:opacity-20 shadow-lg"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[120px] content-start">
              {newBlueprint.fields.length === 0 ? (
                <div className="w-full py-12 text-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <p className="text-[10px] font-black uppercase tracking-widest italic">
                    Nog geen technische velden toegevoegd
                  </p>
                </div>
              ) : (
                newBlueprint.fields.map((field) => (
                  <span
                    key={field}
                    className="bg-white border-2 border-slate-100 px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 flex items-center gap-3 shadow-sm hover:border-purple-200 transition-all group animate-in zoom-in"
                  >
                    {field}
                    <button
                      onClick={() => handleRemoveField(field)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col items-center pt-6 border-t border-slate-100">
            <button
              onClick={handleSaveToLocalState}
              disabled={
                !newBlueprint.productType || !newBlueprint.connectionType
              }
              className="w-full max-w-sm bg-purple-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 shadow-2xl shadow-purple-100 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
            >
              <Save size={20} />
              Bevestig Wijzigingen
            </button>
            <div className="mt-6 p-5 bg-blue-50 rounded-[24px] border border-blue-100 flex items-start gap-4 opacity-80 max-w-xl">
              <AlertCircle
                size={20}
                className="text-blue-500 shrink-0 mt-0.5"
              />
              <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
                Tip: Deze keuzelijsten worden live gesynchroniseerd met de{" "}
                <strong>Bibliotheek</strong> tab. Wijzigingen daar verschijnen
                direct hier als opties. Vergeet niet de Hub op te slaan na het
                bevestigen!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintsView;
