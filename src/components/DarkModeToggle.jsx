// src/components/DarkModeToggle.jsx
import React, { useContext } from "react";
import { DarkModeContext } from "../context/DarkModeContext";

export default function DarkModeToggle() {
  const { darkMode, setDarkMode } = useContext(DarkModeContext);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition"
      title="Toggle dark mode"
    >
      {darkMode ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
