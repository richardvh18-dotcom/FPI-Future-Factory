import React, { useState, useMemo, Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
  getAuth,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, appId } from "./config/firebase";

// Basis Componenten
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import LoginView from "./components/LoginView";
import ProductSearchView from "./components/products/ProductSearchView";
import ProductDetailModal from "./components/products/ProductDetailModal";
import PortalView from "./components/PortalView";
import ForcePasswordChangeView from "./components/ForcePasswordChangeView";
import ProfileView from "./components/ProfileView";

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
const AdminDatabaseView = lazy(() =>
  import("./components/admin/AdminDatabaseView.jsx")
);
const DigitalPlanningHub = lazy(() =>
  import("./components/digitalplanning/DigitalPlanningHub.jsx")
);
const Terminal = lazy(() =>
  import("./components/digitalplanning/Terminal.jsx")
);
const MobileScanner = lazy(() =>
  import("./components/digitalplanning/MobileScanner.jsx")
);

const TerminalWrapper = () => {
  const { stationId } = useParams();
  const navigate = useNavigate();
  return (
    <Terminal initialStation={stationId} onBack={() => navigate("/portal")} />
  );
};

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isCatalogFiltersOpen, setIsCatalogFiltersOpen] = useState(false);

  // Check of we in een 'portal' state zijn waar sidebar/header verborgen moeten zijn
  const isPortalOrLogin =
    location.pathname === "/" ||
    location.pathname === "/portal" ||
    location.pathname === "/login" ||
    location.pathname === "/scanner" ||
    location.pathname.startsWith("/terminal");

  const { user, isAdmin, role, loading: authLoading } = useAdminAuth();
  const { products = [] } = useProductsData();
  const { generalConfig, productTemplates, productRange } =
    useSettingsData(user);
  const { messages } = useMessages(user);
  const unreadCount = messages
    ? messages.filter((m) => !m.read && !m.archived).length
    : 0;

  useEffect(() => {
    const checkTempPassword = async () => {
      if (user?.email) {
        try {
          const userRef = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "user_roles",
            user.uid
          );
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().mustChangePassword) {
            setMustChangePassword(true);
          }
        } catch (e) {}
      }
    };
    checkTempPassword();
  }, [user]);

  const handlePasswordChanged = async (newPassword) => {
    if (!user) return;
    try {
      const authInstance = getAuth();
      await updatePassword(authInstance.currentUser, newPassword);
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "user_roles",
        user.uid
      );
      await updateDoc(userRef, {
        mustChangePassword: false,
        tempPasswordDisplay: null,
      });
      setMustChangePassword(false);
      window.location.reload();
    } catch (err) {
      alert("Fout bij wijzigen wachtwoord.");
    }
  };

  const handleLogin = async (email, password) => {
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/portal");
    } catch (err) {
      setLoginError("Inloggen mislukt.");
    }
  };

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );

  if (!user || user.role === "guest")
    return <LoginView onLogin={handleLogin} error={loginError} />;
  if (mustChangePassword)
    return (
      <ForcePasswordChangeView user={user} onComplete={handlePasswordChanged} />
    );

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden text-left relative">
      {!isPortalOrLogin && (
        <Header
          user={user}
          isAdminMode={isAdmin}
          onLogout={() => {
            signOut(auth);
            navigate("/login");
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          logoUrl={generalConfig?.logoUrl}
          appName={generalConfig?.appName}
          unreadCount={unreadCount}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!isPortalOrLogin && (
          <Sidebar
            onLogout={() => {
              signOut(auth);
              navigate("/login");
            }}
            onToggleCatalogFilters={() =>
              setIsCatalogFiltersOpen(!isCatalogFiltersOpen)
            }
            isCatalogFiltersOpen={isCatalogFiltersOpen}
          />
        )}

        <main
          className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${
            !isPortalOrLogin ? "md:pl-16" : ""
          }`}
        >
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            }
          >
            <Routes>
              {/* Prioritaire routes */}
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/portal" element={<PortalView />} />
              <Route path="/" element={<PortalView />} />

              {/* Functionele modules */}
              <Route path="/scanner" element={<MobileScanner />} />
              <Route
                path="/terminal/:stationId"
                element={<TerminalWrapper />}
              />
              <Route
                path="/products"
                element={
                  <ProductSearchView
                    products={products}
                    onProductClick={setViewingProduct}
                  />
                }
              />
              <Route path="/planning/*" element={<DigitalPlanningHub />} />
              <Route
                path="/inventory"
                element={
                  <AdminLocationsView onBack={() => navigate("/portal")} />
                }
              />
              <Route path="/calculator" element={<CalculatorView />} />
              <Route path="/assistant" element={<AiAssistantView />} />

              {/* Admin secties */}
              <Route path="/admin/messages" element={<MessagesManager />} />
              <Route
                path="/admin"
                element={<AdminDashboard onBack={() => navigate("/portal")} />}
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          userRole={role}
        />
      )}
    </div>
  );
};

export default App;
