import React, { useState, useEffect, useMemo } from "react";
import {
  PlayCircle,
  Printer,
  RefreshCw,
  Edit3,
  Maximize,
  Minimize,
  QrCode,
  ScanBarcode, // Toegevoegd voor barcode rendering
  Image as ImageIcon, // Toegevoegd voor image rendering
  CheckCircle,
  BookOpen,
  X,
  Layers,
  Info,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

// Constanten voor rendering
const PIXELS_PER_MM = 3.78;

// Hulpfunctie voor weeknummer
const getWeekNumber = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

// Helper die zowel week als jaar teruggeeft
const getISOWeekInfo = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  return { week: weekNo, year: year };
};

const ProductionStartModal = ({
  order,
  isOpen,
  onClose,
  onStart,
  stationId,
  existingProducts,
  onOpenProductInfo,
}) => {
  const [mode, setMode] = useState("auto");
  const [labelSize, setLabelSize] = useState("140x90");
  const [lotNumber, setLotNumber] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [stringCount, setStringCount] = useState(1);

  // Label Selectie
  const [availableLabels, setAvailableLabels] = useState([]);
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [isPrinterEnabled, setIsPrinterEnabled] = useState(true);

  // Laad labels bij openen
  useEffect(() => {
    const fetchLabels = async () => {
      if (!isOpen) return;
      setLoadingLabels(true);
      try {
        const querySnapshot = await getDocs(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "label_templates"
          )
        );
        const labels = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAvailableLabels(labels);
      } catch (e) {
        console.error("Fout bij laden labels:", e);
      } finally {
        setLoadingLabels(false);
      }
    };
    fetchLabels();
  }, [isOpen]);

  // Lotnummer logica
  useEffect(() => {
    if (isOpen && order && mode === "auto") {
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const { week } = getISOWeekInfo(now);
      const ww = String(week).padStart(2, "0");
      const digits = stationId.replace(/\D/g, "");
      const machineCode = digits ? `4${digits}` : "400";
      const prefix = `40${yy}${ww}${machineCode}40`;

      const count = existingProducts.filter(
        (p) => p.lotNumber && p.lotNumber.startsWith(prefix)
      ).length;
      const seq = String(count + 1).padStart(4, "0");

      setLotNumber(`${prefix}${seq}`);
      setStringCount(1);
    } else if (mode === "manual") {
      setLotNumber(manualInput);
    }
  }, [isOpen, order, mode, stationId, existingProducts, manualInput]);

  // Hulpfunctie om variabelen te vervangen in de preview
  const resolveVariables = (content) => {
    if (!content) return "";
    return content
      .replace(/{lotNumber}/g, lotNumber)
      .replace(/{orderId}/g, order.orderId)
      .replace(/{itemCode}/g, order.item)
      .replace(/{description}/g, order.item)
      .replace(/{drawing}/g, order.drawing || "N/A")
      .replace(/{date}/g, new Date().toLocaleDateString("nl-NL"));
  };

  const selectedLabel = availableLabels.find((l) => l.id === selectedLabelId);

  const handlePrintLabel = () => {
    // Hier zou de ZPL generatie komen o.b.v. het geselecteerde label
    // Voor nu een simpele alert/print
    window.print();
  };

  const handleStartClick = () => {
    onStart(order, lotNumber, stringCount, isPrinterEnabled, selectedLabel);
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[95vh]">
        {/* LINKER KOLOM: Instellingen & Info */}
        <div className="w-full md:w-1/3 p-8 border-r border-gray-100 flex flex-col bg-gray-50/30 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
              Start Productie
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Configureer label en data
            </p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Order Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                    Order
                  </span>
                  <h3 className="text-xl font-black text-gray-900">
                    {order.orderId}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-black text-blue-600 leading-none">
                    {order.plan}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Stuks
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700 line-clamp-2">
                  {order.item}
                </p>
                {order.drawing && (
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    {order.drawing}
                  </p>
                )}

                {order.linkedProductId && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit mb-2">
                      <CheckCircle size={12} /> Gekoppeld
                    </div>
                    <button
                      onClick={() => onOpenProductInfo(order.linkedProductId)}
                      className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors"
                    >
                      <BookOpen size={14} /> Open Product Dossier
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Productie String */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Productie String (Aantal tegelijk)
              </label>
              <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border-2 border-transparent focus-within:border-blue-500 transition-colors">
                <Layers size={20} className="text-gray-400 ml-2" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={stringCount}
                  onChange={(e) =>
                    setStringCount(parseInt(e.target.value) || 1)
                  }
                  className="bg-transparent font-bold text-gray-800 text-sm w-full outline-none"
                />
              </div>
              {stringCount > 1 && (
                <p className="text-[10px] text-blue-600 font-bold animate-pulse">
                  Er worden {stringCount} unieke lotnummers gegenereerd.
                </p>
              )}
            </div>

            {/* LABEL LAYOUT SELECTIE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                <span>Label Layout</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrinterEnabled}
                    onChange={(e) => setIsPrinterEnabled(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-[9px] text-blue-600">Print</span>
                </label>
              </label>
              {loadingLabels ? (
                <div className="text-xs text-gray-400 italic">Laden...</div>
              ) : (
                <select
                  value={selectedLabelId}
                  onChange={(e) => setSelectedLabelId(e.target.value)}
                  className="w-full p-3 bg-gray-100 border-transparent rounded-xl text-sm font-bold text-gray-700 focus:border-blue-500 outline-none"
                >
                  <option value="">Standaard FPI Label</option>
                  {availableLabels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.width}x{l.height}mm)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Label Formaat (Alleen zichtbaar bij standaard label) */}
            {!selectedLabelId && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Standaard Formaat
                </label>
                <div className="flex bg-gray-100 p-1.5 rounded-xl">
                  <button
                    onClick={() => setLabelSize("140x90")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      labelSize === "140x90"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Maximize size={16} /> 140x90
                  </button>
                  <button
                    onClick={() => setLabelSize("140x40")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      labelSize === "140x40"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Minimize size={16} /> 140x40
                  </button>
                </div>
              </div>
            )}

            {/* Lotnummer Methode */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Lotnummer
              </label>
              <div className="flex bg-gray-100 p-1.5 rounded-xl">
                <button
                  onClick={() => setMode("auto")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    mode === "auto"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <RefreshCw size={16} /> Auto
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    mode === "manual"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Edit3 size={16} /> Handmatig
                </button>
              </div>
              {mode === "manual" && (
                <div className="animate-in slide-in-from-top-2">
                  <input
                    type="text"
                    placeholder="LOTNUMMER"
                    className="w-full p-3 border-2 border-blue-200 rounded-xl font-mono text-sm font-bold text-center uppercase"
                    value={manualInput}
                    onChange={(e) =>
                      setManualInput(e.target.value.toUpperCase())
                    }
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={handleStartClick}
              disabled={!lotNumber}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle size={20} /> Start{" "}
              {stringCount > 1 && `(${stringCount}x)`}
            </button>
          </div>
        </div>

        {/* RECHTER KOLOM: Preview */}
        <div className="w-full md:w-2/3 bg-gray-900 p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Printer Ready (
              {selectedLabel
                ? `${selectedLabel.width}x${selectedLabel.height}`
                : labelSize}
              mm)
            </span>
          </div>
          <div className="mb-4 text-white/50 text-xs font-bold uppercase tracking-widest z-10">
            Live Voorbeeld
          </div>

          {/* CONTAINER VOOR PREVIEW */}
          <div className="relative flex items-center justify-center overflow-auto max-w-full max-h-full">
            {/* A: CUSTOM LABEL PREVIEW */}
            {selectedLabel ? (
              <div
                className="bg-white shadow-2xl relative transition-all duration-300 origin-center"
                style={{
                  width: `${selectedLabel.width * PIXELS_PER_MM}px`, // Schaal naar pixels
                  height: `${selectedLabel.height * PIXELS_PER_MM}px`,
                  // Automatisch schalen zodat het in de modal past als het te groot is
                  transform: `scale(${Math.min(
                    1,
                    600 / (selectedLabel.width * PIXELS_PER_MM)
                  )})`,
                }}
              >
                {selectedLabel.elements?.map((el) => {
                  // Variabelen vervangen in de content
                  const displayContent = el.variable
                    ? resolveVariables(el.content)
                    : el.content;

                  return (
                    <div
                      key={el.id}
                      className="absolute"
                      style={{
                        left: `${el.x * PIXELS_PER_MM}px`,
                        top: `${el.y * PIXELS_PER_MM}px`,
                        transform: `rotate(${el.rotation || 0}deg)`,
                        transformOrigin: "top left",
                      }}
                    >
                      {el.type === "text" && (
                        <div
                          style={{
                            fontSize: `${el.fontSize}px`,
                            fontWeight: el.isBold ? "bold" : "normal",
                            fontFamily: el.fontFamily,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayContent}
                        </div>
                      )}
                      {el.type === "barcode" && (
                        <div
                          style={{
                            width: `${(el.width || 30) * PIXELS_PER_MM}px`,
                            height: `${(el.height || 10) * PIXELS_PER_MM}px`,
                          }}
                          className="flex items-center justify-center bg-white"
                        >
                          <ScanBarcode size={100} className="w-full h-full" />
                        </div>
                      )}
                      {el.type === "qr" && (
                        <div
                          style={{
                            width: `${(el.width || 20) * PIXELS_PER_MM}px`,
                            height: `${(el.width || 20) * PIXELS_PER_MM}px`,
                          }}
                          className="flex items-center justify-center bg-white"
                        >
                          <QrCode size={100} className="w-full h-full" />
                        </div>
                      )}
                      {el.type === "image" && (
                        <div
                          style={{
                            width: `${(el.width || 20) * PIXELS_PER_MM}px`,
                            height: `${(el.height || 20) * PIXELS_PER_MM}px`,
                          }}
                          className="flex items-center justify-center bg-white"
                        >
                          <ImageIcon
                            size={100}
                            className="w-full h-full text-slate-300"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* B: STANDAARD/LEGACY PREVIEW */
              <div
                className={`bg-white shadow-2xl relative rounded-sm border-2 border-white flex transition-all duration-300 ${
                  labelSize === "140x90"
                    ? "w-[450px] h-[290px] flex-col p-4"
                    : "w-[450px] h-[130px] flex-row p-2"
                }`}
              >
                {labelSize === "140x90" ? (
                  <>
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                      <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 m-0">
                        WAVISTRONG
                      </h1>
                      <span className="text-sm font-bold text-slate-900">
                        {order.orderId}
                      </span>
                    </div>
                    <div className="flex flex-1">
                      <div className="w-[60%] border-r-2 border-black pr-2 flex flex-col justify-center">
                        <h2 className="text-xl font-bold leading-tight uppercase text-slate-900 mb-2 line-clamp-2">
                          {order.item}
                        </h2>
                        <div className="text-xs text-slate-700 font-mono mb-4">
                          DRAWING: {order.drawing || "N/A"}
                          <br />
                          PRESSURE: 20 BAR
                          <br />
                          JOINT CODE: CST20
                        </div>
                        <div className="mt-auto">
                          <div className="h-8 w-full flex items-end justify-start gap-[2px] opacity-90 mb-1 overflow-hidden">
                            {[...Array(30)].map((_, i) => (
                              <div
                                key={i}
                                className="bg-black"
                                style={{
                                  width: Math.random() > 0.5 ? "2px" : "5px",
                                  height: "100%",
                                }}
                              ></div>
                            ))}
                          </div>
                          <p className="font-mono text-lg font-black tracking-widest text-slate-900">
                            {lotNumber || "------"}
                          </p>
                        </div>
                      </div>
                      <div className="w-[40%] pl-2 flex flex-col justify-between items-center">
                        <div className="flex gap-2 w-full justify-between">
                          <div className="flex flex-col items-center">
                            <QrCode className="w-12 h-12 text-slate-900" />
                            <span className="text-[7px] font-bold mt-1">
                              ORDER
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <QrCode className="w-12 h-12 text-slate-900" />
                            <span className="text-[7px] font-bold mt-1">
                              ITEM
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center mt-2">
                          <QrCode
                            className="w-20 h-20 text-slate-900"
                            strokeWidth={2}
                          />
                          <span className="text-[8px] font-bold mt-1">
                            LOT NUMBER
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-1 border-t-2 border-black w-full text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">
                      FUTURE PIPE INDUSTRIES
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[30%] border-r-2 border-black pr-2 flex flex-col justify-between items-start">
                      <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                        WAVISTRONG
                      </h1>
                      <span className="text-xs font-bold text-slate-900">
                        {order.orderId}
                      </span>
                      <div className="text-[8px] font-black uppercase tracking-widest text-slate-900">
                        FPI
                      </div>
                    </div>
                    <div className="w-[40%] border-r-2 border-black px-2 flex flex-col justify-center">
                      <h2 className="text-xs font-bold leading-tight uppercase text-slate-900 mb-1 line-clamp-2">
                        {order.item}
                      </h2>
                      <span className="text-[9px] text-slate-600 font-mono mb-1">
                        {order.drawing}
                      </span>
                      <p className="font-mono text-sm font-black tracking-widest text-slate-900 truncate">
                        {lotNumber || "------"}
                      </p>
                    </div>
                    <div className="w-[30%] pl-2 flex items-center justify-center">
                      <QrCode
                        className="w-20 h-20 text-slate-900"
                        strokeWidth={2}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handlePrintLabel}
            className="mt-8 py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 z-20"
          >
            <Printer size={16} /> Print Etiket (ZPL)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionStartModal;
