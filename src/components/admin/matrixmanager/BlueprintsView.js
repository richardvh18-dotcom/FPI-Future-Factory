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
} from "lucide-react";

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

  // Hulpfunctie om sleutel te genereren
  const generateKey = (type, conn, code) => {
    let key = `${type}_${conn}`;
    if (code) key += `_${code}`;
    return key;
  };

  // Groepeer blauwdrukken op Type
  const groupedBlueprints = useMemo(() => {
    const groups = {};
    Object.keys(blueprints)
      .sort()
      .forEach((key) => {
        // Als er een zoekterm is, filter dan eerst
        if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase()))
          return;

        const type = key.split("_")[0]; // Neem het eerste deel als groep (bijv. Elbow)
        if (!groups[type]) groups[type] = [];
        groups[type].push(key);
      });
    return groups;
  }, [blueprints, searchTerm]);

  // Toggle groep open/dicht
  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Selecteer een blauwdruk
  const handleSelect = (key) => {
    const parts = key.split("_");
    const type = parts[0];
    const conn = parts[1];
    const code = parts.slice(2).join("_");

    setSelectedBlueprintKey(key);
    setNewBlueprint({
      productType: type,
      connectionType: conn,
      extraCode: code,
      fields: blueprints[key].fields || [],
    });
  };

  const handleAddField = () => {
    if (newField && !newBlueprint.fields.includes(newField)) {
      setNewBlueprint({
        ...newBlueprint,
        fields: [...newBlueprint.fields, newField],
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

  const handleSave = () => {
    if (!newBlueprint.productType || !newBlueprint.connectionType) {
      alert("Product Type en Connectie Type zijn verplicht.");
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
    // We resetten niet volledig zodat je makkelijk verder kunt werken aan dezelfde
    if (!selectedBlueprintKey) {
      // Als het nieuw was, selecteer hem nu
      setSelectedBlueprintKey(key);
    }
  };

  const handleDelete = (key) => {
    if (
      window.confirm(
        `Weet je zeker dat je de blauwdruk '${key}' wilt verwijderen?`
      )
    ) {
      const updatedBlueprints = { ...blueprints };
      delete updatedBlueprints[key];
      setBlueprints(updatedBlueprints);
      setHasUnsavedChanges(true);
      if (selectedBlueprintKey === key) {
        resetForm();
      }
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
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* LINKER KOLOM: INKLAPBARE LIJST (Catalogus Stijl) */}
      <div className="w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Header met Zoekbalk */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Layers size={18} className="text-purple-500" />
              Blauwdrukken
            </h3>
            <button
              onClick={resetForm}
              className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 transition-colors shadow-sm shadow-purple-200"
              title="Nieuwe blauwdruk"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 transition-all"
              placeholder="Zoek blauwdruk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollbare Lijst met Groepen */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
          {Object.keys(groupedBlueprints).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Geen blauwdrukken gevonden.
            </div>
          ) : (
            Object.entries(groupedBlueprints).map(([group, items]) => (
              <div
                key={group}
                className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm"
              >
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    {group}
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-md">
                      {items.length}
                    </span>
                  </span>
                  {expandedGroups[group] ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </button>

                {/* Items in de groep */}
                {(expandedGroups[group] || searchTerm) && (
                  <div className="bg-white p-1 space-y-1">
                    {items.map((key) => (
                      <div
                        key={key}
                        onClick={() => handleSelect(key)}
                        className={`p-2 pl-4 rounded-lg cursor-pointer text-xs font-medium transition-all flex justify-between items-center group ${
                          selectedBlueprintKey === key
                            ? "bg-purple-50 text-purple-700 font-bold border border-purple-100"
                            : "hover:bg-slate-50 text-slate-500 border border-transparent"
                        }`}
                      >
                        <span className="truncate">{key}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(key);
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                          title="Verwijderen"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RECHTER KOLOM: EDITOR (Kaart Stijl) */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-1 rounded-md mb-2 inline-block">
                {selectedBlueprintKey ? "Modus: Bewerken" : "Modus: Nieuw"}
              </span>
              <h3 className="text-2xl font-black text-slate-800">
                {selectedBlueprintKey || "Nieuwe Blauwdruk"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Configureer de vereiste afmetingen voor dit onderdeel.
              </p>
            </div>
            {selectedBlueprintKey && (
              <button
                onClick={resetForm}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={14} /> Sluiten
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">
                Product Type
              </label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-purple-500 focus:bg-white outline-none transition-all appearance-none"
                  value={newBlueprint.productType}
                  onChange={(e) =>
                    setNewBlueprint({
                      ...newBlueprint,
                      productType: e.target.value,
                    })
                  }
                  disabled={!!selectedBlueprintKey}
                >
                  <option value="">- Selecteer Type -</option>
                  <option value="Algemeen">Algemeen (Fallback)</option>
                  {libraryData?.product_names
                    ?.filter((p) => p !== "Algemeen")
                    .map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">
                Connectie
              </label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-purple-500 focus:bg-white outline-none transition-all appearance-none"
                  value={newBlueprint.connectionType}
                  onChange={(e) =>
                    setNewBlueprint({
                      ...newBlueprint,
                      connectionType: e.target.value,
                    })
                  }
                  disabled={!!selectedBlueprintKey}
                >
                  <option value="">- Selecteer Connectie -</option>
                  {libraryData?.connections?.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">
                Extra Code (Optioneel)
              </label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-purple-500 focus:bg-white outline-none transition-all appearance-none"
                  value={newBlueprint.extraCode}
                  onChange={(e) =>
                    setNewBlueprint({
                      ...newBlueprint,
                      extraCode: e.target.value,
                    })
                  }
                  disabled={!!selectedBlueprintKey}
                >
                  <option value="">- Geen -</option>
                  {libraryData?.extraCodes?.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-black text-slate-400 uppercase ml-1">
                Velden Configuratie
              </label>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                {newBlueprint.fields.length} velden
              </span>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-purple-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
                placeholder="Nieuw veld (bijv. L, Z)..."
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddField()}
              />
              <button
                onClick={handleAddField}
                disabled={!newField}
                className="bg-slate-900 text-white px-5 rounded-xl font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[120px] p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 content-start">
              {newBlueprint.fields.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 py-4">
                  <Layers size={32} className="mb-2 opacity-50" />
                  <span className="text-sm font-medium">
                    Nog geen velden toegevoegd
                  </span>
                </div>
              ) : (
                newBlueprint.fields.map((field) => (
                  <span
                    key={field}
                    className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-3 shadow-sm group hover:border-purple-200 transition-all"
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

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              className="bg-purple-600 text-white px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 shadow-xl shadow-purple-200 transform hover:-translate-y-1 transition-all flex items-center gap-2"
            >
              <Save size={18} />
              {selectedBlueprintKey ? "Wijzigingen Opslaan" : "Toevoegen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintsView;
