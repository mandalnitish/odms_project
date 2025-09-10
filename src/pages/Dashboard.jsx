// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Simple local matcher
function simpleLocalMatch(donors, recipients) {
  const matches = [];
  donors.forEach((d) => {
    recipients.forEach((r) => {
      let score = 0;
      if (d.bloodGroup && r.bloodGroup && d.bloodGroup === r.bloodGroup) score += 50;

      const donorOrgans = (d.organTypes || []).map((s) => s.toLowerCase());
      const recipientOrgans = Array.isArray(r.organNeeded) ? r.organNeeded : [r.organNeeded || ""];
      const recipientOrgansLow = recipientOrgans.map((s) => (s || "").toLowerCase());

      const organCommon = donorOrgans.some((o) =>
        recipientOrgansLow.some((ro) => ro && (ro === o || ro.includes(o) || o.includes(ro)))
      );
      if (organCommon) score += 40;

      if (d.email) score += 5;
      if (r.email) score += 5;

      if (score > 0) {
        matches.push({
          donorId: d.id,
          recipientId: r.id,
          donorName: d.fullName || d.email || "—",
          recipientName: r.fullName || r.email || "—",
          score,
          donor: d,
          recipient: r,
        });
      }
    });
  });

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [donors, setDonors] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [search, setSearch] = useState("");

  // Dark mode state
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // Load user, donors, recipients
  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setUserData(null);
          setLoading(false);
          return;
        }

        const udoc = await getDoc(doc(db, "users", user.uid));
        if (mounted) setUserData(udoc.exists() ? { id: udoc.id, ...udoc.data() } : null);

        const donorsQ = query(collection(db, "users"), where("role", "==", "donor"), orderBy("fullName"));
        const recipsQ = query(collection(db, "users"), where("role", "==", "recipient"), orderBy("fullName"));

        const [dSnap, rSnap] = await Promise.all([getDocs(donorsQ), getDocs(recipsQ)]);
        if (mounted) {
          setDonors(dSnap.docs.map((s) => ({ id: s.id, ...s.data() })));
          setRecipients(rSnap.docs.map((s) => ({ id: s.id, ...s.data() })));
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAll();
    return () => { mounted = false; };
  }, []);

  // Filtered donors/recipients
  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      if (filterBlood && (!d.bloodGroup || !d.bloodGroup.toLowerCase().includes(filterBlood.toLowerCase()))) return false;
      if (filterOrgan && (!d.organTypes || !d.organTypes.join(" ").toLowerCase().includes(filterOrgan.toLowerCase()))) return false;
      if (search && !(`${d.fullName || ""} ${d.email || ""} ${d.mobile || ""}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [donors, filterBlood, filterOrgan, search]);

  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      if (filterBlood && (!r.bloodGroup || !r.bloodGroup.toLowerCase().includes(filterBlood.toLowerCase()))) return false;
      const organField = (r.organNeeded || r.organWanted || r.organTypes || []).toString();
      if (filterOrgan && !organField.toLowerCase().includes(filterOrgan.toLowerCase())) return false;
      if (search && !(`${r.fullName || ""} ${r.email || ""} ${r.mobile || ""}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [recipients, filterBlood, filterOrgan, search]);

  if (loading) return <Spinner />;

  if (!userData || userData.role !== "doctor") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold">Access restricted</h2>
          <p className="mt-2">This dashboard view is for doctors only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome Doctor</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Here you can view and manage your patient matches.
            </p>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-2 rounded bg-gray-700 dark:bg-gray-200 text-white dark:text-black hover:opacity-90 transition"
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={() => exportAllExcel()}
              className="px-3 py-2 bg-green-600 text-white rounded hover:opacity-90 transition"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportAllPDF()}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:opacity-90 transition"
            >
              Export PDF
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded shadow flex flex-wrap gap-3 items-center">
          <input
            placeholder="Search name / email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64"
          />
          <select
            value={filterBlood}
            onChange={(e) => setFilterBlood(e.target.value)}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All blood groups</option>
            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>
          <input
            placeholder="Organ (e.g. kidney)"
            value={filterOrgan}
            onChange={(e) => setFilterOrgan(e.target.value)}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={() => { setFilterBlood(""); setFilterOrgan(""); setSearch(""); }}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:opacity-90 transition"
          >
            Clear
          </button>
        </div>

        {/* Donors & Recipients */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Donors */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Donors ({filteredDonors.length})</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {filteredDonors.map((d) => (
                <div key={d.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{d.fullName || "—"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">{d.email || "-"}</div>
                    <div className="text-sm">Blood: {d.bloodGroup || "—"} | Organs: {(d.organTypes || []).join(", ") || "—"}</div>
                  </div>
                  <button
                    onClick={() => setMatches(simpleLocalMatch([d], recipients))}
                    className="px-2 py-1 bg-indigo-600 text-white rounded hover:opacity-90 transition"
                  >
                    Find Matches
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Recipients ({filteredRecipients.length})</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {filteredRecipients.map((r) => (
                <div key={r.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{r.fullName || "—"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">{r.email || "-"}</div>
                    <div className="text-sm">Blood: {r.bloodGroup || "—"} | Needs: {(r.organNeeded || r.organTypes || []).toString() || "—"}</div>
                  </div>
                  <button
                    onClick={() => setMatches(simpleLocalMatch(donors, [r]))}
                    className="px-2 py-1 bg-indigo-600 text-white rounded hover:opacity-90 transition"
                  >
                    Find Matches
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Proposed Matches */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Proposed Matches ({matches.length})</h3>
          {matches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No proposed matches. Use "Find Matches" or export data to see results.
            </p>
          ) : (
            <div className="space-y-3">
              {matches.map((m, idx) => (
                <div key={`${m.donorId}_${m.recipientId}_${idx}`} className="p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.donorName} → {m.recipientName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">Score: {Math.round(m.score)}</div>
                    <div className="text-sm">Donor: {m.donor?.mobile || m.donor?.email || "—"} • Recipient: {m.recipient?.mobile || m.recipient?.email || "—"}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handleDecision(m, "approved")}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:opacity-90 transition"
                      disabled={m._decision === "approved"}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(m, "rejected")}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:opacity-90 transition"
                      disabled={m._decision === "rejected"}
                    >
                      Reject
                    </button>
                    {m._decision && <span className="text-sm text-gray-500 dark:text-gray-300">{m._decision}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Handle decision
  async function handleDecision(match, status) {
    try {
      const payload = {
        donorId: match.donorId,
        recipientId: match.recipientId,
        score: match.score || 0,
        status,
        decidedBy: auth.currentUser?.uid || null,
        decidedAt: serverTimestamp(),
      };
      await addDoc(collection(db, "matches"), payload);
      setMatches((prev) => prev.map((m) =>
        m.donorId === match.donorId && m.recipientId === match.recipientId ? { ...m, _decision: status } : m
      ));
    } catch (err) {
      console.error("Error saving match decision:", err);
      setError("Failed to save decision: " + (err.message || err));
    }
  }

  // Export functions
  function exportAllExcel() {
    const all = [
      ...donors.map((u) => ({ Type: "Donor", id: u.id, Name: u.fullName || "", Email: u.email || "", Mobile: u.mobile || "", Role: u.role || "donor", Blood: u.bloodGroup || "", Organs: (u.organTypes || []).join(", ") })),
      ...recipients.map((u) => ({ Type: "Recipient", id: u.id, Name: u.fullName || "", Email: u.email || "", Mobile: u.mobile || "", Role: u.role || "recipient", Blood: u.bloodGroup || "", Organs: (u.organNeeded || u.organTypes || []).toString() })),
    ];
    const ws = XLSX.utils.json_to_sheet(all);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "all_users");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `odms_all_users_${new Date().toISOString()}.xlsx`);
  }

  function exportAllPDF() {
    const rows = [
      ...donors.map((u) => [ "Donor", u.fullName || "", u.email || "", u.mobile || "", u.bloodGroup || "", (u.organTypes || []).join(", ") ]),
      ...recipients.map((u) => [ "Recipient", u.fullName || "", u.email || "", u.mobile || "", u.bloodGroup || "", (u.organNeeded || u.organTypes || []).toString() ]),
    ];
    const docp = new jsPDF();
    docp.autoTable({ head: [["Type","Name","Email","Mobile","Blood","Organs"]], body: rows, startY: 10 });
    docp.save(`odms_all_users_${new Date().toISOString()}.pdf`);
  }
}
