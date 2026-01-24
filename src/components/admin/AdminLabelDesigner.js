import React, { useState, useRef, useEffect } from "react";
import {
  Save,
  Printer,
  Type,
  ScanBarcode,
  QrCode,
  Image as ImageIcon,
  Trash2,
  Settings,
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  BoxSelect,
  FileEdit,
  Plus,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  LayoutTemplate,
  RefreshCcw,
  Database,
  X,
  Loader2,
  Minus,
  Square,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  limit,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";

// CRUCIAAL: Importeer de logica en constanten uit het hulpbestand
import {
  LABEL_SIZES,
  processLabelData,
  resolveLabelContent,
} from "../../utils/labelHelpers";

const PIXELS_PER_MM = 3.78;
const SNAP_THRESHOLD_MM = 1.5;

// Basis Template is nu leeg
const DEFAULT_LABEL_ELEMENTS = [];

const AdminLabelDesigner = ({ onBack }) => {
  const [labelName, setLabelName] = useState("Nieuw Label");
  const [selectedSizeKey, setSelectedSizeKey] = useState("Standard");
  // Default startwaarden
  const [labelWidth, setLabelWidth] = useState(LABEL_SIZES.Standard.width);
  const [labelHeight, setLabelHeight] = useState(LABEL_SIZES.Standard.height);

  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [zoom, setZoom] = useState(1.2);
  const [showGrid, setShowGrid] = useState(true);
  const [guidelines, setGuidelines] = useState([]);

  const [previewData, setPreviewData] = useState(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [availableOrders, setAvailableOrders] = useState([]);

  const [isDragging, setIsDragging] = useState(false);
  const [savedLabels, setSavedLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    fetchLabels();
    loadDefaultTemplate();
  }, []);

  useEffect(() => {
    if (selectedSizeKey !== "Custom" && LABEL_SIZES[selectedSizeKey]) {
      setLabelWidth(LABEL_SIZES[selectedSizeKey].width);
      setLabelHeight(LABEL_SIZES[selectedSizeKey].height);
    }
  }, [selectedSizeKey]);

  const fetchLiveOrders = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "digital_planning"
        ),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAvailableOrders(orders);
      setShowDataModal(true);
    } catch (e) {
      console.error("Fout bij ophalen orders:", e);
      alert("Kon geen data ophalen.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectOrderForPreview = (order) => {
    const formattedData = processLabelData(order);
    setPreviewData(formattedData);
    setShowDataModal(false);
  };

  const loadDefaultTemplate = () => {
    setElements(DEFAULT_LABEL_ELEMENTS);
    setLabelWidth(LABEL_SIZES.Standard.width);
    setLabelHeight(LABEL_SIZES.Standard.height);
    setSelectedSizeKey("Standard");
    setLabelName("Nieuw Leeg Label");
  };

  const fetchLabels = async () => {
    try {
      const snap = await getDocs(
        collection(db, "artifacts", appId, "public", "data", "label_templates")
      );
      setSavedLabels(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const addElement = (type) => {
    const newElement = {
      id: Date.now().toString(),
      type,
      x: 5,
      y: 5,
      width:
        type === "text" ? 40 : type === "line" ? 30 : type === "box" ? 30 : 20,
      height:
        type === "text" ? 10 : type === "line" ? 0.5 : type === "box" ? 20 : 20,
      thickness: type === "box" ? 0.5 : undefined,
      content:
        type === "text" ? "Nieuwe Tekst" : type === "barcode" ? "123456" : "QR",
      fontSize: 10,
      align: "left",
      fontFamily: "Arial",
      isBold: false,
      rotation: 0,
      variable: "",
    };
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const duplicateElement = () => {
    if (!selectedElementId) return;
    const el = elements.find((e) => e.id === selectedElementId);
    if (!el) return;
    setElements([
      ...elements,
      { ...el, id: Date.now().toString(), x: el.x + 2, y: el.y + 2 },
    ]);
  };

  const updateElement = (id, updates) => {
    setElements(
      elements.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  const removeElement = (id) => {
    setElements(elements.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // LOGICA VOOR LAAG VOLGORDE
  const changeLayer = (action) => {
    if (!selectedElementId) return;
    const idx = elements.findIndex((el) => el.id === selectedElementId);
    if (idx === -1) return;

    const newElements = [...elements];
    const el = newElements[idx];

    // Verwijder het element eerst uit de array
    newElements.splice(idx, 1);

    if (action === "front") {
      // Voeg toe aan het einde (bovenop)
      newElements.push(el);
    } else if (action === "back") {
      // Voeg toe aan het begin (achteraan)
      newElements.unshift(el);
    } else if (action === "forward") {
      // Eén stapje naar voren (hogere index)
      const newIndex = Math.min(newElements.length, idx + 1);
      newElements.splice(newIndex, 0, el);
    } else if (action === "backward") {
      // Eén stapje naar achteren (lagere index)
      const newIndex = Math.max(0, idx - 1);
      newElements.splice(newIndex, 0, el);
    }

    setElements(newElements);
  };

  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedElementId(id);
    setIsDragging(true);
    const element = elements.find((el) => el.id === id);
    const otherElements = elements.filter((el) => el.id !== id);
    const labelCenterX = labelWidth / 2;
    const labelCenterY = labelHeight / 2;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom / PIXELS_PER_MM;
      const deltaY = (moveEvent.clientY - startY) / zoom / PIXELS_PER_MM;
      let newX = Math.max(0, element.x + deltaX);
      let newY = Math.max(0, element.y + deltaY);

      const activeGuidelines = [];
      const myWidth = element.width || 0;
      const myHeight = element.height || 0;
      const myCenterX = newX + myWidth / 2;
      const myCenterY = newY + myHeight / 2;

      if (Math.abs(myCenterX - labelCenterX) < SNAP_THRESHOLD_MM) {
        newX = labelCenterX - myWidth / 2;
        activeGuidelines.push({ type: "vertical", pos: labelCenterX });
      }
      if (Math.abs(myCenterY - labelCenterY) < SNAP_THRESHOLD_MM) {
        newY = labelCenterY - myHeight / 2;
        activeGuidelines.push({ type: "horizontal", pos: labelCenterY });
      }

      otherElements.forEach((other) => {
        const otherCenterX = other.x + (other.width || 0) / 2;
        const otherCenterY = other.y + (other.height || 0) / 2;
        if (Math.abs(myCenterX - otherCenterX) < SNAP_THRESHOLD_MM) {
          newX = otherCenterX - myWidth / 2;
          if (!activeGuidelines.some((g) => g.type === "vertical"))
            activeGuidelines.push({ type: "vertical", pos: otherCenterX });
        }
        if (Math.abs(myCenterY - otherCenterY) < SNAP_THRESHOLD_MM) {
          newY = otherCenterY - myHeight / 2;
          if (!activeGuidelines.some((g) => g.type === "horizontal"))
            activeGuidelines.push({ type: "horizontal", pos: otherCenterY });
        }
      });

      setGuidelines(activeGuidelines);
      updateElement(id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setGuidelines([]);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const saveLabel = async () => {
    if (!labelName.trim()) return alert("Geef naam.");
    setIsLoading(true);
    try {
      const labelId = labelName.replace(/\s+/g, "_").toLowerCase();
      const cleanElements = elements.map((el) => {
        const cleanEl = {
          ...el,
          x: Number(el.x.toFixed(2)),
          y: Number(el.y.toFixed(2)),
        };
        Object.keys(cleanEl).forEach(
          (key) => cleanEl[key] === undefined && delete cleanEl[key]
        );
        return cleanEl;
      });
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "label_templates",
          labelId
        ),
        {
          name: labelName,
          sizeKey: selectedSizeKey,
          width: labelWidth,
          height: labelHeight,
          elements: cleanElements,
          updatedAt: new Date().toISOString(),
        }
      );
      alert("Opgeslagen!");
      fetchLabels();
    } catch (e) {
      console.error(e);
      alert("Fout.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLabel = (label) => {
    setLabelName(label.name);
    setLabelWidth(label.width);
    setLabelHeight(label.height);
    const isPreset = Object.values(LABEL_SIZES).some(
      (s) => s.width === label.width && s.height === label.height
    );
    setSelectedSizeKey(isPreset && label.sizeKey ? label.sizeKey : "Custom");
    setElements(label.elements || []);
    setSelectedElementId(null);
  };

  const duplicateTemplate = (e, template) => {
    e.stopPropagation();

    if (
      elements.length > 0 &&
      !window.confirm("Huidige wijzigingen gaan verloren. Doorgaan?")
    ) {
      return;
    }

    setLabelName(`${template.name} (Kopie)`);
    setLabelWidth(template.width);
    setLabelHeight(template.height);

    const isPreset = Object.values(LABEL_SIZES).some(
      (s) => s.width === template.width && s.height === template.height
    );
    setSelectedSizeKey(
      isPreset && template.sizeKey ? template.sizeKey : "Custom"
    );

    setElements(JSON.parse(JSON.stringify(template.elements || [])));
    setSelectedElementId(null);
  };

  const deleteLabel = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Verwijderen?")) return;
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "label_templates", id)
    );
    fetchLabels();
  };

  const alignCenter = (axis) => {
    if (!selectedElementId) return;
    const el = elements.find((e) => e.id === selectedElementId);
    if (axis === "x")
      updateElement(el.id, {
        x: Math.max(0, (labelWidth - (el.width || 0)) / 2),
      });
    else if (axis === "y")
      updateElement(el.id, {
        y: Math.max(0, (labelHeight - (el.height || 0)) / 2),
      });
  };

  const rotateElement = (direction) => {
    const el = elements.find((e) => e.id === selectedElementId);
    if (!el) return;
    let newRot =
      direction === "cw" ? (el.rotation || 0) + 90 : (el.rotation || 0) - 90;
    if (newRot >= 360) newRot = 0;
    if (newRot < 0) newRot = 270;
    updateElement(el.id, { rotation: newRot });
  };

  const generateZPL = () => {
    let zpl = "^XA\n";
    zpl += `^PW${Math.round(labelWidth * 8)}\n`;
    zpl += `^LL${Math.round(labelHeight * 8)}\n`;
    elements.forEach((el) => {
      const x = Math.round(el.x * 8);
      const y = Math.round(el.y * 8);
      let data = resolveLabelContent(el.content, previewData);
      const zplData = `^FD${data}^FS`;
      let rot = "N";
      if (el.rotation === 90) rot = "R";
      if (el.rotation === 180) rot = "I";
      if (el.rotation === 270) rot = "B";

      if (el.type === "text")
        zpl += `^FO${x},${y}^A0${rot},${Math.round(
          el.fontSize * 4
        )},${Math.round(el.fontSize * 4)}${zplData}\n`;
      else if (el.type === "barcode")
        zpl += `^FO${x},${y}^BC${rot},${Math.round(
          el.height * 8
        )},Y,N,N${zplData}\n`;
      else if (el.type === "qr")
        zpl += `^FO${x},${y}^BQN,2,6^FDQA,${data}^FS\n`;
      else if (el.type === "line" || el.type === "box") {
        const w = Math.round(el.width * 8);
        const h = Math.round(el.height * 8);
        const t = Math.round((el.thickness || el.height) * 8);
        zpl += `^FO${x},${y}^GB${w},${h},${
          el.type === "box" ? Math.round((el.thickness || 1) * 8) : t
        }^FS\n`;
      }
    });
    zpl += "^XZ";
    console.log(zpl);
    alert("ZPL in Console");
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-20 shrink-0 h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-700 font-bold text-sm flex items-center gap-1"
          >
            ← Terug
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <BoxSelect className="text-blue-600" />
            <h1 className="font-black text-slate-800 text-lg hidden md:block">
              Label Designer
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLiveOrders}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide border transition-all ${
              previewData
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Database size={14} />
            )}
            {previewData ? "Live Data Actief" : "Laad Live Data"}
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <button
            onClick={() => {
              if (window.confirm("Ontwerp resetten?")) loadDefaultTemplate();
            }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
            title="Reset"
          >
            <RefreshCcw size={18} />
          </button>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <LayoutTemplate size={16} className="text-slate-400 ml-2" />
            <select
              value={selectedSizeKey}
              onChange={(e) => setSelectedSizeKey(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none px-2 py-1 cursor-pointer"
            >
              {Object.keys(LABEL_SIZES).map((s) => (
                <option key={s} value={s}>
                  {LABEL_SIZES[s].name}
                </option>
              ))}
              <option value="Custom">Aangepast...</option>
            </select>
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <input
                type="number"
                value={labelWidth}
                onChange={(e) => {
                  setLabelWidth(Number(e.target.value));
                  if (selectedSizeKey !== "Custom")
                    setSelectedSizeKey("Custom");
                }}
                className="w-14 bg-white border border-slate-200 rounded px-1 text-xs text-center py-1 focus:border-blue-500 outline-none"
              />
              <span className="text-slate-400 text-xs">x</span>
              <input
                type="number"
                value={labelHeight}
                onChange={(e) => {
                  setLabelHeight(Number(e.target.value));
                  if (selectedSizeKey !== "Custom")
                    setSelectedSizeKey("Custom");
                }}
                className="w-14 bg-white border border-slate-200 rounded px-1 text-xs text-center py-1 focus:border-blue-500 outline-none"
              />
              <span className="text-slate-400 text-xs">mm</span>
            </div>
          </div>
          <input
            type="text"
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold w-40 focus:border-blue-500 outline-none"
            placeholder="Label Naam"
          />
          <button
            onClick={saveLabel}
            disabled={isLoading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            {isLoading ? (
              <span className="animate-spin">⌛</span>
            ) : (
              <Save size={16} />
            )}
            <span className="hidden md:inline">Opslaan</span>
          </button>
          <button
            onClick={generateZPL}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm ml-2"
          >
            <Printer size={16} />
            <span className="hidden md:inline">Print</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tools */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-3 flex items-center gap-2">
              <Plus size={14} /> Elementen
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addElement("text")}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl border border-slate-200 transition-all group"
              >
                <Type
                  size={20}
                  className="mb-1 text-slate-500 group-hover:text-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">
                  Tekst
                </span>
              </button>
              <button
                onClick={() => addElement("line")}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl border border-slate-200 transition-all group"
              >
                <Minus
                  size={20}
                  className="mb-1 text-slate-500 group-hover:text-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">
                  Lijn
                </span>
              </button>
              <button
                onClick={() => addElement("box")}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl border border-slate-200 transition-all group"
              >
                <Square
                  size={20}
                  className="mb-1 text-slate-500 group-hover:text-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">
                  Kader
                </span>
              </button>
              <button
                onClick={() => addElement("barcode")}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl border border-slate-200 transition-all group"
              >
                <ScanBarcode
                  size={20}
                  className="mb-1 text-slate-500 group-hover:text-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">
                  Barcode
                </span>
              </button>
              <button
                onClick={() => addElement("qr")}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl border border-slate-200 transition-all group"
              >
                <QrCode
                  size={20}
                  className="mb-1 text-slate-500 group-hover:text-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">
                  QR Code
                </span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-3 flex items-center gap-2">
              <FileEdit size={14} /> Bibliotheek
            </h3>
            <div className="space-y-2">
              {savedLabels.map((l) => (
                <div
                  key={l.id}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Wijzigingen worden niet opgeslagen. Label laden?"
                      )
                    )
                      loadLabel(l);
                  }}
                  className="group p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer border border-slate-200 hover:border-blue-300 transition-all relative shadow-sm"
                >
                  <p className="font-bold text-sm text-slate-700 group-hover:text-blue-700 truncate pr-16">
                    {l.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {l.width}x{l.height}mm
                  </p>

                  {/* ACTIE KNOPPEN: DUPLICEREN & VERWIJDEREN */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => duplicateTemplate(e, l)}
                      className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded"
                      title="Dupliceren"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => deleteLabel(l.id, e)}
                      className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Verwijderen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-200 relative overflow-hidden flex flex-col">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-sm border border-slate-200 flex items-center gap-4 z-10">
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-bold text-slate-600 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-slate-200"></div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1 rounded ${
                showGrid
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-slate-100 text-slate-400"
              }`}
            >
              <Grid size={16} />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center overflow-auto p-12 cursor-pointer"
            onClick={() => setSelectedElementId(null)}
          >
            <div
              ref={canvasRef}
              className="bg-white shadow-2xl relative transition-all duration-75 ease-linear cursor-default border border-slate-300 overflow-hidden"
              style={{
                width: `${labelWidth * PIXELS_PER_MM * zoom}px`,
                height: `${labelHeight * PIXELS_PER_MM * zoom}px`,
                backgroundImage: showGrid
                  ? "radial-gradient(#cbd5e1 1px, transparent 1px)"
                  : "none",
                backgroundSize: `${10 * zoom}px ${10 * zoom}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* GUIDELINES */}
              {guidelines.map((g, i) => (
                <div
                  key={i}
                  className="absolute bg-cyan-400 z-30 pointer-events-none"
                  style={{
                    left:
                      g.type === "vertical"
                        ? `${g.pos * PIXELS_PER_MM * zoom}px`
                        : 0,
                    top:
                      g.type === "horizontal"
                        ? `${g.pos * PIXELS_PER_MM * zoom}px`
                        : 0,
                    width: g.type === "vertical" ? "1px" : "100%",
                    height: g.type === "horizontal" ? "1px" : "100%",
                  }}
                />
              ))}

              {elements.map((el) => (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  // FIX: Verwijder de z-10 / z-20 logica. DOM volgorde is nu leidend.
                  className="absolute cursor-move group select-none"
                  style={{
                    left: `${el.x * PIXELS_PER_MM * zoom}px`,
                    top: `${el.y * PIXELS_PER_MM * zoom}px`,
                    transform: `rotate(${el.rotation || 0}deg)`,
                    transformOrigin: "top left",
                  }}
                >
                  <div
                    className={`${
                      selectedElementId === el.id
                        ? "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/20"
                        : "hover:ring-1 hover:ring-blue-300"
                    } transition-all duration-100 p-0.5`}
                  >
                    {el.type === "text" && (
                      <div
                        className="leading-none break-words"
                        style={{
                          fontSize: `${el.fontSize * zoom}px`,
                          fontWeight: el.isBold ? "bold" : "normal",
                          fontFamily: el.fontFamily,
                          width: `${el.width * PIXELS_PER_MM * zoom}px`,
                          height: el.height
                            ? `${el.height * PIXELS_PER_MM * zoom}px`
                            : "auto",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflow: "hidden",
                          textAlign: el.align || "left",
                        }}
                      >
                        {resolveLabelContent(el.content, previewData)}
                      </div>
                    )}
                    {el.type === "line" && (
                      <div
                        style={{
                          width: `${el.width * PIXELS_PER_MM * zoom}px`,
                          height: `${el.height * PIXELS_PER_MM * zoom}px`,
                          backgroundColor: "black",
                        }}
                      />
                    )}
                    {el.type === "box" && (
                      <div
                        style={{
                          width: `${el.width * PIXELS_PER_MM * zoom}px`,
                          height: `${el.height * PIXELS_PER_MM * zoom}px`,
                          border: `${
                            (el.thickness || 1) * PIXELS_PER_MM * zoom
                          }px solid black`,
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                    {(el.type === "barcode" || el.type === "qr") && (
                      <div
                        className="bg-slate-50 border border-slate-300 flex items-center justify-center overflow-hidden"
                        style={{
                          width: `${(el.width || 30) * PIXELS_PER_MM * zoom}px`,
                          height: `${
                            (el.height || 30) * PIXELS_PER_MM * zoom
                          }px`,
                        }}
                      >
                        {el.type === "barcode" && (
                          <ScanBarcode
                            size={24 * zoom}
                            className="text-slate-400"
                          />
                        )}
                        {el.type === "qr" && (
                          <QrCode size={24 * zoom} className="text-slate-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {selectedElementId === el.id && (
                    <div className="absolute -top-8 left-0 bg-blue-600 text-white text-[9px] px-2 py-1 rounded shadow-md whitespace-nowrap font-mono pointer-events-none">
                      x:{Math.round(el.x)} y:{Math.round(el.y)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-10 shrink-0 shadow-[-2px_0_10px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-2">
              <Settings size={14} /> Eigenschappen
            </h3>
          </div>

          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {!selectedElement ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center">
                <BoxSelect size={48} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  Selecteer een element
                  <br />
                  om te bewerken
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Inhoud
                  </label>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Tekst / Data
                    </label>
                    <input
                      type="text"
                      value={selectedElement.content}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          content: e.target.value,
                        })
                      }
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Dynamische Variabele
                    </label>
                    <select
                      value={selectedElement.variable}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          variable: e.target.value,
                          content: `{${e.target.value}}`,
                        })
                      }
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:border-blue-500 outline-none"
                    >
                      <option value="">Geen</option>
                      <option value="lotNumber">Lotnummer</option>
                      <option value="orderId">Ordernummer</option>
                      <option value="itemCode">Artikelcode</option>
                      <option value="productType">Product Type</option>
                      <option value="idLine">ID Regel</option>
                      <option value="radiusText">Radius (R1.0D)</option>
                      <option value="pressureLine">Drukklasse</option>
                      <option value="connectionLine">Mof Type</option>
                      <option value="date">Datum</option>
                    </select>
                  </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Positie & Rotatie
                  </label>

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => alignCenter("x")}
                      className="flex-1 py-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1"
                      title="Centreer Horizontaal"
                    >
                      <AlignHorizontalJustifyCenter size={16} />{" "}
                      <span className="text-[10px] font-bold">Center X</span>
                    </button>
                    <button
                      onClick={() => alignCenter("y")}
                      className="flex-1 py-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1"
                      title="Centreer Verticaal"
                    >
                      <AlignVerticalJustifyCenter size={16} />{" "}
                      <span className="text-[10px] font-bold">Center Y</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        X (mm)
                      </label>
                      <input
                        type="number"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            x: Number(e.target.value),
                          })
                        }
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Y (mm)
                      </label>
                      <input
                        type="number"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            y: Number(e.target.value),
                          })
                        }
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                    <span className="text-xs font-bold text-slate-600">
                      Rotatie: {selectedElement.rotation || 0}°
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => rotateElement("ccw")}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                        title="-90°"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => rotateElement("cw")}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                        title="+90°"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                    <span className="text-xs font-bold text-slate-600">
                      Laag:
                    </span>
                    <div className="flex gap-1">
                      <button
                        title="Helemaal naar achteren"
                        onClick={() => changeLayer("back")}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                      >
                        <SendToBack size={14} />
                      </button>
                      <button
                        title="Stapje naar achteren"
                        onClick={() => changeLayer("backward")}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        title="Stapje naar voren"
                        onClick={() => changeLayer("forward")}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        title="Helemaal naar voren"
                        onClick={() => changeLayer("front")}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                      >
                        <BringToFront size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Afmetingen
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Breedte (mm)
                      </label>
                      <input
                        type="number"
                        value={Math.round(selectedElement.width)}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            width: Number(e.target.value),
                          })
                        }
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Hoogte (mm)
                      </label>
                      <input
                        type="number"
                        value={Math.round(selectedElement.height || 0)}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            height: Number(e.target.value),
                          })
                        }
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                      />
                    </div>
                  </div>

                  {selectedElement.type === "box" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Randdikte (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedElement.thickness || 1}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            thickness: Number(e.target.value),
                          })
                        }
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                {selectedElement.type === "text" && (
                  <div className="space-y-3 mt-3">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Opmaak
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Grootte (pt)
                        </label>
                        <input
                          type="number"
                          value={selectedElement.fontSize}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              fontSize: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedElement.isBold}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                isBold: e.target.checked,
                              })
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Dikgedrukt
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Uitlijning
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateElement(selectedElement.id, { align: "left" })
                          }
                          className={`p-2 rounded border flex-1 flex justify-center ${
                            selectedElement.align === "left" ||
                            !selectedElement.align
                              ? "bg-blue-100 text-blue-600 border-blue-200"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
                          <AlignLeft size={16} />
                        </button>
                        <button
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              align: "center",
                            })
                          }
                          className={`p-2 rounded border flex-1 flex justify-center ${
                            selectedElement.align === "center"
                              ? "bg-blue-100 text-blue-600 border-blue-200"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
                          <AlignCenter size={16} />
                        </button>
                        <button
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              align: "right",
                            })
                          }
                          className={`p-2 rounded border flex-1 flex justify-center ${
                            selectedElement.align === "right"
                              ? "bg-blue-100 text-blue-600 border-blue-200"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
                          <AlignRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 space-y-2">
                  <button
                    onClick={duplicateElement}
                    className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-200 border border-transparent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Copy size={16} /> Dupliceer Element
                  </button>
                  <button
                    onClick={() => removeElement(selectedElement.id)}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 border border-transparent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 size={16} /> Verwijder Element
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDataModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 uppercase italic">
                Selecteer Live Order
              </h3>
              <button
                onClick={() => setShowDataModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              {availableOrders.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">
                  Geen recente orders gevonden in planning.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => selectOrderForPreview(order)}
                      className="p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all flex justify-between items-center group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black bg-slate-800 text-white px-2 py-0.5 rounded">
                            {order.orderId}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {order.lotNumber}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                          {order.item || order.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 block">
                          Status
                        </span>
                        <span className="text-xs font-bold text-emerald-600 uppercase">
                          {order.status || "Gepland"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLabelDesigner;
