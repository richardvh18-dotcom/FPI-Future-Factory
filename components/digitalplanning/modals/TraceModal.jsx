import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ScanBarcode,
  Camera,
  Scan,
  Search,
  AlertTriangle,
} from "lucide-react";

const TraceModal = ({ onClose, products, orders, onFound }) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Cleanup bij sluiten
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.log("Scanner cleanup error", e);
        }
      }
    };
  }, []);

  const handleScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      try {
        scannerRef.current.pause(true);
      } catch (e) {}
    }
    if (navigator.vibrate) navigator.vibrate(200);
    handleSearch(null, decodedText);
  };

  const startScanner = () => {
    setIsScanning(true);
    setError("");

    setTimeout(() => {
      if (!window.Html5QrcodeScanner) {
        setError("Scanner module niet gevonden. Herlaad de pagina.");
        return;
      }

      try {
        const scanner = new window.Html5QrcodeScanner(
          "trace-reader", // Uniek ID voor deze modal
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scanner.render(handleScanSuccess, (err) => {});
        scannerRef.current = scanner;
      } catch (e) {
        console.error(e);
        setError(
          "Camera start mislukt. Gebruik HTTPS en sta cameratoegang toe."
        );
        setIsScanning(false);
      }
    }, 300);
  };

  const handleSearch = (e, val) => {
    if (e) e.preventDefault();
    const term = (val || input).trim().toUpperCase();
    if (!term) return;

    // 1. Zoek in Producten (Lotnummer)
    const product = products.find((p) => p.lotNumber?.toUpperCase() === term);
    if (product) {
      onFound(product, "product");
      onClose();
      return;
    }

    // 2. Zoek in Orders (OrderID)
    const order = orders.find((o) => o.orderId?.toUpperCase() === term);
    if (order) {
      onFound(order, "order");
      onClose();
      return;
    }

    setError(`Geen resultaat voor: ${term}`);
    if (scannerRef.current && isScanning) {
      try {
        scannerRef.current.resume();
      } catch (e) {}
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
            <ScanBarcode size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-800">
            Product Traceren
          </h2>
        </div>

        {isScanning ? (
          <div className="mb-4 bg-black rounded-xl overflow-hidden relative">
            <div id="trace-reader" className="w-full h-64 bg-black"></div>
            <button
              onClick={() => {
                if (scannerRef.current) {
                  try {
                    scannerRef.current.clear();
                  } catch (e) {}
                }
                setIsScanning(false);
              }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/20 hover:bg-white/40 text-white px-4 py-1 rounded-full text-xs font-bold backdrop-blur-md z-20"
            >
              Stop Camera
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <button
              onClick={startScanner}
              className="w-full border-2 border-dashed border-blue-200 bg-blue-50 text-blue-600 font-bold py-6 rounded-2xl hover:bg-blue-100 transition-all flex flex-col items-center justify-center gap-2"
            >
              <Camera size={32} />
              <span>Start Camera Scanner</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSearch}>
          <div className="relative mb-4">
            <input
              autoFocus={!isScanning}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              className="w-full text-center text-lg font-mono font-bold border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none uppercase placeholder:text-slate-300 transition-colors"
              placeholder="OF TYP LOTNUMMER..."
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Scan size={18} />
            </div>
          </div>
          {!isScanning && (
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <Search size={18} /> ZOEKEN
            </button>
          )}
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 text-center font-bold rounded-xl text-sm flex items-center justify-center gap-2 animate-in slide-in-from-top-1">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
      </div>
      <style>{`
            #trace-reader video {
                object-fit: cover;
                width: 100% !important;
                height: 100% !important;
                border-radius: 12px;
            }
        `}</style>
    </div>
  );
};

export default TraceModal;
