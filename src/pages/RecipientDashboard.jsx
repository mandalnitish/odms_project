// src/pages/RecipientDashboard.jsx
import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export default function RecipientDashboard() {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [newMatchAlert, setNewMatchAlert] = useState(false);

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Dark mode handler
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // Fetch user profile
  useEffect(() => {
    async function fetchUser() {
      if (!auth.currentUser) return;
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) setUserData(docSnap.data());
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    }
    fetchUser();
  }, []);

  // Fetch matches with real-time updates
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "matches"),
      where("recipientId", "==", auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Detect new matches
      const oldIds = matches.map((m) => m.id);
      const hasNew = list.some((m) => !oldIds.includes(m.id));
      if (hasNew) setNewMatchAlert(true);

      setMatches(list);
    });

    return () => unsub();
  }, [matches]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) Notification.requestPermission();
  }, []);

  // Play sound or show browser notification for new matches
  useEffect(() => {
    if (newMatchAlert) {
      // Optional sound
      // new Audio("/notification.mp3").play();

      if (Notification.permission === "granted") {
        new Notification("New organ match available!");
      }
    }
  }, [newMatchAlert]);

  // Export to Excel
  const exportToExcel = (list) => {
    const ws = XLSX.utils.json_to_sheet(
      list.map((m) => ({
        Donor: m.donorName,
        Organ: m.organType,
        Blood: m.bloodGroup,
        Score: m.score,
        Status: m.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matches");
    XLSX.writeFile(wb, "recipient_matches.xlsx");
  };

  // Export to PDF
  const exportToPDF = (list) => {
    const doc = new jsPDF();
    doc.text("Recipient Matches Report", 14, 20);
    const rows = list.map((m) => [
      m.donorName,
      m.organType,
      m.bloodGroup,
      m.score,
      m.status,
    ]);
    doc.autoTable?.({
      head: [["Donor", "Organ", "Blood", "Score", "Status"]],
      body: rows,
      startY: 28,
    });
    if (!doc.autoTable) {
      let y = 30;
      rows.forEach((r) => {
        doc.text(r.join(" | "), 14, y);
        y += 8;
      });
    }
    doc.save("recipient_matches.pdf");
  };

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    if (filterBlood && m.bloodGroup?.toLowerCase() !== filterBlood.toLowerCase())
      return false;
    if (filterOrgan && m.organType?.toLowerCase() !== filterOrgan.toLowerCase())
      return false;
    return true;
  });

  // Deduplicate matches
  const deduplicatedMatches = filteredMatches.filter(
    (match, index, self) =>
      index ===
      self.findIndex(
        (m) =>
          m.donorName === match.donorName &&
          m.organType === match.organType &&
          m.bloodGroup === match.bloodGroup
      )
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-purple-200 to-pink-300 dark:from-gray-900 dark:to-gray-800 dark:text-white transition-all">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, {userData?.fullName || "Recipient"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Manage your profile and view your matches
            </p>
          </div>
        </header>

        {/* Notification */}
        {newMatchAlert && (
          <div className="p-3 mb-4 rounded bg-green-500 text-white">
            🎉 New match available! Check below.
            <button
              className="ml-4 underline"
              onClick={() => setNewMatchAlert(false)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Profile */}
        <section className="mb-6 card-glass p-6 rounded-md shadow-md bg-white/20 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
          {userData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Name:</strong> {userData.fullName || "—"}
                </p>
                <p>
                  <strong>Blood Group:</strong> {userData.bloodGroup || "—"}
                </p>
                <p>
                  <strong>Organ Needed:</strong> {userData.organType || "—"}
                </p>
              </div>
            </div>
          ) : (
            <p>Loading profile...</p>
          )}
        </section>

        {/* Filters */}
        <section className="mb-4 flex flex-wrap gap-3 items-center card-glass p-4 rounded-md bg-white/20 dark:bg-gray-800">
          <select
            value={filterBlood}
            onChange={(e) => setFilterBlood(e.target.value)}
            className="p-2 rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Blood Groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={filterOrgan}
            onChange={(e) => setFilterOrgan(e.target.value)}
            className="p-2 rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Organs</option>
            {["Kidney", "Heart", "Liver", "Lung", "Eye"].map((o) => (
              <option key={o} value={o.toLowerCase()}>
                {o}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFilterBlood("");
              setFilterOrgan("");
            }}
            className="ml-auto p-2 bg-gray-200/30 dark:bg-gray-600 rounded"
          >
            Reset Filters
          </button>
        </section>

        {/* Matches */}
        <section className="card-glass p-4 rounded-md shadow-md bg-white/20 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold mb-4">Your Matches</h2>
          {loading && <p>Loading matches...</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {["Donor", "Organ", "Blood", "Score", "Status"].map((c) => (
                    <th
                      key={c}
                      className="p-2 border border-gray-300 dark:border-gray-600 text-left"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deduplicatedMatches.length > 0 ? (
                  deduplicatedMatches.map((m) => (
                    <tr
                      key={m.id}
                      className="odd:bg-white/10 even:bg-white/5 dark:odd:bg-gray-700 dark:even:bg-gray-800"
                    >
                      <td className="p-2 border border-gray-300 dark:border-gray-600">
                        {m.donorName}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600">
                        {m.organType}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600">
                        {m.bloodGroup}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600">
                        {m.score}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600">
                        {m.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      No matches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => exportToExcel(deduplicatedMatches)}
              className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 flex-1 sm:flex-auto text-center"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportToPDF(deduplicatedMatches)}
              className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 flex-1 sm:flex-auto text-center"
            >
              Export PDF
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
