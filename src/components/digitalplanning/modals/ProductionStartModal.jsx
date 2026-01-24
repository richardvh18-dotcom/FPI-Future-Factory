import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  PlayCircle,
  Printer,
  RefreshCw,
  Edit3,
  QrCode,
  ScanBarcode,
  Image as ImageIcon,
  CheckCircle,
  BookOpen,
  Layers,
  AlertCircle,
  ArrowDown,
  Loader2,
  ListOrdered,
  Scissors,
  X,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db, appId } from "../../../config/firebase";
import { generateLotNumber } from "../../../utils/lotLogic";
import {
  processLabelData,
  resolveLabelContent,
} from "../../../utils/labelHelpers";

const PIXELS_PER_MM = 3.78;

const getQRCodeUrl = (data) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(
    data
  )}`;

const getBarcodeUrl = (data) =>
  `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    data
  )}&scale=3&height=10&incltext&guardwhitespace`;

const ProductionStartModal = ({
  order,
  isOpen,
  onClose,
  onStart,
  stationId = "",
  existingProducts,
  onOpenProductInfo,
}) => {
  const [mode, setMode] = useState("auto");
  const [lotNumber, setLotNumber] = useState("");
  const [stringCount, setStringCount] = useState(1);
  const [isStripMode, setIsStripMode] = useState(false);
  const [scanStage, setScanStage] = useState("order");
  const [manualOrderInput, setManualOrderInput] = useState("");
  const [manualLotInput, setManualLotInput] = useState("");
  const [scanError, setScanError] = useState("");

  const orderInputRef = useRef(null);
  const lotInputRef = useRef(null);
  const containerRef = useRef(null);

  const [availableLabels, setAvailableLabels] = useState([]);
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [isPrinterEnabled, setIsPrinterEnabled] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(1);

  const stationUpper = stationId.toUpperCase();
  const isWindingMachine = ["BM11", "BM12", "BM15"].some((m) =>
    stationUpper.includes(m)
  );
  const isMazak = stationUpper.includes("MAZAK");
  const isFinalInspection =
    stationUpper.includes("EIND") ||
    stationUpper.includes("INSPECTIE") ||
    stationUpper.includes("QC");
  const isTeamLead =
    stationUpper.includes("TEAM") || stationUpper.includes("LEAD");

  const canReprint = isMazak || isFinalInspection || isTeamLead;
  const canPrintStrips = isFinalInspection || isTeamLead;

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

        if (labels.length > 0) {
          const smallLabel = labels.find(
            (l) => l.name.toLowerCase().includes("smal") || l.height < 45
          );
          if ((isWindingMachine || isMazak) && smallLabel) {
            setSelectedLabelId(smallLabel.id);
          } else {
            setSelectedLabelId(labels[0].id);
          }
        }
      } catch (e) {
        console.error("Fout bij laden labels:", e);
      } finally {
        setLoadingLabels(false);
      }
    };
    fetchLabels();
  }, [isOpen, isWindingMachine, isMazak]);

  const previewData = useMemo(() => {
    if (!order) return {};
    return processLabelData({
      ...order,
      lotNumber: lotNumber || (mode === "auto" ? "GENERATING..." : "SCAN LOT"),
    });
  }, [order, lotNumber, mode]);

  const selectedLabel = useMemo(() => {
    return availableLabels.find((l) => l.id === selectedLabelId);
  }, [availableLabels, selectedLabelId]);

  useEffect(() => {
    if (containerRef.current && selectedLabel && !isStripMode) {
      const containerW = containerRef.current.clientWidth - 40;
      const containerH = containerRef.current.clientHeight - 80;
      const labelW = selectedLabel.width * PIXELS_PER_MM;
      const labelH = selectedLabel.height * PIXELS_PER_MM;

      const scaleW = containerW / labelW;
      const scaleH = containerH / labelH;
      // Op mobiel mag de zoom iets kleiner zijn om te passen
      setPreviewZoom(Math.max(0.5, Math.min(1.3, scaleW, scaleH)));
    } else if (isStripMode) {
      setPreviewZoom(0.8); // Vaste zoom voor strips op mobiel
    }
  }, [selectedLabel, containerRef.current?.clientWidth, isStripMode]);

  useEffect(() => {
    if (mode === "manual") {
      setScanStage("order");
      setManualOrderInput("");
      setManualLotInput("");
      setLotNumber("");
      setScanError("");
      setTimeout(() => orderInputRef.current?.focus(), 100);
    }
    if (isMazak) setIsPrinterEnabled(true);
    if (isWindingMachine) setIsPrinterEnabled(false);
  }, [mode, isOpen, isWindingMachine, isMazak]);

  useEffect(() => {
    if (isOpen && order && mode === "auto") {
      const safeExistingProducts = Array.isArray(existingProducts)
        ? existingProducts
        : [];
      const newLot = generateLotNumber(stationId, safeExistingProducts);
      setLotNumber(newLot);
      if (stringCount < 1) setStringCount(1);
    }
  }, [isOpen, order, mode, stationId, existingProducts]);

  const handleOrderScan = (e) => {
    if (e.key === "Enter") {
      const input = manualOrderInput.trim();
      if (input.toLowerCase() === order.orderId.toLowerCase()) {
        setScanError("");
        setScanStage("lot");
        setTimeout(() => lotInputRef.current?.focus(), 100);
      } else {
        setScanError("Verkeerde order! Scan order: " + order.orderId);
        setManualOrderInput("");
      }
    }
  };

  const handleLotScan = (e) => {
    const val = e.target.value.toUpperCase();
    setManualLotInput(val);
    setLotNumber(val);
    if (e.key === "Enter" && val.length > 3) {
      setScanStage("complete");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartClick = () => {
    onStart(order, lotNumber, stringCount, isPrinterEnabled, selectedLabel);
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* RESPONSIVE CONTAINER: Full screen op mobiel, centered modal op desktop */}
      <div className="bg-white w-full md:max-w-6xl h-[95vh] md:h-[85vh] rounded-t-[30px] md:rounded-[30px] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-100">
        {/* MOBIEL SLUIT KNOP (Alleen zichtbaar op mobiel) */}
        <div className="md:hidden absolute top-4 right-4 z-50">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* LINKER KOLOM: Controls (Bovenop bij mobiel) */}
        <div className="w-full md:w-1/3 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col bg-gray-50/30 overflow-y-auto custom-scrollbar">
          <div className="mb-6 mt-6 md:mt-0">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase italic tracking-tight">
              {isWindingMachine
                ? "Start Wikkelen"
                : canReprint
                ? "Labels"
                : "Start Productie"}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              {isWindingMachine ? "Batch setup" : "Label configuratie"}
            </p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Order Info Card */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                    Order
                  </span>
                  <h3 className="text-lg font-black text-gray-900">
                    {order.orderId}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Aantal
                  </span>
                  <span className="block text-lg font-black text-blue-600 leading-none">
                    {order.plan}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-700 line-clamp-2">
                  {order.item}
                </p>
                {isWindingMachine && order.specs?.diameter && (
                  <div className="mt-2 text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-fit">
                    ID: {order.specs.diameter}mm
                  </div>
                )}
              </div>
            </div>

            {/* Mode Selectie */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setMode("auto")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === "auto"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <RefreshCw size={14} /> Auto
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === "manual"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <ScanBarcode size={14} /> Scan
              </button>
            </div>

            {canPrintStrips && (
              <div
                onClick={() => setIsStripMode(!isStripMode)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all ${
                  isStripMode
                    ? "bg-purple-50 border-purple-200"
                    : "bg-white border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isStripMode
                        ? "bg-purple-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Scissors size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">
                      Stroken
                    </div>
                    <div className="text-[9px] text-slate-400">90mm breed</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isStripMode
                      ? "border-purple-500 bg-purple-500"
                      : "border-slate-300"
                  }`}
                >
                  {isStripMode && (
                    <CheckCircle size={12} className="text-white" />
                  )}
                </div>
              </div>
            )}

            {/* Input Sectie */}
            {mode === "auto" ? (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center relative overflow-hidden">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                    Start Lotnummer
                  </div>
                  <div className="text-base md:text-xl font-mono font-bold text-blue-700 break-all">
                    {lotNumber || "..."}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                    <span>Aantal</span>
                    {isWindingMachine && (
                      <span className="text-emerald-600">Reeks Modus</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border-2 border-transparent focus-within:border-blue-500">
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
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-top-2 bg-white p-4 rounded-xl border border-gray-200">
                {scanError && (
                  <div className="p-2 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} /> {scanError}
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">
                    1. Order
                  </label>
                  <input
                    ref={orderInputRef}
                    type="text"
                    value={manualOrderInput}
                    disabled={scanStage !== "order"}
                    onChange={(e) => setManualOrderInput(e.target.value)}
                    onKeyDown={handleOrderScan}
                    className="w-full p-2 mt-1 border-2 rounded-lg font-mono text-sm font-bold uppercase outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">
                    2. Lot
                  </label>
                  <input
                    ref={lotInputRef}
                    type="text"
                    value={manualLotInput}
                    disabled={scanStage === "order"}
                    onChange={(e) => {
                      setManualLotInput(e.target.value.toUpperCase());
                      setLotNumber(e.target.value.toUpperCase());
                    }}
                    onKeyDown={handleLotScan}
                    className="w-full p-2 mt-1 border-2 rounded-lg font-mono text-sm font-bold uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {!isStripMode && (
              <div className="pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase flex justify-between mb-2">
                  <span>
                    {isWindingMachine ? "Tijdelijk Label" : "Label Template"}
                  </span>
                  {!isWindingMachine && (
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrinterEnabled}
                        onChange={(e) => setIsPrinterEnabled(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600">Print</span>
                    </label>
                  )}
                </label>
                {availableLabels.length > 0 ? (
                  <select
                    value={selectedLabelId}
                    onChange={(e) => setSelectedLabelId(e.target.value)}
                    className="w-full p-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-700 outline-none"
                  >
                    {availableLabels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.width}x{l.height})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-red-400">Geen templates.</div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {canReprint && (
              <button
                onClick={handlePrint}
                disabled={!lotNumber}
                className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Alleen Printen
              </button>
            )}

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50"
              >
                Sluiten
              </button>
              <button
                onClick={handleStartClick}
                disabled={
                  !lotNumber || (mode === "manual" && manualLotInput.length < 3)
                }
                className={`flex-[2] py-4 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isStripMode
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <PlayCircle size={20} />{" "}
                {isStripMode ? "Print" : isWindingMachine ? "Batch" : "Start"}
              </button>
            </div>
          </div>
        </div>

        {/* RECHTER KOLOM: Live Preview (Onder bij mobiel) */}
        <div
          ref={containerRef}
          className="w-full md:w-2/3 bg-gray-900 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px] md:min-h-0"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Preview
            </span>
          </div>

          <div className="relative flex items-center justify-center overflow-auto w-full h-full">
            {isStripMode ? (
              <div
                className="bg-white shadow-2xl relative"
                style={{
                  width: `${90 * PIXELS_PER_MM * previewZoom}px`,
                  height: `${stringCount * 10 * PIXELS_PER_MM * previewZoom}px`,
                  backgroundColor: "white",
                }}
              >
                {Array.from({ length: stringCount }).map((_, index) => {
                  let currentLot = lotNumber;
                  const match = lotNumber.match(/(\d{4})$/);
                  if (match) {
                    const startSeq = parseInt(match[1]);
                    const prefix = lotNumber.substring(0, lotNumber.length - 4);
                    currentLot =
                      prefix + String(startSeq + index).padStart(4, "0");
                  }
                  return (
                    <div
                      key={index}
                      style={{
                        height: `${10 * PIXELS_PER_MM * previewZoom}px`,
                        width: "100%",
                        borderBottom: "1px dashed black",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: `0 ${2 * PIXELS_PER_MM * previewZoom}px`,
                        boxSizing: "border-box",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Arial",
                          fontWeight: "bold",
                          fontSize: `${4 * PIXELS_PER_MM * previewZoom}px`,
                        }}
                      >
                        {currentLot}
                      </span>
                      <div
                        style={{
                          fontSize: `${3 * PIXELS_PER_MM * previewZoom}px`,
                          fontFamily: "Arial",
                        }}
                      >
                        {order.item?.substring(0, 15)}...
                      </div>
                      <div style={{ height: "80%" }}>
                        <img
                          src={getQRCodeUrl(currentLot)}
                          alt="qr"
                          style={{ height: "100%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedLabel ? (
              <div
                className="bg-white shadow-2xl relative origin-center"
                style={{
                  width: `${
                    selectedLabel.width * PIXELS_PER_MM * previewZoom
                  }px`,
                  height: `${
                    selectedLabel.height * PIXELS_PER_MM * previewZoom
                  }px`,
                  position: "relative",
                }}
              >
                {selectedLabel.elements?.map((el, index) => {
                  const displayContent = resolveLabelContent(
                    el,
                    previewData
                  ).content;
                  const baseStyle = {
                    position: "absolute",
                    left: `${el.x * PIXELS_PER_MM * previewZoom}px`,
                    top: `${el.y * PIXELS_PER_MM * previewZoom}px`,
                    width: `${el.width * PIXELS_PER_MM * previewZoom}px`,
                    height: `${
                      el.height
                        ? el.height * PIXELS_PER_MM * previewZoom + "px"
                        : "auto"
                    }`,
                    transform: `rotate(${el.rotation || 0}deg)`,
                    transformOrigin: "top left",
                  };
                  if (el.type === "text") {
                    return (
                      <div
                        key={index}
                        style={{
                          ...baseStyle,
                          fontSize: `${el.fontSize * previewZoom}px`,
                          fontFamily: el.fontFamily || "Arial",
                          fontWeight: el.isBold ? "bold" : "normal",
                          fontStyle: el.isItalic ? "italic" : "normal",
                          textDecoration: el.isUnderline ? "underline" : "none",
                          textAlign: el.align || "left",
                          lineHeight: "1",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflow: "hidden",
                          color: "black",
                        }}
                      >
                        {displayContent}
                      </div>
                    );
                  }
                  if (el.type === "barcode") {
                    return (
                      <div key={index} style={baseStyle}>
                        <img
                          src={getBarcodeUrl(displayContent || "123456")}
                          alt="Barcode"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "fill",
                          }}
                        />
                      </div>
                    );
                  }
                  if (el.type === "qr") {
                    return (
                      <div key={index} style={baseStyle}>
                        <img
                          src={getQRCodeUrl(displayContent || "DEMO")}
                          alt="QR Code"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    );
                  }
                  if (el.type === "image") {
                    return (
                      <div key={index} style={baseStyle}>
                        {el.url ? (
                          <img
                            src={el.url}
                            alt="Img"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon size={24} />
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (el.type === "line") {
                    return (
                      <div
                        key={index}
                        style={{
                          ...baseStyle,
                          height: `${Math.max(
                            1,
                            el.height * PIXELS_PER_MM * previewZoom
                          )}px`,
                          backgroundColor: "black",
                        }}
                      />
                    );
                  }
                  if (el.type === "box") {
                    return (
                      <div
                        key={index}
                        style={{
                          ...baseStyle,
                          border: `${
                            (el.thickness || 1) * PIXELS_PER_MM * previewZoom
                          }px solid black`,
                          backgroundColor: "transparent",
                          boxSizing: "border-box",
                        }}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-gray-500 font-mono text-xs text-center p-8 border-2 border-dashed border-gray-700 rounded-xl">
                Geen label template geselecteerd.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionStartModal;
