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
} from "lucide-react";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";
// FIX: Import zonder extensie
import { db, appId } from "../../config/firebase";

// CONSISTENTE NAAMGEVING: LABEL_SIZES
const LABEL_SIZES = {
  Standard: { width: 100, height: 50 },
  Large: { width: 100, height: 150 },
  Small: { width: 50, height: 25 },
  Custom: { width: 100, height: 100 },
};

const PIXELS_PER_MM = 3.78;

const AdminLabelDesigner = ({ onBack }) => {
  // Label State
  const [labelName, setLabelName] = useState("Nieuw Label");
  const [selectedSizeKey, setSelectedSizeKey] = useState("Standard");
  const [labelWidth, setLabelWidth] = useState(100);
  const [labelHeight, setLabelHeight] = useState(50);

  // Canvas State
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);

  // Database State
  const [savedLabels, setSavedLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef(null);

  // Laad labels bij start
  useEffect(() => {
    fetchLabels();
  }, []);

  // Update afmetingen als preset wijzigt (behalve bij Custom)
  useEffect(() => {
    if (selectedSizeKey !== "Custom") {
      setLabelWidth(LABEL_SIZES[selectedSizeKey].width);
      setLabelHeight(LABEL_SIZES[selectedSizeKey].height);
    }
  }, [selectedSizeKey]);

  const fetchLabels = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, "artifacts", appId, "public", "data", "label_templates")
      );
      const labels = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavedLabels(labels);
    } catch (e) {
      console.error("Fout bij laden labels:", e);
    }
  };

  const addElement = (type) => {
    const newElement = {
      id: Date.now().toString(),
      type,
      x: 10,
      y: 10,
      width: type === "text" ? null : 30,
      height: type === "text" ? null : 30,
      content: type === "text" ? "Tekst" : type === "barcode" ? "123456" : "QR",
      fontSize: 12,
      fontFamily: "Arial",
      isBold: false,
      rotation: 0,
      variable: "",
    };
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
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

  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedElementId(id);
    setIsDragging(true);

    const element = elements.find((el) => el.id === id);
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom / PIXELS_PER_MM;
      const deltaY = (moveEvent.clientY - startY) / zoom / PIXELS_PER_MM;

      updateElement(id, {
        x: Math.round(Math.max(0, element.x + deltaX)),
        y: Math.round(Math.max(0, element.y + deltaY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const saveLabel = async () => {
    if (!labelName.trim()) return alert("Geef het label een naam.");
    setIsLoading(true);
    try {
      const labelId = labelName.replace(/\s+/g, "_").toLowerCase();
      const labelData = {
        name: labelName,
        sizeKey: selectedSizeKey,
        width: labelWidth,
        height: labelHeight,
        elements: elements,
        updatedAt: new Date().toISOString(),
      };

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
        labelData
      );
      alert("Label succesvol opgeslagen!");
      fetchLabels();
    } catch (e) {
      console.error("Fout bij opslaan:", e);
      alert("Opslaan mislukt.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLabel = (label) => {
    if (
      elements.length > 0 &&
      !window.confirm("Huidige wijzigingen gaan verloren. Doorgaan?")
    )
      return;
    setLabelName(label.name);
    setLabelWidth(label.width);
    setLabelHeight(label.height);
    // Check of de geladen maat een preset is, anders Custom
    const isPreset = Object.values(LABEL_SIZES).some(
      (s) => s.width === label.width && s.height === label.height
    );
    setSelectedSizeKey(isPreset && label.sizeKey ? label.sizeKey : "Custom");

    setElements(label.elements || []);
    setSelectedElementId(null);
  };

  const deleteLabel = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Weet je zeker dat je dit label wilt verwijderen?"))
      return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "label_templates", id)
      );
      fetchLabels();
    } catch (e) {
      console.error(e);
      alert("Verwijderen mislukt.");
    }
  };

  // Uitlijning functies
  const alignCenter = (axis) => {
    if (!selectedElementId) return;
    const el = elements.find((e) => e.id === selectedElementId);

    let elWidth = el.width;
    let elHeight = el.height;

    if (el.type === "text") {
      // Ruwe schatting
      elWidth = el.content.length * el.fontSize * 0.3527 * 0.6;
      elHeight = el.fontSize * 0.3527;
    }

    if (axis === "x") {
      const newX = (labelWidth - elWidth) / 2;
      updateElement(el.id, { x: Math.max(0, Math.round(newX)) });
    } else if (axis === "y") {
      const newY = (labelHeight - elHeight) / 2;
      updateElement(el.id, { y: Math.max(0, Math.round(newY)) });
    }
  };

  const rotateElement = (direction) => {
    const el = elements.find((e) => e.id === selectedElementId);
    if (!el) return;
    const currentRot = el.rotation || 0;
    let newRot = direction === "cw" ? currentRot + 90 : currentRot - 90;
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
      const data = el.variable ? `^FN1` : `^FD${el.content}^FS`;

      let rot = "N";
      if (el.rotation === 90) rot = "R";
      if (el.rotation === 180) rot = "I";
      if (el.rotation === 270) rot = "B";

      if (el.type === "text") {
        zpl += `^FO${x},${y}^A0${rot},${Math.round(
          el.fontSize * 3
        )},${Math.round(el.fontSize * 3)}${data}\n`;
      } else if (el.type === "barcode") {
        zpl += `^FO${x},${y}^BC${rot},${Math.round(
          el.height * 8
        )},Y,N,N${data}\n`;
      } else if (el.type === "qr") {
        zpl += `^FO${x},${y}^BQ${rot},2,${Math.round(
          (el.width || 20) / 5
        )}${data}\n`;
      }
    });

    zpl += "^XZ";
    console.log(zpl);
    alert("ZPL gegenereerd in console (F12)!");
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-full w-full bg-slate-100">
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
          {/* Formaat Selectie */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <LayoutTemplate size={16} className="text-slate-400 ml-2" />
            <select
              value={selectedSizeKey}
              onChange={(e) => setSelectedSizeKey(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none px-2 py-1 cursor-pointer"
            >
              {Object.keys(LABEL_SIZES).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="Custom">Aangepast...</option>
            </select>

            {/* Custom inputs */}
            <div
              className={`flex items-center gap-1 border-l border-slate-200 pl-2 transition-all duration-300 ${
                selectedSizeKey === "Custom"
                  ? "opacity-100 w-auto"
                  : "opacity-50 w-auto"
              }`}
            >
              <input
                type="number"
                value={labelWidth}
                onChange={(e) => {
                  setLabelWidth(Number(e.target.value));
                  setSelectedSizeKey("Custom");
                }}
                className="w-14 bg-white border border-slate-200 rounded px-1 text-xs text-center py-1 focus:border-blue-500 outline-none"
                title="Breedte (mm)"
              />
              <span className="text-slate-400 text-xs">x</span>
              <input
                type="number"
                value={labelHeight}
                onChange={(e) => {
                  setLabelHeight(Number(e.target.value));
                  setSelectedSizeKey("Custom");
                }}
                className="w-14 bg-white border border-slate-200 rounded px-1 text-xs text-center py-1 focus:border-blue-500 outline-none"
                title="Hoogte (mm)"
              />
              <span className="text-slate-400 text-xs">mm</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <input
            type="text"
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold w-48 focus:border-blue-500 outline-none"
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
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tools (Links) */}
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
              <button
                onClick={() => addElement("image")}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl border border-slate-200 transition-all group"
              >
                <ImageIcon
                  size={20}
                  className="mb-1 text-slate-500 group-hover:text-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">
                  Afb.
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
                  onClick={() => loadLabel(l)}
                  className="group p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer border border-slate-200 hover:border-blue-300 transition-all relative shadow-sm"
                >
                  <p className="font-bold text-sm text-slate-700 group-hover:text-blue-700 truncate">
                    {l.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {l.width}x{l.height}mm
                  </p>
                  <button
                    onClick={(e) => deleteLabel(l.id, e)}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Verwijderen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {savedLabels.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Nog geen labels opgeslagen.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Area (Midden) */}
        <div className="flex-1 bg-slate-200 relative overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-sm border border-slate-200 flex items-center gap-4 z-10">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
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

          {/* Canvas Container: Flex zorgt voor centrering */}
          <div
            className="flex-1 flex items-center justify-center overflow-auto p-12 cursor-pointer"
            onClick={() => setSelectedElementId(null)}
          >
            <div
              ref={canvasRef}
              className="bg-white shadow-2xl relative transition-all duration-200 cursor-default"
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
              {elements.map((el) => (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  className={`absolute cursor-move group select-none ${
                    selectedElementId === el.id ? "z-20" : "z-10"
                  }`}
                  style={{
                    left: `${el.x * PIXELS_PER_MM * zoom}px`,
                    top: `${el.y * PIXELS_PER_MM * zoom}px`,
                    transform: `rotate(${el.rotation || 0}deg)`,
                    transformOrigin: "top left",
                  }}
                >
                  <div
                    className={`
                                ${
                                  selectedElementId === el.id
                                    ? "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/20"
                                    : "hover:ring-1 hover:ring-blue-300"
                                } 
                                transition-all duration-100 p-0.5
                            `}
                  >
                    {el.type === "text" && (
                      <div
                        className="whitespace-nowrap px-1 leading-none"
                        style={{
                          fontSize: `${el.fontSize * zoom}px`,
                          fontWeight: el.isBold ? "bold" : "normal",
                          fontFamily: el.fontFamily,
                        }}
                      >
                        {el.content}
                      </div>
                    )}
                    {(el.type === "barcode" ||
                      el.type === "qr" ||
                      el.type === "image") && (
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
                        {el.type === "image" && (
                          <ImageIcon
                            size={24 * zoom}
                            className="text-slate-400"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info Label bij selectie */}
                  {selectedElementId === el.id && (
                    <div className="absolute -top-8 left-0 bg-blue-600 text-white text-[9px] px-2 py-1 rounded shadow-md whitespace-nowrap font-mono pointer-events-none">
                      x:{Math.round(el.x)} y:{Math.round(el.y)}{" "}
                      {el.rotation ? `r:${el.rotation}°` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Properties Panel (Rechts) */}
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
                {/* INHOUD SECTIE */}
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
                      <option value="">Geen (Statische tekst)</option>
                      <option value="lotNumber">Lotnummer</option>
                      <option value="orderId">Ordernummer</option>
                      <option value="itemCode">Artikelcode</option>
                      <option value="description">Omschrijving</option>
                      <option value="drawing">Tekening Nr.</option>
                      <option value="date">Huidige Datum</option>
                    </select>
                  </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                {/* POSITIE & ROTATIE */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Positie & Rotatie
                  </label>

                  {/* UITLIJNING KNOPPEN */}
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

                  {/* ROTATIE KNOPPEN */}
                  <div className="flex items-center gap-2 justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
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
                </div>

                <div className="h-px bg-slate-100"></div>

                {/* STIJL (Alleen voor tekst) */}
                {selectedElement.type === "text" && (
                  <div className="space-y-3">
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
                  </div>
                )}

                {/* AFMETINGEN (Voor niet-tekst) */}
                {selectedElement.type !== "text" && (
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
                          value={Math.round(selectedElement.height)}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              height: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6">
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
    </div>
  );
};

export default AdminLabelDesigner;
