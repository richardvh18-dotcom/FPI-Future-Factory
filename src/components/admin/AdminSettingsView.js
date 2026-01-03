import React, { useState, useEffect } from "react";
import {
  Save,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  Info,
} from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, appId } from "../../config/firebase";
import { compressImage } from "../../utils/helpers"; // We gebruiken je bestaande helper!

const AdminSettingsView = () => {
  const [logo, setLogo] = useState(null);
  const [status, setStatus] = useState(null);

  // 1. Laad huidige instellingen
  useEffect(() => {
    const docRef = doc(
      db,
      "artifacts",
      "fittings-app-v1",
      "public",
      "data",
      "app_settings",
      "general"
    );
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setLogo(snap.data().logo || null);
      }
    });
    return unsub;
  }, []);

  // 2. Upload en converteer naar Base64 (net als producten)
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("uploading");
    try {
      // Comprimeer en maak vierkant/klein genoeg voor header
      const compressed = await compressImage(file);
      setLogo(compressed);
      setStatus("unsaved");
    } catch (err) {
      alert("Fout bij uploaden: " + err.message);
      setStatus(null);
    }
  };

  // 3. Opslaan in Database
  const handleSave = async () => {
    setStatus("saving");
    try {
      const docRef = doc(
        db,
        "artifacts",
        "fittings-app-v1",
        "public",
        "data",
        "app_settings",
        "general"
      );
      await setDoc(docRef, { logo: logo }, { merge: true }); // Merge zorgt dat andere settings blijven bestaan
      setStatus("success");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleRemove = () => {
    if (window.confirm("Logo verwijderen en terug naar standaard?")) {
      setLogo(null);
      setStatus("unsaved");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">App Instellingen</h2>
        {status === "unsaved" && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg animate-pulse"
          >
            <Save size={18} /> Wijzigingen Opslaan
          </button>
        )}
      </div>

      {status === "success" && (
        <div className="bg-emerald-100 text-emerald-800 p-3 rounded-lg mb-6 flex items-center gap-2">
          <Check size={18} /> Instellingen succesvol opgeslagen!
        </div>
      )}

      {/* SECTIE: HUISSTIJL */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700">
          <ImageIcon size={20} /> Huisstijl & Logo
        </h3>
        <div className="flex items-start gap-6">
          {/* LOGO PREVIEW */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-xs text-slate-400 font-bold">
                  Geen Logo
                </span>
              )}
            </div>
            {logo && (
              <button
                onClick={handleRemove}
                className="text-xs text-red-500 flex items-center gap-1 hover:underline"
              >
                <Trash2 size={10} /> Verwijderen
              </button>
            )}
          </div>

          {/* UPLOAD KNOPPEN */}
          <div className="flex-1 space-y-4">
            <p className="text-sm text-slate-600">
              Upload hier het bedrijfslogo. Dit verschijnt linksboven in de
              header.
              <br />
              <span className="text-xs text-slate-400 italic">
                Geadviseerd: PNG met transparante achtergrond.
              </span>
            </p>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition font-bold text-sm">
              <Upload size={16} />
              Kies Afbeelding
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* PLAATS VOOR MEER INSTELLINGEN LATER */}
      <div className="mt-6 bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 flex items-center gap-2">
        <Info size={18} /> Meer instellingen (zoals kleuren of gebruikersbeheer)
        komen hier.
      </div>
    </div>
  );
};

export default AdminSettingsView;
