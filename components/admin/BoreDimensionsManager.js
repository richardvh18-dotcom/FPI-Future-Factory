import React, { useState } from "react";
// AANPASSING: Settings toegevoegd aan imports
import {
  Search,
  Edit3,
  Trash2,
  Plus,
  Save,
  Loader2,
  X,
  Settings,
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";

const BoreDimensionsManager = ({ boreDimensions = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Filteren
  const filteredItems = boreDimensions.filter(
    (item) =>
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.pn).includes(searchTerm) ||
      String(item.dn).includes(searchTerm)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Genereer ID als het een nieuwe is
      let docId = editingItem.id;
      if (isCreating) {
        docId = `BORE_PN${editingItem.pn}_DN${editingItem.dn}`;
      }

      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "bore_dimensions", docId),
        {
          ...editingItem,
          id: docId,
        }
      );

      setEditingItem(null);
      setIsCreating(false);
      alert("✅ Opgeslagen!");
    } catch (error) {
      console.error("Fout bij opslaan:", error);
      alert("Fout bij opslaan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Zeker weten?")) {
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "public", "data", "bore_dimensions", id)
        );
      } catch (e) {
        console.error("Delete error:", e);
      }
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingItem({
      pn: "",
      dn: "",
      pcd: "",
      holes: "",
      thread: "",
      bolt: "",
    });
  };

  return (
    <div className="flex h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
      {/* LINKER KOLOM: LIJST */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-700">Bore Dimensions</h3>
          <button
            onClick={startCreate}
            className="bg-slate-900 text-white p-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
              placeholder="Zoek PN of DN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setEditingItem(item);
                setIsCreating(false);
              }}
              className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${
                editingItem?.id === item.id
                  ? "bg-slate-900 text-white"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              <span className="text-xs font-bold">
                PN{item.pn} - DN{item.dn}
              </span>
              <span className="text-[10px] opacity-60 font-mono">
                PCD: {item.pcd}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RECHTER KOLOM: EDITOR */}
      <div className="flex-1 bg-slate-50 p-8 flex items-center justify-center">
        {editingItem ? (
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 w-full max-w-lg animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {isCreating ? "Nieuwe Boormaat" : editingItem.id}
              </h3>
              {!isCreating && (
                <button
                  onClick={() => handleDelete(editingItem.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    PN (Druk)
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500"
                    value={editingItem.pn}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, pn: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    DN (Diameter)
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500"
                    value={editingItem.dn}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, dn: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    PCD
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500"
                    value={editingItem.pcd}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, pcd: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Gaten
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500"
                    value={editingItem.holes}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, holes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Draad (M)
                  </label>
                  <input
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500"
                    value={editingItem.thread}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, thread: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-slate-400 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg"
                >
                  {loading ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center text-slate-300">
            {/* Hier werd Settings gebruikt zonder import */}
            <Settings size={64} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">
              Selecteer een item of maak een nieuwe aan
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoreDimensionsManager;
