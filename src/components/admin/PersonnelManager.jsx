import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Trash2, Search, Loader2, Monitor, Cpu, 
  ShieldCheck, X, Plus, Layers, Clock, Settings, 
  Edit3, ArrowRight, RotateCcw, UserCircle, 
  ChevronUp, MinusCircle, ChevronLeft, ChevronRight,
  Building2, Info, Globe, ChevronDown, Calculator,
  UserCheck, BarChart3, CalendarDays, TrendingUp,
  Database, Copy
} from "lucide-react";
import { db } from "../../config/firebase";
import { 
  collection, onSnapshot, doc, setDoc, 
  deleteDoc, serverTimestamp, query, orderBy, writeBatch 
} from "firebase/firestore";
import { getISOWeek, format, parse, startOfISOWeek, endOfISOWeek, isWithinInterval, isToday, addDays, subDays, subWeeks, addWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { normalizeMachine } from "../../utils/hubHelpers";

/**
 * PersonnelManager V26.1 - Grouping & Copy Fix
 * OPLOSSING: 
 * - 'countriesData' hersteld (geen crash meer).
 * - Namen medewerkers nu groot en diepzwart.
 * - Kopieerfunctie van gisteren -> vandaag toegevoegd.
 */
const PersonnelManager = () => {
  const [personnel, setPersonnel] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [structure, setStructure] = useState({ departments: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assignment"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDepts, setExpandedDepts] = useState({});
  const [viewDate, setViewDate] = useState(new Date());
  const [timeMode, setTimeMode] = useState("DAY"); 

  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'fittings-app-v1';
  const currentWeek = getISOWeek(viewDate);
  const selectedDateStr = format(viewDate, "yyyy-MM-dd");

  const [personForm, setPersonForm] = useState({
    name: "", employeeNumber: "", departmentId: "",
    rotationType: "STATIC", shiftId: "", startShiftId: "",
    startWeek: currentWeek, offDays: []
  });

  // 1. DATA SYNC
  useEffect(() => {
    const unsubPersonnel = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "personnel"), orderBy("name")),
      (snap) => setPersonnel(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    const unsubOccupancy = onSnapshot(
        collection(db, "artifacts", appId, "public", "data", "machine_occupancy"),
        (snap) => setOccupancy(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    const unsubStructure = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "config", "factory_config"),
      (docSnap) => {
        if (docSnap.exists()) setStructure(docSnap.data());
        setLoading(false);
      }
    );
    return () => { unsubPersonnel(); unsubOccupancy(); unsubStructure(); };
  }, [appId]);

  // --- HELPERS ---
  const getShiftsForDept = (deptId) => {
    const dept = (structure.departments || []).find(d => d.id === deptId);
    return (dept && dept.shifts && dept.shifts.length > 0) ? dept.shifts : [
        { id: "VROEG", label: "Vroege Ploeg", start: "06:00", end: "14:15" }, 
        { id: "LAAT", label: "Late Ploeg", start: "14:15", end: "22:30" }
    ];
  };

  const getShiftHours = (person, deptId, targetWeek) => {
    if (!person) return { label: "Dagdienst", total: 8.0, times: "07:30-16:15", isPloeg: false };
    const shifts = getShiftsForDept(deptId);
    let activeShift = null;
    let isPloeg = false;

    if (person.rotationType === "STATIC") {
        activeShift = shifts.find(s => s.id === person.shiftId) || { label: "Dagdienst", start: "07:30", end: "16:15" };
        if (person.shiftId !== "DAGDIENST" && person.shiftId !== "") isPloeg = true;
    } else {
        isPloeg = true;
        const startWeek = person.startWeek || targetWeek;
        const isSwapped = Math.abs(targetWeek - startWeek) % 2 !== 0;
        const shiftVroeg = shifts[0];
        const shiftLaat = shifts[1] || shifts[0];
        activeShift = (!isSwapped) ? (shifts.find(s => s.id === person.startShiftId) || shiftVroeg) : ((shifts.find(s => s.id === person.startShiftId)?.id === shiftVroeg.id) ? shiftLaat : shiftVroeg);
    }

    try {
        const start = parse(activeShift.start, 'HH:mm', new Date());
        const end = parse(activeShift.end, 'HH:mm', new Date());
        let diff = (end - start) / (1000 * 60 * 60);
        if (diff < 0) diff += 24; 
        const deduction = isPloeg ? 0 : 0.75;
        return { label: activeShift.label, total: Math.max(0, diff - deduction), times: `${activeShift.start}-${activeShift.end}`, isPloeg };
    } catch (e) {
        return { label: "Dagdienst", total: 8.0, times: "07:30-16:15", isPloeg: false };
    }
  };

  // --- KPI CALCULATIONS ---
  const kpiData = useMemo(() => {
    const startWeek = startOfISOWeek(viewDate);
    const endWeek = endOfISOWeek(viewDate);
    const stats = { global: { hours: 0, count: 0 }, byDept: {} };
    (structure.departments || []).forEach(d => {
      stats.byDept[d.id] = { name: d.name, hours: 0, count: 0, operators: new Set() };
    });
    const globalOperators = new Set();
    const activePersonnelIds = new Set(personnel.map(p => p.employeeNumber));

    occupancy.forEach(occ => {
      if (!occ.operatorNumber || !activePersonnelIds.has(occ.operatorNumber)) return;
      let match = (timeMode === "DAY") ? (occ.date === selectedDateStr) : isWithinInterval(parse(occ.date, "yyyy-MM-dd", new Date()), { start: startWeek, end: endWeek });
      if (match) {
        const netHours = Math.max(0, parseFloat(occ.hoursWorked || 0) - parseFloat(occ.hoursOff || 0));
        stats.global.hours += netHours;
        globalOperators.add(occ.operatorNumber);
        if (stats.byDept[occ.departmentId]) {
          stats.byDept[occ.departmentId].hours += netHours;
          stats.byDept[occ.departmentId].operators.add(occ.operatorNumber);
        }
      }
    });
    stats.global.count = globalOperators.size;
    Object.keys(stats.byDept).forEach(id => { stats.byDept[id].count = stats.byDept[id].operators.size; });
    return stats;
  }, [occupancy, personnel, timeMode, selectedDateStr, viewDate, structure.departments]);

  // HERSTELD: Land groepering logica
  const countriesData = useMemo(() => {
    const groups = {};
    (structure.departments || []).forEach(dept => {
        const country = dept.country || "Nederland";
        if (!groups[country]) groups[country] = [];
        groups[country].push(dept);
    });
    return groups;
  }, [structure.departments]);

  // --- HANDLERS ---
  const handleAssign = async (machineId, operatorNumber, deptId) => {
    try {
      if (!operatorNumber || operatorNumber === "") {
         const toDelete = occupancy.filter(o => normalizeMachine(o.machineId) === normalizeMachine(machineId) && o.date === selectedDateStr && o.departmentId === deptId);
         for (const docToDel of toDelete) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'machine_occupancy', docToDel.id));
         return;
      }
      const person = personnel.find(p => p.employeeNumber === operatorNumber);
      if (!person) return;
      const assignmentId = `${selectedDateStr}_${deptId}_${machineId}_${person.employeeNumber}`.replace(/[^a-zA-Z0-9]/g, '_');
      const shiftInfo = getShiftHours(person, deptId, currentWeek);

      await setDoc(doc(db, "artifacts", appId, "public", "data", "machine_occupancy", assignmentId), {
        id: assignmentId, machineId, operatorNumber: person.employeeNumber,
        operatorName: person.name, departmentId: deptId,
        date: selectedDateStr, hoursWorked: shiftInfo.total, hoursOff: 0, updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) { console.error(err); }
  };

  const handleCopyYesterday = async () => {
    const yesterdayStr = format(subDays(viewDate, 1), "yyyy-MM-dd");
    const yesterdayData = occupancy.filter(o => o.date === yesterdayStr && o.operatorNumber);
    if (yesterdayData.length === 0) return alert("Geen bezetting gevonden van gisteren.");
    if (!window.confirm(`Kopieer ${yesterdayData.length} lopers van gisteren naar vandaag?`)) return;

    setIsCopying(true);
    try {
      const batch = writeBatch(db);
      yesterdayData.forEach(old => {
        const newId = `${selectedDateStr}_${old.departmentId}_${old.machineId}_${old.operatorNumber}`.replace(/[^a-zA-Z0-9]/g, '_');
        batch.set(doc(db, "artifacts", appId, "public", "data", "machine_occupancy", newId), {
          ...old, id: newId, date: selectedDateStr, updatedAt: serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
    } catch (err) { alert(err.message); } finally { setIsCopying(false); }
  };

  const handleSavePerson = async () => {
    setSaving(true);
    try {
      const docId = editingId || `P_${personForm.employeeNumber}`;
      await setDoc(doc(db, "artifacts", appId, "public", "data", "personnel", docId), { ...personForm, lastUpdated: serverTimestamp() }, { merge: true });
      setIsPersonModalOpen(false);
    } catch (err) { alert("Fout: " + err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="h-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-left animate-in fade-in">
      
      {/* HEADER & NAV */}
      <div className="p-6 bg-white border-b border-slate-200 flex flex-col gap-6 shrink-0 z-20 shadow-sm text-left">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Users size={24} /></div>
                <div className="text-left">
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none text-left">Resource <span className="text-blue-600">Bezetting</span></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">V26.1 | Active Control</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setTimeMode("DAY")} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeMode === 'DAY' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}><CalendarDays size={14} /> Dag</button>
                    <button onClick={() => setTimeMode("WEEK")} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeMode === 'WEEK' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}><TrendingUp size={14} /> Week</button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {[{ id: 'assignment', label: 'Bezetting', icon: Monitor }, { id: 'personnel', label: 'Database', icon: Database }].map(tab => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setExpandedDepts({}); }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400'}`}>{tab.label}</button>
                  ))}
                </div>
                <button onClick={() => { setEditingId(null); setIsPersonModalOpen(true); }} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"><Plus size={16} /> Persoon</button>
            </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 border-t border-slate-50 pt-4 text-left">
            <div className="flex items-center gap-4 bg-slate-900 text-white p-1.5 rounded-[22px] shadow-lg text-left">
                <button onClick={() => setViewDate(prev => subDays(prev, 1))} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-left"><ChevronLeft size={20}/></button>
                <div className="flex flex-col items-center px-4 min-w-[180px] text-left">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{isToday(viewDate) ? 'Vandaag' : format(viewDate, "eeee", {locale: nl})}</span>
                    <span className="text-sm font-black uppercase italic tracking-tight">{format(viewDate, "dd MMMM yyyy", {locale: nl})}</span>
                </div>
                <button onClick={() => setViewDate(prev => addDays(prev, 1))} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-left"><ChevronRight size={20}/></button>
            </div>

            <button onClick={handleCopyYesterday} disabled={isCopying} className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95 disabled:opacity-50">
                {isCopying ? <Loader2 className="animate-spin" size={16}/> : <Copy size={16} />} Kopieer Gisteren
            </button>

            {activeTab === 'assignment' && (
                <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1 text-left">
                    <div className="bg-slate-900 px-5 py-3 rounded-2xl flex items-center gap-4 border border-white/5 shadow-md shrink-0 text-left">
                        <div className="text-left">
                            <span className="text-[8px] font-black text-blue-400 uppercase block mb-1 text-left leading-none">Totaal</span>
                            <div className="flex items-baseline gap-1 text-white text-left"><span className="text-lg font-black italic">{kpiData.global.hours.toFixed(1)}</span><span className="text-[8px] font-bold text-slate-500 uppercase">u</span></div>
                        </div>
                        <div className="w-px h-6 bg-white/10 text-left"></div>
                        <div className="flex items-center gap-2 text-emerald-400 text-left"><UserCheck size={14}/><span className="text-sm font-black italic">{kpiData.global.count}</span></div>
                    </div>
                    {Object.entries(kpiData.byDept).map(([id, data]) => (
                        <div key={id} className="bg-white border border-slate-200 px-4 py-3 rounded-2xl flex items-center gap-4 shadow-sm shrink-0 hover:border-blue-300 transition-colors text-left">
                            <div className="text-left max-w-[100px] text-left"><span className="text-[8px] font-black text-slate-400 uppercase block leading-none mb-1 truncate">{data.name}</span><div className="flex items-baseline gap-1 text-left"><span className="text-base font-black text-slate-900 italic">{data.hours.toFixed(1)}</span><span className="text-[7px] font-bold text-slate-300 uppercase">u</span></div></div>
                            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-left"><Users size={12}/><span className="text-xs font-black italic">{data.count}</span></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 text-left">
        <div className="max-w-7xl mx-auto pb-32 text-left">
           {activeTab === 'assignment' && (
               <div className="space-y-12 text-left">
                   {Object.entries(countriesData).sort().map(([country, depts]) => (
                       <div key={country} className="space-y-6 animate-in fade-in text-left">
                           <div className="flex items-center gap-4 border-b-2 border-slate-200 pb-3 ml-2 text-left"><Globe size={18} className="text-slate-400 text-left" /><h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight text-left">{country}</h3></div>
                           <div className="space-y-3 text-left">
                                {depts.map(dept => {
                                    const isOpen = expandedDepts[dept.id] === true;
                                    const sortedStations = [...(dept.stations || [])].sort((a, b) => (a.name || "").toLowerCase().includes("teamleader") ? -1 : 1);
                                    const deptHours = kpiData.byDept[dept.id]?.hours || 0;
                                    const deptCount = kpiData.byDept[dept.id]?.count || 0;
                                    return (
                                        <div key={dept.id} className="space-y-3 text-left">
                                            <button onClick={() => setExpandedDepts(prev => ({...prev, [dept.id]: !prev[dept.id]}))} className={`w-full flex items-center justify-between p-4 rounded-[25px] transition-all border-2 ${isOpen ? 'bg-white border-blue-500 shadow-md' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                                <div className="flex items-center gap-4 flex-1 text-left"><div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><Layers size={18} /></div><div className="text-left"><h4 className={`text-sm font-black uppercase italic tracking-wider ${isOpen ? 'text-slate-900' : 'text-slate-700'}`}>{dept.name}</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">{sortedStations.length} Stations</p></div></div>
                                                <div className="flex items-center gap-4 mr-6 hidden md:flex text-left"><div className="text-right px-4 border-r border-slate-100 text-left text-left"><span className="text-[8px] font-black text-slate-300 uppercase block mb-0.5 text-left">Netto</span><span className={`text-sm font-black italic ${deptHours > 0 ? 'text-blue-600' : 'text-slate-300'} text-left`}>{deptHours.toFixed(1)}u</span></div><div className="text-right text-left text-left"><span className="text-[8px] font-black text-slate-300 uppercase block mb-0.5 text-left">Lopers</span><span className={`text-sm font-black italic ${deptCount > 0 ? 'text-slate-800' : 'text-slate-300'} text-left`}>{deptCount}</span></div></div>
                                                <div className={`p-2 rounded-lg transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'} text-left`}><ChevronUp size={20} className={isOpen ? 'text-blue-500' : 'text-slate-300'} /></div>
                                            </button>
                                            {isOpen && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in zoom-in-95 p-2 text-left">
                                                    {sortedStations.map(station => {
                                                        const mId = station.name;
                                                        const isTL = mId.toLowerCase().includes("teamleader");
                                                        const occList = occupancy.filter(o => normalizeMachine(o.machineId) === normalizeMachine(mId) && o.date === selectedDateStr && o.departmentId === dept.id);
                                                        const isBusy = occList.some(o => o.operatorNumber);
                                                        return (
                                                            <div key={station.id} className={`p-5 rounded-[30px] border-2 transition-all relative flex flex-col shadow-sm text-left ${isTL ? (isBusy ? 'bg-slate-900 border-amber-400 ring-4 ring-amber-400/10' : 'bg-slate-900 border-slate-800 opacity-80') : (isBusy ? 'bg-white border-blue-500 ring-4 ring-blue-50/50' : 'bg-white border-slate-100 hover:border-blue-300')}`}>
                                                                <div className="flex justify-between items-start mb-4 text-left text-left"><div><span className={`text-[8px] font-black uppercase tracking-widest block mb-1 text-left ${isTL ? 'text-amber-500 italic' : 'text-slate-400'}`}>{isTL ? 'Regie' : 'Station'}</span><h4 className={`text-lg font-black italic leading-none text-left ${isTL ? 'text-white' : 'text-slate-900'}`}>{mId}</h4></div>{isTL ? <ShieldCheck size={20} className={isBusy ? 'text-amber-400' : 'text-slate-600'} /> : <Cpu size={20} className={isBusy ? 'text-blue-600' : 'text-slate-200'} />}</div>
                                                                <div className="space-y-3 mb-4 flex-1 text-left">
                                                                    {occList.filter(o => o.operatorNumber).map(occ => {
                                                                        const pData = personnel.find(p => p.employeeNumber === occ.operatorNumber);
                                                                        const sHours = getShiftHours(pData, dept.id, currentWeek);
                                                                        return (
                                                                            <div key={occ.id} className={`p-3 rounded-2xl border animate-in slide-in-from-right-1 text-left ${isTL ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-100'}`}>
                                                                                <div className="flex justify-between items-start text-left text-left">
                                                                                    <div className="text-left overflow-hidden text-left">
                                                                                        {/* OPLOSSING: NAAM ZWART EN GROTER */}
                                                                                        <h5 className={`text-sm font-black uppercase italic truncate mb-1 text-left ${isTL ? 'text-amber-400' : 'text-slate-950'}`}>{occ.operatorName}</h5>
                                                                                        <div className="flex items-center gap-2 text-left text-left">
                                                                                           <Clock size={10} className="text-blue-500 text-left"/><span className="text-[9px] font-black text-slate-500 uppercase text-left">{occ.hoursWorked?.toFixed(1) || sHours.total.toFixed(1)}u</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button onClick={() => deleteDoc(doc(db, "artifacts", appId, "public", "data", "machine_occupancy", occ.id))} className="p-1 text-slate-400 hover:text-rose-500 transition-colors text-left"><X size={14}/></button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {!isBusy && <div className="py-4 border border-dashed border-slate-200/20 rounded-2xl flex flex-col items-center justify-center opacity-40 text-center"><span className={`text-[7px] font-black uppercase tracking-widest text-center ${isTL ? 'text-slate-600' : 'text-slate-400'}`}>Vrij</span></div>}
                                                                </div>
                                                                <select className={`w-full p-2.5 rounded-xl font-black text-[9px] outline-none transition-all appearance-none cursor-pointer border ${isTL ? 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-400 focus:border-amber-400' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-300'} text-left`} value="" onChange={(e) => handleAssign(mId, e.target.value, dept.id)}><option value="">+ Operator</option>{personnel.filter(p => p.departmentId === dept.id && !occList.some(o => o.operatorNumber === p.employeeNumber)).map(p => <option key={p.id} value={p.employeeNumber}>{p.name}</option>)}</select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                           </div>
                       </div>
                   ))}
               </div>
           )}
           {activeTab === 'personnel' && <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest">Open de personeelslijst in de zijbalk...</div>}
        </div>
      </div>
      {/* ... De modal code voor toevoegen van medewerkers ... */}
    </div>
  );
};

export default PersonnelManager;