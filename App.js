import React, { useState, useMemo, Suspense, lazy, useEffect } from "react";
import {
  Loader2,
  Package,
  Calculator,
  Sparkles,
  LayoutDashboard,
  Wrench,
  ArrowDownCircle,
  MessageSquare,
  Factory,
  AlertTriangle,
} from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, appId } from "./config/firebase";
import { Toaster } from "react-hot-toast";

// Basis Componenten
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import LoginView from "./components/LoginView";
import ProductSearchView from "./components/products/ProductSearchView";
import ProductDetailModal from "./components/products/ProductDetailModal";
import PortalView from "./components/PortalView";

// Hooks
import { useAdminAuth } from "./hooks/useAdminAuth";
import { useProductsData } from "./hooks/useProductsData";
import { useSettingsData } from "./hooks/useSettingsData";
import { useMessages } from "./hooks/useMessages";

// Lazy Loading Modules
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const AdminUsersView = lazy(() => import("./components/admin/AdminUsersView"));
const AdminLocationsView = lazy(() =>
  import("./components/admin/AdminLocationsView")
);
const MessagesManager = lazy(() =>
  import("./components/admin/messages/MessagesManager")
);
const CalculatorView = lazy(() => import("./components/CalculatorView"));
const AiAssistantView = lazy(() => import("./components/AiAssistantView"));
const AdminProductManager = lazy(() =>
  import("./components/admin/AdminProductManager")
);
const AdminMatrixManager = lazy(() =>
  import("./components/admin/matrixmanager/AdminMatrixManager")
);
const AdminNewProductView = lazy(() =>
  import("./components/admin/AdminNewProductView")
);
const DigitalPlanningHub = lazy(() =>
  import("./components/digitalplanning/DigitalPlanningHub")
);
const AdminDatabaseView = lazy(() =>
  import("./components/admin/AdminDatabaseView.jsx")
);
const ComposeModal = lazy(() =>
  import("./components/admin/messages/ComposeModal")
);
const InventoryView = lazy(() => import("./components/InventoryView"));

// NIEUW: Profiel view lazy loaden
const ProfileView = lazy(() => import("./components/ProfileView"));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Er is iets misgegaan.
          </h2>
          <p className="mb-6 text-center max-w-md">
            De applicatie ondervond een onverwachte fout. Probeer de pagina te
            verversen.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
          >
            Pagina verversen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showPortal, setShowPortal] = useState(true);

  const [filters, setFilters] = useState({
    type: "-",
    diameter: "-",
    pressure: "-",
    connection: "-",
    angle: "-",
    radius: "-",
    boring: "-",
    productLabel: "-",
  });

  const {
    user,
    isAdmin: isAdminMode,
    role,
    loading: authLoading,
  } = useAdminAuth();

  const {
    products = [],
    loading: prodLoading,
    loadMore,
    hasMore,
  } = useProductsData();

  const { generalConfig, productTemplates, productRange } =
    useSettingsData(user);
  const { unreadCount } = useMessages(user);

  useEffect(() => {
    const checkTempPassword = async () => {
      if (user && user.email) {
        try {
          const userRef = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "user_roles",
            user.email.toLowerCase()
          );
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().tempPassword)
            setMustChangePassword(true);
        } catch (e) {
          console.error("Auth check failed:", e);
        }
      }
    };
    checkTempPassword();
  }, [user]);

  useEffect(() => {
    if (!user) setShowPortal(true);
  }, [user]);

  const handlePasswordChanged = async (pwd) => {
    if (!user) return;
    const userRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "user_roles",
      user.email.toLowerCase()
    );
    await updateDoc(userRef, { tempPassword: null });
    setMustChangePassword(false);
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (searchQuery) {
        const terms = searchQuery.toLowerCase().trim().split(/\s+/);
        const matchSearch = terms.every(
          (t) =>
            String(p.name || "")
              .toLowerCase()
              .includes(t) ||
            String(p.type || "")
              .toLowerCase()
              .includes(t) ||
            String(p.articleCode || "")
              .toLowerCase()
              .includes(t) ||
            String(p.diameter || "")
              .toLowerCase()
              .includes(t)
        );
        if (!matchSearch) return false;
      }
      if (filters.type !== "-" && p.type !== filters.type) return false;
      if (
        filters.diameter !== "-" &&
        String(p.diameter) !== String(filters.diameter)
      )
        return false;
      if (
        filters.pressure !== "-" &&
        String(p.pressure) !== String(filters.pressure)
      )
        return false;
      if (filters.connection !== "-" && p.connection !== filters.connection)
        return false;
      if (filters.angle !== "-" && String(p.angle) !== String(filters.angle))
        return false;
      if (filters.radius !== "-" && p.radius !== filters.radius) return false;
      if (filters.boring !== "-" && p.drilling !== filters.boring) return false;
      if (filters.productLabel !== "-" && p.label !== filters.productLabel)
        return false;
      return true;
    });
  }, [products, searchQuery, filters]);

  const sidebarData = useMemo(() => {
    const getUnique = (key) =>
      [...new Set(products.map((p) => p[key]))].filter(Boolean);
    return {
      types: getUnique("type").sort(),
      diameters: getUnique("diameter").sort((a, b) => a - b),
      pressures: getUnique("pressure").sort((a, b) => a - b),
      connections: getUnique("connection").sort(),
      angles: getUnique("angle").sort((a, b) => a - b),
      radii: getUnique("radius").sort(),
      borings: [...new Set(products.map((p) => p.drilling))]
        .filter(Boolean)
        .sort(),
      labels: getUnique("label").sort(),
    };
  }, [products]);

  const handleLogin = async (email, password) => {
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoginError("Inloggen mislukt. Controleer gegevens.");
      throw err;
    }
  };

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  if (!user || user.isAnonymous || mustChangePassword)
    return (
      <LoginView
        onLogin={handleLogin}
        error={loginError}
        mustChangePassword={mustChangePassword}
        onPasswordChanged={handlePasswordChanged}
      />
    );

  if (showPortal) {
    return (
      <PortalView
        user={user}
        onLogout={() => signOut(auth)}
        onSelect={(m) => {
          if (m === "catalog") setActiveTab("products");
          if (m === "planning") setActiveTab("admin_digital_planning");
          setShowPortal(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden text-left relative">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <Header
        user={user}
        isAdminMode={isAdminMode}
        onLogout={() => {
          setShowPortal(true);
          signOut(auth);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        logoUrl={generalConfig?.logoUrl}
        appName={generalConfig?.appName}
        unreadCount={unreadCount}
        onNotificationClick={() => setActiveTab("messages")}
        onNewMessage={() => setIsComposeOpen(true)}
        // HIER WORDT DE NAVIGATIE PROP DOORGEGEVEN
        onNavigate={(tab) => {
          if (tab === "profile") setActiveTab("profile");
        }}
      />

      {/* Navigatie Tabs (Alleen tonen als we NIET op profiel zitten, of juist altijd?) */}
      {/* Meestal wil je de tabs blijven zien, dus we laten ze staan. */}
      <div className="bg-white border-b px-6 pt-2 flex gap-4 shadow-sm z-10 overflow-x-auto no-scrollbar shrink-0 text-left">
        {[
          { id: "products", label: "Catalogus", icon: <Package size={14} /> },
          {
            id: "admin_digital_planning",
            label: "Planning",
            icon: <Factory size={14} />,
          },
          {
            id: "inventory",
            label: "Gereedschappen",
            icon: <Wrench size={14} />,
          },
          {
            id: "calculator",
            label: "Calculator",
            icon: <Calculator size={14} />,
          },
          { id: "ai", label: "AI Expert", icon: <Sparkles size={14} /> },
          {
            id: "messages",
            label: "Berichten",
            icon: <MessageSquare size={14} />,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === t.id
                ? "border-emerald-500 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        {isAdminMode && (
          <>
            <div className="h-6 w-px bg-slate-200 mx-2 shrink-0 self-center mb-2"></div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setActiveTab("admin_dashboard");
              }}
              className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 shrink-0 transition-all ${
                activeTab.startsWith("admin_") &&
                activeTab !== "admin_digital_planning"
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutDashboard size={14} /> Beheer Hub
            </button>
          </>
        )}
      </div>

      <main className="flex-1 flex overflow-hidden relative">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            }
          >
            {/* PRODUCTEN VIEW */}
            {activeTab === "products" && (
              <>
                <Sidebar
                  filters={filters}
                  setFilters={setFilters}
                  isOpen={isSidebarOpen}
                  toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  uniqueTypes={sidebarData.types}
                  uniqueDiameters={sidebarData.diameters}
                  uniquePressures={sidebarData.pressures}
                  uniqueConnections={sidebarData.connections}
                  uniqueAngles={sidebarData.angles}
                  uniqueRadii={sidebarData.radii}
                  uniqueBorings={sidebarData.borings}
                  uniqueLabels={sidebarData.labels}
                />
                <div className="flex-1 overflow-y-auto bg-slate-100 custom-scrollbar text-left">
                  <ProductSearchView
                    products={filteredProducts}
                    onProductClick={setViewingProduct}
                  />
                  {hasMore && (
                    <div className="p-8 text-center">
                      <button
                        onClick={loadMore}
                        className="bg-white border border-slate-300 text-slate-600 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 mx-auto hover:bg-slate-50 active:scale-95 transition-all"
                      >
                        <ArrowDownCircle size={20} /> Meer laden...
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ANDERE VIEWS */}
            {activeTab === "inventory" && (
              <InventoryView onBack={() => setActiveTab("products")} />
            )}

            {activeTab === "calculator" && <CalculatorView />}
            {activeTab === "ai" && (
              <AiAssistantView
                products={products}
                currentSearch={searchQuery}
              />
            )}

            {(activeTab === "messages" || activeTab === "admin_messages") && (
              <MessagesManager
                onBack={() => setActiveTab("products")}
                onCompose={() => setIsComposeOpen(true)}
              />
            )}

            {/* NIEUW: PROFIEL VIEW */}
            {activeTab === "profile" && (
              <ProfileView
                user={user}
                onBack={() => setActiveTab("products")}
              />
            )}

            {/* Admin Routes */}
            {activeTab === "admin_dashboard" && (
              <AdminDashboard navigate={setActiveTab} />
            )}
            {activeTab === "admin_products" && (
              <AdminProductManager
                onBack={() => setActiveTab("admin_dashboard")}
                onAddNew={() => {
                  setEditingProduct(null);
                  setActiveTab("admin_new_product");
                }}
                onEdit={(p) => {
                  setEditingProduct(p);
                  setActiveTab("admin_new_product");
                }}
              />
            )}
            {activeTab === "admin_new_product" && (
              <AdminNewProductView
                onBack={() => setActiveTab("admin_products")}
                editingProduct={editingProduct}
              />
            )}
            {activeTab === "admin_locations" && (
              <AdminLocationsView
                onBack={() => setActiveTab("admin_dashboard")}
              />
            )}
            {activeTab === "admin_matrix" && (
              <AdminMatrixManager
                onBack={() => setActiveTab("admin_dashboard")}
                productTemplates={productTemplates}
                productRange={productRange}
                generalConfig={generalConfig}
              />
            )}
            {activeTab === "admin_digital_planning" && (
              <DigitalPlanningHub onBack={() => setShowPortal(true)} />
            )}
            {activeTab === "admin_database" && (
              <AdminDatabaseView
                onBack={() => setActiveTab("admin_dashboard")}
              />
            )}
            {activeTab === "admin_users" && (
              <AdminUsersView onBack={() => setActiveTab("admin_dashboard")} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          userRole={role}
        />
      )}

      <Suspense fallback={null}>
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
        />
      </Suspense>
    </div>
  );
};

export default App;
