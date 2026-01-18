import React, { useState, useEffect } from "react";
import {
  FileUp,
  Database,
  CheckCircle2,
  Loader2,
  Table,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  Clipboard,
  Zap,
  X,
  FileCheck,
  FileText,
  Info,
} from "lucide-react";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

/**
 * BulkUploadView V2.7
 * Ondersteunt: XLSX Import/Export, Plakken uit Excel, Validatie en Multi-formaat Templates.
 * FIX V2.7: Voorkomt 'empty field name' error door lege kolommen te filteren.
 */
const BulkUploadView = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [targetCollection, setTargetCollection] = useState(
    "standard_fitting_specs"
  );
  const [previewData, setPreviewData] = useState([]);
  const [pastedText, setPastedText] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const [xlsxReady, setXlsxReady] = useState(false);

  // Configuratie van headers per categorie voor templates
  const TEMPLATE_CONFIG = {
    standard_fitting_specs: [
      "id",
      "TW",
      "L",
      "Lo",
      "R",
      "Weight",
      "articleCode",
    ],
    standard_socket_specs: ["id", "TWcb", "BD", "W"],
    cb_dimensions: ["id", "B1", "B2", "BA", "A"],
    tb_dimensions: ["id", "B1", "B2", "BA", "A", "TWtb", "BD", "W"],
    bore_dimensions: ["id", "k", "d", "n", "b"],
  };

  const COLLECTIONS = [
    { id: "standard_fitting_specs", label: "Fitting Afmetingen (Basis - CB)" },
    { id: "standard_socket_specs", label: "Socket Afmetingen (*_Socket - CB)" },
    { id: "cb_dimensions", label: "Mof Afmetingen (CB)" },
    { id: "tb_dimensions", label: "Mof Afmetingen (TB)" },
    { id: "bore_dimensions", label: "Boring Afmetingen (Bore)" },
  ];

  // Laad XLSX bibliotheek dynamisch in
  useEffect(() => {
    if (window.XLSX) {
      setXlsxReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setXlsxReady(true);
    document.head.appendChild(script);
  }, []);

  // --- TEMPLATE DOWNLOAD ---
  const downloadTemplate = (format = "excel") => {
    const headers = TEMPLATE_CONFIG[targetCollection];
    const fileName = `template_${targetCollection}`;

    if (format === "excel" && window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([headers]);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Template");
      window.XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- DATA PARSING ---
  const parseRawData = (rows) => {
    setIsVerified(false);
    setValidationErrors([]);

    // Extra veiligheid: Filter lege objecten of objecten zonder keys
    const cleanRows = rows.filter((row) => {
      const keys = Object.keys(row).filter((k) => k.trim() !== "");
      return keys.length > 0;
    });

    setPreviewData(cleanRows);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !xlsxReady) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = window.XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(firstSheet);
      parseRawData(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = (e) => {
    const text = e.target.value;
    setPastedText(text);
    if (!text.trim()) return;

    const lines = text.split("\n").filter((line) => line.trim());

    // FIX V2.7: Filter lege headers aan het einde van de regel (Excel bijvangst)
    const rawHeaders = lines[0].split("\t").map((h) => h.trim());
    const headers = rawHeaders.filter((h) => h !== "");

    const rows = lines.slice(1).map((line) => {
      const values = line.split("\t");
      const obj = {};

      headers.forEach((h, i) => {
        if (!h) return; // Sla lege kolommen over (dubbele check)

        let val = values[i]?.trim() || "";
        const cleanHeader = h.toLowerCase();

        // Alleen converteren naar nummer als het geen ID of Artikelcode is
        if (
          val !== "" &&
          !isNaN(val) &&
          !["id", "articlecode", "drawing"].includes(cleanHeader)
        ) {
          val = Number(val);
        }
        obj[h] = val;
      });
      return obj;
    });

    parseRawData(rows);
  };

  // --- VALIDATIE ---
  const validateData = () => {
    const errors = [];
    if (previewData.length === 0)
      errors.push("Geen data gevonden om te controleren.");

    previewData.forEach((row, index) => {
      if (!row.id) {
        errors.push(`Rij ${index + 1}: Het veld 'id' is verplicht.`);
      }

      // Controleer op lege veldnamen in het object zelf (Firestore blokkade)
      Object.keys(row).forEach((key) => {
        if (key === "" || key === "undefined") {
          errors.push(
            `Rij ${
              index + 1
            }: Bevat een kolom zonder naam. Verwijder lege kolommen uit Excel.`
          );
        }
      });
    });

    // Haal unieke foutmeldingen op
    const uniqueErrors = [...new Set(errors)];
    setValidationErrors(uniqueErrors);

    if (uniqueErrors.length === 0 && previewData.length > 0) {
      setIsVerified(true);
      setStatus({
        type: "success",
        msg: "Data validatie succesvol. Klaar voor import.",
      });
    } else {
      setIsVerified(false);
      setStatus({
        type: "error",
        msg: "Controle mislukt. Corrigeer de fouten in de lijst.",
      });
    }
  };

  // --- IMPORT ---
  const processImport = async () => {
    if (!isVerified || loading) return;

    setLoading(true);
    const batch = writeBatch(db);
    let count = 0;

    try {
      previewData.forEach((row) => {
        if (!row.id) return;

        // Maak een schoon object zonder lege keys voor Firestore
        const cleanEntry = {};
        Object.entries(row).forEach(([k, v]) => {
          if (k.trim() !== "" && k !== "undefined") {
            cleanEntry[k] = v;
          }
        });

        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          targetCollection,
          String(row.id).trim()
        );
        batch.set(
          docRef,
          {
            ...cleanEntry,
            lastUpdated: serverTimestamp(),
            updatedBy: "Bulk Hub V2.7",
          },
          { merge: true }
        );
        count++;
      });

      await batch.commit();
      setStatus({
        type: "success",
        msg: `Succesvol verwerkt: ${count} documenten in ${targetCollection}.`,
      });
      setPreviewData([]);
      setPastedText("");
      setIsVerified(false);
    } catch (error) {
      console.error("Firestore Batch Error:", error);
      setStatus({ type: "error", msg: "Import error: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left pb-20">
      {/* CATEGORIE & TEMPLATES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 flex flex-col text-left">
          <h3 className="text-lg font-black uppercase italic text-slate-800 flex items-center gap-3">
            <Database className="text-blue-600" /> 1. Categorie
          </h3>
          <div className="space-y-2 flex-1">
            {COLLECTIONS.map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  setTargetCollection(col.id);
                  setPreviewData([]);
                  setIsVerified(false);
                  setStatus(null);
                }}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                  targetCollection === col.id
                    ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-md"
                    : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {col.label}
                </span>
                {targetCollection === col.id && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-2 text-left">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
              Download Sjablonen:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadTemplate("excel")}
                className="py-3 bg-emerald-50 text-emerald-700 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200"
              >
                <FileSpreadsheet size={14} /> Excel (.xlsx)
              </button>
              <button
                onClick={() => downloadTemplate("csv")}
                className="py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"
              >
                <FileText size={14} /> CSV Versie
              </button>
            </div>
          </div>
        </div>

        {/* DATA INVOEREN */}
        <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl space-y-6 relative overflow-hidden flex flex-col justify-between text-left">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileSpreadsheet size={120} />
          </div>
          <h3 className="text-lg font-black uppercase italic flex items-center gap-3 text-left">
            <Clipboard className="text-emerald-400" /> 2. Data Invoeren
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 text-left">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                A. Upload XLSX / CSV
              </p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-[30px] hover:border-emerald-500 transition-all cursor-pointer bg-white/5 hover:bg-white/10 group">
                <FileUp className="w-8 h-8 mb-2 text-slate-500 group-hover:text-emerald-400 transition-all" />
                <span className="text-[10px] text-slate-400 font-black uppercase italic text-center">
                  Bestand Sleep of Klik
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                B. Plakken uit Excel (Headers incl.)
              </p>
              <textarea
                className="w-full h-32 bg-white/5 border-2 border-slate-700 rounded-[30px] p-4 text-[10px] font-mono outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder:text-slate-600 shadow-inner"
                placeholder="Selecteer cellen in Excel, kopieer (Ctrl+C) en plak hier (Ctrl+V)..."
                value={pastedText}
                onChange={handlePaste}
              />
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="flex gap-3 pt-4 animate-in slide-in-from-bottom-2 text-left">
              <button
                onClick={validateData}
                className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
                  isVerified
                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                {isVerified ? <FileCheck size={18} /> : <Zap size={18} />}
                Data Controleren
              </button>

              <button
                onClick={processImport}
                disabled={!isVerified || loading}
                className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-400 disabled:opacity-30 transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
                Start Import ({previewData.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VALIDATIE FEEDBACK */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl space-y-2 animate-in zoom-in shadow-sm text-left">
          <div className="flex items-center gap-2 text-red-600 mb-2 text-left">
            <AlertCircle size={20} />
            <h4 className="font-black uppercase text-sm">Validatie Fouten:</h4>
          </div>
          <ul className="list-disc list-inside text-xs font-bold text-red-500 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] font-black text-red-400 uppercase italic">
            Tip: Zorg dat er geen lege kolommen aan het einde van je Excel
            selectie zitten.
          </p>
        </div>
      )}

      {status && (
        <div
          className={`p-6 rounded-3xl flex items-center gap-4 border-2 shadow-sm animate-in slide-in-from-top-4 ${
            status.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : "bg-blue-50 border-blue-100 text-blue-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 size={24} />
          ) : (
            <Info size={24} />
          )}
          <p className="text-sm font-black uppercase tracking-widest">
            {status.msg}
          </p>
          <button
            onClick={() => setStatus(null)}
            className="ml-auto opacity-40 hover:opacity-100 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* PREVIEW TABEL */}
      {previewData.length > 0 && (
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-700 text-left">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-left">
            <div className="flex items-center gap-2 text-left">
              <Table size={16} className="text-slate-400" />
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-left">
                Preview ({previewData.length} items)
              </h4>
            </div>
            <button
              onClick={() => {
                setPreviewData([]);
                setPastedText("");
                setIsVerified(false);
                setStatus(null);
              }}
              className="text-[10px] font-black text-red-500 uppercase hover:underline"
            >
              Lijst Wissen
            </button>
          </div>
          <div className="overflow-x-auto max-h-[400px] custom-scrollbar text-left">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b sticky top-0 z-10 text-left">
                <tr>
                  {Object.keys(previewData[0])
                    .filter((k) => k.trim() !== "")
                    .map((h) => (
                      <th key={h} className="px-6 py-4">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {previewData.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {Object.entries(row)
                      .filter(([k]) => k.trim() !== "")
                      .map(([k, v], j) => (
                        <td
                          key={j}
                          className="px-6 py-4 text-[10px] font-bold text-slate-600"
                        >
                          {String(v)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RICHTLIJNEN */}
      <div className="p-8 bg-blue-50 rounded-[40px] border border-blue-100 flex items-start gap-4 shadow-inner text-left text-left">
        <AlertCircle className="text-blue-500 shrink-0 mt-1" size={20} />
        <div className="space-y-2 text-left text-left">
          <h4 className="text-xs font-black uppercase text-blue-900 tracking-widest">
            Richtlijnen voor Bulk Hub V2.7:
          </h4>
          <p className="text-[10px] font-bold text-blue-700/70 uppercase leading-relaxed max-w-4xl text-left">
            1. Gebruik altijd de kolom <strong>'id'</strong> voor de
            documentnaam (bv: ELBOW_CB_PN10_ID300). <br />
            2. Het systeem filtert nu automatisch lege kolommen aan het begin of
            einde van je selectie uit. <br />
            3. <strong>Validatie:</strong> Gebruik de 'Controleren' knop om te
            zien of alle kolommen een geldige naam hebben. <br />
            4. Voor <strong>Fitting (CB)</strong>: id, TW, L, Lo, R, Weight,
            articleCode.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadView;
