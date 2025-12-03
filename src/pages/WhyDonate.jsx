import React, { useContext } from "react";
import { DarkModeContext } from "../context/DarkModeContext";

export default function WhyDonate() {
  const { darkMode } = useContext(DarkModeContext);

  const points = [
    {
      icon: "❤️",
      title: "Save Lives",
      desc: "A single organ donor can save multiple lives and provide hope to patients in need.",
    },
    {
      icon: "🤝",
      title: "Help Families",
      desc: "Support families during challenging times by giving their loved ones a second chance.",
    },
    {
      icon: "🌱",
      title: "Create Awareness",
      desc: "Encourage more people to register as donors and increase awareness about organ donation.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-6 py-12">
      <h1 className="text-4xl font-bold text-center text-green-700 mb-12" data-aos="fade-down">
        Why Donate Organs?
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {points.map((point, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-green-600 hover:shadow-xl hover:scale-105 transform transition"
            data-aos="fade-up"
            data-aos-delay={index * 150}
          >
            <div className="text-5xl text-green-600 mb-4">{point.icon}</div>
            <h3 className="text-xl font-semibold mb-3">{point.title}</h3>
            <p className="text-gray-700 dark:text-gray-300">{point.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
