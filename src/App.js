import React, { useState, useMemo, Suspense, lazy } from "react";
import {
  Loader2,
  Package,
  Calculator,
  Sparkles,
  LayoutDashboard,
  Wrench,
  ArrowDownCircle,
} from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./config/firebase";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import LoginView from "./components/LoginView";
import ProductSearchView from "./components/products/ProductSearchView";
import ProductDetailModal from "./components/products/ProductDetailModal";

// Hooks
import { useAdminAuth } from "./hooks/useAdminAuth";
import { useProductsData } from "./hooks/useProductsData";
import { useSettingsData } from "./hooks/useSettingsData";
import useInventory from "./hooks/useInventory";
import { useMessages } from "./hooks/useMessages";

// Lazy Loading voor zwaardere admin componenten
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const AdminProductManager = lazy(() =>
  import("./components/admin/AdminProductManager")
);
const AdminMatrixManager = lazy(() =>
  import("./components/admin/matrixmanager/AdminMatrixManager")
);
const AdminUploadView = lazy(() =>
  import("./components/admin/AdminUploadView")
);
const AdminUsersView = lazy(() => import("./components/admin/AdminUsersView"));
const MessagesManager = lazy(() =>
  import("./components/admin/messages/MessagesManager")
);
const CalculatorView = lazy(() => import("./components/CalculatorView"));
const AiAssistantView = lazy(() => import("./components/AiAssistantView"));
const DigitalPlanningHub = lazy(() =>
  import("./components/admin/digitalplanning/DigitalPlanningHub")
);
const AdminLocationsView = lazy(() =>
  import("./components/admin/AdminLocationsView")
);

const App = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginError, setLoginError] = useState(null);

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
  const {
    generalConfig,
    bellDimensions,
    productRange,
    standardFittingSpecs,
    toleranceSettings,
    productTemplates,
    boreDimensions,
  } = useSettingsData(user);
  const { inventory } = useInventory();
  const { unreadCount } = useMessages(user);

  // Filter Logica
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (searchQuery) {
        const terms = searchQuery.toLowerCase().trim().split(/\s+/);
        const match = terms.every(
          (t) =>
            String(p.name || "")
              .toLowerCase()
              .includes(t) ||
            String(p.type || "")
              .toLowerCase()
              .includes(t) ||
            String(p.diameter || "")
              .toLowerCase()
              .includes(t)
        );
        if (!match) return false;
      }
      if (filters.type !== "-" && p.type !== filters.type) return false;
      if (
        filters.diameter !== "-" &&
        String(p.diameter) !== String(filters.diameter)
      )
        return false;
      return true;
    });
  }, [products, searchQuery, filters]);

  /**
   * Verbeterde Login Handler met Foutafhandeling
   */
  const handleLogin = async (email, password) => {
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login Fout:", err.code);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setLoginError("E-mailadres of wachtwoord is onjuist.");
      } else {
        setLoginError(
          "Er is een probleem met de verbinding. Probeer het later opnieuw."
        );
      }
    }
  };

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );

  // Forceer login voor anonieme of niet-ingelogde gebruikers
  if (!user || user.isAnonymous) {
    return <LoginView onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      <Header
        user={user}
        isAdminMode={isAdminMode}
        onLogout={() => signOut(auth)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        logoUrl={generalConfig?.logoUrl}
        appName={generalConfig?.appName}
        unreadCount={unreadCount}
      />

      <div className="bg-white border-b px-6 pt-2 flex gap-4 shadow-sm z-10 overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: "products", label: "Catalogus", icon: <Package size={14} /> },
          {
            id: "calculator",
            label: "Calculator",
            icon: <Calculator size={14} />,
          },
          { id: "ai", label: "AI Expert", icon: <Sparkles size={14} /> },
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
              onClick={() => setActiveTab("admin_dashboard")}
              className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 shrink-0 transition-all ${
                activeTab.startsWith("admin_")
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
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          }
        >
          {activeTab === "products" && (
            <>
              <Sidebar
                filters={filters}
                setFilters={setFilters}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
              <div className="flex-1 overflow-y-auto bg-slate-100 text-left custom-scrollbar">
                <ProductSearchView
                  products={filteredProducts}
                  onProductClick={setViewingProduct}
                />
                {hasMore && (
                  <div className="p-8 text-center">
                    <button
                      onClick={loadMore}
                      className="bg-white border border-slate-300 text-slate-600 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 mx-auto"
                    >
                      <ArrowDownCircle size={20} /> Meer laden...
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "ai" && (
            <div className="flex-1 p-6 flex justify-center items-center bg-slate-50">
              <div className="w-full max-w-5xl h-full">
                <AiAssistantView
                  products={products}
                  currentSearch={searchQuery}
                />
              </div>
            </div>
          )}
          {activeTab === "admin_dashboard" && (
            <AdminDashboard navigate={setActiveTab} />
          )}
          {activeTab === "admin_users" && (
            <AdminUsersView onBack={() => setActiveTab("admin_dashboard")} />
          )}
          {activeTab === "admin_digital_planning" && (
            <DigitalPlanningHub
              onBack={() => setActiveTab("admin_dashboard")}
            />
          )}
          {(activeTab === "messages" || activeTab === "admin_messages") && (
            <MessagesManager onBack={() => setActiveTab("products")} />
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
