import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Database,
  Filter,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";

const BoreDimensionsManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });

  // Formulier state (PN is hier verwijderd)
  const [formData, setFormData] = useState({
    type: "", // Bijv. "DIN 2576"
    diameter: "", // Bijv. "200"
    specs: {}, // Dynamische velden (B1, B2, etc.)
  });

  // Dynamische velden voor boringen
  const specFields = ["BoltCircle", "Holes", "HoleDiameter", "Weight"];

  const COLLECTION_PATH = `artifacts/${appId}/public/data/bore_dimensions`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_PATH));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setItems(data.sort((a, b) => a.id.localeCompare(b.id)));
    } catch (error) {
      console.error("Fout bij ophalen:", error);
      setStatus({ type: "error", msg: "Kon data niet ophalen." });
    } finally {
      setLoading(false);
    }
  };

  const handleSpecChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      specs: { ...prev.specs, [key]: value },
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Weet je zeker dat je deze boring wilt verwijderen?"))
      return;
    try {
      await deleteDoc(doc(db, COLLECTION_PATH, id));
      setItems((prev) => prev.filter((item) => item.id !== id));
      setStatus({ type: "success", msg: "Item verwijderd." });
    } catch (error) {
      setStatus({ type: "error", msg: "Verwijderen mislukt." });
    }
  };

  const handleSave = async () => {
    if (!formData.type || !formData.diameter) {
      setStatus({ type: "error", msg: "Vul Type en Diameter in." });
      return;
    }

    // GENERATIE ID: TYPE_IDxxx (Zonder PN)
    // Bijv: DIN_2576_ID200
    const cleanType = formData.type.trim().replace(/\s+/g, "_").toUpperCase();
    const cleanID = `ID${formData.diameter}`;
    const docId = `${cleanType}_${cleanID}`;

    try {
      const dataToSave = {
        type: formData.type,
        diameter: formData.diameter,
        lastUpdated: serverTimestamp(),
        ...formData.specs,
      };

      await setDoc(doc(db, COLLECTION_PATH, docId), dataToSave);

      // Update lokale lijst
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== docId);
        return [...filtered, { id: docId, ...dataToSave }].sort((a, b) =>
          a.id.localeCompare(b.id)
        );
      });

      setStatus({ type: "success", msg: "Boring opgeslagen!" });
      // Reset formulier (behalve type, handig voor bulk invoer)
      setFormData((prev) => ({ ...prev, diameter: "", specs: {} }));
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", msg: "Opslaan mislukt." });
    }
  };

  const filteredItems = items.filter((item) =>
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-2">
          <Database className="text-purple-600" /> Boring Manager
        </h3>
        {status.msg && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              status.type === "error"
                ? "bg-red-50 text-red-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>

      {/* Input Formulier */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Type Boring (bijv. DIN 2576)
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-purple-500 outline-none"
              placeholder="Type..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Diameter (ID)
            </label>
            <input
              type="number"
              value={formData.diameter}
              onChange={(e) =>
                setFormData({ ...formData, diameter: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-purple-500 outline-none"
              placeholder="mm"
            />
          </div>
        </div>

        {/* Dynamische Specs */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Technische Specificaties
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {specFields.map((field) => (
              <div key={field}>
                <input
                  type="text"
                  placeholder={field}
                  value={formData.specs[field] || ""}
                  onChange={(e) => handleSpecChange(field, e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:border-purple-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={16} /> Opslaan in Database
        </button>
      </div>

      {/* Lijst Weergave */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={16}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek boring..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="animate-spin mb-2" /> Laden...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase">
              Geen boringen gevonden
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="p-4">ID (Sleutel)</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">ID</th>
                  <th className="p-4">Specs</th>
                  <th className="p-4 text-right">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {item.id}
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {item.type}
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {item.diameter}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {Object.entries(item)
                        .filter(([k]) => specFields.includes(k))
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoreDimensionsManager;
