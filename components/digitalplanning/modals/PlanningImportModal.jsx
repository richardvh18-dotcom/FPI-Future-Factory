import React, { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
  Database,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";

// Helper om App ID op te halen
const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

// --- CDN LOADER VOOR XLSX (Magic Fix voor CodeSandbox) ---
// Dit laadt de bibliotheek pas in als het nodig is, zonder installatie.
const loadXLSX = async () => {
  if (window.XLSX) return window.XLSX; // Al geladen?

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () =>
      reject(new Error("Kon Excel bibliotheek niet laden."));
    document.head.appendChild(script);
  });
};

// --- INTERNE CSV PARSER ---
const parseCSV = (text) => {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
};

// --- HELPER: Excel Datum naar JS Date ---
const excelDateToJSDate = (serial) => {
  if (!serial) return new Date();
  if (typeof serial === "string") return new Date(serial);
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info;
};

const PlanningImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [stats, setStats] = useState({ total: 0, pipes: 0, fittings: 0 });
  const [showPreviewTable, setShowPreviewTable] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);

      const fileType = selectedFile.name.split(".").pop().toLowerCase();

      if (fileType === "csv") {
        processCSVFile(selectedFile);
      } else if (fileType === "xls" || fileType === "xlsx") {
        processExcelFile(selectedFile);
      } else {
        setError("Niet ondersteund bestandstype. Gebruik .csv, .xls of .xlsx");
      }
    }
  };

  // --- CSV VERWERKING ---
  const processCSVFile = (file) => {
    setLoading(true);
    setError(null);
    setShowPreviewTable(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSV(text);
        processRows(rows, "csv");
      } catch (err) {
        console.error(err);
        setError("Fout bij verwerken CSV: " + err.message);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Kon bestand niet lezen.");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  // --- EXCEL VERWERKING (VIA CDN) ---
  const processExcelFile = async (file) => {
    setLoading(true);
    setError(null);
    setShowPreviewTable(false);

    try {
      // Laad de bibliotheek dynamisch
      const XLSX = await loadXLSX();

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Converteer naar Array van Arrays
          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          });

          processRows(rows, "excel");
        } catch (err) {
          console.error(err);
          setError("Fout bij lezen Excel data: " + err.message);
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setError("Kon Excel lezer niet laden. Controleer je internetverbinding.");
      setLoading(false);
    }
  };

  // --- CENTRALE RIJ VERWERKING ---
  const processRows = (rows, type) => {
    try {
      // Validatie: Minimaal 8 regels (6 rommel + 1 header + data)
      if (rows.length < 8) {
        throw new Error("Bestand bevat geen geldige data (te weinig regels).");
      }

      const parsedOrders = [];
      let pipeCount = 0;
      let fitCount = 0;

      // Loop door data (vanaf index 7)
      for (let i = 7; i < rows.length; i++) {
        const row = rows[i];

        // Kolom 6 = Order Nummer (N200xxxx), skip als leeg
        if (!row[6] || !String(row[6]).startsWith("N")) continue;

        // Machine opschonen: 40BH16 -> BH16 (Kolom 3)
        let machineRaw = String(row[3] || "");
        let machineClean = machineRaw.replace(/^40/, "");

        // Datum Formatteren (Kolom 4)
        let dateObj = new Date();
        if (type === "excel" && typeof row[4] === "number") {
          dateObj = excelDateToJSDate(row[4]);
        } else {
          let dateStr = row[4];
          dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) dateObj = new Date();
        }

        // Item Info (Kolom 11)
        const itemDesc = String(row[11] || "Onbekend Item");
        const isPipe =
          itemDesc.toUpperCase().includes("PIPE") ||
          itemDesc.toUpperCase().includes("BUIS");

        // Aantallen (Kolom 14)
        const planVal = parseFloat(row[14] || 0);

        if (isPipe) pipeCount++;
        else fitCount++;

        parsedOrders.push({
          machine: machineClean, // Kolom 3
          plannedDate: dateObj, // Kolom 4
          weekNumber: parseInt(row[5]) || 0, // Kolom 5
          orderId: row[6], // Kolom 6
          poText: String(row[7] || ""), // Kolom 7
          project: String(row[8] || ""), // Kolom 8
          projectDesc: String(row[9] || ""), // Kolom 9
          itemCode: row[10], // Kolom 10
          item: itemDesc, // Kolom 11
          drawing: String(row[13] || ""), // Kolom 13
          plan: planVal, // Kolom 14
          status: "pending",
          importDate: new Date(),
          isPipe: isPipe,
        });
      }

      setPreviewData(parsedOrders);
      setStats({
        total: parsedOrders.length,
        pipes: pipeCount,
        fittings: fitCount,
      });
      setStep(2);
      setLoading(false);
    } catch (err) {
      setError("Data verwerkingsfout: " + err.message);
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    const appId = getAppId();
    const batchSize = 400;

    try {
      let batch = writeBatch(db);
      let count = 0;
      let batchCount = 0;

      for (const order of previewData) {
        const docId = `${order.orderId}_${
          order.itemCode || Math.random().toString(36).substr(2, 5)
        }`;
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "digital_planning",
          docId
        );

        const firestoreData = {
          ...order,
          plannedDate: serverTimestamp(),
          importDate: serverTimestamp(),
        };

        batch.set(docRef, firestoreData);
        count++;

        if (count >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
          batchCount++;
          console.log(`Batch ${batchCount} opgeslagen`);
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Firebase Fout:", err);
      setError("Opslaan mislukt: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">
              Planning Import
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Infor-LN Export (CSV / XLS / XLSX)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
              <AlertTriangle />
              <span className="font-bold text-sm">{error}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="border-4 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative cursor-pointer h-64">
              <input
                type="file"
                accept=".csv, .xls, .xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="bg-blue-50 p-6 rounded-full mb-4 text-blue-600">
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-700 mb-2">
                Sleep bestand of Klik
              </h3>
              <p className="text-sm text-slate-400 font-medium">
                Ondersteunt: Excel & CSV (start op regel 7)
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
                <CheckCircle className="text-emerald-600 w-10 h-10" />
                <div>
                  <h4 className="font-black text-emerald-800 text-lg">
                    Analyse Voltooid
                  </h4>
                  <p className="text-emerald-600 text-sm font-medium">
                    {stats.total} orders gevonden
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Fittings
                  </span>
                  <p className="text-2xl font-black text-slate-800">
                    {stats.fittings}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Pipes
                  </span>
                  <p className="text-2xl font-black text-slate-800">
                    {stats.pipes}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <p className="text-xs text-yellow-800 font-bold flex items-center gap-2">
                  <Database size={14} />
                  Data wordt toegevoegd aan de live planning.
                </p>
              </div>

              {/* Preview / Controle Toggle */}
              <div>
                <button
                  onClick={() => setShowPreviewTable(!showPreviewTable)}
                  className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-bold text-slate-600 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Eye size={16} /> Bekijk Voorbeeld (Eerste 5)
                  </span>
                  {showPreviewTable ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {showPreviewTable && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-black">
                        <tr>
                          <th className="p-3">Order</th>
                          <th className="p-3">Machine</th>
                          <th className="p-3">Item</th>
                          <th className="p-3 text-right">Plan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-blue-50/50">
                            <td className="p-3 font-mono font-bold text-blue-600">
                              {row.orderId}
                            </td>
                            <td className="p-3 font-bold text-slate-700">
                              {row.machine}
                            </td>
                            <td
                              className="p-3 text-slate-600 truncate max-w-[200px]"
                              title={row.item}
                            >
                              {row.item}
                            </td>
                            <td className="p-3 font-bold text-right">
                              {row.plan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-400 italic">
                      ... en nog {stats.total - 5} regels
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors text-sm"
          >
            Annuleren
          </button>
          {step === 2 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              Bevestig Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningImportModal;
