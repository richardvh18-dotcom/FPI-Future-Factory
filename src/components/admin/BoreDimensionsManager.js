import React, { useState, useEffect, useMemo } from "react";
import {
  CircleDashed,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId, logActivity, auth } from "../../config/firebase";

/**
 * BoreDimensionsManager.js - Beheer van boorpatronen en dimensies.
 * Geoptimaliseerde, compacte interface.
 */
const BoreDimensionsManager = () => {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Database connectie naar de juiste collectie
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "bore_dimensions"),
      (snap) => {
        setStandards(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const [formState, setFormState] = useState({
    name: "",
    description: "",
    specs: {},
  });

  const filteredStandards = useMemo(() => {
    return standards.filter(
      (s) =>
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [standards, searchTerm]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formState.name) return;
    try {
      const docId =
        editingId || formState.name.replace(/\s+/g, "_").toUpperCase();
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "bore_dimensions", docId),
        {
          ...formState,
          id: docId,
          updatedAt: new Date(),
        }
      );
      setIsEditing(false);
      setEditingId(null);
      logActivity(
        auth.currentUser,
        "BORE_DIM_SAVE",
        `Boormaat ${docId} opgeslagen.`
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-blue-600 mr-2" />
        <span className="font-bold text-slate-400 italic">Laden...</span>
      </div>
    );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar animate-in fade-in duration-500">
      <div className="w-full flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-4xl space-y-6">
          {/* COMPACTE HEADER - Gecentreerd */}
          <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <CircleDashed size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                  Boor dimensies
                </h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Standaarden & Steekcirkels
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingId(null);
                setFormState({ name: "", description: "", specs: {} });
                setIsEditing(true);
              }}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} /> Nieuwe Standaard
            </button>
          </div>

          {/* COMPACTE ZOEKBALK */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"
                size={16}
              />
              <input
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm transition-all"
                placeholder="Snelzoeken op naam (bijv. ASA 150)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* LIJST - GECENTREERD */}
          <div className="space-y-3">
            {filteredStandards.length > 0 ? (
              filteredStandards.map((std) => (
                <div
                  key={std.id}
                  className="bg-white rounded-[1.25rem] border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-colors"
                >
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-left">
                      <div className="min-w-[80px] text-center p-2 bg-slate-50 text-indigo-600 rounded-lg font-black text-[10px] italic border border-slate-100">
                        {std.id}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase italic text-xs leading-none">
                          {std.name || std.id}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                          {std.description || "Geen omschrijving beschikbaar"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setFormState(std);
                          setEditingId(std.id);
                          setIsEditing(true);
                        }}
                        className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            window.confirm(
                              "Deze boormaat definitief verwijderen uit de database?"
                            )
                          )
                            await deleteDoc(
                              doc(
                                db,
                                "artifacts",
                                appId,
                                "public",
                                "data",
                                "bore_dimensions",
                                std.id
                              )
                            );
                        }}
                        className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-slate-100 mb-3"
                />
                <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[9px]">
                  Geen data gevonden
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: EDITOR */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl space-y-6 border border-white/20 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-start text-left">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg">
                  <CircleDashed size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">
                    Boormaat Editor
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                    {editingId ? `ID: ${editingId}` : "Nieuwe configuratie"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-all active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Naam (bijv. ASA 150 of PN16)
                </label>
                <input
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  required
                  placeholder="Naam standaard..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Omschrijving
                </label>
                <input
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  placeholder="Bijv. DIN / EN Standaard voor flenzen..."
                />
              </div>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3 text-left">
              <div className="flex items-center gap-2 text-blue-600">
                <Info size={14} />
                <span className="text-[9px] font-black uppercase">
                  Database Info
                </span>
              </div>
              <p className="text-[9px] text-blue-800 leading-relaxed font-bold italic opacity-80">
                Hier beheer je de globale definities. Specifieke boormaten (PCD,
                n, d2) per diameter worden gekoppeld via de Smart Spec logica in
                de catalogus.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black uppercase text-xs rounded-2xl shadow-xl hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Save size={18} /> Gegevens Opslaan
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default BoreDimensionsManager;
