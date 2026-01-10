import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Clipboard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Info,
  Upload,
} from "lucide-react";

/**
 * PlanningImportModal: Geoptimaliseerd voor Infor-LN vPlan (Kolom D t/m Q).
 * Lost de sorteerfout bij machines op door alleen de voorloop '40' te strippen.
 */
const PlanningImportModal = ({ isOpen, onClose, onImport, loading }) => {
  const [importMode, setImportMode] = useState("upload");
  const [pasteData, setPasteData] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  // Pre-load SheetJS
  useEffect(() => {
    if (isOpen && !window.XLSX) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isOpen]);

  const processRawRows = (rows) => {
    try {
      const parsedOrders = [];
      let headerFound = false;

      rows.forEach((row) => {
        // Kolom G (index 6) is het Ordernummer
        const orderId = String(row[6] || "").trim();

        // Zoek de header rij om te starten
        if (!headerFound) {
          if (
            orderId.toLowerCase() === "order" ||
            orderId.toLowerCase() === "ordernummer"
          ) {
            headerFound = true;
          }
          return;
        }

        // Sla lege rijen of metadata over
        if (!orderId || orderId === "0" || orderId.length < 5) return;

        // --- VEILIGE MACHINE PARSING ---
        // Kolom D (index 3) bevat de machine (bv 40BH11)
        let rawMachine = String(row[3] || "").trim();
        let cleanMachine = rawMachine;
        // Alleen de EERSTE '40' weghalen als het een prefix is
        if (rawMachine.startsWith("40")) {
          cleanMachine = rawMachine.substring(2);
        }

        // Mapping conform Infor-LN snippet (D t/m Q)
        parsedOrders.push({
          machine: cleanMachine, // D (Index 3)
          date: String(row[4] || "").trim(), // E (Index 4)
          week: parseInt(row[5]) || 0, // F (Index 5)
          orderId: orderId.toUpperCase(), // G (Index 6)
          poText: String(row[7] || "").trim(), // H (Index 7)
          project: String(row[8] || "").trim(), // I (Index 8)
          projectDesc: String(row[9] || "").trim(), // J (Index 9)
          articleCode: String(row[10] || "").trim(), // K (Index 10)
          item: String(row[11] || "").trim(), // L (Index 11)
          extraCode: String(row[12] || "").trim(), // M (Index 12)
          drawing: String(row[13] || "").trim(), // N (Index 13)
          plan: parseInt(row[14]) || 0, // O (Index 14)
          toDo: parseInt(row[15]) || 0, // P (Index 15)
          finish: parseInt(row[16]) || 0, // Q (Index 16)
          status: "GEPLAND",
          updatedAt: new Date().toISOString(),
        });
      });

      if (parsedOrders.length === 0) {
        setError("Geen geldige data gevonden in kolom G (Order).");
      } else {
        setPreview(parsedOrders);
      }
    } catch (err) {
      setError("Fout bij het verwerken van het bestand.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: "array" });
        const rows = window.XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
          { header: 1 }
        );
        processRawRows(rows);
      } catch (err) {
        setError("Excel bestand onleesbaar.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePasteParse = () => {
    if (!pasteData.trim()) return;
    const rows = pasteData
      .trim()
      .split("\n")
      .map((r) => r.split("\t"));
    processRawRows(rows);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 lg:p-10 animate-in fade-in">
      <div className="bg-white w-full max-w-6xl rounded-[50px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] text-left">
        <div className="p-8 bg-blue-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl shadow-inner">
              <FileSpreadsheet size={24} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tight">
              Excel <span className="text-blue-200">Import</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex bg-slate-100 p-1 mx-8 mt-6 rounded-2xl w-fit">
          <button
            onClick={() => setImportMode("upload")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              importMode === "upload"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-400"
            }`}
          >
            Bestand Selecteren
          </button>
          <button
            onClick={() => setImportMode("paste")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              importMode === "paste"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-400"
            }`}
          >
            Cellen Plakken
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-8 gap-8">
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            {importMode === "upload" ? (
              <div className="border-4 border-dashed border-slate-100 rounded-[40px] bg-slate-50/50 flex-1 flex flex-col items-center justify-center p-10 text-center relative group hover:border-blue-400 transition-all">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="p-6 bg-white text-blue-600 rounded-3xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <Upload size={48} />
                </div>
                <p className="text-lg font-black text-slate-800 uppercase italic">
                  Kies Bestand
                </p>
              </div>
            ) : (
              <textarea
                className="flex-1 w-full bg-slate-50 border-2 border-slate-100 rounded-[30px] p-6 text-[10px] font-mono focus:border-blue-500 outline-none resize-none shadow-inner"
                placeholder="Plak hier je Excel rijen..."
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                onBlur={handlePasteParse}
              />
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto border-2 border-slate-50 rounded-[35px] bg-white custom-scrollbar shadow-inner">
              {preview.length > 0 ? (
                <table className="w-full text-[10px] text-left">
                  <thead className="sticky top-0 bg-white border-b z-10">
                    <tr className="font-black uppercase text-slate-400">
                      <th className="p-4">Machine</th>
                      <th className="p-4">Order</th>
                      <th className="p-4">Omschrijving</th>
                      <th className="p-4 text-right">Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.map((p, i) => (
                      <tr
                        key={i}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="p-4 font-black text-blue-600 uppercase">
                          {p.machine}
                        </td>
                        <td className="p-4 font-mono font-bold">{p.orderId}</td>
                        <td className="p-4 font-bold text-slate-700 truncate max-w-[200px]">
                          {p.item}
                        </td>
                        <td className="p-4 text-right font-black">{p.plan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <FileSpreadsheet size={80} />
                  <p className="text-xs font-black uppercase mt-4">
                    Geen data geladen
                  </p>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t flex justify-between items-center shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase italic">
            Controleren: Machine-kolom (D) en Order-kolom (G)
          </p>
          <button
            disabled={preview.length === 0 || loading}
            onClick={() => onImport(preview)}
            className="px-12 py-4 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              `Importeer ${preview.length} Orders`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanningImportModal;
