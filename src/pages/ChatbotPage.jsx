// ----------------------------------------------
// src/pages/ChatbotPage.jsx
// ----------------------------------------------
import React from "react";
import { motion } from "framer-motion";
import ODMSChatbot from "../components/ODMSChatbot";

/* ------------------ Animation Variants ------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};

/* ------------------ Page Component ------------------ */

const ChatbotPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* ---------- Chatbot Component ---------- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <ODMSChatbot />
        </motion.div>

        {/* ---------- Info Cards Section ---------- */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">

          {/* Knowledge Base */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, y: -6 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-all"
          >
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-4xl mb-3"
            >
              📚
            </motion.div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
              Knowledge Base
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Access comprehensive information about organ donation, eligibility,
              and processes.
            </p>
          </motion.div>

          {/* Myth Busting */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, y: -6 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-all"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-4xl mb-3"
            >
              💡
            </motion.div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
              Myth Busting
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Get facts and debunk common misconceptions about organ donation.
            </p>
          </motion.div>

          {/* 24/7 Support */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, y: -6 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-all"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-4xl mb-3"
            >
              🤝
            </motion.div>
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
              24/7 Support
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Our AI assistant is available anytime to guide you through your
              journey.
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
