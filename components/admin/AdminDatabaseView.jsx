import React, { useState, useEffect } from "react";
import {
  Database,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle,
  Folder,
  ChevronRight,
  Layout,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  limit,
} from "firebase/firestore";
import { db } from "../../config/firebase";

const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

const COLLECTIONS = [
  { id: "digital_planning", label: "Planning (Orders)", icon: Layout },
  { id: "tracked_products", label: "Tracked Products", icon: Database },
  { id: "products", label: "Product Catalogus", icon: Database },
  { id: "user_roles", label: "Gebruikers", icon: Database },
  { id: "settings", label: "Instellingen", icon: Database },
  { id: "messages", label: "Berichten", icon: Database },
];

const AdminDatabaseView = () => {
  const [selectedCollection, setSelectedCollection] = useState(
    COLLECTIONS[0].id
  );
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingDoc, setEditingDoc] = useState(null);
  const [jsonContent, setJsonContent] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const appId = getAppId();

  const fetchDocuments = async () => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      // Pad: artifacts/{appId}/public/data/{collection}
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        selectedCollection
      );
      const q = query(colRef, limit(100));

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDocuments(docs);
    } catch (err) {
      console.error("Error fetching docs:", err);
      setError("Kon collectie niet laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCollection]);

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    const { id, ...data } = doc;
    setJsonContent(JSON.stringify(data, null, 2));
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      const parsedData = JSON.parse(jsonContent);
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        selectedCollection,
        editingDoc.id
      );
      await updateDoc(docRef, parsedData);
      setSuccess("Opgeslagen!");
      fetchDocuments();
      setTimeout(() => setEditingDoc(null), 1000);
    } catch (err) {
      setError("Fout: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Zeker weten verwijderen?")) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        selectedCollection,
        id
      );
      await deleteDoc(docRef);
      setDocuments(documents.filter((d) => d.id !== id));
      setSuccess("Verwijderd.");
    } catch (err) {
      setError("Fout: " + err.message);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    return (
      doc.id.toLowerCase().includes(term) ||
      JSON.stringify(doc).toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="w-1/4 min-w-[250px] bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Database size={16} className="text-blue-600" /> Collecties
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {COLLECTIONS.map((col) => (
            <button
              key={col.id}
              onClick={() => setSelectedCollection(col.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                selectedCollection === col.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Folder
                  size={18}
                  className={
                    selectedCollection === col.id
                      ? "text-blue-200"
                      : "text-slate-400"
                  }
                />
                <span>{col.label}</span>
              </div>
              {selectedCollection === col.id && <ChevronRight size={16} />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Zoek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase mr-2">
              {filteredDocs.length} Docs
            </span>
            <button
              onClick={fetchDocuments}
              className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/30">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Laden...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Geen data
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/30 group">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-blue-600">
                      {doc.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 font-mono truncate max-w-md">
                        {JSON.stringify(doc).slice(0, 80)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 uppercase italic">
                Bewerk {editingDoc.id}
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-2 hover:bg-slate-200 rounded-full"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 p-0 relative bg-slate-900">
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="w-full h-full p-6 font-mono text-sm bg-transparent text-emerald-400 outline-none resize-none"
                spellCheck="false"
              />
            </div>
            {error && (
              <div className="px-6 py-3 bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2 border-t border-red-100">
                <AlertTriangle size={16} /> {error}
              </div>
            )}
            {success && (
              <div className="px-6 py-3 bg-green-50 text-green-600 text-xs font-bold flex items-center gap-2 border-t border-emerald-100">
                <Check size={16} /> {success}
              </div>
            )}
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-lg flex items-center gap-2"
              >
                <Save size={16} /> Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabaseView;
