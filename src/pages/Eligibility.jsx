import React, { useContext } from "react";
import { DarkModeContext } from "../context/DarkModeContext";
import { motion } from "framer-motion";

// Per-icon animation: each one moves the way its subject would.
const iconMotion = {
  "✅": {
    animate: { scale: [1, 1.2, 1] },
    transition: { duration: 1.2, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" },
  },
  "🤲": {
    animate: { y: [0, -5, 0], rotate: [0, 4, -4, 0] },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
  "🩺": {
    animate: { rotate: [0, -10, 10, -6, 0] },
    transition: { duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" },
  },
  "📄": {
    animate: { y: [0, -4, 0] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function Eligibility() {
  const { darkMode } = useContext(DarkModeContext);

  const eligibilityList = [
    {
      icon: "✅",
      title: "Minimum Age",
      desc: "Any person 18 years or older can pledge to donate organs.",
    },
    {
      icon: "🤲",
      title: "Voluntary Consent",
      desc: "The donor must willingly authorize the removal of organs and/or tissues.",
    },
    {
      icon: "🩺",
      title: "Health Condition",
      desc: "Donors should be in generally good health; medical evaluation will confirm eligibility.",
    },
    {
      icon: "📄",
      title: "Legal Documentation",
      desc: "Proper consent documentation must be completed according to national regulations.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-6 py-12">
      <h1 className="text-4xl font-bold text-green-700 mb-12 text-center" data-aos="fade-down">
        Organ Donation Eligibility
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {eligibilityList.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-green-600 hover:shadow-xl hover:scale-105 transform transition"
            data-aos="fade-up"
            data-aos-delay={index * 150}
          >
            <motion.div
              className="text-5xl text-green-600 mb-4"
              animate={iconMotion[item.icon].animate}
              transition={iconMotion[item.icon].transition}
              whileHover={{ scale: 1.2 }}
            >
              {item.icon}
            </motion.div>
            <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-gray-700 dark:text-gray-300">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}