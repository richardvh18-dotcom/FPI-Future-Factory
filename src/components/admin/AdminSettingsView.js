import React, { useState, useEffect, useRef } from "react";
import {
  Save,
  Loader2,
  Image,
  Type,
  Check,
  Trash2,
  Upload,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, appId } from "../../config/firebase";

const PRESET_LOGOS = [
  {
    id: "fpi_default",
    url: "https://via.placeholder.com/150/10b981/ffffff?text=FPI",
    label: "FPI Standaard",
  },
  {
    id: "fpi_dark",
    url: "https://via.placeholder.com/150/0f172a/ffffff?text=FPI",
    label: "FPI Donker",
  },
  {
    id: "gre_blue",
    url: "https://via.placeholder.com/150/3b82f6/ffffff?text=GRE",
    label: "GRE Blauw",
  },
];

const AdminSettingsView = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null); // Referentie naar de onzichtbare file input

  const [settings, setSettings] = useState({
    appName: "FPI GRE Database",
    logoUrl: "",
    themeColor: "emerald",
  });

  // Data laden bij start
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "app_settings",
          "general"
        );
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Fout bij laden instellingen:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "app_settings",
          "general"
        ),
        settings,
        { merge: true }
      );
      alert(
        "✅ Instellingen opgeslagen! Ververs de pagina om het resultaat in de header te zien."
      );
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Fout bij opslaan.");
    } finally {
      setSaving(false);
    }
  };

  const selectPreset = (url) => {
    setSettings({ ...settings, logoUrl: url });
  };

  const handleRemoveLogo = () => {
    setSettings({ ...settings, logoUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
  };

  // --- NIEUW: File Upload Logica ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check bestandsgrootte (max 500KB voor Base64 in Firestore)
    if (file.size > 500 * 1024) {
      alert("Het bestand is te groot (max 500KB). Verklein het logo eerst.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Het resultaat is een base64 string die we direct als URL kunnen gebruiken
      setSettings({ ...settings, logoUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex justify-center p-8 bg-slate-50 min-h-full">
      <div className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 h-fit">
        <div className="border-b border-slate-100 pb-6 mb-6">
          <h2 className="text-2xl font-black text-slate-800">
            Algemene Instellingen
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            Beheer de weergave van de applicatie
          </p>
        </div>

        <div className="space-y-8">
          {/* App Naam */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Applicatie Naam
            </label>
            <div className="relative">
              <Type
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                value={settings.appName}
                onChange={(e) =>
                  setSettings({ ...settings, appName: e.target.value })
                }
                placeholder="Bijv. FPI GRE Database"
              />
            </div>
          </div>

          {/* Logo Sectie */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3 ml-1">
              Logo Selectie
            </label>

            {/* Custom URL Input met Knoppen */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Image
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                  value={
                    settings.logoUrl.length > 50
                      ? settings.logoUrl.substring(0, 47) + "..."
                      : settings.logoUrl
                  }
                  onChange={(e) => {
                    // Alleen updaten als de gebruiker de tekst handmatig aanpast (niet voor base64 strings typen)
                    if (!e.target.value.startsWith("data:image")) {
                      setSettings({ ...settings, logoUrl: e.target.value });
                    }
                  }}
                  placeholder="https://... of upload een bestand"
                />

                {/* Verwijder knop */}
                {settings.logoUrl && (
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Verwijder logo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Upload Knop */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={triggerFileInput}
                className="bg-slate-800 text-white px-4 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors text-xs"
                title="Upload vanaf computer"
              >
                <Upload size={16} />
                Uploaden
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-3">
              {PRESET_LOGOS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => selectPreset(preset.url)}
                  className={`cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center gap-2 transition-all ${
                    settings.logoUrl === preset.url
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 hover:border-blue-200"
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="h-10 w-10 object-contain rounded-md"
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      settings.logoUrl === preset.url
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    {preset.label}
                  </span>
                  {settings.logoUrl === preset.url && (
                    <div className="absolute top-[-5px] right-[-5px] bg-emerald-500 text-white rounded-full p-0.5">
                      <Check size={10} />
                    </div>
                  )}
                </div>
              ))}

              {/* Leeg/Reset Optie */}
              <div
                onClick={() => selectPreset("")}
                className={`cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  settings.logoUrl === ""
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-100 hover:border-blue-200"
                }`}
              >
                <div className="h-10 w-10 flex items-center justify-center bg-slate-200 rounded-md text-slate-400 text-xs font-bold">
                  <Trash2 size={18} />
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  Geen Logo
                </span>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-6 bg-slate-900 rounded-xl flex items-center gap-4 shadow-inner overflow-hidden">
            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest min-w-[60px]">
              Preview:
            </span>
            <div className="flex items-center gap-3 overflow-hidden">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Preview"
                  className="h-10 w-10 object-contain bg-white/10 rounded-lg p-1"
                />
              ) : (
                <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
                  DB
                </div>
              )}
              <div className="truncate">
                <h1 className="text-xl font-black text-white leading-none truncate">
                  {settings.appName.split(" ")[0]}{" "}
                  <span className="text-emerald-400">
                    {settings.appName.split(" ").slice(1).join(" ")}
                  </span>
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Database
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsView;
