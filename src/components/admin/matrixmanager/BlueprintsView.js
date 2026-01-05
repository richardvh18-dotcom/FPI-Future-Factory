import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, ArrowLeft, Layers, X, ChevronUp, ChevronDown, ChevronRight, // TOEGEVOEGD
  Tag, Save, Search, Folder, Edit2, FileText 
} from 'lucide-react';
import { doc, setDoc } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

const BlueprintsView = ({ blueprints, setBlueprints, libraryData, setHasUnsavedChanges }) => {
  // State voor navigatie
  const [viewMode, setViewMode] = useState('list'); // 'list' of 'editor'
  const [editingBlueprint, setEditingBlueprint] = useState(null);
  
  // State voor lijst
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  // State voor editor formulier
  const [bpType, setBpType] = useState("");
  const [bpConn, setBpConn] = useState("");
  const [bpCode, setBpCode] = useState("");

  // --- LOGICA VOOR LIJST ---

  // 1. Filteren en Groeperen
  const groupedBlueprints = useMemo(() => {
    const filtered = Object.entries(blueprints).filter(([key, bp]) => 
      key.toLowerCase().includes(searchTerm.toLowerCase()) || 
      bp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = {};
    filtered.forEach(([key, bp]) => {
      // Probeer het type te raden uit de sleutel (deel voor de eerste underscore)
      const type = key.split('_')[0] || "Overig";
      if (!groups[type]) groups[type] = [];
      groups[type].push({ key, ...bp });
    });

    return groups;
  }, [blueprints, searchTerm]);

  // 2. Zet groepen standaard open
  useEffect(() => {
    const initialExpanded = {};
    Object.keys(groupedBlueprints).forEach(key => initialExpanded[key] = true);
    setExpandedGroups(initialExpanded);
  }, [Object.keys(groupedBlueprints).length]); // Alleen bij verandering van groepen

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // --- LOGICA VOOR EDITOR ---

  // Update sleutel en naam live tijdens bewerken (alleen bij nieuwe of als key verandert)
  useEffect(() => {
    if (viewMode === 'editor' && (bpType || bpConn)) {
      let newKey = `${bpType}_${bpConn}`;
      if (bpCode) newKey += `_${bpCode}`;
      
      const newName = bpCode ? `${bpType} (${bpCode})` : bpType;

      // Alleen updaten als de basis verandert, velden behouden
      setEditingBlueprint((prev) => ({
        ...prev,
        key: newKey,
        name: newName,
      }));
    }
  }, [bpType, bpConn, bpCode, viewMode]);

  // Start met bewerken
  const handleEdit = (key, bpData) => {
    setEditingBlueprint({ ...bpData, fields: [...(bpData.fields || [])], key });
    
    // Parse de sleutel om de dropdowns te vullen
    const parts = key.split('_');
    let foundType = "";
    let foundConn = "";
    let foundCode = "";

    if (parts.length >= 2) {
        foundType = parts[0];
        // Check of deel 2 een bekende connectie is uit de library
        if (libraryData.connections.includes(parts[1])) {
             foundConn = parts[1];
             if (parts.length > 2) foundCode = parts.slice(2).join('_');
        } else {
             foundConn = parts[1];
        }
    }

    setBpType(foundType);
    setBpConn(foundConn);
    setBpCode(foundCode);
    setViewMode('editor');
  };

  // Start Nieuwe
  const handleCreate = () => {
    setEditingBlueprint({ key: "", name: "", fields: [] });
    setBpType("");
    setBpConn("");
    setBpCode("");
    setViewMode('editor');
  };

  const handleBack = () => {
    setEditingBlueprint(null);
    setViewMode('list');
  };

  const handleSaveBlueprint = async () => {
    if (!editingBlueprint.key) return alert("Ongeldige configuratie. Selecteer Type en Mof.");
    
    const newBlueprints = {
        ...blueprints,
        [editingBlueprint.key]: { 
            name: editingBlueprint.name, 
            fields: editingBlueprint.fields || [] 
        }
    };
    setBlueprints(newBlueprints);

    try {
        await setDoc(doc(db, "artifacts", appId, "public", "data", "settings", "product_templates"), newBlueprints);
        setHasUnsavedChanges(false);
        alert("✅ Blauwdruk opgeslagen!");
        setViewMode('list'); // Terug naar lijst na opslaan
    } catch (e) {
        console.error("Fout bij opslaan blauwdruk:", e);
        alert("Fout bij opslaan.");
    }
  };

  const deleteBlueprint = async (key) => {
    if (!window.confirm("Weet je zeker dat je deze blauwdruk wilt verwijderen?")) return;

    const newBlueprints = { ...blueprints };
    delete newBlueprints[key];
    setBlueprints(newBlueprints);

    try {
        await setDoc(doc(db, "artifacts", appId, "public", "data", "settings", "product_templates"), newBlueprints);
        if (viewMode === 'editor') handleBack();
    } catch (e) {
        console.error("Fout bij verwijderen:", e);
    }
  };

  const moveField = (index, direction) => {
    if (!editingBlueprint || !editingBlueprint.fields) return;
    const newFields = [...editingBlueprint.fields];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newFields.length) return;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setEditingBlueprint(prev => ({ ...prev, fields: newFields }));
  };

  // --- RENDER: EDITOR MODUS ---
  if (viewMode === 'editor' && editingBlueprint) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header Editor */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
             <button onClick={handleBack} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-slate-500">
                <ArrowLeft size={20} />
             </button>
             <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Layers className="text-purple-500" />
                    {editingBlueprint.key ? "Blauwdruk Bewerken" : "Nieuwe Blauwdruk"}
                </h3>
             </div>
          </div>
          
          {/* Delete knop alleen als key bestaat in originele lijst (niet nieuw) */}
          {blueprints[editingBlueprint.key] && (
            <button
              onClick={() => deleteBlueprint(editingBlueprint.key)}
              className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-3 rounded-xl transition-colors"
              title="Verwijder blauwdruk"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LINKER KOLOM: CONFIGURATIE */}
            <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">1. Eigenschappen</h4>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Product Type</label>
                        <select
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                            value={bpType}
                            onChange={(e) => setBpType(e.target.value)}
                        >
                            <option value="">- Kies Type -</option>
                            <option value="Algemeen">Algemeen</option>
                            {libraryData.product_names
                            .filter((p) => p !== "Algemeen")
                            .flatMap((p) => [
                                <option key={p} value={p}>{p}</option>,
                                <option key={`${p}_Socket`} value={`${p}_Socket`}>{p}_Socket</option>
                            ])}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mof Type</label>
                        <select
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                            value={bpConn}
                            onChange={(e) => setBpConn(e.target.value)}
                        >
                            <option value="">- Kies Mof -</option>
                            {libraryData.connections.map((c) => (
                            <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Extra Code</label>
                        <div className="relative">
                            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                                value={bpCode}
                                onChange={(e) => setBpCode(e.target.value)}
                            >
                                <option value="">- Geen -</option>
                                {libraryData.codes && libraryData.codes.map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm border-b border-blue-200 pb-2 mb-3">Resultaat</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-blue-400 mb-1 uppercase">Naam</label>
                            <div className="text-sm font-bold text-blue-900">{editingBlueprint.name || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-400 mb-1 uppercase">Sleutel</label>
                            <div className="text-xs font-mono text-blue-700 bg-white/50 p-2 rounded border border-blue-100 break-all">{editingBlueprint.key || "-"}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RECHTER KOLOM: VELDEN EDITOR */}
            <div className="lg:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col">
                <h4 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2 mb-4 flex justify-between items-center">
                    <span>2. Velden Definitie</span>
                    <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">{editingBlueprint.fields?.length || 0} velden</span>
                </h4>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
                     {(editingBlueprint.fields || []).map((field, index) => (
                      <div
                        key={`${field}-${index}`}
                        className="bg-white border border-slate-200 p-3 mb-2 rounded-xl flex items-center justify-between shadow-sm group hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveField(index, -1)} disabled={index === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ChevronUp size={14} /></button>
                            <button onClick={() => moveField(index, 1)} disabled={index === (editingBlueprint.fields.length - 1)} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ChevronDown size={14} /></button>
                          </div>
                          <span className="text-sm font-bold text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded">{field}</span>
                        </div>
                        <button onClick={() => setEditingBlueprint((p) => ({ ...p, fields: p.fields.filter((_, i) => i !== index), }))} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"><X size={18} /></button>
                      </div>
                    ))}
                    {(editingBlueprint.fields || []).length === 0 && (
                        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <FileText size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nog geen velden toegevoegd.</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 border-t border-slate-200 pt-4">
                    <input
                      id="newFieldInput"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Nieuw veld typen (bv. B1)..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !editingBlueprint.fields?.includes(val)) {
                            setEditingBlueprint((p) => ({ ...p, fields: [...(p.fields || []), val] }));
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
                          setEditingBlueprint((p) => ({ ...p, fields: [...(p.fields || []), val] }));
                          input.value = "";
                        }
                      }}
                      className="bg-slate-800 text-white px-6 rounded-xl text-sm font-black hover:bg-slate-700 transition-colors"
                    >
                      + Toevoegen
                    </button>
                  </div>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button onClick={handleSaveBlueprint} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-sm flex items-center gap-2">
                <Save size={18} /> Opslaan & Sluiten
            </button>
        </div>

      </div>
    );
  }

  // --- RENDER: LIJST MODUS ---
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      
      {/* Header & Zoeken */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-4 flex-1">
             <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                 <Layers size={24} />
             </div>
             <div>
                 <h2 className="text-xl font-black text-slate-800">Blauwdrukken</h2>
                 <p className="text-sm text-slate-400 font-medium">Beheer templates voor maten</p>
             </div>
        </div>
        <div className="flex gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-200 w-64"
                    placeholder="Zoek blauwdruk..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button
                onClick={handleCreate}
                className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
            >
                <Plus size={16} /> Nieuwe Blauwdruk
            </button>
        </div>
      </div>

      {/* Groepen Lijst */}
      <div className="space-y-4">
        {Object.keys(groupedBlueprints).length === 0 ? (
             <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Layers size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">Geen blauwdrukken gevonden</p>
             </div>
        ) : (
            Object.entries(groupedBlueprints).map(([group, items]) => (
                <div key={group} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Groep Header */}
                    <div 
                        className="bg-slate-50/50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors select-none border-b border-slate-100"
                        onClick={() => toggleGroup(group)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400">
                                {expandedGroups[group] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </div>
                            <div className="flex items-center gap-3">
                                <Folder size={18} className="text-purple-400" />
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">{group}</h3>
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                                    {items.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    {expandedGroups[group] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50/30">
                            {items.map((bp) => (
                                <div
                                    key={bp.key}
                                    onClick={() => handleEdit(bp.key, bp)}
                                    className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-purple-700 transition-colors">{bp.name}</h4>
                                        <Edit2 size={14} className="text-slate-300 group-hover:text-purple-400" />
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {(bp.fields || []).slice(0, 4).map(f => (
                                            <span key={f} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 font-mono">
                                                {f}
                                            </span>
                                        ))}
                                        {(bp.fields || []).length > 4 && (
                                            <span className="text-[10px] text-slate-400 px-1">+{bp.fields.length - 4}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default BlueprintsView;