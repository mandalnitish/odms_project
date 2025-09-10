import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import CallCloudFunction from "./CallCloudFunction";
import DarkModeToggle from "./DarkModeToggle";

export default function DashboardShell() {
  const navigate = useNavigate();
  const [donorId, setDonorId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");

  async function handleSignOut() {
    await signOut(auth);
    navigate("/auth");
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-200 to-pink-300 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">ODMS Dashboard</h1>
          <div className="flex items-center space-x-4">
            <DarkModeToggle />
            <button
              onClick={() => navigate("/admin")}
              className="px-4 py-2 rounded bg-white/40 hover:bg-white/60 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
            >
              Admin Panel
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <select
            value={filterBlood}
            onChange={(e) => setFilterBlood(e.target.value)}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">All Blood Groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter Organ Type (e.g. kidney)"
            value={filterOrgan}
            onChange={(e) => setFilterOrgan(e.target.value)}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>

        {/* Stats and Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 rounded-lg p-6 shadow dark:bg-gray-800 dark:text-gray-200">
            <h2 className="text-xl font-semibold mb-2">Donor / Recipient Stats</h2>
            <p>Stats placeholder</p>
          </div>

          <div className="bg-white/70 rounded-lg p-6 shadow dark:bg-gray-800 dark:text-gray-200">
            <h2 className="text-xl font-semibold mb-2">Recent Matches</h2>
            <p>Recent matches placeholder</p>
          </div>

          <div className="bg-white/70 rounded-lg p-6 shadow dark:bg-gray-800 dark:text-gray-200">
            <h2 className="text-xl font-semibold mb-2">Notifications</h2>
            <p>Notifications placeholder</p>
          </div>
        </div>

        {/* Run Match Runner Form */}
        <div className="bg-white/90 rounded-lg p-6 shadow max-w-md mx-auto dark:bg-gray-800 dark:text-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-center">Run Match Runner Cloud Function</h2>

          <label className="block mb-2 font-medium">Donor ID:</label>
          <input
            type="text"
            value={donorId}
            onChange={(e) => setDonorId(e.target.value)}
            placeholder="Enter donor ID"
            className="w-full mb-4 p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />

          <label className="block mb-2 font-medium">Recipient ID:</label>
          <input
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder="Enter recipient ID"
            className="w-full mb-6 p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />

          <CallCloudFunction donorId={donorId} recipientId={recipientId} />
        </div>
      </div>
    </div>
  );
}

export function DashboardHeader() {
  return (
    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 shadow-md transition-colors duration-500">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <DarkModeToggle />
    </header>
  );
}
