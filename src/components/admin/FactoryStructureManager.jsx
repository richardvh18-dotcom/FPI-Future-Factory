import React, { useState, useEffect } from "react";
import { 
  Settings, Building2, Cpu, Plus, Trash2, Save, 
  Loader2, Layout, X, Database, AlertCircle, 
  CheckCircle2, RefreshCw, Globe, ChevronDown, 
  ChevronUp, MapPin, Activity, Info, Clock, ArrowRight
} from "lucide-react";
import { db } from "../../config/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * FactoryStructureManager - V1.6 (Shifts Management)
 * OPLOSSING: Mogelijkheid toegevoegd om ploegen (Shifts) per afdeling te beheren.
 */
const FactoryStructureManager = () => {
  const [config, setConfig] = useState({ departments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'fittings-app-v1';
  const CONFIG_PATH = ["artifacts", appId, "public", "data", "config", "factory_config"];

  useEffect(() => {
    const docRef = doc(db, ...CONFIG_PATH);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      } else {
        setConfig({ departments: [] });
      }
      setLoading(false);
    }, (err) => {
      console.error("Fout bij laden:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [appId]);

  const toggleExpand = (id) => {
    setExpandedDepts(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const addDepartment = () => {
    const id = `dept_${Date.now()}`;
    const newDept = {
      id: id,
      name: "Nieuwe Afdeling",
      slug: "new-dept",
      country: "Nederland",
      stations: [],
      shifts: [ // Standaard ploegen bij aanmaak
        { id: "VROEG", label: "Vroege Ploeg", start: "06:00", end: "14:15" },
        { id: "LAAT", label: "Late Ploeg", start: "14:15", end: "22:30" }
      ],
      isActive: true
    };
    setConfig(prev => ({ ...prev, departments: [...(prev.departments || []), newDept] }));
    setExpandedDepts(prev => ({ ...prev, [id]: true }));
  };

  const updateDept = (id, field, value) => {
    setConfig(prev => ({
      ...prev,
      departments: (prev.departments || []).map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  // --- SHIFT HANDLERS ---
  const addShift = (deptId) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          const newShift = { id: `SH_${Date.now()}`, label: "Nieuwe Ploeg", start: "08:00", end: "16:30" };
          return { ...d, shifts: [...(d.shifts || []), newShift] };
        }
        return d;
      })
    }));
  };

  const updateShift = (deptId, shiftId, field, value) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          return {
            ...d,
            shifts: d.shifts.map(s => s.id === shiftId ? { ...s, [field]: value } : s)
          };
        }
        return d;
      })
    }));
  };

  const removeShift = (deptId, shiftId) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          return { ...d, shifts: d.shifts.filter(s => s.id !== shiftId) };
        }
        return d;
      })
    }));
  };

  const addStation = (deptId) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          const newStation = { id: `st_${Date.now()}`, name: "NIEUW", type: "machine" };
          return { ...d, stations: [...(d.stations || []), newStation] };
        }
        return d;
      })
    }));
  };

  const updateStation = (deptId, stationId, value) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          return {
            ...d,
            stations: d.stations.map(s => s.id === stationId ? { ...s, name: value.toUpperCase() } : s)
          };
        }
        return d;
      })
    }));
  };

  const removeStation = (deptId, stationId) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          return { ...d, stations: (d.stations || []).filter(s => s.id !== stationId) };
        }
        return d;
      })
    }));
  };

  const saveConfig = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const docRef = doc(db, ...CONFIG_PATH);
      await setDoc(docRef, {
        ...config,
        lastUpdated: serverTimestamp(),
        updatedBy: "Admin"
      }, { merge: true });
      setStatus({ type: 'success', msg: 'Configuratie live gezet!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Fout: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="h-full bg-slate-50 overflow-y-auto custom-scrollbar text-left pb-32">
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
          <div className="text-left">
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Factory <span className="text-blue-600">Configurator</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">V1.6 | Ploegendienst Beheer Actief</p>
          </div>
          <div className="flex gap-4">
            <button onClick={addDepartment} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-slate-200 shadow-sm"><Plus size={16} /> Afdeling</button>
            <button onClick={saveConfig} disabled={saving} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl active:scale-95 disabled:opacity-50">{saving ? <RefreshCw className="animate-spin" /> : <Save />} Publiceren</button>
          </div>
        </div>

        <div className="space-y-6">
          {(config.departments || []).map((dept) => {
            const isExpanded = expandedDepts[dept.id] !== false;
            return (
              <div key={dept.id} className={`bg-white rounded-[45px] border-2 transition-all duration-300 shadow-sm overflow-hidden ${isExpanded ? 'border-blue-500 ring-4 ring-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                <div className={`p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-white' : 'bg-slate-50/50'}`} onClick={() => toggleExpand(dept.id)}>
                  <div className="flex items-center gap-6 flex-1 w-full text-left">
                    <div className={`p-4 rounded-[22px] shadow-sm ${isExpanded ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}><Building2 size={28} /></div>
                    <div className="text-left flex-1">
                      <input type="text" value={dept.name} onClick={(e) => e.stopPropagation()} onChange={(e) => updateDept(dept.id, 'name', e.target.value)} className={`text-2xl font-black uppercase italic tracking-tighter bg-transparent border-b-2 border-transparent focus:border-blue-400 outline-none w-full max-w-md ${isExpanded ? 'text-slate-900' : 'text-slate-500'}`} />
                      <div className="flex items-center gap-4 mt-1"><span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 tracking-widest"><Globe size={12}/> {dept.country || "NL"}</span><span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 tracking-widest border-l border-slate-200 pl-4">{(dept.stations || []).length} STATIONS</span><span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 tracking-widest border-l border-slate-200 pl-4">{(dept.shifts || []).length} PLOEGEN</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0"><div className={`p-4 rounded-2xl transition-all ${isExpanded ? 'bg-blue-50 text-blue-600 rotate-0' : 'bg-white text-slate-300 border border-slate-200 shadow-sm rotate-180'}`}><ChevronUp size={24} /></div></div>
                </div>

                {isExpanded && (
                  <div className="p-8 md:p-10 border-t-2 border-slate-50 space-y-10 animate-in slide-in-from-top-4 bg-white text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2 italic"><MapPin size={12} className="text-blue-500" /> Plant Locatie</label><select value={dept.country} onChange={(e) => updateDept(dept.id, 'country', e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-blue-500 transition-all cursor-pointer"><option value="Nederland">Nederland (Hardenberg)</option><option value="Dubai">Dubai (DXB)</option></select></div>
                       <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2 italic"><Database size={12} className="text-emerald-500" /> Hub Slug</label><input type="text" value={dept.slug} onChange={(e) => updateDept(dept.id, 'slug', e.target.value.toLowerCase())} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-xs font-bold text-blue-600 outline-none focus:border-blue-500" /></div>
                    </div>

                    {/* SHIFTS CONFIGURATIE */}
                    <div className="space-y-6 pt-6 border-t border-slate-50">
                        <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3"><Clock size={14} className="text-orange-500" /> Ploegendiensten Configuration</h3><button onClick={() => addShift(dept.id)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">+ Ploeg Toevoegen</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(dept.shifts || []).map(shift => (
                                <div key={shift.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 group/shift relative">
                                    <input type="text" value={shift.label} onChange={(e) => updateShift(dept.id, shift.id, 'label', e.target.value)} className="w-full bg-transparent font-black uppercase text-[11px] text-slate-800 outline-none border-b border-transparent focus:border-blue-300" />
                                    <div className="flex items-center gap-3"><input type="time" value={shift.start} onChange={(e) => updateShift(dept.id, shift.id, 'start', e.target.value)} className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold" /><ArrowRight size={14} className="text-slate-300"/><input type="time" value={shift.end} onChange={(e) => updateShift(dept.id, shift.id, 'end', e.target.value)} className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold" /></div>
                                    <button onClick={() => removeShift(dept.id, shift.id)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* STATIONS CONFIGURATIE */}
                    <div className="space-y-6 pt-6 border-t border-slate-50">
                      <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 leading-none"><Layout size={14} className="text-blue-500" /> Stations Setup</h3><button onClick={() => addStation(dept.id)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">+ Station</button></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {(dept.stations || []).map((station) => (
                          <div key={station.id} className="relative group/station animate-in zoom-in-95 text-left"><div className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-300 group-hover/station:text-blue-500 transition-colors pointer-events-none"><Cpu size={16} /></div><input type="text" value={station.name} onChange={(e) => updateStation(dept.id, station.id, e.target.value)} className="w-full pl-12 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm" /><button onClick={() => removeStation(dept.id, station.id)} className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/station:opacity-100 transition-all"><X size={16} /></button></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FactoryStructureManager;