import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  Globe,
  Mail,
  User,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../../config/firebase";

const AdminUsersView = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State voor bewerken/aanmaken
  const [editingUser, setEditingUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // State voor inklappen
  const [expandedRoles, setExpandedRoles] = useState({
    admin: true,
    editor: true,
    viewer: true,
  });

  // Formulier data
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "viewer",
    country: "Nederland",
  });

  // --- DATA LADEN ---
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(
        collection(db, "artifacts", appId, "user_roles")
      );
      const userList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Fout bij ophalen gebruikers:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTEREN & GROEPEREN ---
  const filteredUsers = users.filter(
    (u) =>
      (u.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (u.country?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const role = user.role || "viewer";
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {});

  const toggleRoleGroup = (role) => {
    setExpandedRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  // --- HANDLERS ---
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || user.id,
      name: user.name || "",
      role: user.role || "viewer",
      country: user.country || "",
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      name: "",
      role: "viewer",
      country: "Nederland",
    });
    setIsCreating(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.email) return alert("Email is verplicht!");

    try {
      const docId = formData.email.toLowerCase();
      await setDoc(
        doc(db, "artifacts", appId, "user_roles", docId),
        {
          email: docId,
          name: formData.name,
          role: formData.role,
          country: formData.country,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      alert("✅ Gebruiker opgeslagen!");
      setEditingUser(null);
      setIsCreating(false);
      fetchUsers();
    } catch (error) {
      console.error("Opslaan mislukt:", error);
      alert("Fout bij opslaan.");
    }
  };

  const handleDelete = async (email) => {
    if (
      window.confirm(
        `Weet je zeker dat je ${email} wilt verwijderen? De gebruiker verliest dan toegang.`
      )
    ) {
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "user_roles", email.toLowerCase())
        );
        fetchUsers();
      } catch (error) {
        console.error("Verwijderen mislukt:", error);
      }
    }
  };

  // --- RENDER FORMULIER (Gecentreerd) ---
  if (isCreating || editingUser) {
    return (
      <div className="h-full w-full bg-slate-50 overflow-y-auto custom-scrollbar p-8 flex justify-center">
        <div className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 h-fit animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              {isCreating ? (
                <UserPlus className="text-blue-600" />
              ) : (
                <Edit2 className="text-blue-600" />
              )}
              {isCreating ? "Nieuwe Gebruiker" : "Gebruiker Bewerken"}
            </h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingUser(null);
              }}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              Annuleren
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Email Adres
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="email"
                    className={`w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none transition-all ${
                      editingUser
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : "bg-slate-50 focus:border-blue-500 text-slate-700"
                    }`}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="gebruiker@bedrijf.com"
                    readOnly={!!editingUser}
                    required
                  />
                </div>
                {editingUser && (
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">
                    Email is de unieke ID en kan niet gewijzigd worden.
                  </p>
                )}
              </div>

              {/* Naam */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Naam
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Volledige naam"
                  />
                </div>
              </div>

              {/* Land */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Land
                </label>
                <div className="relative">
                  <Globe
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="Bijv. Nederland"
                  />
                </div>
              </div>

              {/* Rol */}
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Toegangsrol
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {["admin", "editor", "viewer"].map((role) => (
                    <div
                      key={role}
                      onClick={() => setFormData({ ...formData, role })}
                      className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${
                        formData.role === role
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]"
                          : "border-slate-100 hover:border-blue-200 text-slate-500 bg-slate-50"
                      }`}
                    >
                      <Shield
                        size={20}
                        className={
                          formData.role === role ? "fill-blue-200" : ""
                        }
                      />
                      <span className="text-xs font-black uppercase">
                        {role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5"
              >
                <Save size={18} /> Opslaan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER LIJST (Gecentreerd) ---
  return (
    // AANPASSING: w-full toegevoegd aan container voor correcte centrering
    <div className="h-full w-full bg-slate-50 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header Sectie */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Users className="text-purple-500" size={32} />
              Gebruikersbeheer
            </h2>
            <p className="text-sm text-slate-400 font-medium ml-11 mt-1">
              Beheer toegang en rollen
            </p>
          </div>

          <div className="flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              >
                Terug
              </button>
            )}
            {/* AANPASSING: Knop kleiner en strakker */}
            <button
              onClick={handleCreate}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform hover:-translate-y-0.5"
            >
              <UserPlus size={16} /> Nieuwe Gebruiker
            </button>
          </div>
        </div>

        {/* Zoekbalk */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 sticky top-0 z-20">
          <Search className="text-slate-400 ml-2" size={20} />
          <input
            className="flex-1 bg-transparent text-lg font-bold text-slate-700 placeholder:text-slate-300 outline-none"
            placeholder="Zoek op naam, email of land..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-slate-400 hover:text-slate-600 mr-2"
            >
              <span className="text-xs font-bold uppercase bg-slate-100 px-2 py-1 rounded-md">
                Reset
              </span>
            </button>
          )}
        </div>

        {/* Lijst */}
        <div className="space-y-4">
          {Object.keys(groupedUsers).length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold text-lg">Geen gebruikers gevonden</p>
              <p className="text-sm">
                Pas je zoekopdracht aan of voeg een nieuwe gebruiker toe.
              </p>
            </div>
          ) : (
            Object.entries(groupedUsers).map(([role, items]) => (
              <div
                key={role}
                className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Groep Header (Compacter) */}
                <div
                  className="bg-slate-50/80 py-2 px-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors select-none border-b border-slate-100"
                  onClick={() => toggleRoleGroup(role)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-white rounded-lg shadow-sm text-slate-400">
                      {expandedRoles[role] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield
                        size={16}
                        className={
                          role === "admin"
                            ? "text-emerald-500"
                            : "text-blue-500"
                        }
                      />
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">
                        {role}
                      </h3>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                        {items.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabel */}
                {expandedRoles[role] && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="p-4 pl-8 w-1/3">Gebruiker</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4">Land</th>
                          <th className="p-4 text-right pr-8">Acties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50 transition-colors group"
                          >
                            <td className="p-4 pl-8">
                              <span className="font-bold text-slate-700 block text-base">
                                {user.name || "Naamloos"}
                              </span>
                              <span className="text-xs text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                              {user.email}
                            </td>
                            <td className="p-4">
                              {user.country && (
                                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg w-fit border border-slate-200">
                                  <Globe size={12} className="text-slate-400" />{" "}
                                  {user.country}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right pr-8">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                  title="Bewerken"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                  title="Toegang intrekken"
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
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersView;
