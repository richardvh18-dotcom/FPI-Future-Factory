import React, { useState, useMemo } from "react";
import {
  Wrench,
  MapPin,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  PackageCheck,
  Hash,
  ArrowUpDown,
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, appId, auth, logActivity } from "../../config/firebase";
import { STANDARD_DIAMETERS, STANDARD_PRESSURES } from "../../data/constants";

/**
 * AdminLocationsView: Register van gereedschappen en stelling-locaties.
 * Functies voor bewerken zijn nu beveiligd met de canEdit prop.
 */
const AdminLocationsView = ({ moffen = [], canEdit = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formState, setFormState] = useState({
    type: "TB",
    diameter: "200",
    pressure: "16",
    location: "",
    stock: 0,
    minStock: 5,
    toolName: "",
  });

  const filteredMoffen = useMemo(() => {
    return moffen
      .filter((m) =>
        `${m.type} ${m.diameter} ${m.location} ${m.toolName || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => Number(a.diameter) - Number(b.diameter));
  }, [moffen, searchTerm]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      const docId =
        editingId ||
        `${formState.type}_${formState.diameter}_${formState.pressure}`.toLowerCase();
      const data = {
        ...formState,
        id: docId,
        diameter: Number(formState.diameter),
        pressure: Number(formState.pressure),
        stock: Number(formState.stock),
        minStock: Number(formState.minStock),
        updatedAt: new Date(),
      };

      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "moffen", docId),
        data
      );
      logActivity(
        auth.currentUser,
        editingId ? "TOOL_UPDATE" : "TOOL_ADD",
        `Gereedschap ${data.type} ID${data.diameter} aangepast.`
      );

      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in h-full flex flex-col">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100">
            <Wrench size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none text-center md:text-left">
              Gereedschappen & Voorraad
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 italic text-center md:text-left">
              Locatie-register van matrijzen en koppelingen
            </p>
          </div>
        </div>

        {/* Knop alleen tonen in Admin Mode */}
        {canEdit && (
          <button
            onClick={() => {
              setEditingId(null);
              setFormState({
                type: "TB",
                diameter: "200",
                pressure: "16",
                location: "",
                stock: 0,
                minStock: 5,
                toolName: "",
              });
              setIsEditing(true);
            }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center gap-3 hover:bg-emerald-600 transition-all"
          >
            <Plus size={18} /> Nieuw Item
          </button>
        )}
      </div>

      <div className="relative">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
          size={20}
        />
        <input
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all"
          placeholder="Zoek op ID, type of stelling (bijv. S-04)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex-1 mb-20">
        <div className="overflow-y-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b sticky top-0 z-10">
              <tr>
                <th className="px-8 py-5">Type / Maat</th>
                <th className="px-8 py-5">Locatie in Stellingen</th>
                <th className="px-8 py-5 text-center">Aantal</th>
                {canEdit && <th className="px-8 py-5 text-right">Acties</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMoffen.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50/50 group transition-colors"
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded uppercase">
                        {m.type}
                      </div>
                      <span className="font-black text-slate-800">
                        ID {m.diameter}{" "}
                        <span className="text-slate-300 ml-1">
                          PN {m.pressure}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2 text-blue-600 font-black italic">
                      <MapPin size={14} />
                      {m.location || "Niet toegewezen"}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span
                      className={`text-lg font-black ${
                        m.stock <= m.minStock
                          ? "text-red-600"
                          : "text-slate-800"
                      }`}
                    >
                      {m.stock}
                    </span>
                  </td>

                  {/* Actie knoppen alleen tonen in Admin Mode */}
                  {canEdit && (
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setFormState(m);
                            setEditingId(m.id);
                            setIsEditing(true);
                          }}
                          className="p-3 hover:text-blue-600 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm("Verwijderen?"))
                              await deleteDoc(
                                doc(
                                  db,
                                  "artifacts",
                                  appId,
                                  "public",
                                  "data",
                                  "moffen",
                                  m.id
                                )
                              );
                          }}
                          className="p-3 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEditing && canEdit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg">
                  <PackageCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">
                    Item Registreren
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Stellingen & Voorraad
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-3 hover:bg-red-50 text-slate-300 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Type
                  </label>
                  <select
                    className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"
                    value={formState.type}
                    onChange={(e) =>
                      setFormState({ ...formState, type: e.target.value })
                    }
                  >
                    <option value="TB">TB (Taper Bell)</option>
                    <option value="CB">CB (Cylindrical Bell)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Diameter
                  </label>
                  <select
                    className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"
                    value={formState.diameter}
                    onChange={(e) =>
                      setFormState({ ...formState, diameter: e.target.value })
                    }
                  >
                    {STANDARD_DIAMETERS.map((d) => (
                      <option key={d} value={d}>
                        {d} mm
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">
                  Stelling Locatie Code
                </label>
                <div className="relative">
                  <MapPin
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"
                    size={20}
                  />
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl font-black text-slate-800"
                    placeholder="Bijv. S-04-A"
                    value={formState.location}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        location: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    Aantal
                  </label>
                  <input
                    type="number"
                    className="w-full p-4 bg-slate-50 border rounded-2xl font-black"
                    value={formState.stock}
                    onChange={(e) =>
                      setFormState({ ...formState, stock: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-red-400 uppercase ml-1">
                    Min. Voorraad
                  </label>
                  <input
                    type="number"
                    className="w-full p-4 bg-slate-50 border rounded-2xl font-black"
                    value={formState.minStock}
                    onChange={(e) =>
                      setFormState({ ...formState, minStock: e.target.value })
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-slate-900 text-white font-black uppercase text-xs rounded-3xl shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Gegevens Opslaan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLocationsView;
