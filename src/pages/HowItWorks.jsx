import React, { useContext } from "react";
import { DarkModeContext } from "../context/DarkModeContext";

export default function HowItWorks() {
  const { darkMode } = useContext(DarkModeContext);

  const steps = [
    {
      icon: "📝",
      title: "Registration",
      desc: "Individuals willing to donate organs can register online or at designated centers.",
    },
    {
      icon: "🩺",
      title: "Medical Evaluation",
      desc: "Potential donors undergo medical and psychological evaluations to ensure safety.",
    },
    {
      icon: "🔗",
      title: "Matching & Allocation",
      desc: "Donor organs are matched with recipients based on medical criteria and compatibility.",
    },
    {
      icon: "🏥",
      title: "Transplantation",
      desc: "The transplant procedure is performed by trained professionals in accredited hospitals.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-16 px-6">
      <h1 className="text-4xl font-bold text-green-700 mb-12 text-center" data-aos="fade-down">
        How Organ Donation Works
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-green-600 hover:shadow-xl hover:scale-105 transform transition duration-300"
            data-aos="fade-up"
            data-aos-delay={index * 150}
          >
            <div className="text-5xl mb-4 text-green-600 animate-bounce">{step.icon}</div>
            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
            <p className="text-gray-700 dark:text-gray-300 text-base">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
