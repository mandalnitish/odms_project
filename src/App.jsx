// ----------------------------------------------
// src/App.jsx  (FIXED VERSION - WITH DOCUMENT VERIFICATION)
// ----------------------------------------------
import { useState, useEffect, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { DarkModeContext } from "./context/DarkModeContext";
import PrivateRoute from "./components/PrivateRoute";

import Footer from "./components/Footer";
import { AnimatePresence, motion } from "framer-motion";
import AOS from "aos";
import "aos/dist/aos.css";

// ----------- Pages -----------
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import WhyDonate from "./pages/WhyDonate";
import HowItWorks from "./pages/HowItWorks";
import Eligibility from "./pages/Eligibility";

import AdminDashboard from "./pages/AdminDashboard";
import DonorDashboard from "./pages/DonorDashboard";
import RecipientDashboard from "./pages/RecipientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

import HospitalsPage from "./pages/HospitalsPage";
import HospitalDetailsPage from "./pages/HospitalDetailsPage";
import ChatbotPage from "./pages/ChatbotPage";
import DocumentVerificationPage from "./pages/DocumentVerificationPage";
import ChatSystem from './components/ChatSystem';
import logo from "./assets/logo.png";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";

// --------------------------------------------
// MAIN APP WRAPPER
// --------------------------------------------
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  useEffect(() => {
    AOS.init({ duration: 800, easing: "ease-in-out", once: true });
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AppContent
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </Router>
    </AuthProvider>
  );
}

// --------------------------------------------
// APP CONTENT (HEADER + ROUTES)
// --------------------------------------------
function AppContent({ menuOpen, setMenuOpen, toggleDarkMode, darkMode }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // FIXED: Redirect only when landing on "/" or "/auth"
  useEffect(() => {
    if (!user || !role) return;

    if (location.pathname !== "/" && location.pathname !== "/auth") return;

    switch (role) {
      case "admin":
        navigate("/admin", { replace: true });
        break;
      case "doctor":
        navigate("/doctor", { replace: true });
        break;
      case "donor":
        navigate("/donor", { replace: true });
        break;
      case "recipient":
        navigate("/recipient", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  }, [user, role, location.pathname, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        toggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
      />

      <AnimatedRoutes />
      {user && <ChatSystem />}
      <ScrollToTopButton />
      <Footer />
    </div>
  );
}

// --------------------------------------------
// HEADER + NAVIGATION BAR
// --------------------------------------------
function Header({ menuOpen, setMenuOpen, toggleDarkMode, darkMode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const hideLogin = location.pathname.startsWith("/auth") || !!user;

  const mobileVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: (i) => ({
      x: 0,
      opacity: 1,
      transition: { delay: i * 0.05 },
    }),
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link to="/">
          <img src={logo} alt="Logo" className="h-16" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-6">
          {[
            { name: "Home", path: "/" },
            { name: "Why Donate", path: "/why-donate" },
            { name: "How It Works", path: "/how-it-works" },
            { name: "Eligibility", path: "/eligibility" },
            { name: "AI Assistant", path: "/chatbot" },
            { name: "Verify Documents", path: "/verify-documents" },
            { name: "Hospitals", path: "/hospitals" },
          ].map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="hover:text-green-600 dark:hover:text-green-400 font-medium"
            >
              {l.name}
            </Link>
          ))}
        </nav>

        {/* Right Side Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>

          {!hideLogin && (
            <Link
              to="/auth"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Login
            </Link>
          )}

          {user && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-700 dark:text-gray-100"
          >
            {menuOpen ? "✖" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden bg-white dark:bg-gray-800 p-4 space-y-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {[
              { name: "Home", path: "/" },
              { name: "Why Donate", path: "/why-donate" },
              { name: "How It Works", path: "/how-it-works" },
              { name: "Eligibility", path: "/eligibility" },
              { name: "AI Assistant", path: "/chatbot" },
              { name: "Verify Documents", path: "/verify-documents" },
              { name: "Hospitals", path: "/hospitals" },
            ].map((link, i) => (
              <motion.div
                key={link.path}
                custom={i}
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={mobileVariants}
              >
                <Link
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className="block font-medium hover:text-green-600"
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}

            {!hideLogin && (
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="block bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Login
              </Link>
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// --------------------------------------------
// ANIMATED ROUTES
// --------------------------------------------
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes key={location.pathname} location={location}>
        {/* Public */}
        <Route
          path="/"
          element={<PageWrapper><HomePage /></PageWrapper>}
        />
        <Route
          path="/auth"
          element={<PageWrapper><AuthPage showLogo={false} /></PageWrapper>}
        />
        <Route
          path="/why-donate"
          element={<PageWrapper><WhyDonate /></PageWrapper>}
        />
        <Route
          path="/how-it-works"
          element={<PageWrapper><HowItWorks /></PageWrapper>}
        />
        <Route
          path="/eligibility"
          element={<PageWrapper><Eligibility /></PageWrapper>}
        />
        <Route
          path="/chatbot"
          element={<PageWrapper><ChatbotPage /></PageWrapper>}
        />

        {/* Document Verification - Private Route */}
        <Route
          path="/verify-documents"
          element={
            <PrivateRoute allowedRoles={["donor", "recipient"]}>
              <PageWrapper><DocumentVerificationPage /></PageWrapper>
            </PrivateRoute>
          }
        />

        {/* Private Routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <PrivateRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/donor"
          element={
            <PrivateRoute allowedRoles={["donor"]}>
              <DonorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/recipient"
          element={
            <PrivateRoute allowedRoles={["recipient"]}>
              <RecipientDashboard />
            </PrivateRoute>
          }
        />

        {/* Hospitals */}
        <Route
          path="/hospitals"
          element={
            <PrivateRoute allowedRoles={["admin", "doctor"]}>
              <HospitalsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/hospitals/:hospitalId"
          element={
            <PrivateRoute allowedRoles={["admin", "doctor"]}>
              <PageWrapper><HospitalDetailsPage /></PageWrapper>
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

// --------------------------------------------
// PAGE TRANSITION WRAPPER
// --------------------------------------------
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}
