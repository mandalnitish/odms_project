// src/components/Header.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { DarkModeContext } from "../context/DarkModeContext";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sun, Moon, LogOut } from "lucide-react";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/why-donate", label: "Why Donate" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/eligibility", label: "Eligibility" },
];

// Small heartbeat-monitor pulse — the header's one signature detail.
// Draws once on mount, then idles; hovering the logo re-triggers it.
function PulseMark({ replay }) {
  return (
    <svg
      width="34"
      height="16"
      viewBox="0 0 34 16"
      fill="none"
      className="shrink-0 text-green-600 dark:text-green-400"
    >
      <motion.path
        key={replay}
        d="M0 8H8L11 2L16 14L19 8H34"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
    </svg>
  );
}

export default function Header() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setUserRole(role);
          if (location.pathname === "/") {
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
                break;
            }
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const hideLoginButton = location.pathname.startsWith("/auth") || !!user;

  return (
    <div className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <header className="max-w-5xl mx-auto rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white/75 dark:bg-gray-900/75 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between h-14 px-4 sm:px-5">
          {/* Logo */}
          <Link
            to="/"
            onMouseEnter={() => setPulseKey((k) => k + 1)}
            className="flex items-center gap-2.5"
          >
            <PulseMark replay={pulseKey} />
            <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">
              Organ<span className="text-gray-400 dark:text-gray-500 font-normal">Donor</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-full bg-gray-100/70 dark:bg-gray-800/60">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
                    active
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white dark:bg-gray-700 shadow-sm"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={darkMode ? "moon" : "sun"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                  className="block"
                >
                  {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                </motion.span>
              </AnimatePresence>
            </button>

            {!hideLoginButton && (
              <Link
                to="/auth"
                className="hidden sm:inline-flex bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium px-4 py-2 rounded-full hover:opacity-85 transition-opacity"
              >
                Log in
              </Link>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            )}

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "close" : "open"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-t border-gray-200/70 dark:border-gray-800"
            >
              <div className="px-3 py-3 space-y-0.5">
                {NAV_LINKS.map((link) => {
                  const active = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                <div className="pt-2 mt-2 border-t border-gray-200/70 dark:border-gray-800 flex flex-col gap-1.5">
                  {!hideLoginButton && (
                    <Link
                      to="/auth"
                      onClick={() => setMenuOpen(false)}
                      className="text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-full text-sm font-medium hover:opacity-85 transition-opacity"
                    >
                      Log in
                    </Link>
                  )}
                  {user && (
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}