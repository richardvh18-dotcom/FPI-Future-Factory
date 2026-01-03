import React, { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * DataMigrator.js
 * Eenmalige tool om oude 'app_settings/dropdowns' samen te voegen met de nieuwe matrix.
 */
const DataMigrator = () => {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const handleMigration = async () => {
    setStatus("loading");
    setLog([]);
    addLog("🚀 Start migratie...");

    try {
      // 1. Haal OUDE data op (app_settings/dropdowns)
      const oldRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "app_settings",
        "dropdowns"
      );
      const oldSnap = await getDoc(oldRef);

      if (!oldSnap.exists()) {
        addLog("⚠️ Geen oude 'dropdowns' gevonden. Niets om te migreren.");
        setStatus("error");
        return;
      }
      const oldData = oldSnap.data();
      addLog(`✅ Oude dropdowns gevonden: ${Object.keys(oldData).join(", ")}`);

      // 2. Haal NIEUWE data op (settings/general_config)
      const newRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "settings",
        "general_config"
      );
      const newSnap = await getDoc(newRef);
      const newData = newSnap.exists()
        ? newSnap.data()
        : { codes: [], labels: [], connections: [], product_names: [] };

      addLog("✅ Huidige general_config geladen.");

      // 3. Samenvoegen & Ontbrekende items vinden
      const mergedConfig = { ...newData };
      const missingItems = {};

      // Helper functie om lijsten te mergen
      const mergeLists = (oldList, newList, keyName) => {
        if (!Array.isArray(oldList)) return newList;

        const combined = new Set([...(newList || [])]);
        const added = [];

        oldList.forEach((item) => {
          if (!combined.has(item)) {
            combined.add(item);
            added.push(item);
          }
        });

        if (added.length > 0) {
          addLog(
            `➕ ${added.length} items toegevoegd aan '${keyName}': ${added.join(
              ", "
            )}`
          );
        }
        return Array.from(combined).sort();
      };

      // Voeg specifieke lijsten samen
      mergedConfig.connections = mergeLists(
        oldData.connections,
        newData.connections,
        "connections"
      );
      mergedConfig.labels = mergeLists(
        oldData.labels,
        newData.labels,
        "labels"
      );
      mergedConfig.codes = mergeLists(
        oldData.productCodes,
        newData.codes,
        "codes"
      ); // Let op: oude naam was productCodes

      // Zoek naar "wezen" (items die niet in de matrix passen)
      // Hier kun je logica toevoegen om te checken of deze items wel in product_range voorkomen
      // Voor nu voegen we ze toe aan een nieuwe categorie 'legacy_imported' in de config
      const legacyItems = [];
      if (oldData.otherItems) {
        // Stel dat er 'otherItems' waren
        legacyItems.push(...oldData.otherItems);
      }

      if (legacyItems.length > 0) {
        mergedConfig.legacy_imported = legacyItems;
        addLog(
          `📦 ${legacyItems.length} items verplaatst naar 'legacy_imported'.`
        );
      }

      // 4. Opslaan
      await setDoc(newRef, mergedConfig, { merge: true });
      addLog("💾 Nieuwe configuratie opgeslagen in 'settings/general_config'.");

      setStatus("success");
      addLog("🎉 Migratie succesvol voltooid!");
    } catch (error) {
      console.error("Migratie fout:", error);
      addLog(`❌ Fout: ${error.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto mt-8">
      <div className="flex items-center gap-3 mb-4">
        <RefreshCw
          className={`text-blue-600 ${
            status === "loading" ? "animate-spin" : ""
          }`}
        />
        <h2 className="text-lg font-bold text-slate-800">Data Migratie Tool</h2>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        Combineer oude dropdown-data (app_settings) met de nieuwe
        matrix-structuur (general_config). Ontbrekende items worden toegevoegd.
      </p>

      <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-xs mb-6 h-48 overflow-y-auto">
        {log.length === 0 ? (
          <span className="opacity-50">// Wachten op start...</span>
        ) : (
          log.map((l, i) => <div key={i}>{l}</div>)
        )}
      </div>

      <button
        onClick={handleMigration}
        disabled={status === "loading"}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {status === "loading" ? "Bezig met migreren..." : "Start Samenvoegen"}
      </button>
    </div>
  );
};

export default DataMigrator;
