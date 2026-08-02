// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import logo from "../assets/logo.png";

const container = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Footer() {
  const { user, role } = useAuth();

  return (
    <motion.footer
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="relative mt-12 bg-gray-950 text-gray-400"
    >
      {/* Thin gradient accent line at the very top, echoes the brand
          green without making the whole footer green */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14 md:py-16">
        {/* TOP GRID
            - 1 column on phones (everything stacks, centered)
            - 2 columns on tablets
            - 4 columns on desktop */}
        <motion.div
          variants={container}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-center sm:text-left"
        >
          {/* Branding */}
          <motion.div variants={item} className="sm:col-span-2 md:col-span-1">
            <div className="flex items-start justify-center sm:justify-start gap-2.5 mb-3">
              <img
                src={logo}
                alt=""
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="w-9 h-9 object-contain select-none shrink-0 mt-0.5"
                style={{ WebkitUserDrag: "none", userSelect: "none" }}
              />
              <span className="text-[15px] font-semibold tracking-tight leading-snug text-green-500 text-left">
                Organ Donor Management System
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto sm:mx-0">
              A secure, AI-powered platform connecting donors, recipients,
              doctors, and hospitals to save lives.
            </p>
          </motion.div>

          {/* Public Pages */}
          <motion.div variants={item}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ["/", "Home"],
                ["/why-donate", "Why Donate"],
                ["/how-it-works", "How It Works"],
                ["/eligibility", "Eligibility"],
              ].map(([path, label]) => (
                <motion.li key={path} whileHover={{ x: 6 }}>
                  <Link
                    to={path}
                    className="text-gray-500 hover:text-green-400 transition-colors"
                  >
                    {label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Smart Features */}
          <motion.div variants={item}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Smart Features
            </h3>
            <ul className="space-y-2.5 text-sm">
              <motion.li whileHover={{ x: 6 }}>
                <Link
                  to="/chatbot"
                  className="font-medium text-green-400 hover:text-green-300 transition-colors"
                >
                  AI Assistant
                </Link>
              </motion.li>

              {user && (role === "donor" || role === "recipient") && (
                <motion.li whileHover={{ x: 6 }}>
                  <Link
                    to="/verify-documents"
                    className="font-medium text-green-400 hover:text-green-300 transition-colors"
                  >
                    Verify Documents
                  </Link>
                </motion.li>
              )}

              {user && (role === "admin" || role === "doctor") && (
                <motion.li whileHover={{ x: 6 }}>
                  <Link
                    to="/hospitals"
                    className="text-gray-500 hover:text-green-400 transition-colors"
                  >
                    Hospitals
                  </Link>
                </motion.li>
              )}
            </ul>
          </motion.div>

          {/* System Info */}
          <motion.div variants={item}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-4">
              System
            </h3>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
              {["Secure", "Verified", "Role-based"].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-900 border border-gray-800 text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              React · Firebase Hosting · AI Services
            </p>
          </motion.div>
        </motion.div>

        {/* DIVIDER */}
        <motion.div variants={item} className="border-t border-gray-800/80 my-8 sm:my-10" />

        {/* BOTTOM BAR */}
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 text-center sm:text-left"
        >
          <span>© {new Date().getFullYear()} OrganDonor. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </span>
        </motion.div>
      </div>
    </motion.footer>
  );
}