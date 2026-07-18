// src/pages/RecipientDashboard.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db, auth } from "../firebase";
import TrackingPage from "./TrackingPage";

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

// ============================================================
// HELPERS
// ============================================================

const normalizeStatus = (status) =>
  String(status || "").trim().toLowerCase();

const normalizeText = (value) =>
  String(value || "").trim().toLowerCase();

const isApprovedMatch = (match) =>
  normalizeStatus(match?.status) === "approved";

// ============================================================
// SPINNER
// ============================================================

function Spinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }) {
  const getStatusColor = (statusValue) => {
    const colors = {
      Pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      Approved:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      Rejected:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      Scheduled:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      "Pre-Op Preparation":
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      "Surgery In Progress":
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      "Post-Op Recovery":
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      Completed:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      Delivered:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      "In Transit":
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };

    return (
      colors[statusValue] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    );
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusColor(
        status
      )}`}
    >
      {status || "Unknown"}
    </span>
  );
}

// ============================================================
// MATCH DETAIL MODAL
// ============================================================

function MatchDetailModal({ match, onClose }) {
  if (!match) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-6 rounded-t-3xl z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>📋</span>
              <span>Match Details</span>
            </h2>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Donor Name
                </p>
                <p className="font-bold text-lg">
                  {match.donorName || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Organ Type
                </p>
                <p className="font-bold text-lg">
                  {match.organType || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Blood Group
                </p>
                <p className="font-bold text-lg">
                  {match.bloodGroup || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Match Score
                </p>
                <p className="font-bold text-lg">
                  {match.score ?? "—"}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">
              Status Information
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  Match Status:
                </span>
                <StatusBadge status={match.status} />
              </div>

              {match.trackingStatus && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Surgery Status:
                  </span>
                  <StatusBadge status={match.trackingStatus} />
                </div>
              )}
            </div>
          </div>

          {match.hospital && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>🏥</span>
                <span>Hospital Information</span>
              </h3>

              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hospital Name
                  </p>
                  <p className="font-medium">{match.hospital}</p>
                </div>

                {match.hospitalAddress && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Address
                    </p>
                    <p className="font-medium">
                      {match.hospitalAddress}
                    </p>
                  </div>
                )}

                {match.scheduledDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Scheduled Date
                    </p>
                    <p className="font-medium">
                      {new Date(match.scheduledDate).toLocaleString()}
                    </p>
                  </div>
                )}

                {match.surgeon && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Surgeon
                    </p>
                    <p className="font-medium">{match.surgeon}</p>
                  </div>
                )}

                {match.estimatedDuration && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Estimated Duration
                    </p>
                    <p className="font-medium">
                      {match.estimatedDuration}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

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
                    className={`flex gap-3 ${
                      idx !== match.timeline.length - 1
                        ? "border-b border-gray-200 dark:border-gray-600 pb-3"
                        : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold">{event.status}</p>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>

                      {event.description && (
                        <p className="text-sm mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {match.notes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-4">Notes</h3>

              <p className="text-gray-700 dark:text-gray-300">
                {match.notes}
              </p>
            </div>
          )}

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

// ============================================================
// RECIPIENT DASHBOARD
// ============================================================

export default function RecipientDashboard() {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);

  // NEW: organ transfers belonging to this recipient
  const [organTransfers, setOrganTransfers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMatchAlert, setNewMatchAlert] = useState(false);

  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const previousMatchIdsRef = useRef([]);

  // ==========================================================
  // APPROVED MATCHES
  // ==========================================================

  const approvedMatches = useMemo(() => {
    return matches.filter(isApprovedMatch);
  }, [matches]);

  const hasApprovedMatch = approvedMatches.length > 0;

  const approvedMatch = approvedMatches[0] || null;

  // ==========================================================
  // MATCH ORGAN TRANSFERS TO APPROVED MATCHES
  // ==========================================================

  const approvedOrganTransfers = useMemo(() => {
    if (!hasApprovedMatch) {
      return [];
    }

    return organTransfers.filter((transfer) => {
      return approvedMatches.some((match) => {
        // BEST METHOD:
        // organTransfers.matchId === matches document ID
        if (
          transfer.matchId &&
          match.id &&
          transfer.matchId === match.id
        ) {
          return true;
        }

        // SECOND METHOD:
        // Match donor UID if both documents contain donorId.
        const donorMatches =
          transfer.donorId &&
          match.donorId &&
          transfer.donorId === match.donorId;

        // Match organ type.
        const organMatches =
          normalizeText(transfer.organType) ===
          normalizeText(match.organType);

        if (donorMatches && organMatches) {
          return true;
        }

        // FALLBACK FOR OLD TRANSFER DOCUMENTS:
        // Match donor name + organ.
        const donorNameMatches =
          normalizeText(transfer.donorName) ===
          normalizeText(match.donorName);

        return donorNameMatches && organMatches;
      });
    });
  }, [organTransfers, approvedMatches, hasApprovedMatch]);

  // Tracking is available ONLY when:
  // 1. Match is approved
  // 2. Recipient has a related organ transfer
  const canAccessTracking =
    hasApprovedMatch &&
    approvedOrganTransfers.length > 0;

  // ==========================================================
  // FETCH USER PROFILE + HOSPITAL
  // ==========================================================

  useEffect(() => {
    async function fetchUser() {
      if (!auth.currentUser) return;

      try {
        const userRef = doc(
          db,
          "users",
          auth.currentUser.uid
        );

        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          let hospitalName = "—";
          let hospitalCity = "—";

          if (data.hospitalId) {
            try {
              const hospitalRef = doc(
                db,
                "hospitals",
                data.hospitalId
              );

              const hospSnap = await getDoc(hospitalRef);

              if (hospSnap.exists()) {
                const hosp = hospSnap.data();

                hospitalName = hosp.name || "—";
                hospitalCity = hosp.city || "—";
              }
            } catch (error) {
              console.error(
                "Error loading hospital:",
                error
              );
            }
          }

          setUserData({
            ...data,
            hospitalName,
            hospitalCity,
          });
        }
      } catch (error) {
        console.error(
          "Error fetching user data:",
          error
        );
      }
    }

    fetchUser();
  }, []);

  // ==========================================================
  // NOTIFICATION PERMISSION
  // ==========================================================

  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // ==========================================================
  // FETCH RECIPIENT MATCHES IN REAL TIME
  // ==========================================================

  useEffect(() => {
    if (!auth.currentUser) return;

    setLoading(true);

    const recipientId = auth.currentUser.uid;

    const matchesQuery = query(
      collection(db, "matches"),
      where("recipientId", "==", recipientId)
    );

    const unsubscribe = onSnapshot(
      matchesQuery,

      (snapshot) => {
        const list = snapshot.docs.map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        }));

        const currentIds = list.map((match) => match.id);
        const previousIds = previousMatchIdsRef.current;

        if (previousIds.length > 0) {
          const hasNew = currentIds.some(
            (id) => !previousIds.includes(id)
          );

          if (hasNew) {
            setNewMatchAlert(true);

            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("New Organ Match!", {
                body: "A new donor match has been found for you!",
                icon: "/favicon.ico",
              });
            }
          }
        }

        previousMatchIdsRef.current = currentIds;

        setMatches(list);
        setLoading(false);
      },

      (error) => {
        console.error(
          "Error loading recipient matches:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ==========================================================
  // FETCH RECIPIENT ORGAN TRANSFERS IN REAL TIME
  // ==========================================================
  //
  // IMPORTANT:
  // Your organTransfers document should preferably contain:
  //
  // recipientId: Firebase UID of recipient
  // matchId: Approved match document ID
  //
  // This listener ensures the recipient receives ONLY their
  // transfer documents instead of loading every transfer.
  // ==========================================================

  useEffect(() => {
    if (!auth.currentUser) return;

    const recipientId = auth.currentUser.uid;

    const transfersQuery = query(
      collection(db, "organTransfers"),
      where("recipientId", "==", recipientId)
    );

    const unsubscribe = onSnapshot(
      transfersQuery,

      (snapshot) => {
        const list = snapshot.docs.map((transferDoc) => ({
          id: transferDoc.id,
          ...transferDoc.data(),
        }));

        console.log(
          "Recipient organ transfers:",
          list
        );

        setOrganTransfers(list);
      },

      (error) => {
        console.error(
          "Error loading recipient organ transfers:",
          error
        );

        setOrganTransfers([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // ==========================================================
  // TRACKING ACCESS GUARD
  // ==========================================================

  useEffect(() => {
    if (
      activeTab === "tracking" &&
      !canAccessTracking
    ) {
      setActiveTab("overview");
    }
  }, [activeTab, canAccessTracking]);

  // ==========================================================
  // EXPORT TO EXCEL
  // ==========================================================

  const exportToExcel = (list) => {
    const ws = XLSX.utils.json_to_sheet(
      list.map((match) => ({
        Donor: match.donorName,
        Organ: match.organType,
        Blood: match.bloodGroup,
        Score: match.score,
        Status: match.status,
        TrackingStatus:
          match.trackingStatus || "Not Started",
        Hospital: match.hospital || "—",
      }))
    );

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Matches"
    );

    XLSX.writeFile(
      wb,
      "recipient_matches.xlsx"
    );
  };

  // ==========================================================
  // EXPORT TO PDF
  // ==========================================================

  const exportToPDF = (list) => {
    const pdfDoc = new jsPDF();

    pdfDoc.text(
      "Recipient Matches Report",
      14,
      20
    );

    const rows = list.map((match) => [
      match.donorName,
      match.organType,
      match.bloodGroup,
      match.score,
      match.status,
    ]);

    pdfDoc.autoTable?.({
      head: [
        [
          "Donor",
          "Organ",
          "Blood",
          "Score",
          "Status",
        ],
      ],
      body: rows,
      startY: 28,
    });

    if (!pdfDoc.autoTable) {
      let y = 30;

      rows.forEach((row) => {
        pdfDoc.text(
          row.join(" | "),
          14,
          y
        );

        y += 8;
      });
    }

    pdfDoc.save(
      "recipient_matches.pdf"
    );
  };

  // ==========================================================
  // FILTER MATCHES
  // ==========================================================

  const filteredMatches = matches.filter((match) => {
    const blood =
      match.bloodGroup?.toLowerCase() || "";

    const organ =
      match.organType?.toLowerCase() || "";

    const status = match.status || "";

    const filterB =
      filterBlood.toLowerCase();

    const filterO =
      filterOrgan.toLowerCase();

    if (filterB && blood !== filterB) {
      return false;
    }

    if (filterO && organ !== filterO) {
      return false;
    }

    if (
      filterStatus &&
      status !== filterStatus
    ) {
      return false;
    }

    return true;
  });

  // ==========================================================
  // DEDUPLICATE MATCHES
  // ==========================================================

  const deduplicatedMatches =
    filteredMatches.filter(
      (match, index, self) =>
        index ===
        self.findIndex(
          (otherMatch) =>
            otherMatch.donorName ===
              match.donorName &&
            otherMatch.organType ===
              match.organType &&
            otherMatch.bloodGroup ===
              match.bloodGroup
        )
    );

  // ==========================================================
  // DASHBOARD TABS
  // ==========================================================

  const dashboardTabs = [
    {
      id: "overview",
      label: "Overview",
      icon: "📊",
    },
    {
      id: "matches",
      label: "My Matches",
      icon: "🔗",
    },

    // Tracking tab is completely hidden unless:
    // Approved Match + Matching Organ Transfer
    ...(canAccessTracking
      ? [
          {
            id: "tracking",
            label: "Live Tracking",
            icon: "🗺️",
          },
        ]
      : []),
  ];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {loading && <Spinner />}

      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* NEW MATCH ALERT */}

        {newMatchAlert && (
          <div className="bg-green-500 text-white rounded-2xl p-4 mb-6 shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                🎉
              </span>

              <div>
                <p className="font-bold text-lg">
                  New Match Available!
                </p>

                <p className="text-sm">
                  A potential donor has been found for you.
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setNewMatchAlert(false)
              }
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* HEADER */}

        <header className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 mb-4 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-500 dark:text-emerald-400">
                Recipient Dashboard
              </h1>

              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Track your organ transplant journey
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  exportToExcel(
                    deduplicatedMatches
                  )
                }
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                📊{" "}
                <span className="hidden sm:inline">
                  Excel
                </span>
              </button>

              <button
                onClick={() =>
                  exportToPDF(
                    deduplicatedMatches
                  )
                }
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                📄{" "}
                <span className="hidden sm:inline">
                  PDF
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* STATS */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            {
              label: "Total Matches",
              value:
                deduplicatedMatches.length,
              icon: "🔗",
              gradient:
                "from-blue-500 to-blue-600",
            },
            {
              label: "Pending",
              value:
                deduplicatedMatches.filter(
                  (match) =>
                    normalizeStatus(
                      match.status
                    ) === "pending"
                ).length,
              icon: "⏳",
              gradient:
                "from-yellow-500 to-yellow-600",
            },
            {
              label: "Approved",
              value:
                deduplicatedMatches.filter(
                  isApprovedMatch
                ).length,
              icon: "✅",
              gradient:
                "from-green-500 to-green-600",
            },
            {
              label: "Completed",
              value:
                deduplicatedMatches.filter(
                  (match) =>
                    normalizeStatus(
                      match.trackingStatus
                    ) === "completed"
                ).length,
              icon: "🎉",
              gradient:
                "from-emerald-500 to-emerald-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center text-sm shadow-sm`}
                >
                  {stat.icon}
                </div>

                <p
                  className={`text-2xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                >
                  {stat.value}
                </p>
              </div>

              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* PROFILE */}

        {userData && (
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 mb-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  {userData.fullName
                    ?.split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2) || "R"}
                </div>

                <div>
                  <p className="text-xs font-bold">
                    👤 Your Profile
                  </p>

                  <p className="text-xs font-semibold">
                    {userData.fullName || "—"}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    {auth.currentUser?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-500">
                  🩸 Blood Group
                </p>
                <p className="font-bold text-red-600">
                  {userData.bloodGroup || "—"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-500">
                  🫀 Organ Needed
                </p>
                <p className="font-bold text-indigo-600 capitalize">
                  {userData.organType || "—"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-500">
                  🏥 Hospital
                </p>
                <p className="font-bold text-xs">
                  {userData.hospitalName || "—"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {userData.hospitalCity || ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FILTERS */}

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterBlood}
              onChange={(e) =>
                setFilterBlood(e.target.value)
              }
              className="px-3 py-2.5 rounded-lg border dark:bg-slate-950"
            >
              <option value="">
                All Blood Groups
              </option>
              {[
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
              ].map((blood) => (
                <option
                  key={blood}
                  value={blood}
                >
                  {blood}
                </option>
              ))}
            </select>

            <select
              value={filterOrgan}
              onChange={(e) =>
                setFilterOrgan(e.target.value)
              }
              className="px-3 py-2.5 rounded-lg border dark:bg-slate-950"
            >
              <option value="">
                All Organs
              </option>

              {[
                "Kidney",
                "Heart",
                "Liver",
                "Lung",
                "Eye",
                "Pancreas",
              ].map((organ) => (
                <option
                  key={organ}
                  value={organ.toLowerCase()}
                >
                  {organ}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value)
              }
              className="px-3 py-2.5 rounded-lg border dark:bg-slate-950"
            >
              <option value="">
                All Statuses
              </option>
              <option value="Pending">
                Pending
              </option>
              <option value="Approved">
                Approved
              </option>
              <option value="Rejected">
                Rejected
              </option>
            </select>

            <button
              onClick={() => {
                setFilterBlood("");
                setFilterOrgan("");
                setFilterStatus("");
              }}
              className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* TABS */}

        <div className="bg-white dark:bg-slate-900 rounded-xl p-1.5 mb-4 inline-flex gap-1.5 shadow-sm border border-slate-200 dark:border-slate-800">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id)
              }
              className={`px-4 py-2.5 rounded-lg transition-all text-sm font-semibold ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}

        <div className="mt-6">
          {/* OVERVIEW */}

          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold mb-4">
                  🔔 Recent Matches
                </h3>

                <div className="space-y-3">
                  {deduplicatedMatches
                    .slice(0, 5)
                    .map((match, idx) => (
                      <div
                        key={match.id}
                        onClick={() =>
                          setSelectedMatch(match)
                        }
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </div>

                        <div className="flex-1">
                          <p className="font-medium">
                            Match with{" "}
                            {match.donorName}
                          </p>

                          <p className="text-sm text-gray-500">
                            {match.organType} -{" "}
                            {match.bloodGroup}
                          </p>
                        </div>

                        <StatusBadge
                          status={match.status}
                        />
                      </div>
                    ))}

                  {deduplicatedMatches.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No matches yet. You'll be notified when a match is found.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MATCHES */}

          {activeTab === "matches" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold mb-6">
                🔗 Your Matches
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left p-4">
                        Donor
                      </th>
                      <th className="text-left p-4">
                        Organ
                      </th>
                      <th className="text-left p-4">
                        Blood
                      </th>
                      <th className="text-left p-4">
                        Score
                      </th>
                      <th className="text-left p-4">
                        Status
                      </th>
                      <th className="text-left p-4">
                        Tracking
                      </th>
                      <th className="text-left p-4">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {deduplicatedMatches.map(
                      (match) => (
                        <tr
                          key={match.id}
                          className="border-b"
                        >
                          <td className="p-4">
                            {match.donorName}
                          </td>

                          <td className="p-4">
                            {match.organType}
                          </td>

                          <td className="p-4">
                            {match.bloodGroup}
                          </td>

                          <td className="p-4">
                            {match.score}
                          </td>

                          <td className="p-4">
                            <StatusBadge
                              status={
                                match.status
                              }
                            />
                          </td>

                          <td className="p-4">
                            <StatusBadge
                              status={
                                match.trackingStatus
                              }
                            />
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() =>
                                setSelectedMatch(
                                  match
                                )
                              }
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      )
                    )}

                    {deduplicatedMatches.length === 0 && (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center py-8 text-gray-500"
                        >
                          No matches found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================
              LIVE TRACKING

              TrackingPage loads ONLY when:
              - Recipient has approved match
              - Recipient has related organ transfer
          ================================================== */}

          {activeTab === "tracking" &&
            canAccessTracking && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <TrackingPage
  userRole="recipient"
  recipientId={auth.currentUser?.uid}
  approvedMatch={approvedMatch}
  approvedMatches={approvedMatches}
  allowedTransfers={approvedOrganTransfers}
/>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}