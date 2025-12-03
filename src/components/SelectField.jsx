// src/components/SelectField.jsx
import React from "react";

export default function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col w-full mb-4">
      <label className="text-sm font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="border border-gray-300 rounded-md p-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
