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
  BellRing,
} from "lucide-react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { db, appId } from "../../config/firebase";

/**
 * AdminUsersView V2.2: Beheert gebruikers en validatie-notificaties.
 * NIEUW: Checkbox om engineers toe te wijzen voor automatische inbox-meldingen.
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
    receivesValidationAlerts: false, // Nieuw veld
  });

  const getSafeConfig = () => {
    try {
      if (
        typeof window.__firebase_config !== "undefined" &&
        window.__firebase_config
      ) {
        return typeof window.__firebase_config === "string"
          ? JSON.parse(window.__firebase_config)
          : window.__firebase_config;
      }
    } catch (e) {
      console.error(e);
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

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const docId = formData.email.toLowerCase().trim();
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "user_roles", docId),
        { ...formData, email: docId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setStatusMsg({ type: "success", text: "Gebruiker bijgewerkt." });
      setTimeout(() => {
        setIsCreating(false);
        setEditingUser(null);
        setIsProcessing(false);
        setStatusMsg(null);
      }, 1000);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Opslaan mislukt." });
      setIsProcessing(false);
    }
  };

  const isEngineerRole = ["engineer", "admin", "teamleader"].includes(
    formData.role
  );

  if (isCreating || editingUser) {
    return (
      <div className="h-full w-full bg-slate-50 p-8 flex justify-center overflow-y-auto custom-scrollbar text-left">
        <div className="max-w-2xl w-full bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 h-fit animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic">
              {isCreating ? (
                <UserPlus className="text-emerald-500" />
              ) : (
                <Edit2 className="text-blue-600" />
              )}
              {isCreating ? "Nieuwe Gebruiker" : "Account Beheren"}
            </h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingUser(null);
              }}
              className="p-2 hover:bg-slate-50 rounded-xl transition-all border-none bg-transparent shadow-none"
            >
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  E-mailadres
                </label>
                <input
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  readOnly={!!editingUser}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Volledige Naam
                </label>
                <input
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Rol
                </label>
                <select
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  {["admin", "engineer", "teamleader", "qc", "operator"].map(
                    (r) => (
                      <option key={r} value={r}>
                        {r.toUpperCase()}
                      </option>
                    )
                  )}
                </select>
              </div>

              {isEngineerRole && (
                <div className="col-span-2 p-6 bg-blue-50/50 border-2 border-blue-100 rounded-3xl animate-in slide-in-from-top-2">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.receivesValidationAlerts}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receivesValidationAlerts: e.target.checked,
                          })
                        }
                      />
                      <div
                        className={`w-12 h-6 rounded-full transition-all ${
                          formData.receivesValidationAlerts
                            ? "bg-blue-600"
                            : "bg-slate-300"
                        }`}
                      ></div>
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${
                          formData.receivesValidationAlerts
                            ? "translate-x-6"
                            : ""
                        }`}
                      ></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BellRing
                        size={16}
                        className={
                          formData.receivesValidationAlerts
                            ? "text-blue-600"
                            : "text-slate-400"
                        }
                      />
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Ontvang validatie meldingen in inbox
                      </span>
                    </div>
                  </label>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 ml-16 italic">
                    Indien ingeschakeld, krijgt deze engineer een bericht
                    wanneer een product ter validatie wordt ingediend.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all disabled:opacity-50"
            >
              {isProcessing ? "Verwerken..." : "Configuratie Opslaan"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center text-left">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex justify-between items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 italic uppercase leading-none">
                Team <span className="text-blue-600">Beheer</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">
                Toegang & Notificatie Beheer
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingUser(null);
              setFormData({
                email: "",
                name: "",
                role: "operator",
                country: "Nederland",
                tempPassword: "",
                receivesValidationAlerts: false,
              });
            }}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
          >
            + Nieuwe User
          </button>
        </div>

        <div className="space-y-4">
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
                    <Shield
                      size={18}
                      className={
                        role === "admin" ? "text-blue-600" : "text-slate-400"
                      }
                    />
                    <span className="font-black text-xs uppercase tracking-widest text-slate-700">
                      {role}{" "}
                      <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                        {roleUsers.length}
                      </span>
                    </span>
                  </div>
                  {expandedRoles[role] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                {expandedRoles[role] && (
                  <div className="p-2 space-y-1">
                    {roleUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl group transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black italic">
                            {user.name?.[0] || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">
                              {user.name || "Naamloos"}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 font-mono">
                              {user.email}
                            </p>
                          </div>
                          {user.receivesValidationAlerts && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-lg border border-blue-100 flex items-center gap-1">
                              <BellRing size={10} /> Alerts
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setFormData({ ...user });
                            }}
                            className="p-2 text-slate-300 hover:text-blue-600 transition-colors border-none bg-transparent shadow-none"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors border-none bg-transparent shadow-none"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersView;
