// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

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
      className="bg-gray-900 text-gray-300 mt-12"
    >
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* TOP GRID */}
        <motion.div
          variants={container}
          className="
            grid gap-8
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
          "
        >
          {/* Branding */}
          <motion.div variants={item} className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-green-500">
              Organ Donor Management System
            </h2>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              A secure, AI-powered platform connecting donors,
              recipients, doctors, and hospitals to save lives.
            </p>
          </motion.div>

          {/* Public Pages */}
          <motion.div variants={item} className="text-center sm:text-left">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              Explore
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                ["/", "Home"],
                ["/why-donate", "Why Donate"],
                ["/how-it-works", "How It Works"],
                ["/eligibility", "Eligibility"],
              ].map(([path, label]) => (
                <motion.li key={path} whileHover={{ x: 6 }}>
                  <Link
                    to={path}
                    className="hover:text-green-400 transition"
                  >
                    {label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Smart Features */}
          <motion.div variants={item} className="text-center sm:text-left">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              Smart Features
            </h3>
            <ul className="space-y-2 text-sm">
              <motion.li whileHover={{ x: 6 }}>
                <Link
                  to="/chatbot"
                  className="font-medium text-green-400 hover:underline"
                >
                  AI Assistant
                </Link>
              </motion.li>

              {user && (role === "donor" || role === "recipient") && (
                <motion.li whileHover={{ x: 6 }}>
                  <Link
                    to="/verify-documents"
                    className="font-medium text-green-400 hover:underline"
                  >
                    Verify Documents
                  </Link>
                </motion.li>
              )}

              {user && (role === "admin" || role === "doctor") && (
                <motion.li whileHover={{ x: 6 }}>
                  <Link
                    to="/hospitals"
                    className="hover:text-green-400 transition"
                  >
                    Hospitals
                  </Link>
                </motion.li>
              )}
            </ul>
          </motion.div>

          {/* System Info */}
          <motion.div variants={item} className="text-center sm:text-left">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              System
            </h3>
            <p className="text-sm text-gray-400">
              Secure • Verified • Role-based
            </p>
            <p className="text-xs text-gray-500 mt-2">
              React · Firebase Hosting · AI Services
            </p>
          </motion.div>
        </motion.div>

        {/* DIVIDER */}
        <motion.div
          variants={item}
          className="border-t border-gray-700 my-8"
        />

        {/* BOTTOM BAR */}
        <motion.div
          variants={item}
          className="
            flex flex-col sm:flex-row
            items-center justify-between
            gap-3 text-xs text-gray-400 text-center
          "
        >
          <span>
            © {new Date().getFullYear()} Organ Donor Management System
          </span>
          <span>All rights reserved</span>
        </motion.div>
      </div>
    </motion.footer>
  );
}
