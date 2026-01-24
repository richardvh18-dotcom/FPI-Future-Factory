import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Scan,
  Loader2,
  Camera,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Maximize,
  AlertTriangle,
  Search,
  X,
  Keyboard,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  limit,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";

/**
 * Terminal V3.2 (Mobile Responsive & Hybrid)
 */
const Terminal = () => {
  const { stationId } = useParams();
  const navigate = useNavigate();

  const isMobileScanner = stationId === "MOBILE_SCANNER";

  // Data State
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(!isMobileScanner);

  // Input & UI State
  const [input, setInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(!isMobileScanner); // Op desktop direct tonen
  const [isValid, setIsValid] = useState(false);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef(null);
  const inputRef = useRef(null);

  // 1. DATA OPHALEN (Alleen voor Vaste Stations)
  useEffect(() => {
    if (isMobileScanner) return;

    const q = query(
      collection(db, "artifacts", appId, "public", "data", "digital_planning"),
      where("stationId", "==", stationId),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const orderData = snapshot.docs[0].data();
        setActiveOrder({ id: snapshot.docs[0].id, ...orderData });
      } else {
        setActiveOrder(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [stationId, isMobileScanner]);

  // 2. INPUT VALIDATIE (15 cijfers 40... OF Ordernummer)
  useEffect(() => {
    const clean = input.trim().toUpperCase();
    const isLot = clean.length === 15 && clean.startsWith("40");
    const isOrder = clean.length > 5; // Simpele check voor ordernummer
    setIsValid(isLot || isOrder);
  }, [input]);

  // 3. CAMERA STARTEN
  const startCamera = async () => {
    if (isCameraActive) return;
    setIsCameraActive(true);
    setCameraError("");
    setShowManualInput(false);

    // Wacht op DOM
    await new Promise((r) => setTimeout(r, 300));

    if (!window.Html5Qrcode) {
      setCameraError("Scanner software niet geladen.");
      setIsCameraActive(false);
      return;
    }

    try {
      const scanner = new window.Html5Qrcode("reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (decodedText) {
            if (navigator.vibrate) navigator.vibrate(200);
            handleScanResult(decodedText);
          }
        },
        () => {}
      );
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Geen camera toegang. Gebruik HTTPS.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  // 4. SLIM ZOEKEN & VERWERKEN
  const handleScanResult = async (scannedValue) => {
    if (!scannedValue) return;
    const term = scannedValue.trim().toUpperCase();
    setInput(term);

    // Als we alleen aan het zoeken zijn (Mobiele Scanner zonder actieve order)
    if (isMobileScanner && !activeOrder) {
      setLoading(true);
      try {
        // Zoek op Lotnummer
        let q = query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "digital_planning"
          ),
          where("lotNumber", "==", term),
          limit(1)
        );
        let snap = await getDocs(q);

        // Zoek op Ordernummer
        if (snap.empty) {
          q = query(
            collection(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "digital_planning"
            ),
            where("orderId", "==", term),
            limit(1)
          );
          snap = await getDocs(q);
        }

        if (!snap.empty) {
          const data = snap.docs[0].data();
          setActiveOrder({ id: snap.docs[0].id, ...data });
          stopCamera(); // Stop camera als we iets gevonden hebben
        } else {
          alert("Geen order of lotnummer gevonden: " + term);
          setInput("");
        }
      } catch (e) {
        alert("Fout bij zoeken: " + e.message);
      } finally {
        setLoading(false);
      }
    } else {
      // We hebben al een order, of het is een vaste terminal -> dit is een bevestiging
      // Stop camera voor UX
      stopCamera();
    }
  };

  const handleConfirm = async () => {
    // Als we in zoekmodus zitten en handmatig iets hebben getypt:
    if (isMobileScanner && !activeOrder && input) {
      handleScanResult(input);
      return;
    }

    if (!activeOrder) return;

    try {
      setLoading(true);
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "digital_planning",
          activeOrder.id
        ),
        {
          status: "completed",
          completedAt: serverTimestamp(),
          scanLog: input,
          finishedBy: isMobileScanner ? "MobileScanner" : stationId,
        }
      );

      alert("Gereed gemeld!");
      setActiveOrder(null);
      setInput("");
      setLoading(false);
      setShowManualInput(false); // Reset UI

      if (!isMobileScanner) navigate("/digital-planning");
    } catch (e) {
      setLoading(false);
      alert("Fout: " + e.message);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8 overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={() =>
          navigate(isMobileScanner ? "/portal" : "/digital-planning")
        }
        className="fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-slate-500 hover:text-slate-900 border border-slate-200"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        <div
          className={`w-full grid grid-cols-1 ${
            activeOrder ? "lg:grid-cols-2" : ""
          } gap-6 lg:gap-12 items-center`}
        >
          {/* LINKER KOLOM: CAMERA / KEUZE */}
          <div
            className={`transition-all duration-300 w-full ${
              !showManualInput && !activeOrder ? "block" : "hidden lg:block"
            }`}
          >
            <div className="bg-slate-900 rounded-[40px] aspect-square relative overflow-hidden border-8 border-white shadow-2xl mx-auto w-full max-w-md">
              {/* Camera View */}
              <div
                id="reader"
                className="absolute inset-0 bg-black w-full h-full object-cover z-0"
              ></div>

              {/* Overlay: Keuze Menu (Als camera uit is) */}
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-8 text-center z-10">
                  <Scan size={64} className="mb-4 opacity-50" />
                  <h2 className="text-white text-2xl font-black uppercase italic mb-2">
                    {isMobileScanner ? "Mobiele Scanner" : "Workstation"}
                  </h2>

                  <div className="flex flex-col gap-4 w-full mt-6">
                    <button
                      onClick={startCamera}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-5 rounded-2xl font-black uppercase text-sm shadow-lg flex items-center justify-center gap-3 transform active:scale-95 transition-all w-full"
                    >
                      <Camera size={24} /> Start Camera
                    </button>

                    <button
                      onClick={() => setShowManualInput(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-5 rounded-2xl font-black uppercase text-sm shadow-lg flex items-center justify-center gap-3 transform active:scale-95 transition-all w-full"
                    >
                      <Keyboard size={24} /> Handmatig
                    </button>
                  </div>
                </div>
              )}

              {/* Overlay: Camera Frame (Als camera aan is) */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl opacity-80"></div>
                  <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl opacity-80"></div>
                  <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl opacity-80"></div>
                  <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-blue-500 rounded-br-3xl opacity-80"></div>

                  <button
                    onClick={stopCamera}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold text-xs pointer-events-auto hover:bg-white/30"
                  >
                    Stop Camera
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-20">
                  <AlertTriangle size={48} className="text-red-500 mb-4" />
                  <p className="text-white font-bold mb-2">{cameraError}</p>
                  <button
                    onClick={() => setCameraError("")}
                    className="bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
                  >
                    Sluiten
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RECHTS: HANDMATIG & INFO */}
          {(showManualInput || activeOrder) && (
            <div className="bg-white rounded-[40px] p-6 md:p-12 shadow-xl border border-slate-100 flex flex-col animate-in slide-in-from-bottom-4 w-full max-w-md mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">
                    {activeOrder ? "Order Gevonden" : "Handmatig"}
                  </h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {activeOrder ? "Bevestig om af te ronden" : "Typ nummer"}
                  </p>
                </div>
                {!activeOrder && (
                  <button
                    onClick={() => setShowManualInput(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
                {activeOrder && (
                  <button
                    onClick={() => {
                      setActiveOrder(null);
                      setInput("");
                      setShowManualInput(false);
                    }}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-4 text-center text-xl font-bold uppercase focus:border-blue-500 outline-none"
                    placeholder="Nummer..."
                  />
                </div>

                <button
                  onClick={handleConfirm}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    input || activeOrder
                      ? "bg-slate-900 text-white hover:bg-blue-600"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {activeOrder ? "Gereed Melden" : "Zoeken"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>

              {activeOrder && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-blue-600">
                        {activeOrder.orderId}
                      </span>
                      <span className="bg-white text-slate-800 text-[10px] font-black px-2 py-1 rounded shadow-sm">
                        {activeOrder.plan} stuks
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 leading-tight">
                      {activeOrder.item}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 font-mono">
                      Lot: {activeOrder.lotNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        #reader video {
            object-fit: cover;
            width: 100% !important;
            height: 100% !important;
            border-radius: 35px;
        }
      `}</style>
    </div>
  );
};

export default Terminal;
