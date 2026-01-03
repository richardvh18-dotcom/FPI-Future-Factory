import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db, appId, logActivity, auth } from "../../config/firebase";
import {
  Users,
  UserCheck,
  Clock,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Shield,
  UserPlus,
  Plus,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  Loader2,
} from "lucide-react";

/**
 * AdminUsersView: Centraal Gebruikersbeheer voor FPI GRE Database.
 * Volledig gecentreerde lay-out met groepering op rol en aanvraag-wachtrij.
 */
const AdminUsersView = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [activeView, setActiveView] = useState("active"); // "active" of "pending"

  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "user",
    status: "active",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "artifacts", appId, "user_roles"),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === "pending"),
    [users]
  );
  const activeUsers = useMemo(
    () => users.filter((u) => u.status !== "pending"),
    [users]
  );

  const groupedUsers = useMemo(() => {
    const filtered = activeUsers.filter(
      (u) =>
        u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = {
      admin: {
        label: "Beheerders",
        icon: <ShieldCheck className="text-orange-500" />,
        items: [],
      },
      editor: {
        label: "Redacteuren",
        icon: <Edit2 className="text-blue-500" />,
        items: [],
      },
      inspector: {
        label: "Inspecteurs",
        icon: <Briefcase className="text-emerald-500" />,
        items: [],
      },
      user: {
        label: "Gebruikers",
        icon: <Users className="text-slate-400" />,
        items: [],
      },
    };

    filtered.forEach((u) => {
      const role = u.role || "user";
      if (groups[role]) groups[role].items.push(u);
      else groups.user.items.push(u);
    });

    return groups;
  }, [activeUsers, searchTerm]);

  const approve = async (id) => {
    await updateDoc(doc(db, "artifacts", appId, "user_roles", id), {
      status: "active",
      role: "user",
    });
    logActivity(
      auth.currentUser,
      "USER_APPROVE",
      `Gebruiker ${id} goedgekeurd.`
    );
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email) return;
    try {
      const emailId = newUser.email.toLowerCase().trim();
      await setDoc(doc(db, "artifacts", appId, "user_roles", emailId), {
        ...newUser,
        id: emailId,
        createdAt: new Date(),
      });
      setIsAdding(false);
      setNewUser({ email: "", name: "", role: "user", status: "active" });
      logActivity(
        auth.currentUser,
        "USER_MANUAL_ADD",
        `Gebruiker ${emailId} handmatig aangemaakt.`
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center p-20 bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mr-2" />
        <span className="font-bold text-slate-400 italic uppercase text-[10px] tracking-widest">
          Database Sync...
        </span>
      </div>
    );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar animate-in fade-in duration-500">
      {/* Centrerende Wrapper */}
      <div className="w-full flex flex-col items-center min-h-full py-10 px-4">
        {/* Content Container (Gecentreerd) */}
        <div className="w-full max-w-4xl space-y-10">
          {/* Header Sectie */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center gap-6">
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                Gebruikersbeheer
              </h2>
              <div className="flex items-center justify-center gap-4">
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    activeView === "active"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-100 text-slate-400"
                  }`}
                  onClick={() => setActiveView("active")}
                >
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {activeUsers.length} Actief
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    activeView === "pending"
                      ? "bg-orange-500 text-white shadow-lg animate-pulse"
                      : "bg-slate-100 text-slate-400"
                  }`}
                  onClick={() => setActiveView("pending")}
                >
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {pendingUsers.length} Wachtende Aanvragen
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsAdding(true)}
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-3"
            >
              <UserPlus size={18} /> Nieuwe Gebruiker Registreren
            </button>
          </div>

          {/* Zoekbalk */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md group">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"
                size={20}
              />
              <input
                className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm transition-all"
                placeholder="Zoek op naam of e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamische Weergave */}
          {activeView === "pending" ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-center gap-3 text-orange-600 mb-4">
                <AlertCircle size={22} />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">
                  Openstaande Autorisatie Aanvragen
                </h3>
              </div>

              {pendingUsers.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {pendingUsers.map((u) => (
                    <div
                      key={u.id}
                      className="bg-white p-8 rounded-[2rem] border-2 border-orange-100 flex justify-between items-center shadow-xl"
                    >
                      <div className="text-left space-y-1">
                        <p className="font-black text-slate-800 text-lg uppercase italic leading-tight">
                          {u.name || "Gast Gebruiker"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono tracking-tight">
                          {u.id}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => approve(u.id)}
                          className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-90"
                          title="Accepteren"
                        >
                          <UserCheck size={24} />
                        </button>
                        <button
                          onClick={() =>
                            deleteDoc(
                              doc(db, "artifacts", appId, "user_roles", u.id)
                            )
                          }
                          className="bg-slate-50 text-slate-300 p-4 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                        >
                          <X size={24} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 text-center">
                  <Clock size={56} className="mx-auto text-slate-100 mb-6" />
                  <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">
                    Geen nieuwe aanvragen gevonden
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-16 animate-in">
              {Object.entries(groupedUsers).map(
                ([role, group]) =>
                  group.items.length > 0 && (
                    <div key={role} className="space-y-6">
                      <div className="flex items-center justify-center gap-4">
                        <span className="h-px bg-slate-200 flex-1"></span>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                          {group.icon}
                          {group.label} ({group.items.length})
                        </h3>
                        <span className="h-px bg-slate-200 flex-1"></span>
                      </div>

                      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                            <tr>
                              <th className="px-10 py-5">Medewerker Details</th>
                              <th className="px-10 py-5 text-center">Status</th>
                              <th className="px-10 py-5 text-right">Beheer</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.items.map((u) => (
                              <tr
                                key={u.id}
                                className="hover:bg-slate-50/50 transition-colors group"
                              >
                                <td className="px-10 py-6">
                                  <div className="flex flex-col text-left">
                                    <span className="font-black text-slate-800 uppercase italic text-sm tracking-tight leading-none mb-1">
                                      {u.name || "Naam onbekend"}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono tracking-tighter">
                                      {u.id}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-10 py-6">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                      Gevalideerd
                                    </span>
                                  </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button className="p-3 bg-slate-50 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        deleteDoc(
                                          doc(
                                            db,
                                            "artifacts",
                                            appId,
                                            "user_roles",
                                            u.id
                                          )
                                        )
                                      }
                                      className="p-3 bg-slate-50 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: HANDMATIG TOEVOEGEN */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 border border-white/20 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-200">
                  <UserPlus size={26} />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                    Registreren
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">
                    Nieuw Account Aanmaken
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-all active:scale-90"
              >
                <X size={32} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Volledige Naam
                </label>
                <div className="relative">
                  <Users
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                    placeholder="Bijv: Jan de Groot"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  E-mail Adres
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                    type="email"
                    placeholder="naam@fpi.com"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Toegangsrol
                </label>
                <div className="relative">
                  <Shield
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <select
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all outline-none appearance-none cursor-pointer"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="user">USER (Alleen Kijkrechten)</option>
                    <option value="inspector">
                      INSPECTOR (QC Meetlijsten)
                    </option>
                    <option value="editor">EDITOR (Data Wijzigen)</option>
                    <option value="admin">ADMIN (Volledige Toegang)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-6 bg-slate-900 text-white font-black uppercase text-xs rounded-[2rem] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Plus size={22} /> Gebruiker Activeren
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsersView;
