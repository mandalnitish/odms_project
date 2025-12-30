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
import "jspdf-autotable";

function Spinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function StatusBadge({ status }) {
  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Pre-Op Preparation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Surgery In Progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Post-Op Recovery': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusColor(status)}`}>
      {status || "Unknown"}
    </span>
  );
}

function MatchDetailModal({ match, onClose }) {
  if (!match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)" }}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>📋</span>
              <span>Match Details</span>
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Match Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Donor Name</p>
                <p className="font-bold text-lg">{match.donorName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Organ Type</p>
                <p className="font-bold text-lg">{match.organType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Blood Group</p>
                <p className="font-bold text-lg">{match.bloodGroup}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Match Score</p>
                <p className="font-bold text-lg">{match.score}%</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">Status Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Match Status:</span>
                <StatusBadge status={match.status} />
              </div>
              {match.trackingStatus && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Surgery Status:</span>
                  <StatusBadge status={match.trackingStatus} />
                </div>
              )}
            </div>
          </div>

          {/* Hospital Info */}
          {match.hospital && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>🏥</span>
                <span>Hospital Information</span>
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hospital Name</p>
                  <p className="font-medium">{match.hospital}</p>
                </div>
                {match.hospitalAddress && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                    <p className="font-medium">{match.hospitalAddress}</p>
                  </div>
                )}
                {match.scheduledDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled Date</p>
                    <p className="font-medium">{new Date(match.scheduledDate).toLocaleString()}</p>
                  </div>
                )}
                {match.surgeon && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Surgeon</p>
                    <p className="font-medium">{match.surgeon}</p>
                  </div>
                )}
                {match.estimatedDuration && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Duration</p>
                    <p className="font-medium">{match.estimatedDuration}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          {match.timeline && match.timeline.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>🕐</span>
                <span>Timeline</span>
              </h3>
              <div className="space-y-3">
                {match.timeline.map((event, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${idx !== match.timeline.length - 1 ? 'border-b border-gray-200 dark:border-gray-600 pb-3' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{event.status}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.description && <p className="text-sm mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {match.notes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-4">Notes</h3>
              <p className="text-gray-700 dark:text-gray-300">{match.notes}</p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipientDashboard() {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMatchAlert, setNewMatchAlert] = useState(false);

  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

// Fetch user profile + hospital details
useEffect(() => {
  async function fetchUser() {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        let hospitalName = "—";
        let hospitalCity = "—";

        // If recipient has hospitalId → fetch hospital document
        if (data.hospitalId) {
          try {
            const hospitalRef = doc(db, "hospitals", data.hospitalId);
            const hospSnap = await getDoc(hospitalRef);

            if (hospSnap.exists()) {
              const hosp = hospSnap.data();
              hospitalName = hosp.name || "—";
              hospitalCity = hosp.city || "—";
            }
          } catch (e) {
            console.error("Error loading hospital:", e);
          }
        }

        setUserData({
          ...data,
          hospitalName,
          hospitalCity,
        });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }

  fetchUser();
}, []);


  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) Notification.requestPermission();
  }, []);

  // Fetch matches with real-time updates
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);

    const q = query(
      collection(db, "matches"),
      where("recipientId", "==", auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Detect new matches
      const oldIds = matches.map((m) => m.id);
      const hasNew = list.some((m) => !oldIds.includes(m.id));
      
      if (hasNew && matches.length > 0) {
        setNewMatchAlert(true);
        
        // Show browser notification
        if (Notification.permission === "granted") {
          new Notification("New Organ Match!", {
            body: "A new donor match has been found for you!",
            icon: "/favicon.ico"
          });
        }
      }

      setMatches(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Export to Excel
  const exportToExcel = (list) => {
    const ws = XLSX.utils.json_to_sheet(
      list.map((m) => ({
        Donor: m.donorName,
        Organ: m.organType,
        Blood: m.bloodGroup,
        Score: m.score,
        Status: m.status,
        TrackingStatus: m.trackingStatus || "Not Started",
        Hospital: m.hospital || "—",
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

  // Filter and deduplicate matches
  const filteredMatches = matches.filter((m) => {
    const blood = m.bloodGroup?.toLowerCase() || "";
    const organ = m.organType?.toLowerCase() || "";
    const status = m.status || "";
    const filterB = filterBlood.toLowerCase();
    const filterO = filterOrgan.toLowerCase();
    
    if (filterB && blood !== filterB) return false;
    if (filterO && organ !== filterO) return false;
    if (filterStatus && status !== filterStatus) return false;
    return true;
  });

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
    <div className="min-h-screen p-4 lg:p-8 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all">
      {loading && <Spinner />}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* New Match Alert */}
        {newMatchAlert && (
          <div className="bg-green-500 text-white rounded-2xl p-4 mb-6 shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-lg">New Match Available!</p>
                <p className="text-sm">A potential donor has been found for you.</p>
              </div>
            </div>
            <button
              onClick={() => setNewMatchAlert(false)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-xl border border-white/20">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome, {userData?.fullName || "Recipient"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Track your organ transplant journey</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToExcel(deduplicatedMatches)}
                className="px-4 py-3 bg-green-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <span>📊</span>
                  <span className="hidden sm:inline">Excel</span>
                </span>
              </button>
              <button
                onClick={() => exportToPDF(deduplicatedMatches)}
                className="px-4 py-3 bg-red-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <span>📄</span>
                  <span className="hidden sm:inline">PDF</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[
            { label: "Total Matches", value: deduplicatedMatches.length, icon: "🔗", gradient: "from-blue-500 to-blue-600" },
            { label: "Pending", value: deduplicatedMatches.filter(m => m.status === "Pending").length, icon: "⏳", gradient: "from-yellow-500 to-yellow-600" },
            { label: "Approved", value: deduplicatedMatches.filter(m => m.status === "Approved").length, icon: "✅", gradient: "from-green-500 to-green-600" },
            { label: "Completed", value: deduplicatedMatches.filter(m => m.trackingStatus === "Completed").length, icon: "🎉", gradient: "from-emerald-500 to-emerald-600" }
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:scale-105 transition-transform"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                  {stat.icon}
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Profile Card */}
        {userData && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-lg border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>👤</span>
              <span>Your Profile</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    {userData.fullName?.split(" ").map(n => n[0]).join("") || "R"}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{userData.fullName || "—"}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{auth.currentUser?.email || "—"}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Blood Group</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{userData.bloodGroup || "—"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Organ Needed</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{userData.organType || "—"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hospital</p>
                <p className="text-xl font-bold">{userData.hospitalName || "—"}</p>
                <p className="text-sm text-gray-500">{userData.hospitalCity || ""}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-lg border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterBlood}
              onChange={(e) => setFilterBlood(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Blood Groups</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={filterOrgan}
              onChange={(e) => setFilterOrgan(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Organs</option>
              {["Kidney", "Heart", "Liver", "Lung", "Eye", "Pancreas"].map(o => (
                <option key={o} value={o.toLowerCase()}>{o}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button
              onClick={() => {
                setFilterBlood("");
                setFilterOrgan("");
                setFilterStatus("");
              }}
              className="px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-2 mb-6 inline-flex gap-2 shadow-lg border border-white/20">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "matches", label: "My Matches", icon: "🔗" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl transition-all font-medium ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6">
              {/* Recent Matches */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>🔔</span>
                  <span>Recent Matches</span>
                </h3>
                <div className="space-y-3">
                  {deduplicatedMatches.slice(0, 5).map((match, idx) => (
                    <div
                      key={match.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
                      onClick={() => setSelectedMatch(match)}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Match with {match.donorName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{match.organType} - {match.bloodGroup}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={match.status} />
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Score: {match.score}</span>
                      </div>
                    </div>
                  ))}
                  {deduplicatedMatches.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No matches yet. You'll be notified when a match is found.</p>
                  )}
                </div>
              </div>

              {/* Match Statistics */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>📈</span>
                  <span>Match Statistics</span>
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Pending Review", value: deduplicatedMatches.filter(m => m.status === "Pending").length, color: "bg-yellow-500" },
                    { label: "Approved", value: deduplicatedMatches.filter(m => m.status === "Approved").length, color: "bg-green-500" },
                    { label: "Surgery Scheduled", value: deduplicatedMatches.filter(m => m.trackingStatus === "Scheduled").length, color: "bg-blue-500" },
                    { label: "In Progress", value: deduplicatedMatches.filter(m => m.trackingStatus === "Surgery In Progress").length, color: "bg-orange-500" },
                    { label: "Completed", value: deduplicatedMatches.filter(m => m.trackingStatus === "Completed").length, color: "bg-emerald-500" }
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{stat.label}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`${stat.color} h-full transition-all duration-1000`} style={{ width: `${(stat.value / (deduplicatedMatches.length || 1)) * 100}%` }}></div>
                        </div>
                        <span className="font-bold text-lg w-8 text-right">{stat.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === "matches" && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>🔗</span>
                <span>Your Matches</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-4 font-semibold">Donor</th>
                      <th className="text-left py-4 px-4 font-semibold">Organ</th>
                      <th className="text-left py-4 px-4 font-semibold">Blood</th>
                      <th className="text-left py-4 px-4 font-semibold">Score</th>
                      <th className="text-left py-4 px-4 font-semibold">Status</th>
                      <th className="text-left py-4 px-4 font-semibold">Tracking</th>
                      <th className="text-left py-4 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deduplicatedMatches.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray-500">
                          No matches found. Please wait for the doctor to create matches.
                        </td>
                      </tr>
                    ) : (
                      deduplicatedMatches.map(match => (
                        <tr
                          key={match.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                        >
                          <td className="py-4 px-4 font-medium">{match.donorName}</td>
                          <td className="py-4 px-4">{match.organType}</td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm font-medium">
                              {match.bloodGroup}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                                  style={{ width: `${match.score}%` }}
                                ></div>
                              </div>
                              <span className="font-semibold">{match.score}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge status={match.status} />
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge status={match.trackingStatus} />
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => setSelectedMatch(match)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}