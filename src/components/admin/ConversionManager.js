import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Database,
  Search,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  X,
  FileSpreadsheet,
  Eye,
  Info,
  PlusCircle,
  ArrowRightCircle,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  parseCSV,
  parseExcel,
  uploadConversionBatch,
  uploadNewItemsOnly,
  lookupProductByManufacturedId,
  fetchConversions,
  updateConversion,
  createConversion,
  deleteConversion,
} from "../../utils/conversionLogic";

export default function ConversionManager() {
  const [activeTab, setActiveTab] = useState("upload");
  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  // Upload State
  const [fileData, setFileData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [testCode, setTestCode] = useState("");
  const [testResult, setTestResult] = useState(null);

  // Beheer State
  const [conversions, setConversions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Paginatie State
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  // --- UPLOAD HANDLERS ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("processing");
    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    try {
      let parsedData = [];
      if (isExcel) {
        parsedData = await parseExcel(file);
      } else {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        parsedData = parseCSV(text);
      }

      if (parsedData.length > 0) {
        const firstRow = parsedData[0];
        const hasOldCode = firstRow["Old Item Code"] || firstRow["Item Code"];
        const hasNewCode = firstRow["New Item Code"];

        if (!hasOldCode && !hasNewCode) {
          throw new Error(
            "Kolom 'Old Item Code' of 'New Item Code' niet gevonden."
          );
        }
      } else {
        throw new Error("Het bestand lijkt leeg te zijn.");
      }

      setFileData(parsedData);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      alert("Fout bij lezen bestand: " + err.message);
      setStatus("error");
    }
  };

  const handleFullImport = async () => {
    if (fileData.length === 0) return;
    setUploading(true);
    setStatus("uploading");

    try {
      await uploadConversionBatch(fileData, appId, (prog) => setProgress(prog));
      setStatus("done");
      alert(`Succes! ${fileData.length} regels verwerkt.`);
      resetUpload();
    } catch (error) {
      console.error(error);
      alert("Upload fout.");
      setStatus("error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeltaImport = async () => {
    if (fileData.length === 0) return;
    setUploading(true);
    setStatus("uploading");

    try {
      const result = await uploadNewItemsOnly(fileData, appId, (prog) =>
        setProgress(prog)
      );
      setStatus("done");
      alert(
        `Klaar! ${result.added} nieuwe items toegevoegd. (${result.skipped} bestaande overgeslagen)`
      );
      resetUpload();
    } catch (error) {
      console.error(error);
      alert("Upload fout.");
      setStatus("error");
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setTimeout(() => {
      setStatus("idle");
      setFileData([]);
      setProgress(0);
    }, 2000);
  };

  const handleTestLookup = async () => {
    if (!testCode) return;
    const result = await lookupProductByManufacturedId(appId, testCode);
    setTestResult(result || { error: "Niet gevonden" });
  };

  // --- BEHEER HANDLERS (PAGINATIE UPDATE) ---

  // Initiële laadactie (of reset bij zoeken)
  const loadInitialConversions = async () => {
    setLoadingList(true);
    setLastDoc(null); // Reset cursor
    try {
      const { data, lastDoc: newLastDoc } = await fetchConversions(
        appId,
        null,
        PAGE_SIZE,
        searchTerm
      );
      setConversions(data);
      setLastDoc(newLastDoc);
      setHasMore(data.length === PAGE_SIZE); // Als we minder dan PAGE_SIZE kregen, is er niet meer
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  // Laad meer (append)
  const loadMoreConversions = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, lastDoc: newLastDoc } = await fetchConversions(
        appId,
        lastDoc,
        PAGE_SIZE,
        searchTerm
      );
      setConversions((prev) => [...prev, ...data]); // Voeg toe aan bestaande lijst
      setLastDoc(newLastDoc);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Trigger laden bij tab wissel of zoekterm wijziging
  useEffect(() => {
    if (activeTab === "manage") {
      const timer = setTimeout(() => {
        loadInitialConversions();
      }, 300); // Debounce search
      return () => clearTimeout(timer);
    }
  }, [activeTab, searchTerm]);

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingItem({
      manufacturedId: "",
      targetProductId: "",
      type: "Coupler",
      serie: "EST",
      dn: "",
      pn: "",
      ends: "CB/CB",
      description: "",
      sheet: "-",
      drilling: "-",
      rev: "-",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (!editingItem.manufacturedId || !editingItem.targetProductId) {
      return alert("Oude en Nieuwe code zijn verplicht.");
    }

    try {
      if (isCreating) {
        await createConversion(appId, editingItem);
      } else {
        await updateConversion(appId, editingItem.id, editingItem);
      }

      setEditingItem(null);
      setIsCreating(false);
      loadInitialConversions(); // Ververs lijst van begin
    } catch (err) {
      console.error(err);
      alert("Opslaan mislukt: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Zeker weten?")) {
      try {
        await deleteConversion(appId, id);
        // Verwijder lokaal uit state voor instant feedback
        setConversions((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        alert("Fout bij verwijderen");
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
            <Database className="text-teal-600" />
            Conversie Matrix
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Beheer de koppeling tussen Planning en Tekeningen.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "upload"
                ? "bg-white text-teal-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Importeer Data
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "manage"
                ? "bg-white text-teal-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Database Beheer
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD (Ongewijzigd) */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">
              1. Upload Bestand
            </h3>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 hover:border-teal-400 transition-colors">
              <FileSpreadsheet
                size={48}
                className="mx-auto text-slate-300 mb-4"
              />
              <p className="text-sm font-bold text-slate-600 mb-2">
                Sleep Excel (.xlsx) of CSV
              </p>
              <label className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-teal-700 transition-all shadow-lg inline-block mt-4">
                Kies Bestand
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {status === "ready" && (
              <div className="mt-6 space-y-3">
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 mb-4 font-bold flex items-center gap-2">
                  <CheckCircle size={16} /> {fileData.length} Regels gevonden
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleFullImport}
                    disabled={uploading}
                    className="w-full bg-slate-200 text-slate-700 py-4 rounded-xl font-bold uppercase tracking-wide hover:bg-slate-300 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <RefreshCw size={20} />{" "}
                    <span className="text-xs">Alles Overschrijven</span>
                  </button>
                  <button
                    onClick={handleDeltaImport}
                    disabled={uploading}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-wide hover:bg-slate-800 transition-all shadow-xl flex flex-col items-center justify-center gap-1"
                  >
                    <PlusCircle size={20} className="text-teal-400" />{" "}
                    <span className="text-xs">Alleen Nieuwe</span>
                  </button>
                </div>
                {uploading && (
                  <p className="text-center text-xs text-slate-400 animate-pulse mt-2">
                    Bezig met verwerken... {progress}%
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">
              2. Test een Code
            </h3>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Zoek Oude of Nieuwe code..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-mono text-sm"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
              />
              <button
                onClick={handleTestLookup}
                className="bg-teal-100 text-teal-700 p-3 rounded-xl"
              >
                <Search size={20} />
              </button>
            </div>
            {testResult && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                {testResult.error ? (
                  <span className="text-red-500 font-bold">Niet gevonden</span>
                ) : (
                  <>
                    <p>
                      <span className="font-bold text-slate-400 w-24 inline-block">
                        Old Code:
                      </span>{" "}
                      {testResult.manufacturedId}
                    </p>
                    <p>
                      <span className="font-bold text-slate-400 w-24 inline-block">
                        New Code:
                      </span>{" "}
                      <span className="text-blue-600 font-mono font-bold">
                        {testResult.targetProductId}
                      </span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-400 w-24 inline-block">
                        Tekening:
                      </span>{" "}
                      {testResult.drawingProductId}
                    </p>
                    {testResult.isFallback && (
                      <p className="text-orange-500 text-xs italic">
                        ⚠️ Fallback naar EST tekening
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BEHEER (MET PAGINATIE FIX) */}
      {activeTab === "manage" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="relative w-full max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Zoek op Old Code of New Code..."
                className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl focus:border-teal-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateNew}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-lg"
              >
                <Plus size={18} /> Nieuw
              </button>
              <button
                onClick={loadInitialConversions}
                className="p-2 text-slate-400 hover:text-teal-600"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 bg-slate-50">Old Item Code</th>
                  <th className="px-6 py-4 bg-slate-50">New Item Code</th>
                  <th className="px-6 py-4 bg-slate-50">Type</th>
                  <th className="px-6 py-4 bg-slate-50">Info (DN/PN)</th>
                  <th className="px-6 py-4 bg-slate-50 text-right">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conversions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-teal-50/30 cursor-pointer transition-colors group"
                    onClick={() => setDetailItem(item)}
                  >
                    <td className="px-6 py-3 font-mono text-slate-700">
                      {item.manufacturedId}
                    </td>
                    <td className="px-6 py-3 font-mono text-blue-600 font-bold">
                      {item.targetProductId}
                    </td>
                    <td className="px-6 py-3">
                      {item.type}{" "}
                      <span className="text-slate-400 ml-1">{item.serie}</span>
                    </td>
                    <td className="px-6 py-3">
                      DN{item.dn} / PN{item.pn}
                    </td>
                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailItem(item);
                        }}
                        className="text-slate-400 hover:text-teal-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCreating(false);
                          setEditingItem(item);
                        }}
                        className="text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* STATUS & MEER LADEN KNOP */}
            <div className="p-4 flex justify-center border-t border-slate-100 bg-slate-50">
              {loadingList ? (
                <span className="text-slate-400 italic text-xs">Laden...</span>
              ) : hasMore && !searchTerm ? (
                <button
                  onClick={loadMoreConversions}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm flex items-center gap-2"
                >
                  {loadingMore ? (
                    "Laden..."
                  ) : (
                    <>
                      Meer laden <ChevronDown size={14} />
                    </>
                  )}
                </button>
              ) : (
                <span className="text-slate-300 italic text-xs">
                  Einde van de lijst
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Max-w-2xl) */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-white italic tracking-tight uppercase">
                  Product Detail
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase mt-1">
                  Conversie Matrix Data
                </p>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                    Old Code
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-700 break-all">
                    {detailItem.manufacturedId}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-1">
                    New Code
                  </p>
                  <p className="font-mono text-sm font-bold text-blue-700 break-all">
                    {detailItem.targetProductId}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                  Omschrijving
                </p>
                <p className="font-medium text-sm text-slate-700">
                  {detailItem.description || "-"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Type
                  </p>
                  <p className="font-bold text-slate-800">{detailItem.type}</p>
                </div>
                <div className="p-3 border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Serie
                  </p>
                  <p className="font-bold text-slate-800">{detailItem.serie}</p>
                </div>
                <div className="p-3 border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    DN/PN
                  </p>
                  <p className="font-mono font-bold text-slate-800">
                    DN{detailItem.dn} / PN{detailItem.pn}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Sheet
                  </p>
                  <p className="font-bold text-slate-800">
                    {detailItem.sheet || "-"}
                  </p>
                </div>
                <div className="p-3 border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Drilling
                  </p>
                  <p className="font-bold text-slate-800">
                    {detailItem.drilling || "-"}
                  </p>
                </div>
                <div className="p-3 border rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Rev
                  </p>
                  <p className="font-mono font-bold text-slate-800">
                    {detailItem.rev || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {isCreating ? "Nieuwe Koppeling Toevoegen" : "Koppeling Bewerken"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Old Code (Planning ID)
                </label>
                <input
                  disabled={!isCreating}
                  value={editingItem.manufacturedId}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      manufacturedId: e.target.value,
                    })
                  }
                  className={`w-full p-3 rounded-lg text-sm font-mono border-2 ${
                    !isCreating
                      ? "bg-slate-100 border-slate-200 text-slate-500"
                      : "bg-white border-blue-100 focus:border-blue-500 outline-none"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  New Code (Tekening ID)
                </label>
                <input
                  value={editingItem.targetProductId}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      targetProductId: e.target.value,
                    })
                  }
                  className="w-full border-2 border-blue-100 p-3 rounded-lg text-sm font-mono focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Type
                  </label>
                  <input
                    value={editingItem.type}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, type: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Serie
                  </label>
                  <input
                    value={editingItem.serie}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, serie: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    DN
                  </label>
                  <input
                    type="number"
                    value={editingItem.dn}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, dn: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    PN
                  </label>
                  <input
                    type="number"
                    value={editingItem.pn}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, pn: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Sheet
                  </label>
                  <input
                    value={editingItem.sheet}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, sheet: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Drilling
                  </label>
                  <input
                    value={editingItem.drilling}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        drilling: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Verbinding (Ends)
                </label>
                <input
                  value={editingItem.ends}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, ends: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Omschrijving
                </label>
                <textarea
                  rows="2"
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      description: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save size={16} /> {isCreating ? "Toevoegen" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
