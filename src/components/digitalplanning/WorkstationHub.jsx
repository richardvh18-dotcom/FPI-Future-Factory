import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  PlayCircle,
  Package,
  Monitor,
  Search,
  Clock,
  AlertTriangle,
  ChevronDown,
  X,
  CheckCircle,
  LogOut,
  Loader2,
  FileText,
  ArrowRight,
  Info,
  Printer,
  QrCode,
  RefreshCw,
  Edit3,
  Maximize,
  Minimize,
  Activity,
  Check,
  ImageIcon,
  BookOpen, // Icoon voor dossier
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDoc, // Nodig voor ophalen details
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import StatusBadge from "./common/StatusBadge";
import DrillDownModal from "./modals/DrillDownModal";
import Terminal from "./Terminal";
import LossenView from "./LossenView";
import ProductDetailModal from "../products/ProductDetailModal";

const COLLECTION_NAME = "digital_planning";

// App ID Helper
const getAppId = () => {
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;
  return "fittings-app-v1";
};

// Stations configuratie
const WORKSTATIONS = [
  { id: "BM01", name: "De eindinspectie", type: "inspection" },
  { id: "BH11", name: "BH11", type: "winding" },
  { id: "BH12", name: "BH12", type: "winding" },
  { id: "BH15", name: "BH15", type: "winding" },
  { id: "BH16", name: "BH16", type: "winding" },
  { id: "BH17", name: "BH17", type: "winding" },
  { id: "BH18", name: "BH18", type: "winding" },
  { id: "BH31", name: "BH31", type: "winding" },
  { id: "Mazak", name: "Mazak", type: "machining" },
  { id: "Nabewerking", name: "Nabewerking", type: "finishing" },
];

const getWeekNumber = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

// --- FPI LABEL START MODAL ---
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

  // Genereer lotnummer bij openen
  useEffect(() => {
    if (isOpen && order && mode === "auto") {
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const ww = String(getWeekNumber(now)).padStart(2, "0");
      const digits = stationId.replace(/\D/g, "");
      const machineCode = digits ? `4${digits}` : "400";
      const prefix = `40${yy}${ww}${machineCode}40`;

      const count = existingProducts.filter(
        (p) => p.lotNumber && p.lotNumber.startsWith(prefix)
      ).length;
      const seq = String(count + 1).padStart(4, "0");

      setLotNumber(`${prefix}${seq}`);
    } else if (mode === "manual") {
      setLotNumber(manualInput);
    }
  }, [isOpen, order, mode, stationId, existingProducts, manualInput]);

  const handlePrintLabel = () => {
    const width = labelSize === "140x90" ? 800 : 800;
    const height = labelSize === "140x90" ? 600 : 300;
    const printWindow = window.open("", "", `width=${width},height=${height}`);
    const isSmall = labelSize === "140x40";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print FPI Label ${labelSize}</title>
          <style>
            @font-face { font-family: 'Libre Barcode 39'; src: url('https://fonts.gstatic.com/s/librebarcode39/v17/-nFnOHM08vwC6h8Li1eQopTXUlwU1K5kAA.woff2') format('woff2'); }
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .label-container { border: 1px solid #000; width: 140mm; height: ${
              isSmall ? "40mm" : "90mm"
            }; padding: ${
      isSmall ? "2mm" : "5mm"
    }; box-sizing: border-box; display: flex; flexDirection: ${
      isSmall ? "row" : "column"
    }; position: relative; overflow: hidden; }
            .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px; }
            .brand { font-size: ${
              isSmall ? "18px" : "32px"
            }; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
            .order-ref { font-size: ${
              isSmall ? "12px" : "16px"
            }; font-weight: bold; }
            .content-area { display: flex; flex: 1; }
            .left-col { width: 60%; border-right: ${
              isSmall ? "none" : "2px solid black"
            }; padding-right: 5px; display: flex; flex-direction: column; justify-content: center; }
            .right-col { width: 40%; padding-left: 5px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
            .product-name { font-size: ${
              isSmall ? "14px" : "20px"
            }; font-weight: bold; line-height: 1.1; margin-bottom: 5px; text-transform: uppercase; }
            .specs { font-size: ${
              isSmall ? "10px" : "12px"
            }; font-family: monospace; line-height: 1.2; }
            .qr-row { display: flex; justify-content: space-between; width: 100%; }
            .qr-item { display: flex; flex-direction: column; align-items: center; }
            .qr-img-sm { width: ${isSmall ? "30px" : "50px"}; height: ${
      isSmall ? "30px" : "50px"
    }; }
            .qr-img-lg { width: ${isSmall ? "40px" : "70px"}; height: ${
      isSmall ? "40px" : "70px"
    }; }
            .qr-label { font-size: 8px; font-weight: bold; margin-top: 2px; text-transform: uppercase; }
            .lot-display { font-family: 'Libre Barcode 39', cursive; font-size: ${
              isSmall ? "30px" : "48px"
            }; white-space: nowrap; margin-top: 5px; }
            .lot-readable { font-family: monospace; font-size: ${
              isSmall ? "12px" : "16px"
            }; font-weight: 900; letter-spacing: 2px; }
            .footer { margin-top: 5px; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: center; border-top: 2px solid black; padding-top: 2px; width: 100%; }
            .small-col-1 { width: 30%; border-right: 1px solid black; padding-right: 5px; display: flex; flex-direction: column; justify-content: space-between; }
            .small-col-2 { width: 40%; border-right: 1px solid black; padding: 0 5px; display: flex; flex-direction: column; justify-content: center; }
            .small-col-3 { width: 30%; padding-left: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div class="label-container">
            ${
              !isSmall
                ? `
              <div class="header-row"><div class="brand">WAVISTRONG</div><div class="order-ref">${
                order.orderId
              }</div></div>
              <div class="content-area">
                 <div class="left-col">
                    <div class="product-name">${order.item}</div>
                    <div class="specs">DRAWING: ${
                      order.drawing || "N/A"
                    }<br>PRESSURE: 20 BAR<br>JOINT: CST20</div>
                    <div class="lot-display">*${lotNumber}*</div>
                    <div class="lot-readable">${lotNumber}</div>
                 </div>
                 <div class="right-col">
                    <div class="qr-row">
                       <div class="qr-item"><img class="qr-img-sm" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${
                         order.orderId
                       }" /><span class="qr-label">ORD</span></div>
                       <div class="qr-item"><img class="qr-img-sm" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${
                         order.item
                       }" /><span class="qr-label">ITM</span></div>
                    </div>
                    <div class="qr-item"><img class="qr-img-lg" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${lotNumber}" /><span class="qr-label">LOT</span></div>
                 </div>
              </div>
              <div class="footer">FUTURE PIPE INDUSTRIES</div>
            `
                : `
              <div class="small-col-1"><div class="brand" style="font-size:16px;">WAVISTRONG</div><div class="order-ref" style="font-size:10px;">${
                order.orderId
              }</div><div style="font-size:8px; font-weight:bold;">FPI</div></div>
              <div class="small-col-2"><div class="product-name" style="font-size:12px; margin-bottom:2px;">${
                order.item
              }</div><div class="specs" style="font-size:9px;">${
                    order.drawing || "N/A"
                  }</div><div class="lot-readable" style="font-size:11px; margin-top:4px;">${lotNumber}</div></div>
              <div class="small-col-3"><img class="qr-img-lg" style="width:35mm; height:35mm;" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${lotNumber}" /></div>
            `
            }
          </div>
          <script>setTimeout(() => { window.print(); window.close(); }, 800);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">
        {/* LINKER KOLOM: Instellingen & Info */}
        <div className="w-full md:w-1/3 p-8 border-r border-gray-100 flex flex-col bg-gray-50/30">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
              Start Productie
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Configureer label en data
            </p>
          </div>

          <div className="space-y-6 flex-1">
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

                {/* LINK STATUS & INFO KNOP */}
                {order.linkedProductId && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit mb-2">
                      <CheckCircle size={12} /> Gekoppeld
                    </div>
                    {/* CORRECTIE: Gebruik onOpenProductInfo hier */}
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

            {/* Label Formaat Selectie */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Label Formaat
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
              onClick={() => onStart(order, lotNumber)}
              disabled={!lotNumber}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle size={20} /> Start
            </button>
          </div>
        </div>

        {/* RECHTER KOLOM: Preview */}
        <div className="w-full md:w-2/3 bg-gray-900 p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Printer Ready ({labelSize}mm)
            </span>
          </div>
          <div className="mb-4 text-white/50 text-xs font-bold uppercase tracking-widest">
            Live Voorbeeld
          </div>
          {/* ... Preview code blijft hetzelfde ... */}
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
                        <span className="text-[7px] font-bold mt-1">ORDER</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <QrCode className="w-12 h-12 text-slate-900" />
                        <span className="text-[7px] font-bold mt-1">ITEM</span>
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
          <button
            onClick={handlePrintLabel}
            className="mt-8 py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Printer size={16} /> Print Etiket (ZPL)
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOPPEL MODAL (VOOR OPERATORS) ---
const OperatorLinkModal = ({ order, onClose, onLinkProduct }) => {
  // ... zelfde code ...
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchCatalog = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const appId = getAppId();
      const productsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "products"
      );
      const q = query(
        productsRef,
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      setSearchResults(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Zoekfout:", err);
    } finally {
      setSearching(false);
    }
  };

  // Functie voor opslaan
  const handleSave = (product) => {
    onLinkProduct(order.id, product);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tight">
              Koppel Product
            </h2>
            <p className="text-xs text-gray-500 font-medium font-mono">
              Order: {order.orderId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Zoek op productnaam..."
              className="flex-1 p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCatalog()}
              autoFocus
            />
            <button
              onClick={searchCatalog}
              disabled={searching}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="animate-spin" /> : "Zoek"}
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleSave(prod)} // Direct selecteren en opslaan
                className="p-3 border rounded-xl hover:bg-blue-50 flex justify-between items-center transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt=""
                      className="w-10 h-10 object-cover rounded-lg bg-gray-100"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {prod.name}
                    </p>
                    <p className="text-xs text-gray-400">{prod.articleCode}</p>
                  </div>
                </div>
                <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
                  Kies
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkstationHub = ({ initialStationId, onExit }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAdminAuth();

  const [selectedStation, setSelectedStation] = useState(
    initialStationId || "BH11"
  );
  const [activeTab, setActiveTab] = useState("planning");
  const [rawOrders, setRawOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [weekFilter, setWeekFilter] = useState("current");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStationSelector, setShowStationSelector] = useState(false);

  // States voor de Linked Product Modal en Koppel Modal
  const [linkedProductData, setLinkedProductData] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [orderToLink, setOrderToLink] = useState(null);

  const currentAppId = getAppId();

  // ... useEffects voor data laden ... (ongewijzigd)
  useEffect(() => {
    if (initialStationId) setSelectedStation(initialStationId);
  }, [initialStationId]);
  useEffect(() => {
    if (!currentAppId) return;
    setLoading(true);
    const ordersRef = collection(
      db,
      "artifacts",
      currentAppId,
      "public",
      "data",
      "digital_planning"
    );
    const unsubOrders = onSnapshot(
      query(ordersRef),
      (snap) => {
        const loadedOrders = snap.docs.map((doc) => {
          const data = doc.data();
          let dateObj = new Date();
          if (data.plannedDate?.toDate) dateObj = data.plannedDate.toDate();
          else if (data.importDate?.toDate) dateObj = data.importDate.toDate();
          return {
            id: doc.id,
            ...data,
            orderId: data.orderId || data.orderNumber || doc.id,
            item: data.item || data.productCode || "Onbekend Item",
            plan: data.plan || data.quantity || 0,
            dateObj: dateObj,
            weekNumber: getWeekNumber(dateObj),
          };
        });
        setRawOrders(loadedOrders);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const unsubProds = onSnapshot(
      query(
        collection(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          "tracked_products"
        )
      ),
      (snap) => {
        setRawProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubOrders();
      unsubProds();
    };
  }, [currentAppId]);

  // ... stationOrders useMemo en acties ... (ongewijzigd)
  const stationOrders = useMemo(() => {
    if (!selectedStation) return [];
    const currentStationNorm = selectedStation.replace(/\D/g, "");
    const orderStats = {};
    rawProducts.forEach((p) => {
      if (!p.orderId) return;
      if (!orderStats[p.orderId])
        orderStats[p.orderId] = { started: 0, finished: 0 };
      orderStats[p.orderId].started++;
      if (p.currentStep === "Finished") orderStats[p.orderId].finished++;
    });
    return rawOrders
      .filter((o) => {
        if (o.status === "cancelled") return false;
        const orderMachineNorm = String(o.machine || "").replace(/\D/g, "");
        return (
          o.machine === selectedStation ||
          orderMachineNorm === currentStationNorm
        );
      })
      .map((o) => {
        const stats = orderStats[o.orderId] || { started: 0, finished: 0 };
        return {
          ...o,
          liveToDo: Math.max(0, Number(o.plan || 0) - stats.started),
          liveFinish: stats.finished,
        };
      })
      .sort((a, b) => {
        const dateDiff = a.dateObj - b.dateObj;
        if (dateDiff !== 0) return dateDiff;
        return String(a.orderId).localeCompare(String(b.orderId));
      });
  }, [rawOrders, rawProducts, selectedStation]);

  const handleStartProduction = async (order, customLotNumber) => {
    // ... (code voor starten) ...
    if (!currentUser || !currentAppId || !customLotNumber) return;
    try {
      const now = new Date();
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "tracked_products",
        customLotNumber
      );
      await setDoc(productRef, {
        lotNumber: customLotNumber,
        orderId: order.orderId,
        item: order.item,
        drawing: order.drawing || "",
        originMachine: selectedStation,
        currentStation: selectedStation,
        currentStep: "Wikkelen",
        status: "in_progress",
        startTime: now.toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        operator: currentUser.email,
      });
      if (order.status !== "completed") {
        const orderRef = doc(
          db,
          "artifacts",
          currentAppId,
          "public",
          "data",
          COLLECTION_NAME,
          order.id
        );
        await updateDoc(orderRef, {
          status: "in_progress",
          lastUpdated: serverTimestamp(),
        });
      }
      setShowStartModal(false);
    } catch (error) {
      alert("Kon productie niet starten: " + error.message);
    }
  };

  const handleNextStep = async (product) => {
    if (!currentAppId) return;
    try {
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "tracked_products",
        product.id
      );
      await updateDoc(productRef, {
        currentStep: "Lossen",
        updatedAt: serverTimestamp(),
      });
      setActiveTab("lossen");
    } catch (e) {}
  };

  // ZORG DAT DEZE FUNCTIE GEBRUIKT WORDT
  // FIX: DIT IS DE FUNCTIE DIE DE ERROR VEROORZAAKTE (NU DEFINITIEF GEFIXT)
  const handleOpenProductInfo = async (productId) => {
    try {
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "products",
        productId
      );
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        setLinkedProductData({ id: productSnap.id, ...productSnap.data() });
      } else {
        alert("Product niet gevonden.");
      }
    } catch (error) {
      console.error(error);
      alert("Fout bij laden.");
    }
  };

  const handleProcessUnit = async (product) => {
    if (!currentAppId) return;
    try {
      const productRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "tracked_products",
        product.id
      );

      // Scenario 1: BM01 (Eindinspectie) -> Afronden
      if (selectedStation === "BM01") {
        await updateDoc(productRef, {
          currentStep: "Finished",
          currentStation: "GEREED",
          status: "completed",
          updatedAt: serverTimestamp(),
        });

        // CHECK: Is de hele order nu klaar?
        const orderId = product.orderId;
        const relatedOrder = rawOrders.find((o) => o.orderId === orderId);

        if (relatedOrder) {
          // Tel hoeveel er nu klaar zijn (inclusief deze nieuwe)
          const finishedCount =
            rawProducts.filter(
              (p) => p.orderId === orderId && p.currentStep === "Finished"
            ).length + 1;

          // Als aantal >= plan -> Sluit order
          if (finishedCount >= Number(relatedOrder.plan)) {
            const orderRef = doc(
              db,
              "artifacts",
              currentAppId,
              "public",
              "data",
              COLLECTION_NAME,
              relatedOrder.id
            );
            await updateDoc(orderRef, {
              status: "completed",
              actualEndDate: serverTimestamp(),
              lastUpdated: serverTimestamp(),
            });
          }
        }
      } else if (
        selectedStation === "Mazak" ||
        selectedStation === "Nabewerking"
      ) {
        // Scenario 2: Bewerking -> Inspectie (BM01)
        await updateDoc(productRef, {
          currentStep: "Eindinspectie",
          currentStation: "BM01", // Stuur naar BM01
          updatedAt: serverTimestamp(),
        });
      } else {
        // Scenario 3: Wikkelen -> Lossen (BHxx)
        await updateDoc(productRef, {
          currentStep: "Lossen",
          updatedAt: serverTimestamp(),
        });
        setActiveTab("lossen"); // Switch naar lossen
      }
    } catch (error) {
      console.error("Fout bij proces:", error);
    }
  };

  const handleLinkProduct = async (docId, product) => {
    try {
      const orderRef = doc(
        db,
        "artifacts",
        currentAppId,
        "public",
        "data",
        "digital_planning",
        docId
      );
      await updateDoc(orderRef, {
        linkedProductId: product.id,
        linkedProductImage: product.imageUrl || product.drawingUrl || null,
        linkedProductSpecs: {
          dim1: product.diameter || "",
          dim2: product.pressure || "",
        },
        lastUpdated: new Date(),
      });
      alert("Gekoppeld!");
      setShowLinkModal(false);
      setOrderToLink(null);
    } catch (error) {
      console.error("Fout bij koppelen:", error);
      alert("Koppelen mislukt: " + error.message);
    }
  };

  const renderPlanningContent = () => {
    const currentWeek = getWeekNumber(new Date());
    const filteredOrders = stationOrders.filter((order) => {
      if (order.status === "completed") return false;
      if (weekFilter === "prev" && order.weekNumber >= currentWeek)
        return false;
      if (weekFilter === "current" && order.weekNumber !== currentWeek)
        return false;
      if (weekFilter === "next" && order.weekNumber <= currentWeek)
        return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          String(order.orderId).toLowerCase().includes(term) ||
          String(order.item).toLowerCase().includes(term)
        );
      }
      return true;
    });
    const groupedByWeek = filteredOrders.reduce((acc, order) => {
      const week = order.weekNumber || "Onbekend";
      if (!acc[week]) acc[week] = [];
      acc[week].push(order);
      return acc;
    }, {});
    const sortedWeekKeys = [
      ...new Set(filteredOrders.map((o) => o.weekNumber || "Onbekend")),
    ];

    return (
      <div className="space-y-4 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm gap-3">
          <div className="flex bg-gray-50 rounded-lg p-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setWeekFilter("prev")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                weekFilter === "prev"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Vorige
            </button>
            <button
              onClick={() => setWeekFilter("current")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                weekFilter === "current"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Deze Week
            </button>
            <button
              onClick={() => setWeekFilter("next")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                weekFilter === "next"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Volgende
            </button>
            <button
              onClick={() => setWeekFilter("all")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                weekFilter === "all"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Alles
            </button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            />
          </div>
        </div>

        {sortedWeekKeys.map((weekNum) => (
          <div
            key={weekNum}
            className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
                Week {weekNum}
              </h3>
              <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                {groupedByWeek[weekNum].length} items
              </span>
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-gray-50">
                {groupedByWeek[weekNum].map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-blue-50 transition-all group"
                  >
                    <td className="pl-4 py-3 w-8 align-top">
                      {/* START KNOP: LINKS VOOR ALLE STATIONS BEHALVE BM01 */}
                      {selectedStation !== "BM01" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setShowStartModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl shadow-md transition-all active:scale-95 flex flex-col items-center justify-center w-12 h-12"
                          title="Start Productie"
                        >
                          <PlayCircle size={20} />
                          <span className="text-[8px] font-black mt-0.5">
                            START
                          </span>
                        </button>
                      )}
                      {/* Status badge fallback */}
                      {selectedStation === "BM01" && (
                        <div className="mt-2 flex justify-center">
                          <StatusBadge status={order.status} />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-3">
                          {/* DOSSIER KNOP: LINKS (alleen als gekoppeld) */}
                          {order.linkedProductId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductInfo(order.linkedProductId);
                              }}
                              className="bg-blue-600 text-white p-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-wide"
                              title="Open Product Dossier"
                            >
                              <BookOpen size={16} /> DOSSIER
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToLink(order);
                                setShowLinkModal(true);
                              }}
                              className="text-slate-300 hover:text-blue-500 transition-colors p-1"
                              title="Koppel aan catalogus"
                            >
                              <LinkIcon size={14} />
                            </button>
                          )}

                          <span className="font-black text-gray-900 text-base tracking-tight ml-2">
                            {order.orderId}
                          </span>
                          {order.drawing && (
                            <span className="text-[10px] font-mono font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                              <FileText size={8} /> {order.drawing}
                            </span>
                          )}

                          {order.status === "in_progress" && (
                            <span className="ml-2 flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-blue-200 animate-pulse">
                              <Activity size={10} /> IN PRODUCTIE
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2 bg-gray-50 px-1.5 rounded">
                          {order.dateObj.toLocaleDateString("nl-NL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      {/* ... rest van rij ... */}
                      <div className="flex justify-between items-end gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-600 leading-tight line-clamp-2">
                            {order.item}
                          </span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {order.plan}{" "}
                            <span className="text-[10px] font-normal text-blue-400">
                              st
                            </span>
                          </span>
                          {order.liveToDo > 0 &&
                            order.liveToDo !== order.plan && (
                              <span className="text-[9px] font-bold text-orange-500 mt-0.5">
                                Nog {order.liveToDo}
                              </span>
                            )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  // renderWindingContent (ongewijzigd) ...
  const renderWindingContent = () => {
    // FIX: Toon hier de actieve PRODUCTEN (units) in plaats van orders!
    const currentStationNorm = selectedStation.replace(/\D/g, "");

    const activeUnits = rawProducts.filter((p) => {
      const pLoc = String(p.currentStation || "");
      if (selectedStation === "BM01") {
        return pLoc === "BM01" || p.currentStep === "Eindinspectie";
      }
      if (selectedStation === "Mazak")
        return pLoc === "MAZAK" || p.currentStep === "Mazak";
      if (selectedStation === "Nabewerking")
        return pLoc === "NABW" || p.currentStep === "Nabewerken";

      // Winding
      const pMachineNorm = pLoc.replace(/\D/g, "");
      return (
        (p.currentStation === selectedStation ||
          pMachineNorm === currentStationNorm) &&
        p.currentStep === "Wikkelen"
      );
    });

    return (
      <div className="space-y-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeUnits.map((unit) => (
            <div
              key={unit.id || unit.lotNumber}
              className="bg-white border-l-4 border-blue-500 rounded-xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                      Actieve Unit
                    </span>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter">
                      {unit.lotNumber}
                    </h2>
                    <p className="text-sm font-medium text-gray-600 mt-1">
                      {unit.item}
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase">
                    {selectedStation === "BM01" ? "INSPECTIE" : "WIKKELEN"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Order
                    </span>
                    <span className="text-lg font-bold text-gray-800">
                      {unit.orderId}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Gestart
                    </span>
                    <span className="block text-sm font-mono font-bold text-gray-700">
                      {unit.startTime
                        ? new Date(unit.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-auto">
                {/* FIX: Actie knop voor doorschuiven/afronden */}
                <button
                  onClick={() => handleProcessUnit(unit)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  {selectedStation === "BM01" ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                  {selectedStation === "BM01"
                    ? "Gereedmelden"
                    : "Volgende Stap"}
                </button>
              </div>
            </div>
          ))}
          {activeUnits.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <Clock className="w-12 h-12 mb-3 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-600">
                Geen items aanwezig
              </h3>
              <p className="text-sm text-gray-400">
                Wacht op aanvoer vanuit voorgaande stap.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // RENDER DYNAMISCHE TABS
  const renderActiveTab = () => {
    // Voor alle stations (incl. BM01) gebruiken we nu de verbeterde renderWindingContent die slim filtert
    return renderWindingContent();
  };

  return (
    <div className="flex flex-col w-full h-full bg-gray-50/50">
      {/* Header en Tabs ... (ongewijzigd) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              {onExit && (
                <button
                  onClick={onExit}
                  className="mr-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors tooltip flex items-center gap-2 font-bold"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
              <div className="bg-blue-600 text-white p-2 rounded-xl mr-3 shadow-sm">
                <Monitor className="w-6 h-6" />
              </div>
              <div
                className="relative group cursor-pointer"
                onClick={() => setShowStationSelector(true)}
              >
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                  Station
                </p>
                <div className="flex items-center gap-2 hover:bg-gray-50 rounded p-1 -ml-1 transition-colors">
                  <span className="text-xl font-black text-gray-900 italic tracking-tight">
                    {WORKSTATIONS.find((w) => w.id === selectedStation)?.name ||
                      selectedStation}
                  </span>
                  <ChevronDown className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </div>
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("planning")}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === "planning"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" /> Planning
              </button>
              {/* DYNAMISCHE TAB NAAM */}
              <button
                onClick={() => setActiveTab("winding")}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === "winding"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {selectedStation === "BM01"
                  ? "Inspectie"
                  : ["Mazak", "Nabewerking"].includes(selectedStation)
                  ? "Bewerking"
                  : "Winding"}
              </button>

              {/* Lossen alleen tonen bij Winding stations */}
              {!["BM01", "Mazak", "Nabewerking"].includes(selectedStation) && (
                <button
                  onClick={() => setActiveTab("lossen")}
                  className={`flex items-center px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === "lossen"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Package className="w-4 h-4 mr-2" /> Lossen
                </button>
              )}

              <button
                onClick={() => setActiveTab("terminal")}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === "terminal"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Monitor className="w-4 h-4 mr-2" /> Terminal
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full p-4 sm:p-6 lg:p-8 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <Loader2 className="animate-spin rounded-full h-12 w-12 text-blue-600 mb-4" />
            <p className="text-gray-500 font-medium animate-pulse">
              Station data ophalen...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "planning" && renderPlanningContent()}
            {activeTab === "winding" && renderActiveTab()}
            {activeTab === "lossen" && (
              <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <LossenView
                  currentUser={currentUser}
                  products={rawProducts}
                  currentStation={selectedStation}
                />
              </div>
            )}
            {activeTab === "terminal" && (
              <div className="h-full">
                <Terminal
                  currentUser={currentUser}
                  initialStation={selectedStation}
                  products={rawProducts}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: Station Selector */}
      {showStationSelector && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tight">
                  Wissel Werkstation
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Selecteer het station om te beheren
                </p>
              </div>
              <button
                onClick={() => setShowStationSelector(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {WORKSTATIONS.map((station) => (
                <button
                  key={station.id}
                  onClick={() => {
                    setSelectedStation(station.id);
                    setShowStationSelector(false);
                  }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    selectedStation === station.id
                      ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-100 shadow-md"
                      : "border-gray-100 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        selectedStation === station.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Monitor className="w-6 h-6" />
                    </div>
                    {selectedStation === station.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-black text-gray-800 uppercase italic tracking-tight">
                    {station.name}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {station.type}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Production Start (Nu met onOpenProductInfo) */}
      <ProductionStartModal
        order={selectedOrder}
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={handleStartProduction}
        stationId={selectedStation}
        existingProducts={rawProducts}
        // FIX IS HIER:
        onOpenProductInfo={handleOpenProductInfo}
      />

      {/* MODAL: Catalogus Product Details (De Grote Pop-up) */}
      {linkedProductData && (
        <ProductDetailModal
          product={linkedProductData}
          onClose={() => setLinkedProductData(null)}
          userRole={currentUser?.role || "operator"}
        />
      )}

      {/* MODAL: Koppel Modal voor Operator */}
      {showLinkModal && orderToLink && (
        <OperatorLinkModal
          order={orderToLink}
          onClose={() => {
            setShowLinkModal(false);
            setOrderToLink(null);
          }}
          onLinkProduct={handleLinkProduct}
        />
      )}
    </div>
  );
};

export default WorkstationHub;
