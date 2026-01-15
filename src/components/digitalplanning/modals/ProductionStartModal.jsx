import React, { useState, useEffect } from "react";
import {
  PlayCircle,
  RefreshCw,
  Edit3,
  Maximize,
  Minimize,
  QrCode,
  Printer,
  CheckCircle,
  ImageIcon,
  BookOpen,
} from "lucide-react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

// FPI LABEL START MODAL
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
  const [showDrawing, setShowDrawing] = useState(false);

  const getWeekNumber = (date) => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

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
                {order.linkedProductId && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold uppercase w-fit mb-2">
                      <CheckCircle size={12} /> Gekoppeld aan Catalogus
                    </div>
                    {order.linkedProductImage && (
                      <button
                        onClick={() => setShowDrawing(!showDrawing)}
                        className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors"
                      >
                        <ImageIcon size={14} />{" "}
                        {showDrawing ? "Toon Label" : "Toon Tekening"}
                      </button>
                    )}
                    {/* CORRECTIE: Gebruik onOpenProductInfo hier */}
                    <button
                      onClick={() => onOpenProductInfo(order.linkedProductId)}
                      className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors mt-2"
                    >
                      <BookOpen size={14} /> Open Product Dossier
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                    className="w-full p-3 border-2 border-blue-200 rounded-xl font-mono text-base font-bold text-center uppercase"
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
        <div className="w-full md:w-2/3 bg-gray-900 p-8 flex flex-col items-center justify-center relative overflow-hidden">
          {showDrawing && order.linkedProductImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95">
              <div className="absolute top-4 right-4 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold">
                Catalogus Tekening
              </div>
              <img
                src={order.linkedProductImage}
                alt="Technische Tekening"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border-4 border-white"
              />
            </div>
          ) : (
            <>
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Printer Ready ({labelSize}mm)
                </span>
              </div>
              <div className="mb-4 text-white/50 text-xs font-bold uppercase tracking-widest">
                Live Voorbeeld
              </div>
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
              <button
                onClick={handlePrintLabel}
                className="mt-8 py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Printer size={16} /> Print Etiket (ZPL)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionStartModal;
