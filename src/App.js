import React, { useState, Suspense, lazy } from "react";
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

import { generateProductPDF } from "./utils/pdfGenerator";
import { callGemini } from "./utils/helpers";

// Lazy Loading
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
const AdminToleranceView = lazy(() =>
  import("./components/admin/AdminToleranceView")
);
const AdminLocationsView = lazy(() =>
  import("./components/admin/AdminLocationsView")
);
const AdminSettingsView = lazy(() =>
  import("./components/admin/AdminSettingsView")
);
const AdminUsersView = lazy(() => import("./components/admin/AdminUsersView"));
const MessagesManager = lazy(() =>
  import("./components/admin/messages/MessagesManager")
);

const CalculatorView = lazy(() => import("./components/CalculatorView"));
const AiAssistantView = lazy(() => import("./components/AiAssistantView"));

const App = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shouldOpenCreateModal, setShouldOpenCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    type: "-",
    diameter: "-",
    pressure: "-",
    connection: "-",
    angle: "-",
    productLabel: "-",
  });

  const { user, isAdmin: isAdminMode, loading: authLoading } = useAdminAuth();
  const {
    products,
    loading: prodLoading,
    loadMore,
    hasMore,
  } = useProductsData();
  const {
    bellDimensions,
    productRange,
    standardFittingSpecs,
    toleranceSettings,
    productTemplates,
    generalConfig,
    boreDimensions,
    loading: settingsLoading,
  } = useSettingsData(user);
  const { moffen, loading: invLoading } = useInventory(!!user);
  const { unreadCount } = useMessages(user);

  const loading = authLoading || prodLoading || settingsLoading || invLoading;

  const uniqueTypes = [...new Set(products.map((p) => p.type))].sort();
  const uniqueDiameters = [
    ...new Set(products.map((p) => Number(p.diameter))),
  ].sort((a, b) => a - b);
  const uniquePressures = [
    ...new Set(products.map((p) => Number(p.pressure))),
  ].sort((a, b) => a - b);
  const uniqueConnections = [
    ...new Set(products.map((p) => p.connection)),
  ].sort();
  const uniqueAngles = [
    ...new Set(products.filter((p) => p.angle).map((p) => p.angle)),
  ].sort();
  const uniqueLabels = [
    ...new Set(products.map((p) => p.productLabel || "Standaard")),
  ].sort();

  const filteredProducts = products.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (p.name?.toLowerCase() || "").includes(q) ||
        (p.id?.toLowerCase() || "").includes(q) ||
        (p.articleCode?.toLowerCase() || "").includes(q);
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
    if (
      filters.productLabel !== "-" &&
      (p.productLabel || "Standaard") !== filters.productLabel
    )
      return false;
    return true;
  });

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );

  if (!user)
    return (
      <LoginView onLogin={(e, p) => signInWithEmailAndPassword(auth, e, p)} />
    );

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
        onNotificationClick={() => setActiveTab("messages")}
      />

      <div className="bg-white border-b px-6 pt-2 flex gap-4 shadow-sm z-10 overflow-x-auto no-scrollbar text-left items-center shrink-0">
        {[
          { id: "products", label: "Catalogus", icon: <Package size={14} /> },
          {
            id: "admin_locations",
            label: "Gereedschappen",
            icon: <Wrench size={14} />,
          },
          {
            id: "calculator",
            label: "Calculator",
            icon: <Calculator size={14} />,
          },
          { id: "ai", label: "AI", icon: <Sparkles size={14} /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 transition-all ${
              activeTab === t.id
                ? "border-blue-600 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}

        {isAdminMode && (
          <>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button
              onClick={() => setActiveTab("admin_dashboard")}
              className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 flex items-center gap-2 ${
                activeTab.startsWith("admin_")
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutDashboard size={14} /> Beheer
            </button>
          </>
        )}
      </div>

      <main className="flex-1 flex overflow-hidden relative">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          }
        >
          {activeTab === "products" && (
            <>
              <Sidebar
                filters={filters}
                setFilters={setFilters}
                uniqueTypes={uniqueTypes}
                uniqueDiameters={uniqueDiameters}
                uniquePressures={uniquePressures}
                uniqueConnections={uniqueConnections}
                uniqueAngles={uniqueAngles}
                uniqueLabels={uniqueLabels}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
              <div className="flex-1 overflow-y-auto bg-slate-100 text-left relative custom-scrollbar">
                <ProductSearchView
                  products={filteredProducts}
                  onProductClick={setViewingProduct}
                />
                {hasMore && (
                  <div className="p-8 text-center bg-gradient-to-t from-slate-100 to-transparent">
                    <button
                      onClick={loadMore}
                      className="bg-white border border-slate-300 text-slate-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-white hover:border-slate-400 hover:text-slate-800 transition-all flex items-center gap-2 mx-auto"
                    >
                      {prodLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <ArrowDownCircle size={20} />
                      )}{" "}
                      Meer producten laden...
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "admin_locations" && (
            <AdminLocationsView moffen={moffen} canEdit={isAdminMode} />
          )}
          {activeTab === "calculator" && (
            <CalculatorView
              bellDimensions={bellDimensions}
              standardFittingDims={standardFittingSpecs}
            />
          )}
          {activeTab === "ai" && (
            <AiAssistantView products={products} callGemini={callGemini} />
          )}
          {activeTab === "admin_dashboard" && (
            <AdminDashboard navigate={setActiveTab} />
          )}

          {activeTab === "admin_products" && (
            <AdminProductManager
              products={products}
              onLoadMore={loadMore}
              hasMore={hasMore}
              productRange={productRange}
              bellDimensions={bellDimensions}
              standardFittingSpecs={standardFittingSpecs}
              productTemplates={productTemplates}
              generalConfig={generalConfig}
              toleranceSettings={toleranceSettings}
              boreDimensions={boreDimensions}
              onBack={() => setActiveTab("admin_dashboard")}
              initialOpenModal={shouldOpenCreateModal}
              onModalClose={() => setShouldOpenCreateModal(false)}
            />
          )}
          {activeTab === "admin_matrix" && (
            <AdminMatrixManager
              productRange={productRange}
              productTemplates={productTemplates}
              bellDimensions={bellDimensions}
              boreDimensions={boreDimensions}
              generalConfig={generalConfig} // NIEUW: Config doorgeven
              onBack={() => setActiveTab("admin_dashboard")}
            />
          )}

          {activeTab === "admin_upload" && (
            <AdminUploadView onBack={() => setActiveTab("admin_dashboard")} />
          )}
          {activeTab === "admin_tolerances" && (
            <AdminToleranceView
              bellDimensions={bellDimensions}
              productRange={productRange}
              onBack={() => setActiveTab("admin_dashboard")}
            />
          )}
          {activeTab === "admin_settings" && <AdminSettingsView />}
          {activeTab === "admin_users" && (
            <AdminUsersView onBack={() => setActiveTab("admin_dashboard")} />
          )}
          {(activeTab === "messages" || activeTab === "admin_messages") && (
            <MessagesManager onBack={() => setActiveTab("products")} />
          )}
        </Suspense>
      </main>

      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          moffen={moffen}
          toleranceSettings={toleranceSettings}
          onClose={() => setViewingProduct(null)}
          onExportPDF={generateProductPDF}
        />
      )}
    </div>
  );
};

export default App;
