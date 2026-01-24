import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Box,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Ruler,
  Save,
  X,
  FileText,
  AlertOctagon,
  HelpCircle
} from "lucide-react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "../../config/firebase.js";

// Redenen voor afkeur
const REJECTION_REASONS = [
  "Maatvoering onjuist",
  "Beschadiging",
  "Luchtbellen / Blaasjes",
  "Kleurafwijking",
  "Vervuiling",
  "Wanddikte te dun",
  "Anders, zie opmerking"
];

const UnloadModal = ({ product, onClose, onProcess }) => {
  const [status, setStatus] = useState("completed"); // 'completed', 'temp_reject', 'rejected'
  const [measurements, setMeasurements] = useState({ TF: "", TW: "", Twcb: "", Twtb: "" });
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Bepaal of het een 'FL' product is (Flens)
  const isFL = useMemo(() => (product?.item || "").toUpperCase().includes("FL"), [product]);

  // Validatie functie
  const validate = () => {
    const newErrors = {};

    // 1. Meetgegevens validatie
    if (isFL) {
      if (!measurements.TF) newErrors.TF = "TF is verplicht voor FL producten";
    } else {
      if (!measurements.TW) newErrors.TW = "TW is verplicht";
    }

    // 2. Afkeur redenen validatie
    if (status !== "completed") {
      if (selectedReasons.length === 0) {
        newErrors.reasons = "Selecteer minimaal één reden voor afkeur";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsProcessing(true);

    try {
      const payload = {
        measurements: { ...measurements }, // Sla metingen op
        note: note
      };

      // Voeg afkeur info toe indien van toepassing
      if (status !== "completed") {
        payload.inspection = {
          status: status === "temp_reject" ? "Tijdelijke afkeur" : "Afkeur",
          reasons: selectedReasons,
          timestamp: new Date().toISOString()
        };
      }

      await onProcess(product, status, payload);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Er ging iets mis bij het opslaan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleReason = (reason) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason) 
        : [...prev, reason]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800">Product Lossen & Controleren</h3>
            <p className="text-sm text-slate-500 font-mono">{product.lotNumber} • {product.item}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* 1. Status Selectie */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Beoordeling</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setStatus("completed")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  status === "completed" 
                    ? "border-green-500 bg-green-50 text-green-700" 
                    : "border-slate-100 hover:border-green-200 text-slate-400"
                }`}
              >
                <CheckCircle size={32} />
                <span className="font-bold text-sm">Akkoord</span>
              </button>

              <button
                onClick={() => setStatus("temp_reject")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  status === "temp_reject" 
                    ? "border-orange-500 bg-orange-50 text-orange-700" 
                    : "border-slate-100 hover:border-orange-200 text-slate-400"
                }`}
              >
                <AlertTriangle size={32} />
                <span className="font-bold text-sm">Tijdelijke Afkeur</span>
                <span className="text-[10px] uppercase opacity-75">(Reparatie)</span>
              </button>

              <button
                onClick={() => setStatus("rejected")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  status === "rejected" 
                    ? "border-red-500 bg-red-50 text-red-700" 
                    : "border-slate-100 hover:border-red-200 text-slate-400"
                }`}
              >
                <XCircle size={32} />
                <span className="font-bold text-sm">Afkeur</span>
                <span className="text-[10px] uppercase opacity-75">(Definitief)</span>
              </button>
            </div>
          </div>

          {/* 2. Meetgegevens */}
          <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="text-blue-600" size={20} />
              <h4 className="font-bold text-blue-900">Verplichte Metingen</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isFL ? (
                // FLENS (FL) Specifiek
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-blue-700 mb-1">
                    TF (Flensdikte) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className={`w-full p-3 border rounded-lg outline-none font-mono ${errors.TF ? "border-red-500 bg-red-50" : "border-blue-200 focus:border-blue-500"}`}
                    placeholder="Invoeren..."
                    value={measurements.TF}
                    onChange={(e) => {
                      setMeasurements({ ...measurements, TF: e.target.value });
                      if (errors.TF) setErrors({ ...errors, TF: null });
                    }}
                  />
                  {errors.TF && <p className="text-xs text-red-500 mt-1 font-bold">{errors.TF}</p>}
                </div>
              ) : (
                // STANDAARD (Niet-FL)
                <>
                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-xs font-bold text-blue-700 mb-1">
                      TW (Wanddikte) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className={`w-full p-3 border rounded-lg outline-none font-mono ${errors.TW ? "border-red-500 bg-red-50" : "border-blue-200 focus:border-blue-500"}`}
                      placeholder="Invoeren..."
                      value={measurements.TW}
                      onChange={(e) => {
                        setMeasurements({ ...measurements, TW: e.target.value });
                        if (errors.TW) setErrors({ ...errors, TW: null });
                      }}
                    />
                    {errors.TW && <p className="text-xs text-red-500 mt-1 font-bold">{errors.TW}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex justify-between">
                      Twcb <span>(Optioneel, bij CB)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
                      placeholder="-"
                      value={measurements.Twcb}
                      onChange={(e) => setMeasurements({ ...measurements, Twcb: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex justify-between">
                      Twtb <span>(Optioneel, bij TB)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
                      placeholder="-"
                      value={measurements.Twtb}
                      onChange={(e) => setMeasurements({ ...measurements, Twtb: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. Redenen voor Afkeur (Conditioneel) */}
          {status !== "completed" && (
            <div className="bg-red-50 p-5 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-4">
                <AlertOctagon className="text-red-600" size={20} />
                <h4 className="font-bold text-red-900">
                  Reden voor {status === "temp_reject" ? "tijdelijke afkeur" : "afkeur"} <span className="text-red-500">*</span>
                </h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {REJECTION_REASONS.map((reason) => (
                  <div 
                    key={reason}
                    onClick={() => {
                        toggleReason(reason);
                        if (errors.reasons) setErrors({ ...errors, reasons: null });
                    }}
                    className={`p-3 rounded-lg border cursor-pointer text-sm font-medium transition-all flex items-center gap-3 ${
                      selectedReasons.includes(reason)
                        ? "bg-red-100 border-red-500 text-red-800"
                        : "bg-white border-red-100 text-slate-600 hover:border-red-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedReasons.includes(reason) ? "bg-red-500 border-red-500" : "border-slate-300"}`}>
                        {selectedReasons.includes(reason) && <CheckCircle size={10} className="text-white" />}
                    </div>
                    {reason}
                  </div>
                ))}
              </div>
              {errors.reasons && <p className="text-xs text-red-600 font-black mb-2 animate-pulse">{errors.reasons}</p>}
            </div>
          )}

          {/* 4. Opmerkingen */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Opmerking / Toelichting</label>
            <textarea
              className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm min-h-[100px]"
              placeholder="Typ hier eventuele bijzonderheden..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`px-8 py-3 rounded-xl font-black text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
              status === "completed" 
                ? "bg-green-600 hover:bg-green-700 shadow-green-200" 
                : status === "temp_reject"
                ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200"
                : "bg-red-600 hover:bg-red-700 shadow-red-200"
            }`}
          >
            {isProcessing ? <span className="animate-spin">⌛</span> : <Save size={18} />}
            {status === "completed" ? "Goedkeuren & Opslaan" : "Afkeur Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
};

const LossenView = ({ currentUser, products, currentStation }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter producten die 'klaar' zijn met wikkelen en nu gelost moeten worden
  // OF producten die al op 'Lossen' staan.
  const unloadableProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((p) => {
      // Mag niet al klaar zijn
      if (p.currentStep === "Finished" || p.currentStep === "REJECTED") return false;

      // Zoekfilter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!p.lotNumber?.toLowerCase().includes(term) && !p.item?.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Check of het product bij dit station hoort (Strict Matching)
      // We checken of currentStation of originMachine overeenkomt met het geselecteerde station (bijv. "BH15")
      const matchesStation = (p.currentStation === currentStation) || (p.originMachine === currentStation);

      // Alleen tonen als status 'Lossen' is EN het station matcht
      if (p.currentStep === "Lossen" && matchesStation) return true;

      return false;
    }).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [products, currentStation, searchTerm]);

  const handleProcessProduct = async (product, status, data) => {
    try {
      const productRef = doc(db, "artifacts", "fittings-app-v1", "public", "data", "tracked_products", product.id);
      
      const updates = {
        updatedAt: serverTimestamp(),
        measurements: data.measurements, // Sla metingen op
        note: data.note,
        unloadedBy: currentUser?.email || "Unknown",
        unloadedAt: new Date().toISOString()
      };

      if (status === "completed") {
        updates.currentStep = "Nabewerking"; // Of Mazak, afhankelijk van route
        // Als het FL is, misschien naar Mazak? Voor nu default Nabewerking, routing regelt de volgende stap
        if (product.item?.toUpperCase().includes("FL")) {
             updates.currentStation = "MAZAK"; // Suggestie voor volgende locatie
        } else {
             updates.currentStation = "NABW"; // Suggestie
        }
      } else if (status === "temp_reject") {
        updates.inspection = data.inspection;
        updates.currentStep = "HOLD_AREA"; // Markeer als geparkeerd
        updates.currentStation = "HOLD_AREA";
      } else if (status === "rejected") {
        updates.status = "rejected";
        updates.currentStep = "REJECTED";
        updates.currentStation = "AFKEUR";
        updates.inspection = data.inspection;
      }

      await updateDoc(productRef, updates);
      
      // Als er opmerkingen/afkeur is, log een bericht
      if (status !== "completed" || data.note) {
        await addDoc(collection(db, "artifacts", "fittings-app-v1", "public", "data", "messages"), {
            title: status === "completed" ? "Opmerking bij Lossen" : `Afkeur bij Lossen (${status})`,
            message: `Lot: ${product.lotNumber}. ${data.note || "Geen opmerking."} ${data.inspection ? "Redenen: " + data.inspection.reasons.join(", ") : ""}`,
            type: status === "completed" ? "info" : "warning",
            status: "unread",
            createdAt: serverTimestamp(),
            source: "LossenView"
        });
      }

    } catch (error) {
      console.error("Fout bij verwerken:", error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Box size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Lossen & Controle</h2>
            <p className="text-xs text-slate-500 font-medium">Scan of selecteer producten om te lossen voor {currentStation}</p>
          </div>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Zoek op lotnummer of type..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {unloadableProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <Box size={64} className="mb-4 text-slate-300" />
            <p className="text-lg font-bold uppercase tracking-widest">Geen producten om te lossen</p>
            <p className="text-xs">Producten verschijnen hier als ze klaar zijn met wikkelen op {currentStation}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unloadableProducts.map(product => (
              <div 
                key={product.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="text-blue-500" />
                </div>
                
                <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{product.lotNumber}</span>
                </div>
                
                <p className="text-sm font-bold text-slate-500 mb-4">{product.item}</p>
                
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-50 p-2 rounded-lg w-fit">
                    <Ruler size={14} />
                    <span>
                        {product.item.toUpperCase().includes("FL") ? "FLENS (TF meten)" : "STANDAARD (TW meten)"}
                    </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">KLIK OM TE VERWERKEN</span>
                    <span className="text-[10px] text-slate-400">
                        {product.updatedAt ? new Date(product.updatedAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <UnloadModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onProcess={handleProcessProduct}
        />
      )}
    </div>
  );
};

export default LossenView;