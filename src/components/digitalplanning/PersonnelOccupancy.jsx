import React, { useState, useEffect, useMemo } from "react";
import { 
  Loader2, Cpu, Users, Layers, Info, Clock, MinusCircle, 
  ChevronUp, ShieldCheck, X, ChevronDown, Activity, Calculator, TrendingUp, RotateCw,
  UserCheck, AlertCircle, AlertTriangle, CheckCircle2
} from "lucide-react";
import { format, getISOWeek, parse } from "date-fns";
import { db } from "../../config/firebase";
import { 
  collection, onSnapshot, doc, setDoc, 
  deleteDoc, query, orderBy, serverTimestamp 
} from "firebase/firestore";
import { normalizeMachine } from "../../utils/hubHelpers";
import { useAdminAuth } from "../../hooks/useAdminAuth";

/**
 * PersonnelOccupancy - V38 (Visual Polish)
 * OPLOSSING: 
 * - Operator namen zijn nu groter en in zwart (slate-950) voor betere leesbaarheid op tablets.
 */
const PersonnelOccupancy = ({ scope, machines = [], editable = true }) => {
  const { user } = useAdminAuth();
  const [personnel, setPersonnel] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [structure, setStructure] = useState({ departments: [] });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'fittings-app-v1';
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentWeek = getISOWeek(new Date());

  // 1. DATA SYNC
  useEffect(() => {
    const unsubPersonnel = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "personnel"), orderBy("name")),
      (snap) => setPersonnel(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubOccupancy = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "machine_occupancy"),
      (snap) => setOccupancy(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubStructure = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "config", "factory_config"),
      (docSnap) => {
        if (docSnap.exists()) {
            setStructure(docSnap.data());
            const initialExpanded = {};
            (docSnap.data().departments || []).forEach(d => { initialExpanded[d.id] = true; });
            setExpandedSections(initialExpanded);
        }
        setLoading(false);
      }
    );
    return () => { unsubPersonnel(); unsubOccupancy(); unsubStructure(); };
  }, [appId]);

  // 2. HELPERS
  const getShiftDetails = (person, deptId) => {
    const dept = (structure.departments || []).find(d => d.id === deptId);
    const fallbackShift = { label: "DAGDIENST", start: "07:30", end: "16:15" };
    let activeShift = null;
    let isPloeg = false;

    if (!dept || !dept.shifts || dept.shifts.length === 0) {
        activeShift = fallbackShift;
    } else if (person.rotationType === "STATIC") {
        activeShift = dept.shifts.find(s => s.id === person.shiftId) || fallbackShift;
        if (person.shiftId !== "DAGDIENST" && person.shiftId) isPloeg = true;
    } else if (person.rotationType === "RELATIVE") {
        isPloeg = true; 
        const startWeek = person.startWeek || currentWeek;
        const isSwapped = Math.abs(currentWeek - startWeek) % 2 !== 0;
        const startIndex = dept.shifts.findIndex(s => s.id === person.startShiftId);
        const currentIndex = isSwapped ? (startIndex === 0 ? 1 : 0) : (startIndex === -1 ? 0 : startIndex);
        activeShift = dept.shifts[currentIndex] || dept.shifts[0];
    }

    try {
        const start = parse(activeShift.start, 'HH:mm', new Date());
        const end = parse(activeShift.end, 'HH:mm', new Date());
        let diff = (end - start) / (1000 * 60 * 60);
        if (diff < 0) diff += 24; 
        const deduction = isPloeg ? 0 : 0.75;
        return { ...activeShift, hours: Math.max(0, diff - deduction), isPloeg };
    } catch (e) {
        return { ...fallbackShift, hours: 8.0, isPloeg: false };
    }
  };

  // 3. KPI CALCULATIONS
  const capacityMetrics = useMemo(() => {
    let totalNetHours = 0;
    const activeToday = occupancy.filter(occ => occ.date === todayStr && occ.operatorNumber);
    const countedOperators = new Set();
    activeToday.forEach(occ => {
        totalNetHours += parseFloat(occ.hoursWorked || 0);
        countedOperators.add(occ.operatorNumber);
    });
    return { daily: totalNetHours, activeCount: countedOperators.size };
  }, [occupancy, todayStr]);

  // 4. DISPLAY SECTIONS
  const displaySections = useMemo(() => {
    const allDepts = structure.departments || [];
    const cleanScope = (scope || "").toLowerCase();
    let filtered = (scope === 'all') ? allDepts : allDepts.filter(d => d.id.toLowerCase() === cleanScope || d.slug === cleanScope || d.name.toLowerCase().includes(cleanScope));
    return filtered.map(d => ({
        ...d,
        stations: [...(d.stations || [])].sort((a,b) => a.name.toLowerCase().includes("teamleader") ? -1 : 1)
    }));
  }, [structure.departments, scope]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={48} /></div>;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500 w-full pb-32 px-1">
      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-[35px] border-2 border-slate-100 shadow-sm text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Man-uren Vandaag</span>
              <div className="flex items-baseline gap-2 text-left">
                  <span className="text-3xl font-black text-slate-900 italic tracking-tighter">{capacityMetrics.daily.toFixed(1)}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Uur</span>
              </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-[35px] shadow-xl text-white text-left">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1 text-left">Operators</span>
              <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black italic tracking-tighter">{capacityMetrics.activeCount}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Actief</span>
              </div>
          </div>
          <div className="bg-blue-600 p-6 rounded-[35px] shadow-lg text-white text-left">
              <span className="text-[9px] font-black text-blue-100/50 uppercase tracking-widest block mb-1 text-left">Systeem Status</span>
              <span className="text-2xl font-black italic tracking-tighter uppercase">W{currentWeek} Live</span>
          </div>
      </div>

      {displaySections.map(dept => (
        <section key={dept.id} className="space-y-4 text-left">
            <button onClick={() => setExpandedSections(prev => ({...prev, [dept.id]: !prev[dept.id]}))} className="w-full flex items-center justify-between border-b-2 border-slate-200 pb-3 ml-2 hover:bg-slate-100/50 p-2 rounded-xl transition-all">
                <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-slate-800 text-white rounded-xl shadow-md"><Layers size={16} /></div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">{dept.name}</h3>
                </div>
                <ChevronUp className={`transition-transform duration-300 ${expandedSections[dept.id] !== false ? '' : 'rotate-180'}`} size={20} />
            </button>

            {expandedSections[dept.id] !== false && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in zoom-in-95 duration-200 text-left">
                    {dept.stations.map(station => {
                        const mId = station.name;
                        const isTL = mId.toLowerCase().includes("teamleader");
                        const stationOccupancy = occupancy.filter(b => normalizeMachine(b.machineId) === normalizeMachine(mId) && b.date === todayStr && b.departmentId === dept.id);
                        const isBusy = stationOccupancy.length > 0;
                        return (
                            <div key={station.id} className={`p-5 rounded-[35px] border-2 transition-all duration-500 relative flex flex-col shadow-sm ${isTL ? (isBusy ? 'bg-slate-900 border-amber-400 ring-4 ring-amber-400/10 shadow-xl' : 'bg-slate-900 border-slate-800 opacity-80 shadow-inner') : (isBusy ? 'bg-white border-blue-500 ring-4 ring-blue-50/50' : 'bg-white border-slate-100 hover:border-blue-200')}`}>
                                <div className="flex justify-between items-start mb-4 text-left">
                                    <div className="text-left"><span className={`text-[8px] font-black uppercase tracking-widest block mb-0.5 ${isTL ? 'text-amber-500 italic' : 'text-slate-400 opacity-60'}`}>{isTL ? 'Regie' : 'Station ID'}</span><h4 className={`text-lg font-black tracking-tighter italic uppercase truncate leading-none ${isTL ? 'text-white' : 'text-slate-900'}`}>{mId}</h4></div>
                                    {isTL ? <ShieldCheck size={20} className={isBusy ? 'text-amber-400' : 'text-slate-600'} /> : <Cpu size={20} className={isBusy ? 'text-blue-600' : 'text-slate-200'} />}
                                </div>
                                <div className="space-y-2 mb-4 flex-1 text-left text-left">
                                    {stationOccupancy.map(occ => (
                                        <div key={occ.id} className={`p-3 rounded-2xl border flex flex-col gap-2 animate-in slide-in-from-right-1 ${isTL ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex items-center justify-between text-left">
                                                <div className="text-left overflow-hidden text-left">
                                                    {/* OPLOSSING: NAAM ZWART EN GROTER */}
                                                    <h5 className={`text-sm font-black uppercase italic truncate mb-0.5 text-left ${isTL ? 'text-amber-400' : 'text-slate-950'}`}>{occ.operatorName}</h5>
                                                    <div className="flex items-center gap-1.5 opacity-70 text-left">
                                                        <span className={`text-[7px] font-black px-1 rounded ${occ.isPloeg ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{occ.isPloeg ? 'PLOEG' : 'DAG'}</span>
                                                        <span className={`text-[7px] font-bold uppercase ${isTL ? 'text-slate-400' : 'text-slate-500'}`}>{occ.shift}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => deleteDoc(doc(db, "artifacts", appId, "public", "data", "machine_occupancy", occ.id))} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><X size={14} /></button>
                                            </div>
                                            <div className={`pt-2 border-t flex items-center justify-between ${isTL ? 'border-white/5' : 'border-slate-200/60'}`}><div className="flex items-center gap-1.5"><Clock size={10} className="text-blue-500" /><span className={`text-[8px] font-black uppercase tracking-tighter ${isTL ? 'text-slate-500' : 'text-slate-400'}`}>Inzet:</span></div><span className={`text-[10px] font-black ${isTL ? 'text-white' : 'text-slate-900'}`}>{occ.hoursWorked?.toFixed(1) || 0}u</span></div>
                                        </div>
                                    ))}
                                    {!isBusy && <div className={`py-4 border border-dashed rounded-2xl flex flex-col items-center justify-center opacity-40 ${isTL ? 'border-white/10' : 'border-slate-200'}`}><span className={`text-[7px] font-black uppercase tracking-widest text-center ${isTL ? 'text-slate-600' : 'text-slate-400'}`}>Vrij</span></div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
      ))}
    </div>
  );
};

export default PersonnelOccupancy;