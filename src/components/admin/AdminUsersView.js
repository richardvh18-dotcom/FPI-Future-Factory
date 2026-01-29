import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Key,
  Mail,
  Shield,
  Search,
  Loader2,
  AlertTriangle,
  Lock,
  Send,
  RefreshCw,
  Globe,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Edit3,
  Eye,
  Clock,
  Save,
  UserCheck,
  ShieldCheck,
  Settings,
  Layout,
  Factory,
  ClipboardCheck,
  Tags,
  BookmarkPlus,
  EyeOff,
  Wand2,
  Monitor,
  ScanBarcode,
  MessageSquare,
  Calculator,
  Bot,
  Database,
  Package,
  ShieldAlert,
  UserCircle,
  Info,
} from "lucide-react";
import { db, auth } from "../../config/firebase";
import { initializeApp, deleteApp, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

/**
 * AdminUsersView V17 - Dynamische Responsieve Modal
 * De modal past zich nu aan op basis van schermformaat (Mobile/Tablet/Desktop).
 */
const AdminUsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const [customRoles, setCustomRoles] = useState([
    "Admin",
    "Engineer",
    "Teamleader",
    "Operator",
    "Planner",
    "Manager",
    "QC Inspector",
  ]);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [showRoleManager, setShowRoleManager] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Operator",
    country: "Nederland",
    status: "active",
    permissions: {
      isAdmin: false,
      accessPlanning: false,
      accessTerminals: false,
      accessScanner: false,
      accessCatalog: true,
      accessMessages: true,
      accessCalculator: true,
      accessAssistant: true,
      accessInventory: false,
      canEditProducts: false,
      canVerify: false,
    },
  });

  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "user_roles")
    );
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const roleRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "settings",
      "user_categories"
    );
    const unsubscribeRoles = onSnapshot(roleRef, (docSnap) => {
      if (docSnap.exists()) setCustomRoles(docSnap.data().list || []);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }, [appId]);

  const groupedUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      const matchesSearch =
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (filter === "pending") return matchesSearch && u.status === "pending";
      return matchesSearch;
    });
    const groups = {};
    filtered.forEach((u) => {
      const country = u.country || "Nederland";
      const role = u.role || "Operator";
      if (!groups[country]) groups[country] = {};
      if (!groups[country][role]) groups[country][role] = [];
      groups[country][role].push(u);
    });
    return groups;
  }, [users, searchTerm, filter]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "FPI-";
    for (let i = 0; i < 6; i++)
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setUserForm((prev) => ({ ...prev, password: pass }));
    setShowPassword(true);
  };

  const handleRoleChange = (newRole) => {
    const isHigher = [
      "Admin",
      "Engineer",
      "Manager",
      "Teamleader",
      "Planner",
    ].includes(newRole);
    const isProduction = [
      "Operator",
      "Teamleader",
      "Planner",
      "QC Inspector",
      "Admin",
    ].includes(newRole);

    setUserForm((prev) => ({
      ...prev,
      role: newRole,
      permissions: {
        isAdmin: newRole === "Admin",
        accessPlanning: isHigher,
        accessTerminals: isProduction,
        accessScanner: isProduction,
        accessCatalog: true,
        accessMessages: true,
        accessCalculator: true,
        accessAssistant: true,
        accessInventory: isHigher,
        canEditProducts: ["Admin", "Engineer"].includes(newRole),
        canVerify: ["Admin", "Engineer", "QC Inspector"].includes(newRole),
      },
    }));
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setActiveTab("profile");
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "Operator",
      country: user.country || "Nederland",
      status: user.status || "active",
      permissions: {
        isAdmin: user.permissions?.isAdmin || false,
        accessPlanning: user.permissions?.accessPlanning || false,
        accessTerminals: user.permissions?.accessTerminals || false,
        accessScanner: user.permissions?.accessScanner || false,
        accessCatalog: user.permissions?.accessCatalog ?? true,
        accessMessages: user.permissions?.accessMessages ?? true,
        accessCalculator: user.permissions?.accessCalculator ?? true,
        accessAssistant: user.permissions?.accessAssistant ?? true,
        accessInventory: user.permissions?.accessInventory || false,
        canEditProducts: user.permissions?.canEditProducts || false,
        canVerify: user.permissions?.canVerify || false,
        ...(user.permissions || {}),
      },
    });
    setIsEditMode(true);
  };

  const togglePermission = (key) => {
    setUserForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const handleUpdateUser = async (e) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "user_roles",
        selectedUser.id
      );
      const updateData = { ...userForm, lastUpdated: serverTimestamp() };
      if (userForm.password) {
        updateData.tempPasswordDisplay = userForm.password;
        updateData.mustChangePassword = true;
      }
      await updateDoc(userRef, updateData);
      setIsEditMode(false);
      setSelectedUser(null);
    } catch (err) {
      alert("Fout: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !window.confirm(`Verwijder ${selectedUser.name}?`))
      return;
    setIsProcessing(true);
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "user_roles",
          selectedUser.id
        )
      );
      setIsEditMode(false);
      setSelectedUser(null);
    } catch (err) {
      alert("Fout: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const PermissionToggle = ({ permKey, label, desc, icon: Icon, color }) => (
    <div
      onClick={() => togglePermission(permKey)}
      className={`p-4 rounded-[25px] border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[110px] ${
        userForm.permissions?.[permKey]
          ? "bg-white border-blue-400 shadow-sm"
          : "bg-slate-50/50 border-slate-100 opacity-60 hover:border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between w-full">
        <div
          className={`p-2 rounded-xl ${
            userForm.permissions?.[permKey]
              ? "bg-blue-50 " + color
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Icon size={18} />
        </div>
        <div
          className={`w-10 h-5 rounded-full p-1 transition-colors ${
            userForm.permissions?.[permKey] ? "bg-blue-600" : "bg-slate-200"
          }`}
        >
          <div
            className={`w-3 h-3 bg-white rounded-full transition-transform ${
              userForm.permissions?.[permKey]
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </div>
      </div>
      <div className="text-left mt-3">
        <p
          className={`text-[11px] font-black uppercase leading-none mb-1 ${
            userForm.permissions?.[permKey]
              ? "text-slate-900"
              : "text-slate-400"
          }`}
        >
          {label}
        </p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">
          {desc}
        </p>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );

  return (
    <div className="flex flex-col h-full animate-in fade-in text-left bg-slate-50 overflow-hidden">
      {/* TOOLBAR */}
      <div className="p-6 bg-white border-b border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
            Systeem <span className="text-blue-600">Autorisatie</span>
          </h2>
          <div className="relative flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Zoek gebruiker..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-xs font-bold transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setShowRoleManager(!showRoleManager)}
            className={`p-3 rounded-xl border transition-all ${
              showRoleManager
                ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
            }`}
          >
            <Tags size={18} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
          >
            <UserPlus size={16} /> Nieuwe Gebruiker
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ROLE MANAGER SIDEBAR */}
        {showRoleManager && (
          <div className="w-80 bg-white border-r border-slate-200 p-8 flex flex-col animate-in slide-in-from-left">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 italic">
              Functie Categorieën
            </h3>
            <div className="space-y-2 mb-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {customRoles.map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group border border-slate-100 hover:border-blue-200 transition-all"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {role}
                  </span>
                  <button
                    onClick={() =>
                      setDoc(
                        doc(
                          db,
                          "artifacts",
                          appId,
                          "public",
                          "data",
                          "settings",
                          "user_categories"
                        ),
                        { list: customRoles.filter((r) => r !== role) }
                      )
                    }
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <input
                type="text"
                placeholder="Nieuwe rol..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
              />
              <button
                onClick={() => {
                  if (newRoleInput)
                    setDoc(
                      doc(
                        db,
                        "artifacts",
                        appId,
                        "public",
                        "data",
                        "settings",
                        "user_categories"
                      ),
                      { list: [...new Set([...customRoles, newRoleInput])] }
                    );
                  setNewRoleInput("");
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Rol Toevoegen
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-8 space-y-12 custom-scrollbar">
          {Object.entries(groupedUsers)
            .sort()
            .map(([country, roles]) => (
              <div key={country} className="space-y-8 text-left">
                <div className="flex items-center gap-4 border-b-2 border-slate-200 pb-4">
                  <div className="p-2 bg-slate-900 text-white rounded-lg shadow-md">
                    <Globe size={20} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">
                    {country}
                  </h3>
                </div>
                <div className="space-y-10">
                  {Object.entries(roles)
                    .sort()
                    .map(([role, userList]) => (
                      <div key={role} className="space-y-4 text-left">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4 flex items-center gap-2">
                          <Shield size={14} className="text-blue-500" /> {role}{" "}
                          ({userList.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {userList.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => handleOpenEdit(user)}
                              className="bg-white p-6 rounded-[35px] border-2 border-slate-100 transition-all cursor-pointer hover:border-blue-400 hover:shadow-2xl hover:-translate-y-1 flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-5 text-left overflow-hidden">
                                <div
                                  className={`p-4 rounded-2xl transition-colors ${
                                    user.permissions?.isAdmin
                                      ? "bg-slate-900 text-emerald-400"
                                      : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                                  }`}
                                >
                                  <Users size={22} />
                                </div>
                                <div className="overflow-hidden">
                                  <h3 className="font-black text-slate-900 truncate text-sm mb-0.5 tracking-tight uppercase italic">
                                    {user.name || "Naamloos"}
                                  </h3>
                                  <p className="text-[10px] text-slate-400 font-bold truncate italic tracking-tighter">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight
                                size={18}
                                className="text-slate-200 group-hover:text-blue-500 transition-transform group-hover:translate-x-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* MODAL: DOSSIER EDITEREN (DYNAMISCH RESPONSIEF) */}
      {isEditMode && selectedUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          {/* DYNAMISCH SCHAALBAAR: Breedte tot 5xl, hoogte tot 90% van scherm, max 800px */}
          <div className="bg-white w-full max-w-5xl h-[90vh] lg:h-[80vh] max-h-[850px] rounded-[30px] md:rounded-[50px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 bg-slate-900 text-white rounded-[20px] md:rounded-[25px] shadow-2xl rotate-2">
                  <UserCircle size={32} className="md:w-10 md:h-10" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                    {userForm.name || "Medewerker"}
                  </h2>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mt-1 md:mt-2 tracking-[0.2em] truncate max-w-[200px] md:max-w-none">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditMode(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all active:scale-90"
              >
                <X size={28} className="md:w-8 md:h-8" />
              </button>
            </div>

            {/* Tab Navigation (Scrollable on small devices) */}
            <div className="flex px-6 md:px-10 bg-white border-b border-slate-100 gap-6 md:gap-10 shrink-0 overflow-x-auto custom-scrollbar">
              {[
                { id: "profile", label: "Basis Profiel", icon: Users },
                {
                  id: "permissions",
                  label: "Module Toegang",
                  icon: ShieldCheck,
                },
                { id: "security", label: "Beveiliging", icon: Lock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 md:gap-3 py-4 md:py-6 border-b-4 transition-all text-[10px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <tab.icon size={14} className="md:w-4 md:h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content Wrapper (Fluid Height Content) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white custom-scrollbar">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                {activeTab === "profile" && (
                  <div className="space-y-8 md:space-y-10 text-left">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                        Volledige Naam
                      </label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(e) =>
                          setUserForm({ ...userForm, name: e.target.value })
                        }
                        className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-[20px] md:rounded-[25px] text-base md:text-lg font-black italic focus:border-blue-500 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                          Systeem Rol
                        </label>
                        <div className="relative">
                          <select
                            value={userForm.role}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-[20px] md:rounded-[25px] text-xs md:text-sm font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all"
                          >
                            {customRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                            size={18}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                          Werklocatie
                        </label>
                        <div className="relative">
                          <select
                            value={userForm.country}
                            onChange={(e) =>
                              setUserForm({
                                ...userForm,
                                country: e.target.value,
                              })
                            }
                            className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-[20px] md:rounded-[25px] text-xs md:text-sm font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all"
                          >
                            <option value="Nederland">
                              Nederland (FPI NL)
                            </option>
                            <option value="Dubai">Dubai (FPI DXB)</option>
                          </select>
                          <ChevronDown
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                            size={18}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-6 md:p-8 bg-blue-50 rounded-[30px] md:rounded-[40px] border border-blue-100 flex flex-col sm:flex-row items-center gap-4 md:gap-6 shadow-sm">
                      <div className="p-3 md:p-4 bg-white rounded-2xl shadow-md text-blue-500 shrink-0">
                        <Info size={28} />
                      </div>
                      <div className="text-center sm:text-left">
                        <h4 className="font-black text-blue-900 uppercase text-[10px] md:text-xs mb-1">
                          Automatische Rechten
                        </h4>
                        <p className="text-[9px] md:text-[10px] text-blue-700/70 font-bold uppercase leading-relaxed tracking-tight">
                          Bevoegdheden worden automatisch bijgewerkt op basis
                          van de gekozen rol. Controleer het tabblad 'Module
                          Toegang'.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "permissions" && (
                  <div className="space-y-10 md:space-y-12 text-left pb-10">
                    <section className="space-y-4 md:space-y-6">
                      <h4 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] border-b border-slate-100 pb-3 ml-2 flex items-center gap-3 text-left">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>{" "}
                        Productie & Vloer
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                        <PermissionToggle
                          permKey="accessPlanning"
                          label="Planning Hub"
                          desc="Werkbonnen inzien."
                          icon={Factory}
                          color="text-blue-500"
                        />
                        <PermissionToggle
                          permKey="accessTerminals"
                          label="Terminals"
                          desc="Workstation bediening."
                          icon={Monitor}
                          color="text-indigo-500"
                        />
                        <PermissionToggle
                          permKey="accessScanner"
                          label="Scanner"
                          desc="Mobiele QR-scan acties."
                          icon={ScanBarcode}
                          color="text-purple-500"
                        />
                      </div>
                    </section>

                    <section className="space-y-4 md:space-y-6">
                      <h4 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] border-b border-slate-100 pb-3 ml-2 flex items-center gap-3 text-left">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                        Informatie & Tools
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                        <PermissionToggle
                          permKey="accessCatalog"
                          label="Catalogus"
                          desc="Tekeningen bekijken."
                          icon={Package}
                          color="text-emerald-500"
                        />
                        <PermissionToggle
                          permKey="accessMessages"
                          label="Berichten"
                          desc="Interne inbox & alerts."
                          icon={MessageSquare}
                          color="text-rose-500"
                        />
                        <PermissionToggle
                          permKey="accessCalculator"
                          label="Calculator"
                          icon={Calculator}
                          desc="Matrixen & Rekenen."
                          color="text-amber-500"
                        />
                        <PermissionToggle
                          permKey="accessAssistant"
                          label="AI Assistent"
                          icon={Bot}
                          desc="Support Co-pilot."
                          color="text-cyan-500"
                        />
                      </div>
                    </section>

                    <section className="space-y-4 md:space-y-6">
                      <h4 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] border-b border-slate-100 pb-3 ml-2 flex items-center gap-3 text-left">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>{" "}
                        Beheer & Kwaliteit
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                        <PermissionToggle
                          permKey="canEditProducts"
                          label="Engineer Mode"
                          desc="Dossiers bewerken."
                          icon={Layout}
                          color="text-blue-600"
                        />
                        <PermissionToggle
                          permKey="canVerify"
                          label="QC Verificatie"
                          desc="Validatie goedkeuring."
                          icon={ClipboardCheck}
                          color="text-emerald-600"
                        />
                        <PermissionToggle
                          permKey="accessInventory"
                          label="Voorraad"
                          desc="Mof-voorraad beheer."
                          icon={Database}
                          color="text-orange-600"
                        />
                        <PermissionToggle
                          permKey="isAdmin"
                          label="Admin Hub"
                          desc="Volledig beheer."
                          icon={ShieldAlert}
                          color="text-red-600"
                        />
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-8 md:space-y-10 text-left">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                        <Lock size={16} /> Wachtwoord Overschrijven
                      </label>
                      <div className="relative">
                        <Key
                          className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"
                          size={24}
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Nieuw veilig wachtwoord..."
                          className="w-full p-5 md:p-6 bg-rose-50/20 border-2 border-rose-100 rounded-[25px] md:rounded-[30px] text-base md:text-lg font-mono focus:border-rose-400 outline-none transition-all pl-16 pr-16"
                          value={userForm.password}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              password: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff size={24} />
                          ) : (
                            <Eye size={24} />
                          )}
                        </button>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 mt-4">
                        <AlertTriangle
                          className="text-rose-500 shrink-0 mt-0.5"
                          size={18}
                        />
                        <p className="text-[9px] text-rose-700 font-bold uppercase tracking-widest leading-tight">
                          Belangrijk: De gebruiker moet dit wachtwoord verplicht
                          wijzigen bij de volgende login.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="w-full py-5 md:py-6 bg-slate-900 text-emerald-400 rounded-[25px] md:rounded-[30px] font-black uppercase text-[10px] md:text-xs tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-slate-800 shadow-2xl transition-all active:scale-95"
                    >
                      <Wand2 size={22} /> Systeem Wachtwoord Genereren
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <button
                type="button"
                onClick={handleDeleteUser}
                className="p-4 text-slate-300 hover:text-red-600 hover:bg-white rounded-[20px] md:rounded-[25px] transition-all group shadow-sm border border-transparent hover:border-red-100 active:scale-90"
              >
                <Trash2
                  size={24}
                  className="md:w-7 md:h-7 group-hover:scale-110 transition-transform"
                />
              </button>
              <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="flex-1 sm:flex-none px-6 md:px-10 py-4 md:py-5 text-slate-400 font-black uppercase text-[10px] md:text-xs tracking-widest hover:text-slate-600 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={isProcessing}
                  className="flex-[2] sm:flex-none px-10 md:px-14 py-4 md:py-5 bg-blue-600 text-white rounded-[20px] md:rounded-[30px] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-2xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NIEUWE GEBRUIKER (Ook geoptimaliseerd) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] md:rounded-[50px] shadow-2xl overflow-hidden border border-white/20 p-8 md:p-12 text-left">
            <form
              onSubmit={handleCreateUser}
              className="space-y-6 md:row space-y-8 text-left"
            >
              <div className="flex items-center gap-5 mb-8 md:mb-10 text-left">
                <div className="p-4 bg-blue-600 text-white rounded-[20px] md:rounded-[25px] shadow-xl">
                  <UserPlus size={28} className="md:w-8 md:h-8" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                  Nieuw Account
                </h2>
              </div>
              <div className="space-y-4 md:space-y-5 text-left">
                <input
                  type="text"
                  placeholder="Volledige Naam"
                  required
                  className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic outline-none focus:border-blue-500 transition-all shadow-inner text-sm md:text-base"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                />
                <input
                  type="email"
                  placeholder="E-mailadres"
                  required
                  className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all shadow-inner text-sm md:text-base"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                />

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Wachtwoord
                  </label>
                  <div className="flex gap-2 md:gap-3">
                    <div className="relative flex-1 text-left">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Wachtwoord..."
                        required
                        className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-xs md:text-sm font-bold outline-none focus:border-blue-500 pr-12 shadow-inner"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({ ...userForm, password: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="p-4 md:p-5 bg-slate-900 text-emerald-400 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                    >
                      <Wand2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <select
                    value={userForm.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest outline-none appearance-none cursor-pointer focus:border-blue-500 shadow-inner"
                  >
                    {customRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    value={userForm.country}
                    onChange={(e) =>
                      setUserForm({ ...userForm, country: e.target.value })
                    }
                    className="p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest outline-none appearance-none cursor-pointer focus:border-blue-500 shadow-inner"
                  >
                    <option value="Nederland">Nederland</option>
                    <option value="Dubai">Dubai</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 md:gap-6 pt-8 md:pt-10 text-left">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-4 md:py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-[2] py-4 md:py-5 bg-blue-600 text-white rounded-[20px] md:rounded-[25px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-900/20 active:scale-95 transition-all"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin mx-auto" />
                  ) : (
                    "Aanmaken"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersView;
