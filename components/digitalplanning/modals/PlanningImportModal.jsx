import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowRight,
  GitMerge,
  RefreshCw,
  Loader2, // <-- DEZE WAS VERGETEN, NU TOEGEVOEGD
} from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db, appId } from "../../../config/firebase";
import {
  format,
  subWeeks,
  differenceInCalendarDays,
  isValid,
  parseISO,
  getYear,
} from "date-fns";

const PlanningImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Cache voor checks
  const [existingOrderIds, setExistingOrderIds] = useState(new Set());
  const [existingOrderDocs, setExistingOrderDocs] = useState({});
  const [dbProductIndex, setDbProductIndex] = useState([]);

  // Overschrijf modus state
  const [overwriteMode, setOverwriteMode] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    skipped: 0,
    updated: 0,
  });

  // REF voor de file input (FIX VOOR VERKENNER PROBLEEM)
  const fileInputRef = useRef(null);

  // 1. Haal bestaande orders op
  useEffect(() => {
    if (isOpen) {
      const fetchExistingOrders = async () => {
        try {
          const q = query(
            collection(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "digital_planning"
            )
          );
          const snapshot = await getDocs(q);

          const ids = new Set();
          const docsMap = {};
          const productIndex = [];

          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.orderId) {
              ids.add(data.orderId);
              docsMap[data.orderId] = doc.id;
            }

            const itemKey = (data.item || data.description || "")
              .trim()
              .toUpperCase();
            if (itemKey && data.week) {
              productIndex.push({
                item: itemKey,
                week: parseInt(data.week),
              });
            }
          });

          setExistingOrderIds(ids);
          setExistingOrderDocs(docsMap);
          setDbProductIndex(productIndex);
        } catch (error) {
          console.error("Fout bij ophalen bestaande orders:", error);
        }
      };
      fetchExistingOrders();
      setFile(null);
      setPreviewData([]);
      setStats({ total: 0, new: 0, skipped: 0, updated: 0 });
      setOverwriteMode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (file) {
      parseCSV(file);
    }
  }, [overwriteMode]);

  const getUrgencyStatus = (deliveryDateObj) => {
    if (!deliveryDateObj || !isValid(deliveryDateObj))
      return { color: "text-gray-500", label: "Onbekend" };

    const today = new Date();
    const daysDiff = differenceInCalendarDays(deliveryDateObj, today);

    if (daysDiff <= 7) {
      return {
        color: "text-red-600 font-bold",
        bg: "bg-red-50",
        label: "Urgent (< 1 week)",
      };
    } else if (daysDiff <= 14) {
      return {
        color: "text-blue-600 font-bold",
        bg: "bg-blue-50",
        label: "Starten (< 2 weken)",
      };
    } else {
      return { color: "text-slate-700", bg: "bg-white", label: "Gepland" };
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  // Functie om de onzichtbare input te activeren
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const parseCSV = (file) => {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n");

      let startIndex = 6;

      const parsedRows = [];
      let skippedCount = 0;
      let newCount = 0;
      let updateCount = 0;

      for (let i = startIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (cols.length < 15) continue;

        const rawMachine = cols[3]?.replace(/"/g, "").trim();
        const rawDateString = cols[4]?.replace(/"/g, "").trim();
        const rawWeek = cols[5]?.replace(/"/g, "").trim();
        const orderId = cols[6]?.replace(/"/g, "").trim();
        const project = cols[8]?.replace(/"/g, "").trim();
        const itemCode = cols[10]?.replace(/"/g, "").trim();
        const itemDesc = cols[11]?.replace(/"/g, "").trim();
        const extraCode = cols[12]?.replace(/"/g, "").trim();
        const drawing = cols[13]?.replace(/"/g, "").trim();
        const planQty = cols[14]?.replace(/"/g, "").trim();

        if (!orderId || !rawMachine) continue;

        const exists = existingOrderIds.has(orderId);

        if (exists && !overwriteMode) {
          skippedCount++;
          continue;
        }

        let deliveryDateObj = null;
        let deliveryDateString = "";

        if (rawDateString) {
          const d = parseISO(rawDateString);
          if (isValid(d)) {
            deliveryDateObj = d;
            deliveryDateString = format(d, "yyyy-MM-dd");
          } else {
            const d2 = new Date(rawDateString);
            if (isValid(d2)) {
              deliveryDateObj = d2;
              deliveryDateString = format(d2, "yyyy-MM-dd");
            }
          }
        }

        let plannedStartString = "";
        if (deliveryDateObj) {
          const startDate = subWeeks(deliveryDateObj, 2);
          plannedStartString = format(startDate, "yyyy-MM-dd");
        }

        const year = deliveryDateObj
          ? getYear(deliveryDateObj)
          : new Date().getFullYear();
        const urgency = getUrgencyStatus(deliveryDateObj);

        parsedRows.push({
          machine: rawMachine,
          deliveryDate: deliveryDateString,
          plannedDate: plannedStartString,
          week: parseInt(rawWeek) || 0,
          year: year,
          orderId: orderId,
          project: project,
          item: itemCode,
          description: itemDesc,
          productCode: extraCode,
          drawing: drawing,
          plan: parseInt(planQty) || 0,
          status: "planned",
          urgencyColor: urgency.color,
          urgencyBg: urgency.bg,
          isNew: !exists,
          isUpdate: exists && overwriteMode,
          docId: exists ? existingOrderDocs[orderId] : null,
        });

        if (!exists) newCount++;
        if (exists && overwriteMode) updateCount++;
      }

      const enrichedRows = parsedRows.map((row) => {
        const currentItem = (row.description || row.item || "")
          .trim()
          .toUpperCase();
        const currentWeek = row.week;
        const foundWeeks = new Set();

        dbProductIndex.forEach((p) => {
          if (p.item === currentItem && p.week !== currentWeek)
            foundWeeks.add(p.week);
        });

        parsedRows.forEach((p) => {
          const pItem = (p.description || p.item || "").trim().toUpperCase();
          const pWeek = p.week;
          if (pItem === currentItem && pWeek !== currentWeek)
            foundWeeks.add(pWeek);
        });

        const sortedWeeks = Array.from(foundWeeks).sort((a, b) => a - b);

        return {
          ...row,
          optimizationHint:
            sortedWeeks.length > 0 ? sortedWeeks.join(", ") : null,
        };
      });

      enrichedRows.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.week !== b.week) return a.week - b.week;
        if (a.deliveryDate < b.deliveryDate) return -1;
        if (a.deliveryDate > b.deliveryDate) return 1;
        return 0;
      });

      setPreviewData(enrichedRows);
      setStats({
        total: lines.length - startIndex,
        new: newCount,
        skipped: skippedCount,
        updated: updateCount,
      });
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setImporting(true);

    try {
      const batch = writeBatch(db);

      previewData.forEach((order) => {
        const {
          urgencyColor,
          urgencyBg,
          isNew,
          isUpdate,
          docId,
          optimizationHint,
          ...dbData
        } = order;

        const dataToSave = {
          ...dbData,
          optimizationNote: optimizationHint
            ? `Ook in week: ${optimizationHint}`
            : "",
          source: "excel_import",
          importedAt: serverTimestamp(),
        };

        if (isUpdate && docId) {
          const ref = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "digital_planning",
            docId
          );
          batch.update(ref, dataToSave);
        } else {
          const ref = doc(
            collection(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "digital_planning"
            )
          );
          batch.set(ref, { ...dataToSave, createdAt: serverTimestamp() });
        }
      });

      await batch.commit();

      onSuccess();
      onClose();
      alert(`Import voltooid!\n${stats.new} Nieuw\n${stats.updated} Geüpdatet`);
    } catch (error) {
      console.error("Import error:", error);
      alert("Er ging iets mis tijdens het importeren.");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
                Importeer Planning
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Excel / CSV Upload + Optimalisatie Check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Upload Area - CLICK HANDLER FIX */}
          {!file && (
            <div
              onClick={triggerFileUpload}
              className="border-4 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all group cursor-pointer"
            >
              {/* HIDDEN INPUT MET REF */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <Upload size={40} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700">
                    Klik hier om te uploaden
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Ondersteunt .csv en .xlsx (Kolommen D t/m P)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overwrite Toggle */}
          <div className="flex items-center justify-end mb-4 px-2">
            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
              <div
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  overwriteMode ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                    overwriteMode ? "left-6" : "left-1"
                  }`}
                />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-700 uppercase">
                  Overschrijf Bestaande
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">
                  Update orders met zelfde ID
                </span>
              </div>
              <input
                type="checkbox"
                checked={overwriteMode}
                onChange={(e) => setOverwriteMode(e.target.checked)}
                className="hidden"
              />
            </label>
          </div>

          {loading && (
            <div className="py-12 text-center">
              <Loader2
                className="animate-spin mx-auto text-blue-600 mb-4"
                size={48}
              />
              <p className="text-slate-500 font-bold">Bestand analyseren...</p>
            </div>
          )}

          {previewData.length > 0 && !loading && (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <CheckCircle className="text-emerald-600" />
                  <div>
                    <p className="text-2xl font-black text-emerald-700">
                      {stats.new}
                    </p>
                    <p className="text-xs font-bold text-emerald-600 uppercase">
                      Nieuw
                    </p>
                  </div>
                </div>
                {overwriteMode ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                    <RefreshCw className="text-blue-600" />
                    <div>
                      <p className="text-2xl font-black text-blue-700">
                        {stats.updated}
                      </p>
                      <p className="text-xs font-bold text-blue-600 uppercase">
                        Updates
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
                    <AlertCircle className="text-amber-600" />
                    <div>
                      <p className="text-2xl font-black text-amber-700">
                        {stats.skipped}
                      </p>
                      <p className="text-xs font-bold text-amber-600 uppercase">
                        Geskipt
                      </p>
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3 col-span-2">
                  <Calendar className="text-slate-600" />
                  <div>
                    <p className="text-2xl font-black text-slate-700">
                      Week {previewData.length > 0 ? previewData[0].week : "-"}{" "}
                      -{" "}
                      {previewData.length > 0
                        ? previewData[previewData.length - 1].week
                        : "-"}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Planning Range
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Status</th>
                      <th className="p-4">Leverdatum</th>
                      <th className="p-4">Week</th>
                      <th className="p-4">Order</th>
                      <th className="p-4">Machine</th>
                      <th className="p-4">Item</th>
                      <th className="p-4">Code</th>
                      <th className="p-4 text-right">Aantal</th>
                      <th className="p-4 text-orange-600">Optimalisatie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 ${row.urgencyBg || ""}`}
                      >
                        <td className="p-4">
                          {row.isNew && (
                            <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">
                              NIEUW
                            </span>
                          )}
                          {row.isUpdate && (
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">
                              UPDATE
                            </span>
                          )}
                        </td>
                        <td
                          className={`p-4 font-mono font-bold ${row.urgencyColor}`}
                        >
                          {row.deliveryDate || "-"}
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                          {row.week}
                        </td>
                        <td className="p-4 font-mono text-blue-600 font-bold">
                          {row.orderId}
                        </td>
                        <td className="p-4 text-slate-600 font-bold">
                          {row.machine}
                        </td>
                        <td
                          className="p-4 text-slate-600 truncate max-w-[150px]"
                          title={row.description}
                        >
                          {row.description || row.item}
                        </td>
                        <td className="p-4 font-mono text-xs font-bold bg-slate-100 rounded text-center">
                          {row.productCode || "-"}
                        </td>
                        <td className="p-4 text-right font-black text-slate-800">
                          {row.plan}
                        </td>
                        <td className="p-4">
                          {row.optimizationHint && (
                            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-xs font-bold w-fit border border-orange-100">
                              <GitMerge size={14} />
                              <span>Week: {row.optimizationHint}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {file && previewData.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-4 text-amber-400" />
              <h3 className="text-lg font-bold text-slate-700">
                Geen nieuwe orders gevonden
              </h3>
              <button
                onClick={() => setFile(null)}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Ander bestand proberen
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-between items-center">
          {file ? (
            <button
              onClick={() => {
                setFile(null);
                setPreviewData([]);
              }}
              className="text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
            >
              Annuleren
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={handleImport}
            disabled={previewData.length === 0 || importing}
            className={`px-8 py-4 rounded-xl font-black uppercase text-sm tracking-widest flex items-center gap-3 shadow-lg transition-all ${
              previewData.length === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="animate-spin" /> Importeren...
              </>
            ) : (
              <>
                Importeren <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanningImportModal;
