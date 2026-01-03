import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import {
  Search,
  Loader2,
  Ruler,
  Table,
  Settings2,
  Database,
} from "lucide-react";

const AdminReferenceTable = () => {
  const [activeTab, setActiveTab] = useState("standard_specs");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // De paden naar jouw gevulde database mappen
  const collectionPaths = {
    standard_specs: `artifacts/${appId}/public/data/standard_fitting_specs`,
    bore_dims: `artifacts/${appId}/public/data/bore_dimensions`,
    mof_data: `artifacts/${appId}/public/data/standard_fitting_specs`, // Pas aan indien mof-specifieke map anders is
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, collectionPaths[activeTab]));
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sortering op diameter (indien aanwezig)
        docs.sort(
          (a, b) => Number(a.diameter || a.dn) - Number(b.diameter || b.dn)
        );
        setData(docs);
      } catch (err) {
        console.error("Fout bij laden referentiedata:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  // Filter functie voor de zoekbalk
  const filtered = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const thStyle =
    "px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50";
  const tdStyle =
    "px-6 py-4 text-xs font-bold text-slate-700 border-b border-slate-50";

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* TAB NAVIGATIE */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
        {[
          {
            id: "standard_specs",
            label: "Fitting Specs (CB/TB)",
            icon: <Ruler size={14} />,
          },
          {
            id: "bore_dims",
            label: "Bore Dimensions",
            icon: <Table size={14} />,
          },
          {
            id: "mof_data",
            label: "Standard Mof Data",
            icon: <Settings2 size={14} />,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase border-b-4 transition-all ${
              activeTab === t.id
                ? "border-blue-600 text-blue-600 bg-blue-50/30"
                : "border-transparent text-slate-400 bg-white hover:text-slate-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ZOEKBALK */}
      <div className="relative">
        <Search className="absolute left-4 top-4 text-slate-300" size={20} />
        <input
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-sm text-sm font-bold outline-none focus:border-blue-600 shadow-sm uppercase placeholder:text-slate-300"
          placeholder="Filter op maat, druk of type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* DATA TABEL */}
      <div className="bg-white border border-slate-200 shadow-xl overflow-x-auto min-h-[400px] relative">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center bg-white/80 absolute inset-0 z-10">
            <Loader2 className="animate-spin text-blue-600 mb-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Database Syncing...
            </span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {activeTab === "standard_specs" && (
                  <>
                    {["Type", "Mof", "PN", "DN", "Specs", "Drawing"].map(
                      (h) => (
                        <th key={h} className={thStyle}>
                          {h}
                        </th>
                      )
                    )}
                  </>
                )}
                {activeTab === "bore_dims" && (
                  <>
                    {["DN (ID)", "PN", "PCD", "Holes", "Bolt Size"].map((h) => (
                      <th key={h} className={thStyle}>
                        {h}
                      </th>
                    ))}
                  </>
                )}
                {activeTab === "mof_data" && (
                  <>
                    {["Mof Type", "DN", "Insertion (L)", "Bell OD", "Code"].map(
                      (h) => (
                        <th key={h} className={thStyle}>
                          {h}
                        </th>
                      )
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50/20 transition-colors"
                >
                  {activeTab === "standard_specs" && (
                    <>
                      <td className={tdStyle + " text-blue-600"}>
                        {item.type}
                      </td>
                      <td className={tdStyle}>
                        <span className="px-2 py-0.5 bg-slate-800 text-white text-[9px] font-black">
                          {item.mofType}
                        </span>
                      </td>
                      <td className={tdStyle}>PN {item.pressure}</td>
                      <td className={tdStyle}>{item.diameter} mm</td>
                      <td className={tdStyle + " text-slate-400"}>
                        {item.angle ? `${item.angle}° / ${item.radius}` : "-"}
                      </td>
                      <td
                        className={
                          tdStyle + " font-mono text-[11px] text-blue-500"
                        }
                      >
                        {item.drawingNr}
                      </td>
                    </>
                  )}
                  {activeTab === "bore_dims" && (
                    <>
                      <td className={tdStyle}>DN {item.dn}</td>
                      <td className={tdStyle}>PN {item.pn}</td>
                      <td className={tdStyle + " text-blue-600"}>
                        {item.pcd} mm
                      </td>
                      <td className={tdStyle}>{item.holes}</td>
                      <td className={tdStyle}>
                        {item.thread || item.boltSize}
                      </td>
                    </>
                  )}
                  {activeTab === "mof_data" && (
                    <>
                      <td className={tdStyle}>{item.mofType}</td>
                      <td className={tdStyle}>{item.diameter || item.dn}</td>
                      <td className={tdStyle}>
                        {item.insertionDepth || item.l_maat} mm
                      </td>
                      <td className={tdStyle}>
                        {item.bellOD || item.d_maat} mm
                      </td>
                      <td
                        className={
                          tdStyle + " text-[10px] font-mono text-slate-300"
                        }
                      >
                        {item.id || item.productCode}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
            <Database className="text-slate-100 mb-2" size={48} />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
              Geen data gevonden in deze map
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReferenceTable;
