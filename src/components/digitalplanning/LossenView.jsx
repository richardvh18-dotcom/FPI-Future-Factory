import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Truck,
  Wrench,
  Monitor,
  X,
  MessageSquare,
  Ruler,
  AlertOctagon,
  Save,
  ChevronDown
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Helper om machinenummers te normaliseren
const normalizeMachine = (m) => {
  if (!m) return "";
  return String(m).replace(/\D/g, "") || String(m); 
};

// Lijst met afkeur redenen
const REJECTION_REASONS = [
  "TF te dun",
  "TW te dun",
  "Verkeerde Moflengte",
  "Verkeerd Label",
  "Visuele Afkeur",
  "Beschadigingen"
];

/**
 * MODAL: De Operator Actie Pop-up
 * Hier vult de operator metingen, status en opmerkingen in.
 */
const UnloadActionModal = ({ item, currentStation, onClose, onConfirm, isProcessing }) => {
  const [status, setStatus] = useState('ok'); // 'ok', 'temp_reject', 'reject'
  const [destination, setDestination] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [measurements, setMeasurements] = useState({
    tf: '',
    tw: '',
    twcb: '',
    twtb: ''
  });
  const [comments, setComments] = useState('');

  // Bepaal welke meetvelden nodig zijn op basis van de naam
  const itemName = (item.item || '').toUpperCase();
  const showTF = itemName.includes('FL') || itemName.includes('FLANGE'); // Flenzen
  const showCB = itemName.includes('CB'); // CB producten
  const showTB = itemName.includes('TB'); // TB producten
  const showTW = showCB || showTB; // Bij TB en CB moet ook TW gemeten worden

  // Automatische bestemming bepalen bij openen of statuswissel
  useEffect(() => {
    if (status === 'temp_reject') {
      setDestination('HOLD'); 
    } else if (status === 'reject') {
      setDestination('REJECTED');
    } else {
      // Standaard logica voor OK producten
      const stationNorm = normalizeMachine(currentStation);
      
      // Groep 1: BH16, 18, 31 -> Altijd naar Nabewerking
      if (['16', '18', '31'].includes(stationNorm)) {
        setDestination('NABW');
      } 
      // Groep 2: BH11, 12, 15, 17 -> Mazak (indien FL) anders Nabewerking
      else if (['11', '12', '15', '17'].includes(stationNorm)) {
        if (showTF) setDestination('MAZAK');
        else setDestination('NABW');
      } 
      // Fallback
      else {
        setDestination('NABW'); 
      }
    }
  }, [status, currentStation, showTF]);

  const handleSubmit = () => {
    // Validatie: Reden verplicht bij afkeur
    if ((status === 'reject' || status === 'temp_reject') && !rejectionReason) {
      alert("Selecteer een reden voor de afkeur.");
      return;
    }

    onConfirm({
      itemId: item.id,
      status,
      destination,
      measurements,
      comments,
      rejectionReason
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Product Lossen</h3>
            <p className="text-sm font-bold text-blue-600 mt-1">{item.lotNumber}</p>
            <p className="text-xs text-slate-500 truncate max-w-md">{item.item}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* 1. STATUS KEUZE */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Beoordeling</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setStatus('ok')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${status === 'ok' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
              >
                <CheckCircle size={24} />
                <span className="font-bold text-sm">OK</span>
              </button>

              <button 
                onClick={() => setStatus('temp_reject')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${status === 'temp_reject' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
              >
                <AlertTriangle size={24} />
                <span className="font-bold text-sm">Tijdelijke Afkeur</span>
              </button>

              <button 
                onClick={() => setStatus('reject')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${status === 'reject' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
              >
                <AlertOctagon size={24} />
                <span className="font-bold text-sm">Definitieve Afkeur</span>
              </button>
            </div>
          </div>

          {/* 1b. REDEN KEUZE (Alleen bij afkeur) */}
          {(status === 'temp_reject' || status === 'reject') && (
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 animate-in slide-in-from-top-2">
               <label className="text-xs font-black text-red-400 uppercase tracking-widest mb-3 block">
                 Reden van {status === 'temp_reject' ? 'tijdelijke ' : ''}afkeur
               </label>
               <div className="grid grid-cols-2 gap-2">
                 {REJECTION_REASONS.map(reason => (
                   <button
                     key={reason}
                     onClick={() => setRejectionReason(reason)}
                     className={`p-3 rounded-lg text-xs font-bold text-left transition-colors flex items-center justify-between ${rejectionReason === reason ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-red-50 border border-slate-100'}`}
                   >
                     {reason}
                     {rejectionReason === reason && <CheckCircle size={14} />}
                   </button>
                 ))}
               </div>
            </div>
          )}

          {/* 2. MEETWAARDEN (Dynamisch) */}
          {(showTF || showTW) && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
               <label className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Ruler size={14} /> Meetwaarden
               </label>
               <div className="grid grid-cols-2 gap-4">
                 {showTF && (
                   <div>
                     <label className="text-xs font-bold text-slate-600 mb-1 block">TF (Flenzen)</label>
                     <input 
                        type="text" 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                        placeholder="Waarde..."
                        value={measurements.tf}
                        onChange={e => setMeasurements({...measurements, tf: e.target.value})}
                     />
                   </div>
                 )}
                 {showTW && (
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">TW</label>
                      <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                          placeholder="Waarde..."
                          value={measurements.tw}
                          onChange={e => setMeasurements({...measurements, tw: e.target.value})}
                      />
                    </div>
                 )}
                 {showCB && (
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">TWcb</label>
                      <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                          placeholder="Waarde..."
                          value={measurements.twcb}
                          onChange={e => setMeasurements({...measurements, twcb: e.target.value})}
                      />
                    </div>
                 )}
                 {showTB && (
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">TWtb</label>
                      <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                          placeholder="Waarde..."
                          value={measurements.twtb}
                          onChange={e => setMeasurements({...measurements, twtb: e.target.value})}
                      />
                    </div>
                 )}
               </div>
            </div>
          )}

          {/* 3. OPMERKINGEN */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <MessageSquare size={14} /> Opmerking Operator
            </label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              placeholder="Typ hier bijzonderheden..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          {/* 4. BESTEMMING OVERRIDE (Alleen bij OK status) */}
          {status === 'ok' && (
             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Bestemming</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['NABW', 'MAZAK', 'BM01'].map(dest => (
                        <button
                            key={dest}
                            onClick={() => setDestination(dest)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${destination === dest ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {dest === 'BM01' ? 'BM01 (Direct QC)' : dest === 'NABW' ? 'Nabewerking' : 'Mazak'}
                        </button>
                    ))}
                </div>
             </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-200 transition-colors">
                Annuleren
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
            >
                {isProcessing ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"/> : <Save size={18} />}
                Bevestigen
            </button>
        </div>
      </div>
    </div>
  );
};


// --- HOOFD COMPONENT ---
const LossenView = ({ currentUser, products, currentStation }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // Voor de modal
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter de producten
  const itemsToUnload = useMemo(() => {
    if (!products || !currentStation) return [];
    const stationNorm = normalizeMachine(currentStation);

    return products.filter(p => {
      const step = (p.currentStep || "").toLowerCase();
      if (step !== 'lossen') return false;

      const pMachine = String(p.originMachine || p.currentStation || "");
      const pMachineNorm = normalizeMachine(pMachine);

      return pMachine === currentStation || pMachineNorm === stationNorm;
    }).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [products, currentStation]);

  const filteredItems = itemsToUnload.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.lotNumber && item.lotNumber.toLowerCase().includes(term)) ||
      (item.item && item.item.toLowerCase().includes(term)) ||
      (item.orderId && item.orderId.toLowerCase().includes(term))
    );
  });

  // De definitieve save actie
  const handleConfirmAction = async (data) => {
    setIsProcessing(true);
    try {
      const appId = typeof window !== "undefined" && window.__app_id ? window.__app_id : "fittings-app-v1";
      const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'tracked_products', data.itemId);
      
      let updates = {
        updatedAt: serverTimestamp(),
        unloadedAt: serverTimestamp(),
        lastOperator: currentUser?.email || 'Operator',
        measurements: data.measurements,
        comments: data.comments,
        rejectionReason: data.rejectionReason || null
      };

      // Logica voor status en routing
      if (data.status === 'reject') {
          updates.status = 'rejected';
          updates.currentStep = 'REJECTED';
          updates.currentStation = 'SCRAP';
      } else if (data.status === 'temp_reject') {
          updates.status = 'hold';
          updates.currentStep = 'Hold'; 
          updates.currentStation = 'HOLD_AREA'; 
          updates.inspection = { 
            status: 'Tijdelijke afkeur', 
            note: data.comments, 
            reason: data.rejectionReason 
          };
      } else {
          // OK status -> Routing toepassen
          // FIX: GEBRUIK EXACTE CODES DIE WORKSTATION HUB VERWACHT
          if (data.destination === 'NABW') {
            updates.currentStep = "Nabewerken";
            updates.currentStation = "NABW"; // CORRECTE CODE
            updates.transportToProcessingAt = serverTimestamp();
          } else if (data.destination === 'MAZAK') {
            updates.currentStep = "Mazak";
            updates.currentStation = "MAZAK"; // CORRECTE CODE
            updates.transportToProcessingAt = serverTimestamp();
          } else if (data.destination === 'BM01') {
            updates.currentStep = "Eindinspectie";
            updates.currentStation = "BM01";
            updates.arrivedAtInspectionAt = serverTimestamp();
          }
      }

      await updateDoc(productRef, updates);
      setSelectedItem(null); // Sluit modal
    } catch (error) {
      console.error("Fout bij opslaan:", error);
      alert("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Lossen & Kwaliteit</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              {filteredItems.length} items gereed op {currentStation}
            </p>
          </div>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Zoek lotnummer..." 
            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-lg text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <Truck size={64} className="mb-4" />
            <p className="font-bold text-lg">Geen items om te lossen</p>
            <p className="text-sm">Producten verschijnen hier als ze gereed zijn op de wikkelbank.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)} 
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider group-hover:bg-blue-600 group-hover:text-white transition-colors">
                         KLIK OM TE LOSSEN
                       </span>
                       <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                         <Clock size={10} /> {item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                       </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">
                      {item.lotNumber}
                    </h3>
                    <p className="text-sm text-slate-600 font-medium mb-2">
                      {item.item}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                       <span>ORD: {item.orderId}</span>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                      <ArrowRight size={24} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL RENDEREN ALS ER EEN ITEM IS GESELECTEERD */}
      {selectedItem && (
        <UnloadActionModal 
            item={selectedItem}
            currentStation={currentStation}
            onClose={() => setSelectedItem(null)}
            onConfirm={handleConfirmAction}
            isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default LossenView;