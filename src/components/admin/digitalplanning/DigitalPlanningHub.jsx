import React, { useState, useEffect } from "react";
import {
  FileUp,
  Factory,
  Scan,
  ClipboardList,
  CheckCircle2,
  Search,
  History,
  Layers,
  Database,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Settings,
  Activity,
  User,
  Clock,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Edit3,
  X,
  Save,
} from "lucide-react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../../../config/firebase";

/**
 * Digital Planning Hub: MES Module.
 * Nu met ondersteuning voor het bewerken en verwijderen van orders.
 */
const DigitalPlanningHub = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState("planning");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [terminalInput, setTerminalInput] = useState("");
  const [statusMsg, setStatusMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  // Laad de XLSX bibliotheek dynamisch in
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setXlsxLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!appId) return;
    const qPlanning = query(
      collection(db, "artifacts", appId, "public", "data", "digital_planning")
    );
    const unsubPlanning = onSnapshot(qPlanning, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const qTracking = query(
      collection(db, "artifacts", appId, "public", "data", "tracked_products")
    );
    const unsubTracking = onSnapshot(qTracking, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubPlanning();
      unsubTracking();
    };
  }, []);

  const generateLotNumber = (year, week, machineId, sequence) => {
    const nl = "40";
    const yy = year.toString().slice(-2);
    const ww = week.toString().padStart(2, "0");
    const mmm = machineId
      .toString()
      .replace(/\D/g, "")
      .slice(-3)
      .padStart(3, "0");
    const seq = sequence.toString().padStart(4, "0");
    return `${nl}${yy}${ww}${mmm}${nl}${seq}`;
  };

  // --- ORDER ACTIES ---
  const handleDeleteOrder = async (e, orderId) => {
    e.stopPropagation(); // Voorkom dat de order geselecteerd wordt bij klikken op verwijderen
    if (
      !window.confirm(
        "Weet je zeker dat je deze order uit de planning wilt verwijderen?"
      )
    )
      return;

    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "digital_planning",
          orderId
        )
      );
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      setStatusMsg({ type: "success", text: "Order verwijderd." });
    } catch (err) {
      setStatusMsg({ type: "error", text: "Fout bij verwijderen." });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const startEditing = () => {
    setEditForm({ ...selectedOrder });
    setIsEditing(true);
  };

  const handleUpdateOrder = async () => {
    setLoading(true);
    try {
      const orderRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "digital_planning",
        selectedOrder.id
      );
      const updatedData = {
        orderId: editForm.orderId,
        customer: editForm.customer,
        item: editForm.item,
        qty: parseInt(editForm.qty),
        machine: editForm.machine,
      };
      await updateDoc(orderRef, updatedData);
      setSelectedOrder({ ...selectedOrder, ...updatedData });
      setIsEditing(false);
      setStatusMsg({ type: "success", text: "Order succesvol bijgewerkt." });
    } catch (err) {
      setStatusMsg({ type: "error", text: "Fout bij bijwerken." });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // --- IMPORT LOGICA ---
  const processRows = async (rows, fileName) => {
    const machineMatch = fileName.match(/BH(\d+)/);
    const machineFromTitle = machineMatch ? machineMatch[1] : "000";
    const currentYear = new Date().getFullYear();
    const currentWeek = 10;

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || cols.length < 10 || !cols[1]) continue;

      const orderData = {
        orderId: String(cols[1]).trim(),
        customer: String(cols[4] || "Onbekend").trim(),
        item: String(cols[6] || "").trim(),
        qty: parseInt(cols[10]) || 0,
        machine: machineFromTitle,
        status: "GEPLAND",
        week: currentWeek,
        year: currentYear,
        importDate: serverTimestamp(),
        sourceFile: fileName,
      };

      if (orderData.orderId && orderData.qty > 0) {
        await addDoc(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "digital_planning"
          ),
          orderData
        );
        count++;
      }
    }
    return count;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");
    if (!isExcel && !isCsv) {
      setStatusMsg({ type: "error", text: "Alleen Excel of CSV bestanden." });
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let rows = [];
        if (isExcel) {
          const data = new Uint8Array(event.target.result);
          const workbook = window.XLSX.read(data, { type: "array" });
          rows = window.XLSX.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]],
            { header: 1 }
          );
        } else {
          rows = event.target.result
            .split("\n")
            .map((line) =>
              line.split(",").map((cell) => cell.replace(/"/g, ""))
            );
        }
        const count = await processRows(rows, file.name);
        setStatusMsg({ type: "success", text: `${count} orders ingelezen.` });
      } catch (err) {
        setStatusMsg({ type: "error", text: "Fout bij import." });
      } finally {
        setLoading(false);
        setTimeout(() => setStatusMsg(null), 4000);
        e.target.value = null;
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const activateOrder = async (order) => {
    if (
      !window.confirm(`Dit genereert ${order.qty} unieke lotnummers. Doorgaan?`)
    )
      return;
    setLoading(true);
    try {
      for (let i = 1; i <= order.qty; i++) {
        const lot = generateLotNumber(order.year, order.week, order.machine, i);
        const productRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tracked_products",
          lot
        );
        await setDoc(productRef, {
          lotNumber: lot,
          orderId: order.orderId,
          item: order.item,
          customer: order.customer,
          machine: order.machine,
          currentStation: "Wikkelen",
          status: "Actief",
          history: [
            {
              station: "Planning",
              time: new Date().toISOString(),
              user: "Systeem",
            },
          ],
        });
      }
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "digital_planning",
          order.id
        ),
        { status: "IN PRODUCTIE" }
      );
      setStatusMsg({
        type: "success",
        text: `Productie gestart voor ${order.orderId}`,
      });
    } catch (e) {
      setStatusMsg({ type: "error", text: "Fout bij genereren." });
    } finally {
      setLoading(false);
    }
  };

  const handleStationUpdate = async (nextStation) => {
    if (terminalInput.length < 15) return;
    setLoading(true);
    try {
      const product = products.find((p) => p.lotNumber === terminalInput);
      if (!product) throw new Error("Lotnummer niet gevonden.");
      const productRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "tracked_products",
        terminalInput
      );
      await updateDoc(productRef, {
        currentStation: nextStation,
        history: [
          ...(product.history || []),
          {
            station: nextStation,
            time: new Date().toISOString(),
            user: "Operator",
          },
        ],
      });
      setStatusMsg({
        type: "success",
        text: `Lot ${terminalInput} naar ${nextStation}`,
      });
      setTerminalInput("");
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* MODULE NAVIGATIE */}
      <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-slate-100 mx-1"></div>
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {[
              {
                id: "planning",
                label: "Planning",
                icon: <ClipboardList size={14} />,
              },
              { id: "terminal", label: "Terminal", icon: <Scan size={14} /> },
              { id: "monitor", label: "Monitor", icon: <Activity size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        {statusMsg && (
          <div
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter animate-in fade-in zoom-in ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden">
        {activeTab === "planning" && (
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* LINKER KOLOM: ORDERS */}
            <div className="col-span-4 bg-white rounded-[32px] border border-slate-200 p-6 flex flex-col overflow-hidden shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">
                  Digital Planning
                </h3>
                <label className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 group">
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={14} />
                  )}
                  Import
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </label>
              </div>

              <div className="relative mb-4">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-400 transition-all"
                  placeholder="Zoek ordernummer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {orders
                  .filter((o) =>
                    o.orderId.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsEditing(false);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative group ${
                        selectedOrder?.id === order.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-transparent bg-slate-50 hover:bg-white hover:border-slate-200"
                      }`}
                    >
                      <button
                        onClick={(e) => handleDeleteOrder(e, order.id)}
                        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex justify-between items-center mb-1 pr-6">
                        <span className="text-[10px] font-mono text-indigo-600 font-bold">
                          {order.orderId}
                        </span>
                        <span
                          className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                            order.status === "IN PRODUCTIE"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-500 uppercase"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <h4 className="font-black text-sm text-slate-800 leading-tight truncate">
                        {order.item}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">
                        {order.customer}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* RECHTER KOLOM: DETAILS / BEWERKEN */}
            <div className="col-span-8 bg-white rounded-[32px] border border-slate-200 flex flex-col overflow-hidden shadow-sm">
              {selectedOrder ? (
                <>
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                        {selectedOrder.item}
                      </h2>
                      <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 font-mono text-indigo-500">
                          <Database size={14} /> {selectedOrder.orderId}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Settings size={14} /> Mach. {selectedOrder.machine}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing &&
                        selectedOrder.status !== "IN PRODUCTIE" && (
                          <button
                            onClick={startEditing}
                            className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                          >
                            <Edit3 size={20} />
                          </button>
                        )}
                      {selectedOrder.status !== "IN PRODUCTIE" ? (
                        <button
                          onClick={() => activateOrder(selectedOrder)}
                          disabled={loading || isEditing}
                          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-30"
                        >
                          {loading ? "Starten..." : "Start Productie"}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-100">
                          <CheckCircle2 size={18} /> In Productie
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {isEditing ? (
                      <div className="max-w-md space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                              Order ID (N-nummer)
                            </label>
                            <input
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                              value={editForm.orderId}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  orderId: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                              Machine
                            </label>
                            <input
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                              value={editForm.machine}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  machine: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                              Klant
                            </label>
                            <input
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                              value={editForm.customer}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  customer: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                              Item Omschrijving
                            </label>
                            <input
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                              value={editForm.item}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  item: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                              Aantal (Quantity)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                              value={editForm.qty}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  qty: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={handleUpdateOrder}
                            disabled={loading}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            <Save size={16} /> Wijzigingen Opslaan
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Annuleren
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {products
                          .filter((p) => p.orderId === selectedOrder.orderId)
                          .map((p) => (
                            <div
                              key={p.lotNumber}
                              className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-md transition-all group"
                            >
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase mb-1">
                                  Lotnummer
                                </span>
                                <span className="font-mono text-xs font-black text-slate-800 tracking-wider">
                                  {p.lotNumber.slice(0, 2)}{" "}
                                  {p.lotNumber.slice(2, 4)}{" "}
                                  {p.lotNumber.slice(4, 6)}{" "}
                                  <span className="text-emerald-500">
                                    {p.lotNumber.slice(6, 9)}
                                  </span>{" "}
                                  {p.lotNumber.slice(9, 11)}{" "}
                                  <span className="bg-slate-200 px-1 rounded">
                                    {p.lotNumber.slice(11)}
                                  </span>
                                </span>
                              </div>
                              <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-[9px] font-black uppercase text-emerald-600 shadow-sm">
                                {p.currentStation}
                              </div>
                            </div>
                          ))}
                        {products.filter(
                          (p) => p.orderId === selectedOrder.orderId
                        ).length === 0 && (
                          <div className="col-span-2 py-20 text-center opacity-20 flex flex-col items-center gap-4">
                            <ClipboardList size={64} />
                            <p className="text-xs font-black uppercase tracking-widest">
                              Nog geen lotnummers gegenereerd
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-20">
                  <ClipboardList size={100} />
                  <p className="text-xl font-black uppercase mt-4 tracking-[0.2em]">
                    Selecteer een Order
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="bg-white w-full p-12 rounded-[50px] shadow-2xl border border-slate-200 text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-slate-900 rounded-[30px] mx-auto flex items-center justify-center text-white mb-8 shadow-xl">
                <Scan size={40} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                Product Scan
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-10">
                Production Terminal
              </p>

              <div className="space-y-8">
                <input
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-[35px] px-8 py-8 text-center font-mono text-4xl font-black tracking-[0.4em] focus:border-emerald-500 focus:bg-white outline-none transition-all placeholder:text-slate-200 shadow-inner"
                  placeholder="40XXXXXXXXX40XX"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  maxLength={15}
                  autoFocus
                />
                <button
                  disabled={terminalInput.length < 15 || loading}
                  onClick={() => handleStationUpdate("Uitharden")}
                  className="w-full bg-slate-900 text-white py-8 rounded-[35px] font-black text-xl uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-20 shadow-2xl flex items-center justify-center gap-6 group"
                >
                  Meld Gereed voor Station{" "}
                  <ArrowRight
                    size={32}
                    className="group-hover:translate-x-2 transition-transform"
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DigitalPlanningHub;
