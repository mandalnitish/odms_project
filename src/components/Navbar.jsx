// src/components/Navbar.jsx
import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import logo from "../assets/logo.png";

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Hide login button if on /auth page
  const hideLoginButton = location.pathname.startsWith("/auth");

  // Slightly increase blur/shadow once the page has scrolled, same
  // behavior as Header.jsx, so both navs feel like one system.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`max-w-5xl mx-auto flex items-center justify-between h-14 px-4 sm:px-5 rounded-2xl border transition-all duration-300 ${
          scrolled
            ? "border-gray-200/70 dark:border-gray-800 bg-white/85 dark:bg-gray-900/85 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.2)]"
            : "border-gray-200/50 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        } backdrop-blur-xl`}
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt=""
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="w-7 h-7 object-contain select-none"
            style={{ WebkitUserDrag: "none", userSelect: "none" }}
          />
          <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">
            Organ<span className="text-gray-400 dark:text-gray-500 font-normal">Donor</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <NavLink
            to="/tracking"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <MapPin size={14} />
            Live Tracking
          </NavLink>

          {!hideLoginButton && (
            <Link
              to="/auth?tab=login"
              className="px-4 py-2 text-[13px] font-medium rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Log in
            </Link>
          )}
          <Link
            to="/auth?tab=signup"
            className="px-4 py-2 text-[13px] font-medium rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-85 transition-opacity"
          >
            Sign up
          </Link>
        </div>
      </motion.nav>
    </div>
  );
}