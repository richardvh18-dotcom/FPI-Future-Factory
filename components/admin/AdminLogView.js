import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  Download,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Tag,
  Clock,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * AdminLogView.js - Activiteitenlogboek
 * Toont een chronologisch overzicht van alle acties in het systeem.
 * Features:
 * - Realtime updates
 * - Filteren op actie type (CREATE, UPDATE, DELETE, etc.)
 * - Zoeken op gebruiker of details
 * - Export naar CSV
 * - Opschonen van oude logs
 */
const AdminLogView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [limitCount, setLimitCount] = useState(50);
  const [isClearing, setIsClearing] = useState(false);

  // Lijst van mogelijke acties voor de filter dropdown
  const actionTypes = [
    "PRODUCT_CREATE",
    "PRODUCT_UPDATE",
    "PRODUCT_DELETE",
    "MATRIX_UPDATE",
    "SETTINGS_UPDATE",
    "MASTER_SYNC",
    "LOGIN",
    "EXPORT_PDF",
  ];

  // 1. Logs ophalen (Realtime)
  useEffect(() => {
    setLoading(true);

    // Basis query: Sorteer op datum (nieuwste eerst)
    let q = query(
      collection(db, "artifacts", appId, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    // Als er een filter actief is, pas de query aan
    // Let op: Firestore vereist soms een samengestelde index voor where() + orderBy()
    if (filterType !== "ALL") {
      q = query(
        collection(db, "artifacts", appId, "activity_logs"),
        where("action", "==", filterType),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Timestamp conversie veilig maken (soms is het null direct na aanmaken)
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));
        setLogs(logData);
        setLoading(false);
      },
      (error) => {
        console.error("Fout bij ophalen logs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filterType, limitCount]);

  // 2. Client-side Search Filter
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.userEmail?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q)
    );
  });

  // 3. Export naar CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ["Datum", "Tijd", "Actie", "Gebruiker", "Details"];
    const rows = filteredLogs.map((log) => [
      format(log.timestamp, "dd-MM-yyyy"),
      format(log.timestamp, "HH:mm:ss"),
      log.action,
      log.userEmail,
      `"${log.details?.replace(/"/g, '""')}"`, // Escape quotes in details
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `activity_log_${format(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Logs Opschonen (Ouder dan 30 dagen)
  const handleClearOldLogs = async () => {
    if (
      !window.confirm(
        "Weet je zeker dat je logs ouder dan 30 dagen wilt verwijderen?"
      )
    )
      return;

    setIsClearing(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, "artifacts", appId, "activity_logs"),
        where("timestamp", "<", thirtyDaysAgo)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      alert(`${snapshot.size} oude logs verwijderd.`);
    } catch (error) {
      console.error("Fout bij opschonen:", error);
      alert("Kon logs niet opschonen.");
    } finally {
      setIsClearing(false);
    }
  };

  // Helper voor badge kleuren
  const getActionColor = (action) => {
    if (action.includes("DELETE"))
      return "bg-red-100 text-red-700 border-red-200";
    if (action.includes("CREATE"))
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (action.includes("UPDATE"))
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (action.includes("LOGIN"))
      return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 animate-in fade-in zoom-in-95 duration-500">
      {/* HEADER */}
      <div className="bg-white border-b px-8 py-6 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Activiteiten Logboek
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Audit Trail & Systeem Events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClearOldLogs}
            disabled={isClearing}
            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Oude logs verwijderen"
          >
            {isClearing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Trash2 size={20} />
            )}
          </button>
          <button
            onClick={() => setLimitCount((prev) => prev + 50)}
            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Laad meer"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Search Bar */}
        <div className="relative group">
          <Search
            className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Zoek op gebruiker, actie of details..."
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <Filter
            className="absolute left-4 top-3.5 text-slate-400"
            size={18}
          />
          <select
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 shadow-sm appearance-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Alle Activiteiten</option>
            {actionTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-4 pointer-events-none">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400" />
          </div>
        </div>

        {/* Stats Display */}
        <div className="flex items-center justify-end px-4 gap-4 text-xs font-black text-slate-400 uppercase tracking-wider">
          <span>
            Totaal: <span className="text-slate-900">{logs.length}</span>
          </span>
          <span>
            Gefilterd:{" "}
            <span className="text-blue-600">{filteredLogs.length}</span>
          </span>
        </div>
      </div>

      {/* LOG TABEL */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl h-full overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
            <div className="col-span-2 flex items-center gap-2">
              <Clock size={12} /> Tijdstip
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <User size={12} /> Gebruiker
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Tag size={12} /> Actie
            </div>
            <div className="col-span-5 flex items-center gap-2">
              <AlertCircle size={12} /> Details
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                <Loader2 className="animate-spin" size={40} />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Logs laden...
                </p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                <div className="p-6 bg-slate-50 rounded-full">
                  <History size={40} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest">
                  Geen activiteiten gevonden
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-12 gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 items-center group"
                >
                  <div className="col-span-2 flex flex-col">
                    <span className="text-xs font-bold text-slate-700">
                      {format(log.timestamp, "dd MMM yyyy", { locale: nl })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {format(log.timestamp, "HH:mm:ss")}
                    </span>
                  </div>

                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs border border-slate-200">
                      {log.userEmail?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span
                        className="text-xs font-bold text-slate-700 truncate"
                        title={log.userEmail}
                      >
                        {log.userEmail}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">
                        User ID: {log.userId?.substring(0, 6)}...
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action
                        ?.replace("PRODUCT_", "")
                        .replace("MATRIX_", "")}
                    </span>
                  </div>

                  <div className="col-span-5">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogView;
