import React, { useState, useEffect } from "react";
import { Filter, Package, Info, Layers, Copy, Check } from "lucide-react";

const MatrixView = ({
  libraryData,
  matrixData,
  setMatrixData,
  setHasUnsavedChanges,
}) => {
  const [selectedConnection, setSelectedConnection] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // State voor de kopieer-functie
  const [copySource, setCopySource] = useState("");
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  useEffect(() => {
    if (libraryData.connections?.length > 0 && !selectedConnection) {
      setSelectedConnection(libraryData.connections[0]);
    }
    if (libraryData.product_names?.length > 0 && !selectedType) {
      setSelectedType(libraryData.product_names[0]);
    }
  }, [libraryData, selectedConnection, selectedType]);

  const normalizeConnection = (conn) => {
    if (!conn) return "";
    const c = conn.toUpperCase();
    // Normaliseer TB/TB naar TB, etc.
    if (c.includes("/")) return c.split("/")[0].trim();
    return c;
  };

  const toggleMatrixItem = (connection, pressure, category, id) => {
    const storageKey = normalizeConnection(connection);
    const pnKey = String(pressure);
    const idStr = String(id);

    setMatrixData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (!newData[storageKey]) newData[storageKey] = {};
      if (!newData[storageKey][pnKey]) newData[storageKey][pnKey] = {};

      let currentList = newData[storageKey][pnKey][category] || [];
      if (currentList.includes(idStr))
        currentList = currentList.filter((i) => i !== idStr);
      else currentList.push(idStr);

      currentList.sort((a, b) => Number(a) - Number(b));

      if (currentList.length > 0)
        newData[storageKey][pnKey][category] = currentList;
      else delete newData[storageKey][pnKey][category];

      return newData;
    });
    setHasUnsavedChanges(true);
  };

  // --- KOPIEER FUNCTIE ---
  const handleCopyFrom = () => {
    if (!copySource || !selectedType || !selectedConnection) return;

    const storageKey = normalizeConnection(selectedConnection);

    setMatrixData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));

      // We moeten door alle PN's heen loopen voor deze connectie
      const connectionData = newData[storageKey] || {};

      let copiedCount = 0;

      Object.keys(connectionData).forEach((pnKey) => {
        const sourceIds = connectionData[pnKey]?.[copySource];

        if (sourceIds && Array.isArray(sourceIds)) {
          // Kopieer naar het doel (selectedType)
          // We vervangen de bestaande lijst of voegen we samen?
          // Voor nu: Vervangen (dat is meestal wat je wilt bij een 'reset/copy')
          connectionData[pnKey][selectedType] = [...sourceIds];
          copiedCount++;
        }
      });

      if (copiedCount > 0) {
        setShowCopyConfirm(true);
        setTimeout(() => setShowCopyConfirm(false), 3000);
        setHasUnsavedChanges(true);
      } else {
        alert(
          `Geen data gevonden in '${copySource}' voor verbinding '${storageKey}' om te kopiëren.`
        );
      }

      return newData;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER & SELECTIE */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
              Configuratie Selectie
            </h3>
          </div>

          {/* KOPIEER TOOL */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">
              Kopieer van:
            </span>
            <select
              className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded py-1 px-2 outline-none focus:border-blue-400"
              value={copySource}
              onChange={(e) => setCopySource(e.target.value)}
            >
              <option value="">- Kies Bron -</option>
              {libraryData.product_names
                .filter((p) => p !== selectedType) // Niet van zichzelf kopiëren
                .map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
            <button
              onClick={handleCopyFrom}
              disabled={!copySource}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-1 rounded transition-colors disabled:opacity-50"
              title="Kopieer diameters naar huidige selectie"
            >
              {showCopyConfirm ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
              1. Kies Verbinding (Mof)
            </label>
            <div className="relative group">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
              >
                {libraryData.connections.length === 0 && (
                  <option>Geen verbindingen...</option>
                )}
                {libraryData.connections.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Layers
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-emerald-500 transition-colors"
                size={18}
              />
            </div>
            {selectedConnection !== normalizeConnection(selectedConnection) && (
              <p className="text-[10px] text-emerald-600 font-bold mt-2 ml-1">
                * Opslag als: {normalizeConnection(selectedConnection)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
              2. Kies Product Type (Doel)
            </label>
            <div className="relative group">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {libraryData.product_names.length === 0 && (
                  <option>Geen producten...</option>
                )}
                {libraryData.product_names.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Package
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-emerald-500 transition-colors"
                size={18}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedConnection && selectedType ? (
        <div className="flex flex-wrap justify-center gap-6">
          {libraryData.pns.map((pn) => {
            const storageKey = normalizeConnection(selectedConnection);
            const pnKey = String(pn);
            const activeIDs =
              matrixData[storageKey]?.[pnKey]?.[selectedType] || [];

            return (
              <div
                key={pn}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm"
              >
                <div className="bg-slate-900 px-5 py-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">PN {pn}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Selecteer ID's
                  </span>
                </div>
                <div className="p-5 flex flex-wrap gap-2 justify-center content-start min-h-[100px]">
                  {libraryData.diameters.map((id) => {
                    const idStr = String(id);
                    const isActive = activeIDs.includes(idStr);
                    return (
                      <button
                        key={id}
                        onClick={() =>
                          toggleMatrixItem(
                            selectedConnection,
                            pn,
                            selectedType,
                            id
                          )
                        }
                        className={`h-10 w-14 rounded-lg text-[11px] font-bold transition-all border flex items-center justify-center shadow-sm ${
                          isActive
                            ? "bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-200 scale-105 shadow-emerald-200/50"
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:border-slate-300 hover:text-slate-600"
                        }`}
                      >
                        {id}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 max-w-2xl mx-auto">
          <Info className="mb-4 opacity-50" size={48} />
          <p className="font-bold text-lg">Nog geen selectie gemaakt</p>
          <p className="text-sm">
            Kies hierboven een Verbinding en Product Type.
          </p>
        </div>
      )}
    </div>
  );
};

export default MatrixView;
