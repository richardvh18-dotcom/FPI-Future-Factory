import React, { useState } from "react";
import {
  UploadCloud,
  FileText,
  Database,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Table,
  Info,
} from "lucide-react";
import { writeBatch, doc, getDoc, setDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";

/**
 * AdminUploadView.js - v2.0 (Matrix Compatible)
 * Bulk upload functionaliteit die aansluit op de nieuwe datastructuur.
 *
 * FEATURES:
 * - Ondersteunt CSV (Excel copy-paste) import.
 * - Genereert automatische Document ID's op basis van de Matrix-logica (TYPE_CONN_PN_ID).
 * - Normaliseert verbindingen (CB/CB -> CB).
 * - Kan direct de 'product_range' matrix updaten bij nieuwe producten.
 */
const AdminUploadView = ({ onBack }) => {
  const [targetCollection, setTargetCollection] = useState("products");
  const [rawData, setRawData] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [log, setLog] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [updateMatrix, setUpdateMatrix] = useState(true); // Optie om matrix auto-te-vullen

  // Schema definities voor validatie en ID generatie
  const TARGETS = {
    products: {
      label: "Product Catalogus",
      collection: "products",
      required: ["category", "type", "diameter", "pressure", "connection"],
      idGen: (row) => {
        // Unieke ID voor product lijst: Categorie_Mof_PN_ID_Timestamp (om conflicten te vermijden in catalogus)
        const normConn = normalizeConnection(row.connection);
        return `${row.category}_${normConn}_PN${row.pressure}_ID${
          row.diameter
        }_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      },
    },
    cb_dimensions: {
      label: "CB Maatvoering (B1, B2, ...)",
      collection: "cb_dimensions",
      required: ["diameter", "pressure"],
      idGen: (row) => `CB_PN${row.pressure}_ID${row.diameter}`, // Strikte ID: CB_PN10_ID200
    },
    tb_dimensions: {
      label: "TB Maatvoering (L1, L2, ...)",
      collection: "tb_dimensions",
      required: ["diameter", "pressure"],
      idGen: (row) => `TB_PN${row.pressure}_ID${row.diameter}`,
    },
    bore_dimensions: {
      label: "Bore Dimensions (d, k, b)",
      collection: "bore_dimensions",
      required: ["diameter", "pressure"],
      idGen: (row) => `PN${row.pressure}_ID${row.diameter}`,
    },
    fitting_specs: {
      label: "Fitting Specs (L, Z, etc.)",
      collection: "fitting_specs",
      required: ["category", "diameter", "pressure", "connection"],
      idGen: (row) => {
        // Strikte ID: TYPE_MOF_PN_ID
        const type = row.category.split(" ")[0].toUpperCase();
        const normConn = normalizeConnection(row.connection);
        return `${type}_${normConn}_PN${row.pressure}_ID${row.diameter}`;
      },
    },
    tolerance_settings: {
      label: "Tolerantie Instellingen",
      collection: "tolerance_settings",
      required: ["category", "parameter"],
      idGen: (row) => {
        // ID: Categorie_Mof_PN_ID_Param (Of korter als velden ontbreken)
        const parts = [row.category];
        if (row.connection) parts.push(normalizeConnection(row.connection));
        if (row.pressure) parts.push(`PN${row.pressure}`);
        if (row.diameter) parts.push(`ID${row.diameter}`);
        parts.push(row.parameter);
        return parts.join("_");
      },
    },
  };

  // Helper: Normaliseer Mof naam (CB/CB -> CB) - CRUCIAAL VOOR MATRIX COMPATIBILITEIT
  const normalizeConnection = (conn) => {
    if (!conn) return "UNKNOWN";
    const c = conn.toUpperCase().trim();
    if (c === "CB/CB" || c === "CB/CB/CB") return "CB";
    if (c === "TB/TB" || c === "TB/TB/TB") return "TB";
    if (c.includes("/")) return c.split("/")[0]; // Fallback: pak eerste deel
    return c;
  };

  // CSV Parser (Tab of Komma gescheiden)
  const parseData = () => {
    setLog([]);
    setParsedData([]);

    if (!rawData.trim()) {
      setLog(["⚠️ Geen data ingevoerd."]);
      return;
    }

    try {
      const rows = rawData.trim().split("\n");
      if (rows.length < 2)
        throw new Error("Te weinig data. Voeg een header rij toe.");

      // Headers bepalen (normalize to lowercase keys)
      const headers = rows[0]
        .split(/[\t,;]+/)
        .map((h) => h.trim().toLowerCase().replace(/['"]+/g, ""));

      const result = [];
      const config = TARGETS[targetCollection];

      // Rows verwerken
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i]
          .split(/[\t,;]+/)
          .map((v) => v.trim().replace(/['"]+/g, ""));

        if (values.length < 2) continue; // Sla lege regels over

        const item = {};
        headers.forEach((header, index) => {
          // Mapping voor veelvoorkomende kolomnamen
          let key = header;
          if (key === "pn" || key === "druk" || key === "bar") key = "pressure";
          if (key === "id" || key === "dn" || key === "maat") key = "diameter";
          if (key === "type" || key === "product") key = "category";
          if (key === "mof" || key === "verbinding" || key === "conn")
            key = "connection";
          if (key === "param") key = "parameter";

          // Waarde opschonen
          let val = values[index];
          if (key === "pressure" && val) val = val.replace("PN", ""); // 'PN10' -> '10'

          item[key] = val;
        });

        // Validatie
        const missing = config.required.filter((req) => !item[req]);
        if (missing.length > 0) {
          console.warn(
            `Rij ${i + 1} overgeslagen: mist ${missing.join(", ")}`,
            item
          );
          continue;
        }

        // Genereer ID
        item._docId = config.idGen(item);
        result.push(item);
      }

      setParsedData(result);
      setLog([
        `✅ ${result.length} regels succesvol geparsed. Klaar om te uploaden naar '${config.collection}'.`,
      ]);
    } catch (error) {
      setLog([`❌ Parse fout: ${error.message}`]);
    }
  };

  // Upload naar Firestore
  const handleUpload = async () => {
    if (parsedData.length === 0) return;
    setUploading(true);
    const config = TARGETS[targetCollection];

    // We gebruiken batches (max 500 ops per batch)
    const batchSize = 450;
    let batch = writeBatch(db);
    let count = 0;
    let batchCount = 0;

    // Voor Matrix Update
    let matrixUpdates = {};
    // Structuur: { CB: { 10: { Elbow: [100, 200] } } }

    try {
      for (const item of parsedData) {
        // 1. Data Document voorbereiden
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          config.collection,
          item._docId
        );

        // Verwijder _docId uit de data zelf
        const { _docId, ...dataToSave } = item;

        // Voeg timestamps toe
        dataToSave.updatedAt = new Date().toISOString();
        if (targetCollection === "products")
          dataToSave.createdAt = new Date().toISOString();

        batch.set(docRef, dataToSave);
        count++;

        // 2. Matrix Update Verzamelen (Alleen als optie aan staat en relevant)
        if (
          updateMatrix &&
          (targetCollection === "products" ||
            targetCollection.includes("specs"))
        ) {
          const normConn = normalizeConnection(item.connection);
          const pn = item.pressure;
          const type = item.category; // bijv 'Elbow'
          const id = item.diameter;

          if (normConn && pn && type && id) {
            if (!matrixUpdates[normConn]) matrixUpdates[normConn] = {};
            if (!matrixUpdates[normConn][pn]) matrixUpdates[normConn][pn] = {};
            if (!matrixUpdates[normConn][pn][type])
              matrixUpdates[normConn][pn][type] = new Set();

            matrixUpdates[normConn][pn][type].add(id);
          }
        }

        // Commit batch als vol
        if (count >= batchSize) {
          await batch.commit();
          setLog((prev) => [...prev, `💾 Batch ${++batchCount} opgeslagen...`]);
          batch = writeBatch(db); // Nieuwe batch
          count = 0;
        }
      }

      // Laatste batch
      if (count > 0) {
        await batch.commit();
      }

      // 3. Matrix Daadwerkelijk Updaten
      if (updateMatrix && Object.keys(matrixUpdates).length > 0) {
        setLog((prev) => [...prev, `🔄 Matrix bijwerken...`]);

        const matrixRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "settings",
          "product_range"
        );
        const matrixSnap = await getDoc(matrixRef);
        let currentMatrix = matrixSnap.exists() ? matrixSnap.data() : {};

        // Merge updates
        Object.keys(matrixUpdates).forEach((conn) => {
          if (!currentMatrix[conn]) currentMatrix[conn] = {};
          Object.keys(matrixUpdates[conn]).forEach((pn) => {
            if (!currentMatrix[conn][pn]) currentMatrix[conn][pn] = {};
            Object.keys(matrixUpdates[conn][pn]).forEach((type) => {
              const existingIDs = currentMatrix[conn][pn][type] || [];
              const newIDs = Array.from(matrixUpdates[conn][pn][type]);
              // Merge en ontdubbel
              const combined = [...new Set([...existingIDs, ...newIDs])].sort(
                (a, b) => Number(a) - Number(b)
              );
              currentMatrix[conn][pn][type] = combined;
            });
          });
        });

        await setDoc(matrixRef, currentMatrix);
        setLog((prev) => [...prev, `✅ Matrix gesynchroniseerd!`]);
      }

      setLog((prev) => [
        ...prev,
        `🎉 Klaar! Alle ${parsedData.length} items verwerkt.`,
      ]);
      setParsedData([]); // Reset
      setRawData("");
    } catch (error) {
      console.error(error);
      setLog((prev) => [...prev, `❌ Upload Fout: ${error.message}`]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full p-8 overflow-y-auto custom-scrollbar">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-3 bg-white hover:bg-slate-100 rounded-2xl text-slate-500 transition-colors shadow-sm border border-slate-100"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <UploadCloud className="text-cyan-500" /> Data Upload Center
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Bulk Import & Matrix Sync
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* 1. SELECTIE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Database size={16} /> Stap 1: Kies Doel Collectie
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(TARGETS).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setTargetCollection(key);
                  setParsedData([]);
                  setLog([]);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  targetCollection === key
                    ? "bg-cyan-50 border-cyan-500 text-cyan-800 ring-2 ring-cyan-200"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white hover:shadow-md"
                }`}
              >
                <div className="font-bold text-sm mb-1">
                  {TARGETS[key].label}
                </div>
                <div className="text-[10px] opacity-70 font-mono">
                  {TARGETS[key].collection}
                </div>
              </button>
            ))}
          </div>

          {/* Matrix Optie */}
          {(targetCollection === "products" ||
            targetCollection.includes("specs")) && (
            <div
              className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer"
              onClick={() => setUpdateMatrix(!updateMatrix)}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  updateMatrix
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : "bg-white border-emerald-300"
                }`}
              >
                {updateMatrix && <CheckCircle size={12} />}
              </div>
              Automatisch Product Matrix (Beschikbaarheid) bijwerken met deze
              data?
            </div>
          )}
        </div>

        {/* 2. INPUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <FileText size={16} /> Stap 2: Plak Data (Excel/CSV)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Kopieer data uit Excel inclusief headers. Vereiste kolommen voor{" "}
              <strong>{TARGETS[targetCollection].label}</strong>:
              <br />
              <span className="font-mono text-cyan-600">
                {TARGETS[targetCollection].required.join(", ")}
              </span>
            </p>
            <textarea
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs outline-none focus:border-cyan-500 min-h-[300px]"
              placeholder={`Category\tConnection\tPressure\tDiameter\t...\nElbow\tCB\tPN10\t200\t...`}
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
            />
            <button
              onClick={parseData}
              className="mt-4 w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all"
            >
              Valideer & Parse Data
            </button>
          </div>

          {/* 3. PREVIEW & LOG */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <RefreshCw size={16} /> Stap 3: Resultaat & Upload
            </h3>

            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 overflow-y-auto max-h-[300px] min-h-[200px]">
              {log.map((l, i) => (
                <div
                  key={i}
                  className="text-xs font-mono mb-1 border-b border-slate-100 pb-1 last:border-0"
                >
                  {l}
                </div>
              ))}
              {parsedData.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Preview (Eerste 3 items)
                  </h4>
                  {parsedData.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded border border-slate-200 mb-2 text-[10px]"
                    >
                      <div className="font-bold text-cyan-600 mb-1">
                        ID: {item._docId}
                      </div>
                      <div className="grid grid-cols-2 gap-1 opacity-70">
                        {Object.entries(item)
                          .slice(0, 6)
                          .map(
                            ([k, v]) =>
                              k !== "_docId" && (
                                <div key={k}>
                                  {k}: {v}
                                </div>
                              )
                          )}
                      </div>
                    </div>
                  ))}
                  {parsedData.length > 3 && (
                    <div className="text-center text-xs text-slate-400 italic">
                      ... en nog {parsedData.length - 3} items.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || parsedData.length === 0}
              className="w-full bg-cyan-500 text-white py-3 rounded-xl font-bold hover:bg-cyan-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-200"
            >
              {uploading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <UploadCloud size={18} />
              )}
              {uploading
                ? "Bezig met uploaden..."
                : `Upload ${parsedData.length} Items naar Database`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadView;
