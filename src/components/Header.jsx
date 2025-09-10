// src/components/Header.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { DarkModeContext } from "../context/DarkModeContext";

export default function Header() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  // Track user auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setUserRole(role);

          // Redirect instantly based on role if on home page
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
    <header className="bg-gray-100 dark:bg-gray-800 shadow transition-colors duration-700 ease-in-out">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-green-600">
          Organ Donor Management
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex space-x-6">
          <Link
            to="/"
            className="hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
          >
            Home
          </Link>
          <Link
            to="/why-donate"
            className="hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
          >
            Why Donate
          </Link>
          <Link
            to="/how-it-works"
            className="hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
          >
            How It Works
          </Link>
          <Link
            to="/eligibility"
            className="hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
          >
            Eligibility
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>

          {/* Login / Logout */}
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
              className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-400 font-medium"
            >
              Logout
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              {menuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-max-height duration-500 ease-in-out ${
          menuOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="bg-gray-100 dark:bg-gray-800 px-4 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-green-600 dark:hover:text-green-400"
          >
            Home
          </Link>
          <Link
            to="/why-donate"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-green-600 dark:hover:text-green-400"
          >
            Why Donate
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-green-600 dark:hover:text-green-400"
          >
            How It Works
          </Link>
          <Link
            to="/eligibility"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-green-600 dark:hover:text-green-400"
          >
            Eligibility
          </Link>

          {!hideLoginButton && (
            <Link
              to="/auth"
              onClick={() => setMenuOpen(false)}
              className="block bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-400"
            >
              Login
            </Link>
          )}
          {user && (
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="block w-full bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-400"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
