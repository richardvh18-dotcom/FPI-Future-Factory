import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Database,
  FileSpreadsheet,
  Loader2,
  Ruler,
  Layers,
} from "lucide-react";
import { writeBatch, doc, getDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import {
  generateProductCode,
  validateAgainstMatrix,
  formatProductForSave,
  validateProductData,
} from "../../utils/productHelpers";

const UPLOAD_CONFIG = {
  fitting: {
    label: "Fitting Specificaties",
    icon: <Ruler size={24} />,
    description: "Upload maten voor bochten, T-stukken, etc.",
    variants: {
      cb: {
        label: "Lijm (CB)",
        collection: "standard_fitting_specs",
        headers: ["type", "pressure", "diameter", "TWcb", "BD", "W", "L", "Z"],
        idPrefix: "_CB_",
      },
      tb: {
        label: "Manchet (TB)",
        collection: "standard_fitting_specs",
        headers: ["type", "pressure", "diameter", "TWtb", "BD", "W", "L", "Z"],
        idPrefix: "_TB_",
      },
    },
  },
  bell: {
    label: "Bell Mof (Maten)",
    icon: <Layers size={24} />,
    description: "Upload de specifieke maten voor moffen.",
    variants: {
      cb: {
        label: "Lijm Mof (CB)",
        collection: "cb_dimensions",
        headers: ["id", "B1", "B2", "BA", "A1"],
        description: "ID formaat: CB_PN10_ID110",
      },
      tb: {
        label: "Manchet Mof (TB)",
        collection: "tb_dimensions",
        headers: ["id", "B1", "B2", "BA", "r1", "alpha"],
        description: "ID formaat: TB_PN10_ID110",
      },
    },
  },
};

const AdminUploadView = ({ onBack }) => {
  const [mainCategory, setMainCategory] = useState("fitting");
  const [subVariant, setSubVariant] = useState("cb");
  const [jsonInput, setJsonInput] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [matrix, setMatrix] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(true);

  const currentConfig = UPLOAD_CONFIG[mainCategory].variants[subVariant];

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_range"
        );
        const snap = await getDoc(docRef);
        if (snap.exists()) setMatrix(snap.data());
      } catch (err) {
        console.error("Kon matrix niet laden:", err);
      } finally {
        setLoadingMatrix(false);
      }
    };
    fetchMatrix();
  }, []);

  const parseCSV = (text) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    if (lines.length < 2)
      throw new Error("CSV bestand is leeg of bevat geen headers.");
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(",");
      if (currentLine.length < headers.length) continue;
      const obj = {};
      headers.forEach((header, index) => {
        let val = currentLine[index]?.trim().replace(/^"|"$/g, "") || "";
        if (!isNaN(val) && val !== "") val = Number(val);
        obj[header] = val;
      });
      result.push(obj);
    }
    return result;
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," + currentConfig.headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `template_${mainCategory}_${subVariant}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const data = parseCSV(text);
        setJsonInput(JSON.stringify(data, null, 2));
        processData(data);
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          { type: "error", msg: "CSV Fout: " + err.message },
        ]);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleManualParse = () => {
    const trimmedInput = jsonInput.trim();
    if (trimmedInput.startsWith("[") || trimmedInput.startsWith("{")) {
      try {
        const data = JSON.parse(jsonInput);
        if (!Array.isArray(data)) throw new Error("JSON moet een array zijn.");
        processData(data);
      } catch (e) {
        setLogs((prev) => [
          ...prev,
          { type: "error", msg: "JSON Syntax Fout: " + e.message },
        ]);
      }
    } else {
      try {
        const data = parseCSV(jsonInput);
        processData(data);
        setLogs((prev) => [
          ...prev,
          { type: "info", msg: "Tekst verwerkt als CSV." },
        ]);
      } catch (e) {
        setLogs((prev) => [
          ...prev,
          { type: "error", msg: "Ongeldig formaat. Gebruik JSON of CSV." },
        ]);
      }
    }
  };

  const processData = (data) => {
    const processed = data.map((item) => {
      const tempItem = { ...item };
      let isValid = true;
      let errorMsg = "";
      let generatedId = "";

      if (mainCategory === "fitting") {
        if (!tempItem.type || !tempItem.pressure || !tempItem.diameter) {
          isValid = false;
          errorMsg = "Type, Pressure en Diameter zijn verplicht.";
        } else {
          const baseType = tempItem.type;
          if (!baseType.toLowerCase().includes("_socket")) {
            tempItem.type = `${baseType}_Socket`;
          }
          const typeUpper = tempItem.type.toUpperCase();
          const variantUpper = subVariant.toUpperCase();
          generatedId = `${typeUpper}_${variantUpper}_PN${tempItem.pressure}_ID${tempItem.diameter}`;

          const matrixCheckItem = {
            ...tempItem,
            type: baseType,
            mofType: variantUpper,
          };
          const matrixCheck = validateAgainstMatrix(matrixCheckItem, matrix);
          if (!matrixCheck.allowed) {
            isValid = false;
            errorMsg = matrixCheck.error;
          }
        }
      } else {
        if (!tempItem.id) {
          isValid = false;
          errorMsg = "ID is verplicht (bv. CB_PN10_ID110)";
        } else {
          generatedId = tempItem.id;
          if (!generatedId.toUpperCase().includes("_PN")) {
            isValid = false;
            errorMsg = "ID mist PN aanduiding";
          }
        }
      }

      return {
        ...tempItem,
        _docId: generatedId,
        _status: isValid ? "valid" : "invalid",
        _error: errorMsg,
      };
    });

    setParsedData(processed);
    setLogs([
      {
        type: "info",
        msg: `${processed.length} regels geanalyseerd voor ${currentConfig.label}.`,
      },
    ]);
  };

  const handleUpload = async () => {
    setUploading(true);
    const batch = writeBatch(db);
    const validItems = parsedData.filter((i) => i._status === "valid");
    const collectionName = currentConfig.collection;

    if (validItems.length === 0) {
      setLogs((prev) => [
        ...prev,
        { type: "error", msg: "Geen geldige items om te uploaden." },
      ]);
      setUploading(false);
      return;
    }

    try {
      validItems.forEach((item) => {
        const { _status, _error, _docId, ...cleanItem } = item;
        const ref = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          collectionName,
          _docId
        );
        batch.set(ref, { ...cleanItem, id: _docId });
      });

      await batch.commit();
      setLogs((prev) => [
        ...prev,
        {
          type: "success",
          msg: `Succes: ${validItems.length} items opgeslagen in '${collectionName}'!`,
        },
      ]);
      setParsedData([]);
      setJsonInput("");
    } catch (error) {
      console.error("Upload error:", error);
      setLogs((prev) => [
        ...prev,
        { type: "error", msg: "Upload mislukt: " + error.message },
      ]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <UploadCloud className="text-cyan-500" size={28} /> Data Import
            </h2>
            <p className="text-sm text-slate-400 font-medium ml-10">
              Bulk import via Excel/CSV of JSON
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
            >
              Terug
            </button>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Database size={18} /> 1. Wat wil je uploaden?
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(UPLOAD_CONFIG).map(([key, conf]) => (
              <button
                key={key}
                onClick={() => {
                  setMainCategory(key);
                  setParsedData([]);
                  setLogs([]);
                }}
                className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${
                  mainCategory === key
                    ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-md"
                    : "border-slate-100 hover:border-slate-300 text-slate-500"
                }`}
              >
                <div
                  className={`p-3 rounded-full ${
                    mainCategory === key ? "bg-cyan-200" : "bg-slate-100"
                  }`}
                >
                  {conf.icon}
                </div>
                <div>
                  <span className="font-black block text-sm uppercase tracking-wide">
                    {conf.label}
                  </span>
                  <span className="text-xs opacity-70">{conf.description}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
              Kies Variant
            </span>
            <div className="flex gap-4">
              {Object.entries(UPLOAD_CONFIG[mainCategory].variants).map(
                ([key, variant]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSubVariant(key);
                      setParsedData([]);
                    }}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                      subVariant === key
                        ? "bg-white border-cyan-500 text-cyan-700 shadow-sm"
                        : "bg-transparent border-transparent text-slate-500 hover:bg-white hover:border-slate-200"
                    }`}
                  >
                    {variant.label}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-slate-500 font-mono">
              Doel:{" "}
              <span className="font-bold text-slate-700">
                /public/data/{currentConfig.collection}
              </span>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
            >
              <FileSpreadsheet size={16} /> Download {currentConfig.label}{" "}
              Template
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2">
              <FileText size={18} /> 2. Data Invoeren
            </h3>
            <div
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-cyan-400 transition-colors mb-4 group shrink-0"
            >
              <UploadCloud
                size={32}
                className="mx-auto text-slate-300 group-hover:text-cyan-500 mb-2 transition-colors"
              />
              <p className="text-xs font-bold text-slate-500 group-hover:text-cyan-700">
                Klik hier om CSV te uploaden
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="relative flex items-center py-2 shrink-0">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-bold uppercase">
                Of plak data
              </span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>
            <textarea
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
              placeholder={`Plak hier je CSV data...\n${currentConfig.headers.join(
                ","
              )}`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <button
              onClick={handleManualParse}
              disabled={!jsonInput}
              className="mt-4 w-full bg-slate-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 disabled:opacity-50 shrink-0"
            >
              Verwerk Tekst
            </button>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle size={18} /> 3. Validatie
              </span>
              {mainCategory === "fitting" && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    loadingMatrix
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {loadingMatrix ? "Matrix laden..." : "Matrix actief"}
                </span>
              )}
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-2">
              {parsedData.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <Database size={48} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold">Wachtend op data...</p>
                </div>
              )}
              {parsedData.map((item, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-xs flex justify-between items-start ${
                    item._status === "valid"
                      ? "bg-white border-slate-200"
                      : "bg-red-50 border-red-100"
                  }`}
                >
                  <div className="flex-1">
                    <span className="font-bold block text-slate-700">
                      {item._docId || "Onbekend ID"}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(item)
                        .filter(
                          ([k]) =>
                            !k.startsWith("_") && k !== "id" && k !== "type"
                        )
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] text-slate-500"
                          >
                            {k}: {v}
                          </span>
                        ))}
                    </div>
                    {item._error && (
                      <span className="block text-red-500 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> {item._error}
                      </span>
                    )}
                  </div>
                  {item._status === "valid" ? (
                    <CheckCircle
                      size={16}
                      className="text-emerald-500 shrink-0"
                    />
                  ) : (
                    <X size={16} className="text-red-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={handleUpload}
                disabled={
                  uploading ||
                  parsedData.filter((i) => i._status === "valid").length === 0
                }
                className="w-full bg-cyan-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-cyan-700 disabled:opacity-50 flex justify-center gap-2 shadow-lg shadow-cyan-200"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <UploadCloud size={16} />
                )}{" "}
                Start Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadView;
