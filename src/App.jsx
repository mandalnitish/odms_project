// src/App.jsx
import { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DarkModeContext } from "./context/DarkModeContext";
import PrivateRoute from "./components/PrivateRoute";
import Footer from "./components/Footer";
import { AnimatePresence, motion } from "framer-motion";
import AOS from "aos";
import "aos/dist/aos.css";

// Pages
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import WhyDonate from "./pages/WhyDonate";
import HowItWorks from "./pages/HowItWorks";
import Eligibility from "./pages/Eligibility";
import AdminDashboard from "./pages/AdminDashboard";
import DonorDashboard from "./pages/DonorDashboard";
import RecipientDashboard from "./pages/RecipientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

// Assets
import logo from "./assets/logo.png";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  useEffect(() => {
    AOS.init({ duration: 800, easing: "ease-in-out", once: true });
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppContent menuOpen={menuOpen} setMenuOpen={setMenuOpen} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      </Router>
    </AuthProvider>
  );
}

// ---------------- AppContent ----------------
function AppContent({ menuOpen, setMenuOpen, toggleDarkMode, darkMode }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Redirect user automatically on login based on role
  useEffect(() => {
    if (user && role) {
      switch (role) {
        case "admin":
          navigate("/admin");
          break;
        case "donor":
          navigate("/donor");
          break;
        case "recipient":
          navigate("/recipient");
          break;
        case "doctor":
          navigate("/doctor");
          break;
        default:
          navigate("/");
      }
    }
  }, [user, role, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out">
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      <AnimatedRoutes />
      <Footer />
    </div>
  );
}

// ---------------- Header ----------------
function Header({ menuOpen, setMenuOpen, toggleDarkMode, darkMode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const hideLoginButton = location.pathname.startsWith("/auth") || !!user;

  const mobileLinkVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: (i) => ({ x: 0, opacity: 1, transition: { delay: i * 0.05, duration: 0.2 } }),
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false); // close mobile menu
    navigate("/"); // redirect to homepage
  };

  return (
    <header className="bg-gray-100 dark:bg-gray-800 shadow transition-colors duration-700 ease-in-out">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link to="/">
          <img src={logo} alt="Logo" className="h-16" />
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex space-x-6">
          {[
            { name: "Home", path: "/" },
            { name: "Why Donate", path: "/why-donate" },
            { name: "How It Works", path: "/how-it-works" },
            { name: "Eligibility", path: "/eligibility" },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Dark Mode & Login/Logout */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>

          {!hideLoginButton && (
            <Link
              to="/auth"
              className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-400 font-medium"
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

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-700 dark:text-gray-200 focus:outline-none">
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden bg-gray-100 dark:bg-gray-800 px-4 pb-4 space-y-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {[
              { name: "Home", path: "/" },
              { name: "Why Donate", path: "/why-donate" },
              { name: "How It Works", path: "/how-it-works" },
              { name: "Eligibility", path: "/eligibility" },
            ].map((link, i) => (
              <motion.div key={link.path} custom={i} initial="hidden" animate="visible" exit="hidden" variants={mobileLinkVariants}>
                <Link to={link.path} onClick={() => setMenuOpen(false)} className="block hover:text-green-600 dark:hover:text-green-400">
                  {link.name}
                </Link>
              </motion.div>
            ))}

            {!hideLoginButton && (
              <motion.div custom={4} initial="hidden" animate="visible" exit="hidden" variants={mobileLinkVariants}>
                <Link to="/auth" onClick={() => setMenuOpen(false)} className="block bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-400">
                  Login
                </Link>
              </motion.div>
            )}

            {user && (
              <motion.div custom={5} initial="hidden" animate="visible" exit="hidden" variants={mobileLinkVariants}>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ---------------- Animated Routes ----------------
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/auth" element={<PageWrapper><AuthPage showLogo={false} /></PageWrapper>} />
        <Route path="/why-donate" element={<PageWrapper><WhyDonate /></PageWrapper>} />
        <Route path="/how-it-works" element={<PageWrapper><HowItWorks /></PageWrapper>} />
        <Route path="/eligibility" element={<PageWrapper><Eligibility /></PageWrapper>} />

        {/* Private Routes */}
        <Route path="/admin" element={<PrivateRoute allowedRoles={["admin"]}><AdminDashboard /></PrivateRoute>} />
        <Route path="/donor" element={<PrivateRoute allowedRoles={["donor"]}><DonorDashboard /></PrivateRoute>} />
        <Route path="/recipient" element={<PrivateRoute allowedRoles={["recipient"]}><RecipientDashboard /></PrivateRoute>} />
        <Route path="/doctor" element={<PrivateRoute allowedRoles={["doctor"]}><DoctorDashboard /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

// ---------------- Page Wrapper ----------------
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}
