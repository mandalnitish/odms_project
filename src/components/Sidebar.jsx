// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiHome, FiUsers, FiSettings, FiMenu } from "react-icons/fi";
import { useMediaQuery } from "react-responsive";
import logo from "../assets/logo.png"; // Your logo

const menuItems = [
  { name: "Dashboard", icon: <FiHome />, link: "/" },
  { name: "Users", icon: <FiUsers />, link: "/users" },
  { name: "Settings", icon: <FiSettings />, link: "/settings" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Auto-collapse on small screens
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Sidebar animations
  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 70 } },
    closed: { x: "-100%", transition: { type: "spring", stiffness: 70 } },
  };

  const menuItemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: (i) => ({
      x: 0,
      opacity: 1,
      transition: { delay: i * 0.1, duration: 0.3 },
    }),
  };

  return (
    <>
      {/* Menu Button */}
      <div className="p-2 bg-white/10 backdrop-blur-md fixed top-4 left-4 z-50 rounded-lg shadow-lg cursor-pointer">
        <FiMenu size={24} onClick={toggleSidebar} />
      </div>

      {/* Overlay for Mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(isOpen || isMobileOpen) && (
          <motion.aside
            className={`fixed top-0 left-0 h-full w-64 glass-bg backdrop-blur-xl shadow-lg z-50 p-4 flex flex-col`}
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
          >
            {/* Logo + Toggle */}
            <div className="flex items-center justify-between mb-8">
              {isOpen && <img src={logo} alt="Logo" className="h-10 object-contain" />}
              <button
                onClick={toggleSidebar}
                className="text-white focus:outline-none"
              >
                <FiMenu />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex flex-col gap-2">
              {menuItems.map((item, i) => (
                <motion.a
                  href={item.link}
                  key={item.name}
                  className="flex items-center gap-3 p-3 rounded-lg text-white hover:bg-white/20 cursor-pointer"
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={menuItemVariants}
                >
                  <motion.div
                    animate={{ rotate: isMobileOpen || isOpen ? 0 : -90 }}
                    transition={{ duration: 0.3 }}
                  >
                    {item.icon}
                  </motion.div>
                  {(!isMobile && isOpen) || isMobile ? (
                    <span>{item.name}</span>
                  ) : null}
                </motion.a>
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
