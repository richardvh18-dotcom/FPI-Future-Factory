import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Shield,
  RefreshCw,
  Clock,
  CheckCircle,
  Key,
  AlertCircle,
  User,
  Lock,
  X,
} from "lucide-react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { db, appId } from "../../config/firebase";

/**
 * AdminUsersView: Beheert gebruikersrollen en accounts.
 * Hersteld: Verbeterde detectie van Firebase configuratie voor accountcreatie.
 */
const AdminUsersView = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [expandedRoles, setExpandedRoles] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "operator",
    country: "Nederland",
    tempPassword: "",
  });

  /**
   * getSafeConfig: Haalt de Firebase configuratie op uit de globale omgeving.
   * Aangepast om zowel strings als objecten te ondersteunen.
   */
  const getSafeConfig = () => {
    try {
      // 1. Check de meest gebruikte globale variabele in deze omgeving
      if (
        typeof window.__firebase_config !== "undefined" &&
        window.__firebase_config
      ) {
        return typeof window.__firebase_config === "string"
          ? JSON.parse(window.__firebase_config)
          : window.__firebase_config;
      }

      // 2. Fallback naar de variabele zonder window prefix
      if (typeof __firebase_config !== "undefined" && __firebase_config) {
        return typeof __firebase_config === "string"
          ? JSON.parse(__firebase_config)
          : __firebase_config;
      }

      // 3. Laatste redding: probeer de API key uit de procesomgeving (voor lokale dev)
      if (process.env.REACT_APP_FIREBASE_API_KEY) {
        return {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
        };
      }
    } catch (e) {
      console.error("Configuratie leesfout:", e);
    }
    return null;
  };

  useEffect(() => {
    if (!appId) return;
    const unsubUsers = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "user_roles"),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Fout bij laden gebruikers:", err);
        setLoading(false);
      }
    );

    const unsubRequests = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "user_requests"),
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubUsers();
      unsubRequests();
    };
  }, []);

  const groupedUsers = useMemo(() => {
    const filtered = users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.reduce((acc, user) => {
      const role = user.role || "operator";
      if (!acc[role]) acc[role] = [];
      acc[role].push(user);
      return acc;
    }, {});
  }, [users, searchTerm]);

  /**
   * Maakt een account aan in Firebase Auth zonder de huidige sessie te verbreken.
   */
  const createAuthAccount = async (email, password) => {
    const config = getSafeConfig();

    if (!config || !config.apiKey) {
      throw new Error(
        "Systeem-configuratie niet gevonden. Neem contact op met de beheerder."
      );
    }

    // Gebruik een unieke naam om conflicten met bestaande apps te voorkomen
    const tempAppName = `TempAuthApp-${Date.now()}`;

    let tempApp;
    try {
      tempApp = initializeApp(config, tempAppName);
      const tempAuth = getAuth(tempApp);

      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        email,
        password
      );

      // Belangrijk: verwijder de tijdelijke app direct na gebruik
      await deleteApp(tempApp);
      return userCredential.user;
    } catch (error) {
      if (tempApp) await deleteApp(tempApp);

      if (error.code === "auth/email-already-in-use") {
        return { note: "Bestaand account" };
      }
      throw error;
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    const cleanEmail = formData.email.toLowerCase().trim();
    if (!cleanEmail)
      return setStatusMsg({ type: "error", text: "E-mailadres is verplicht." });
    if (
      isCreating &&
      (!formData.tempPassword || formData.tempPassword.length < 6)
    ) {
      return setStatusMsg({
        type: "error",
        text: "Wachtwoord moet minimaal 6 tekens bevatten.",
      });
    }

    setIsProcessing(true);
    setStatusMsg({ type: "info", text: "Bezig met verwerken..." });

    try {
      // 1. Firebase Authentication stap (alleen bij nieuwe users)
      if (isCreating) {
        setStatusMsg({ type: "info", text: "Inlog-account genereren..." });
        await createAuthAccount(cleanEmail, formData.tempPassword);
      }

      // 2. Database stap
      setStatusMsg({ type: "info", text: "Rechten toewijzen..." });
      const docId = cleanEmail;
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "user_roles", docId),
        {
          ...formData,
          email: docId,
          updatedAt: new Date().toISOString(),
          status: "active",
        },
        { merge: true }
      );

      // 3. Verwijder eventuele aanvraag
      const requestMatch = requests.find(
        (r) => r.email.toLowerCase() === docId
      );
      if (requestMatch) {
        await deleteDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "user_requests",
            requestMatch.id
          )
        );
      }

      setStatusMsg({
        type: "success",
        text: isCreating
          ? "Account succesvol geactiveerd!"
          : "Wijzigingen opgeslagen.",
      });

      setTimeout(() => {
        setIsCreating(false);
        setEditingUser(null);
        setFormData({
          email: "",
          name: "",
          role: "operator",
          country: "Nederland",
          tempPassword: "",
        });
        setIsProcessing(false);
        setStatusMsg(null);
      }, 1500);
    } catch (error) {
      console.error("Opslaan mislukt:", error);
      let errorText = "Er is een technische fout opgetreden.";
      if (error.code === "auth/weak-password")
        errorText = "Wachtwoord is te zwak.";
      if (error.code === "auth/invalid-email")
        errorText = "E-mailadres is ongeldig.";

      setStatusMsg({
        type: "error",
        text: errorText + " (" + (error.message || error.code) + ")",
      });
      setIsProcessing(false);
    }
  };

  const handleApproveRequest = (request) => {
    setFormData({
      email: request.email,
      name: request.name || "",
      role: "operator",
      country: request.country || "Nederland",
      tempPassword: "FPI" + Math.floor(1000 + Math.random() * 9000),
    });
    setIsCreating(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Account verwijderen uit database?")) {
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "public", "data", "user_roles", id)
        );
      } catch (e) {
        alert("Fout bij verwijderen: " + e.message);
      }
    }
  };

  if (isCreating || editingUser) {
    return (
      <div className="h-full w-full bg-slate-50 p-8 flex justify-center overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl w-full bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 h-fit animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic">
              {isCreating ? (
                <UserPlus className="text-emerald-500" />
              ) : (
                <Edit2 className="text-blue-600" />
              )}
              {isCreating ? "Account Activeren" : "Rechten Aanpassen"}
            </h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingUser(null);
                setStatusMsg(null);
              }}
              className="p-2 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          {statusMsg && (
            <div
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
                statusMsg.type === "error"
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-blue-50 text-blue-600 border border-blue-100"
              }`}
            >
              {statusMsg.type === "error" ? (
                <AlertCircle size={18} />
              ) : statusMsg.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <RefreshCw size={18} className="animate-spin" />
              )}
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveUser} className="space-y-6 text-left">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  E-mailadres (Inlognaam)
                </label>
                <input
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="naam@fpi-gre.com"
                  readOnly={!!editingUser}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Volledige Naam
                </label>
                <input
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Bijv. Jan Jansen"
                />
              </div>

              {isCreating && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Tijdelijk Wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-6 py-4 text-sm font-black text-blue-700 outline-none focus:border-blue-500 transition-all"
                      value={formData.tempPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempPassword: e.target.value,
                        })
                      }
                      placeholder="Min. 6 tekens"
                      required
                    />
                    <Key
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300"
                      size={18}
                    />
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Systeem Rol
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["admin", "engineer", "teamleader", "qc", "operator"].map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                          formData.role === r
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                            : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        {r}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
            >
              {isProcessing
                ? "Bezig met verwerken..."
                : isCreating
                ? "Account & Rechten Activeren"
                : "Wijzigingen Opslaan"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
              <Users size={28} />
            </div>
            <div className="text-left">
              <h2 className="text-3xl font-black text-slate-800 italic">
                Team <span className="text-blue-600">Beheer</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Toegang & Authenticatie
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingUser(null);
              setStatusMsg(null);
              setFormData({
                email: "",
                name: "",
                role: "operator",
                country: "Nederland",
                tempPassword: "",
              });
            }}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
          >
            + Nieuwe User
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 px-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${
              activeTab === "active"
                ? "border-blue-600 text-slate-900"
                : "border-transparent text-slate-400"
            }`}
          >
            Actieve Leden ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-all border-b-4 relative ${
              activeTab === "requests"
                ? "border-orange-500 text-slate-900"
                : "border-transparent text-slate-400"
            }`}
          >
            Wachtrij ({requests.length})
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-[8px] flex items-center justify-center rounded-full animate-pulse font-bold">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "active" ? (
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={18}
              />
              <input
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none shadow-sm"
                placeholder="Zoek op naam of email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {Object.entries(groupedUsers)
                .sort()
                .map(([role, roleUsers]) => (
                  <div
                    key={role}
                    className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedRoles((p) => ({ ...p, [role]: !p[role] }))
                      }
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100 transition-colors border-b border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-white rounded-lg border border-slate-100">
                          {expandedRoles[role] ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </div>
                        <Shield
                          size={18}
                          className={
                            role === "admin"
                              ? "text-blue-600"
                              : "text-slate-400"
                          }
                        />
                        <span className="font-black text-xs uppercase tracking-widest text-slate-700">
                          {role}{" "}
                          <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                            {roleUsers.length}
                          </span>
                        </span>
                      </div>
                    </button>
                    {expandedRoles[role] && (
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-50">
                          {roleUsers.map((user) => (
                            <tr
                              key={user.id}
                              className="hover:bg-slate-50/50 group transition-colors"
                            >
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs italic">
                                    {user.name?.[0] || "U"}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">
                                      {user.name || "Naamloos"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 font-mono">
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setFormData({
                                        email: user.email,
                                        name: user.name || "",
                                        role: user.role,
                                        country: user.country || "Nederland",
                                        tempPassword: "",
                                      });
                                      setStatusMsg(null);
                                    }}
                                    className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="py-20 text-center text-slate-300 italic border-2 border-dashed border-slate-200 rounded-[32px]">
                Geen openstaande aanvragen.
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-6 rounded-[32px] border-2 border-orange-100 flex items-center justify-between shadow-sm animate-in slide-in-from-right"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800">
                        {req.name || "Nieuwe Aanvraag"}
                      </h4>
                      <p className="text-xs font-bold text-slate-400">
                        {req.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApproveRequest(req)}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <CheckCircle size={16} /> Goedkeuren
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersView;
