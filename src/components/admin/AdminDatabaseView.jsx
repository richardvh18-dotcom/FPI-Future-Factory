import React, { useState, useEffect } from "react";
import {
  Database,
  Table,
  FileJson,
  Save,
  Trash2,
  Search,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Code,
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
import { db, appId } from "../../config/firebase";

const COLLECTIONS = [
  { id: "products", label: "Product Catalogus" },
  { id: "digital_planning", label: "Planning (Orders)" },
  { id: "tracked_products", label: "Productie (Units)" },
  { id: "user_roles", label: "Gebruikers & Rollen" },
  { id: "messages", label: "Berichten" },
  { id: "access_requests", label: "Aanvragen" },
];

/**
 * AdminDatabaseView
 * Een krachtige tool voor admins om ruwe Firestore data in te zien en te bewerken.
 */
const AdminDatabaseView = ({ onBack }) => {
  const [selectedCollection, setSelectedCollection] = useState(
    COLLECTIONS[0].id
  );
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    setSelectedDoc(null);

    try {
      const q = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          selectedCollection
        ),
        limit(200)
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDocuments(docs);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Kon collectie niet laden: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCollection]);

  const handleSelectDoc = (docData) => {
    setSelectedDoc(docData);
    setJsonInput(JSON.stringify(docData, null, 2));
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const parsedData = JSON.parse(jsonInput);
      const { id, ...dataToUpdate } = parsedData;

      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        selectedCollection,
        selectedDoc.id
      );
      await updateDoc(docRef, dataToUpdate);

      setDocuments((docs) =>
        docs.map((d) => (d.id === selectedDoc.id ? parsedData : d))
      );
      alert("Succesvol opgeslagen!");
    } catch (err) {
      alert("Fout bij opslaan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Weet je zeker dat je dit document definitief wilt verwijderen?"
      )
    )
      return;

    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        selectedCollection,
        selectedDoc.id
      );
      await deleteDoc(docRef);

      setDocuments((docs) => docs.filter((d) => d.id !== selectedDoc.id));
      setSelectedDoc(null);
      setJsonInput("");
    } catch (err) {
      alert("Kon niet verwijderen: " + err.message);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    JSON.stringify(doc).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full w-full bg-slate-50 p-4 md:p-8 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[1600px] h-[90vh] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="text-left">
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-none">
                Database Explorer
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                <Code size={12} /> Directe Firestore Edit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl border border-rose-100 text-xs font-black uppercase tracking-wider">
            <AlertTriangle size={16} />
            Live Productie Data
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* PANE 1: Collecties */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 text-left">
            <div className="p-5 font-black text-[10px] uppercase text-slate-400 tracking-widest border-b border-slate-200/50">
              Collecties
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {COLLECTIONS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollection(col.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${
                    selectedCollection === col.id
                      ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
                  }`}
                >
                  <Database
                    size={14}
                    className={
                      selectedCollection === col.id
                        ? "text-blue-500"
                        : "opacity-50"
                    }
                  />
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* PANE 2: Document Lijst */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 text-left">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Zoek ID of inhoud..."
                  className="w-full pl-9 pr-4 py-2 text-sm font-medium bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`w-full text-left p-3 rounded-xl border transition-all group ${
                        selectedDoc?.id === doc.id
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100"
                          : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                      }`}
                    >
                      <div
                        className={`font-mono text-[10px] font-bold truncate mb-0.5 ${
                          selectedDoc?.id === doc.id
                            ? "text-blue-700"
                            : "text-slate-600"
                        }`}
                      >
                        {doc.id}
                      </div>
                      <div className="text-xs text-slate-400 truncate font-medium group-hover:text-slate-500">
                        {doc.name ||
                          doc.orderId ||
                          doc.item ||
                          doc.email ||
                          "Geen label gevonden"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANE 3: JSON Editor */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e] text-slate-300 overflow-hidden relative text-left">
            {selectedDoc ? (
              <>
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#252526]">
                  <div className="flex items-center gap-3 text-xs font-mono text-emerald-400">
                    <FileJson size={16} />
                    {selectedDoc.id}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                      Opslaan
                    </button>
                  </div>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <textarea
                    className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-6 outline-none resize-none leading-relaxed"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    spellCheck="false"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Table size={48} className="opacity-20 text-white" />
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-xs opacity-50 text-center">
                  Selecteer een document om te bewerken
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDatabaseView;
