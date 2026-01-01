// src/pages/DoctorDashboard.jsx
import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  where,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import DoctorReviewDashboard from "../components/DoctorReviewDashboard.jsx";

function Spinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Highlight({ text = "", highlight = "" }) {
  if (!highlight) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span
            key={i}
            className="bg-yellow-300 dark:bg-yellow-600"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function StatusBadge({ status }) {
  const getStatusColor = (status) => {
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
      Cancelled:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusColor(
        status
      )}`}
    >
      {status || "Not Started"}
    </span>
  );
}

// ---------------- Tracking Modal ----------------
function TrackingModal({ match, onClose, onSave, hospitals, doctors }) {
  const [trackingData, setTrackingData] = useState({
    trackingStatus: match.trackingStatus || "",
    scheduledDate: match.scheduledDate || "",
    hospitalId: match.hospitalId || "",
    hospital: match.hospital || "",
    hospitalAddress: match.hospitalAddress || "",
    surgeon: match.surgeon || "",
    surgeonId: match.surgeonId || "",
    department: match.department || "",
    estimatedDuration: match.estimatedDuration || "",
    notes: match.notes || "",
    timeline: match.timeline || [],
  });

  const trackingStatuses = [
    "Scheduled",
    "Pre-Op Preparation",
    "Surgery In Progress",
    "Post-Op Recovery",
    "Completed",
    "Cancelled",
  ];

  const selectedHospital = hospitals.find(
    (h) => h.id === trackingData.hospitalId
  );

  const hospitalDoctors = doctors.filter(
    (d) => d.hospitalId === trackingData.hospitalId
  );

  const hospitalDepartments =
    (selectedHospital && selectedHospital.departments) || [];

  const addTimelineEvent = () => {
    if (trackingData.trackingStatus) {
      setTrackingData((prev) => ({
        ...prev,
        timeline: [
          ...(prev.timeline || []),
          {
            timestamp: new Date().toISOString(),
            status: prev.trackingStatus,
            description: `Status updated to ${prev.trackingStatus}`,
          },
        ],
      }));
    }
  };

  const handleHospitalChange = (hospitalId) => {
    const hospital = hospitals.find((h) => h.id === hospitalId);
    if (hospital) {
      const address = `${hospital.addressLine1 || ""}${
        hospital.addressLine2 ? ", " + hospital.addressLine2 : ""
      }, ${hospital.city || ""}, ${hospital.state || ""}${
        hospital.pincode ? " - " + hospital.pincode : ""
      }`;

      setTrackingData((prev) => ({
        ...prev,
        hospitalId: hospital.id,
        hospital: hospital.name,
        hospitalAddress: address,
        surgeon: "",
        surgeonId: "",
        department: "",
      }));
    } else {
      setTrackingData((prev) => ({
        ...prev,
        hospitalId: "",
        hospital: "",
        hospitalAddress: "",
        surgeon: "",
        surgeonId: "",
        department: "",
      }));
    }
  };

  const handleSurgeonChange = (doctorId) => {
    const doc = hospitalDoctors.find((d) => d.id === doctorId);
    if (doc) {
      setTrackingData((prev) => ({
        ...prev,
        surgeonId: doc.id,
        surgeon: doc.fullName || "",
      }));
    } else {
      setTrackingData((prev) => ({
        ...prev,
        surgeonId: "",
        surgeon: "",
      }));
    }
  };

  const handleSave = () => {
    onSave(trackingData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)" }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>🏥</span>
              <span>Transplant Tracking</span>
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

        <div className="p-6">
          {/* Match Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Donor
                </p>
                <p className="font-bold text-lg">{match.donorName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recipient
                </p>
                <p className="font-bold text-lg">{match.recipientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Organ Type
                </p>
                <p className="font-bold">{match.organType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Blood Group
                </p>
                <p className="font-bold">{match.bloodGroup}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Tracking Status
                </label>
                <select
                  value={trackingData.trackingStatus}
                  onChange={(e) =>
                    setTrackingData((prev) => ({
                      ...prev,
                      trackingStatus: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                >
                  <option value="">Select Status</option>
                  {trackingStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addTimelineEvent}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Add to Timeline
                </button>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={trackingData.scheduledDate}
                  onChange={(e) =>
                    setTrackingData((prev) => ({
                      ...prev,
                      scheduledDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Department
                </label>
                <select
                  value={trackingData.department}
                  onChange={(e) =>
                    setTrackingData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                >
                  <option value="">Select Department</option>
                  {hospitalDepartments.map((dName, idx) => (
                    <option key={idx} value={dName}>
                      {dName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Surgeon */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Surgeon / Team Lead
                </label>
                <select
                  value={trackingData.surgeonId}
                  onChange={(e) => handleSurgeonChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all mb-2"
                >
                  <option value="">Select Surgeon</option>
                  {hospitalDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fullName}{" "}
                      {doc.specialization ? `(${doc.specialization})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={trackingData.surgeon}
                  onChange={(e) =>
                    setTrackingData((prev) => ({
                      ...prev,
                      surgeon: e.target.value,
                      surgeonId: "",
                    }))
                  }
                  placeholder="Or type surgeon name manually"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Estimated Duration
                </label>
                <input
                  type="text"
                  value={trackingData.estimatedDuration}
                  onChange={(e) =>
                    setTrackingData((prev) => ({
                      ...prev,
                      estimatedDuration: e.target.value,
                    }))
                  }
                  placeholder="4-6 hours"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Hospital Select */}
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <span>📍</span>
                  <span>Select Hospital</span>
                </label>
                <select
                  value={trackingData.hospitalId}
                  onChange={(e) => handleHospitalChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                >
                  <option value="">Select Hospital</option>
                  {hospitals
                    .filter((h) => !h.status || h.status === "Active")
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} - {h.city}
                      </option>
                    ))}
                </select>

                {/* Hospital Details */}
                {selectedHospital && (
                  <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Address
                      </p>
                      <p className="text-sm font-medium">
                        {selectedHospital.addressLine1}
                        {selectedHospital.addressLine2
                          ? `, ${selectedHospital.addressLine2}`
                          : ""}
                        , {selectedHospital.city}, {selectedHospital.state}{" "}
                        {selectedHospital.pincode
                          ? `- ${selectedHospital.pincode}`
                          : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Phone
                        </p>
                        <p className="text-sm font-medium">
                          {selectedHospital.contactNumber || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Emergency
                        </p>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          {selectedHospital.emergencyNumber || "—"}
                        </p>
                      </div>
                    </div>

                    {(selectedHospital.availableOrgans || []).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Available Organs
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedHospital.availableOrgans.map(
                            (organ, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded"
                              >
                                {organ}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {hospitalDepartments.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Departments
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {hospitalDepartments.map((dep, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">
                          Total Beds
                        </p>
                        <p className="font-semibold">
                          {selectedHospital.totalBeds ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">
                          ICU Beds
                        </p>
                        <p className="font-semibold">
                          {selectedHospital.icuBeds ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">
                          Ventilators
                        </p>
                        <p className="font-semibold">
                          {selectedHospital.ventilators ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Notes
                </label>
                <textarea
                  value={trackingData.notes}
                  onChange={(e) =>
                    setTrackingData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Additional notes or special considerations..."
                  rows="8"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-6">
            <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🕐</span>
              <span>Timeline</span>
            </label>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 max-h-64 overflow-y-auto">
              {!trackingData.timeline ||
              trackingData.timeline.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No timeline events yet
                </p>
              ) : (
                <div className="space-y-3">
                  {trackingData.timeline.map((event, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        idx !== trackingData.timeline.length - 1
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
                          <p className="text-sm mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Save Tracking Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Main Doctor Dashboard ----------------
export default function DoctorDashboard() {
  const [donors, setDonors] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [matches, setMatches] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatedMatches, setUpdatedMatches] = useState({});
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHospital, setFilterHospital] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [doctor, setDoctor] = useState(null);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // Fetch users and hospitals
  useEffect(() => {
    async function fetchData() {
      try {
        const usersCol = collection(db, "users");
        const snap = await getDocs(usersCol);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDonors(all.filter((u) => u.role === "donor"));
        setRecipients(all.filter((u) => u.role === "recipient"));
        const allDoctors = all.filter((u) => u.role === "doctor");
        setDoctors(allDoctors);

        const currentDoctor =
          allDoctors.find((u) => u.id === auth.currentUser?.uid) || null;
        setDoctor(currentDoctor);

        const hospitalsCol = collection(db, "hospitals");
        const hospitalsSnap = await getDocs(hospitalsCol);
        setHospitals(
          hospitalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    fetchData();
  }, []);

  // Real-time matches listener
  useEffect(() => {
    const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMatches(arr);
      },
      (err) => {
        console.error("Failed to load matches:", err);
      }
    );
    return () => unsub();
  }, []);

  // AI Match runner
  async function runMatching() {
    if (!donors.length || !recipients.length) {
      alert("Donors or recipients not loaded yet.");
      return;
    }

    setLoading(true);
    const updated = {};
    try {
      await saveLocalMatches(updated);
    } catch (err) {
      console.warn("Matching failed:", err);
      alert("AI matching failed: " + err.message);
    } finally {
      setUpdatedMatches(updated);
      setLoading(false);
      setTimeout(() => setUpdatedMatches({}), 2000);
    }
  }

  async function saveLocalMatches(updated) {
    for (const r of recipients) {
      const donor = donors.find(
        (d) =>
          d.bloodGroup?.toLowerCase() === r.bloodGroup?.toLowerCase() &&
          d.organType?.toLowerCase() === r.organType?.toLowerCase()
      );
      if (!donor) continue;

      const existingQuery = query(
        collection(db, "matches"),
        where("donorId", "==", donor.id),
        where("recipientId", "==", r.id)
      );
      const snapshot = await getDocs(existingQuery);
      const score = Math.round(70 + Math.random() * 30);

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          score,
          status: "Pending",
          updatedAt: new Date(),
        });
        updated[snapshot.docs[0].id] = true;
      } else {
        const newDoc = await addDoc(collection(db, "matches"), {
          donorId: donor.id,
          donorName: donor.fullName || "",
          recipientId: r.id,
          recipientName: r.fullName || "",
          bloodGroup: r.bloodGroup || "",
          organType: r.organType || "",
          score,
          status: "Pending",
          createdAt: new Date(),
        });
        updated[newDoc.id] = true;
      }
    }
  }

  async function updateMatchStatus(matchId, newStatus) {
    try {
      const ref = doc(db, "matches", matchId);
      await updateDoc(ref, { status: newStatus });
    } catch (err) {
      console.error(err);
      alert("Failed to update status: " + err.message);
    }
  }

  async function saveTrackingInfo(matchId, trackingData) {
    try {
      const ref = doc(db, "matches", matchId);
      await updateDoc(ref, {
        ...trackingData,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update tracking info: " + err.message);
    }
  }

  const uniqueMatches = matches.filter(
    (match, index, self) =>
      index ===
      self.findIndex(
        (m) =>
          m.donorId === match.donorId &&
          m.recipientId === match.recipientId &&
          m.organType === match.organType
      )
  );

  const filteredDonors = donors.filter(
    (d) =>
      (!filterBlood ||
        d.bloodGroup?.toLowerCase() === filterBlood.toLowerCase()) &&
      (!filterOrgan ||
        d.organType?.toLowerCase() === filterOrgan.toLowerCase()) &&
      (!filterHospital || d.hospitalId === filterHospital) &&
      (!searchName ||
        d.fullName?.toLowerCase().includes(searchName.toLowerCase()))
  );

  const filteredRecipients = recipients.filter(
    (r) =>
      (!filterBlood ||
        r.bloodGroup?.toLowerCase() === filterBlood.toLowerCase()) &&
      (!filterOrgan ||
        r.organType?.toLowerCase() === filterOrgan.toLowerCase()) &&
      (!filterHospital || r.hospitalId === filterHospital) &&
      (!searchName ||
        r.fullName?.toLowerCase().includes(searchName.toLowerCase()))
  );

  const filteredMatches = uniqueMatches.filter(
    (m) =>
      (!filterBlood ||
        m.bloodGroup?.toLowerCase() === filterBlood.toLowerCase()) &&
      (!filterOrgan ||
        m.organType?.toLowerCase() === filterOrgan.toLowerCase()) &&
      (!filterStatus || m.status === filterStatus) &&
      (!filterHospital || m.hospitalId === filterHospital) &&
      (!searchName ||
        m.donorName?.toLowerCase().includes(searchName.toLowerCase()) ||
        m.recipientName?.toLowerCase().includes(searchName.toLowerCase()))
  );

  // Doctors at current doctor's hospital (for overview "team")
  const doctorHospitalId = doctor?.hospitalId || null;
  const teamDoctors =
    doctorHospitalId
      ? doctors.filter(
          (d) => d.hospitalId === doctorHospitalId && d.id !== doctor.id
        )
      : [];

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all">
      {loading && <Spinner />}
      {selectedMatch && (
        <TrackingModal
          match={selectedMatch}
          hospitals={hospitals}
          doctors={doctors}
          onClose={() => setSelectedMatch(null)}
          onSave={(trackingData) =>
            saveTrackingInfo(selectedMatch.id, trackingData)
          }
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-xl border border-white/20">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Doctor Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Real-time organ transplant management system
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={runMatching}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>{loading ? "Matching..." : "AI Match"}</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          {[
            {
              label: "Total Donors",
              value: donors.length,
              icon: "👥",
              gradient: "from-blue-500 to-blue-600",
            },
            {
              label: "Recipients",
              value: recipients.length,
              icon: "🏥",
              gradient: "from-purple-500 to-purple-600",
            },
            {
              label: "Active Matches",
              value: uniqueMatches.length,
              icon: "🔗",
              gradient: "from-green-500 to-green-600",
            },
            {
              label: "Completed",
              value: uniqueMatches.filter(
                (m) => m.trackingStatus === "Completed"
              ).length,
              icon: "✅",
              gradient: "from-emerald-500 to-emerald-600",
            },
            {
              label: "Hospitals",
              value: hospitals.filter(
                (h) => !h.status || h.status === "Active"
              ).length,
              icon: "🏢",
              gradient: "from-orange-500 to-red-600",
            },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:scale-105 transition-transform"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-2xl shadow-lg`}
                >
                  {stat.icon}
                </div>
                <div className="text-right">
                  <p
                    className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-lg border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="🔍 Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
            <select
              value={filterBlood}
              onChange={(e) => setFilterBlood(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Blood Groups</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                )
              )}
            </select>
            <select
              value={filterOrgan}
              onChange={(e) => setFilterOrgan(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Organs</option>
              {["Kidney", "Heart", "Liver", "Lung", "Eye", "Pancreas"].map(
                (o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                )
              )}
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
            <select
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Hospitals</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchName("");
                setFilterBlood("");
                setFilterOrgan("");
                setFilterStatus("");
                setFilterHospital("");
              }}
              className="px-4 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-2 mb-6 inline-flex gap-2 shadow-lg border border-white/20">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "donors", label: "Donors", icon: "👥" },
            { id: "recipients", label: "Recipients", icon: "🏥" },
            { id: "matches", label: "Matches", icon: "🔗" },
            { id: "documents", label: "Document Review", icon: "📄" }, 
          ].map((tab) => (
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
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Match Statistics */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>📈</span>
                  <span>Match Statistics</span>
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      label: "Pending Approvals",
                      value: uniqueMatches.filter(
                        (m) => m.status === "Pending"
                      ).length,
                      color: "bg-yellow-500",
                    },
                    {
                      label: "Approved Matches",
                      value: uniqueMatches.filter(
                        (m) => m.status === "Approved"
                      ).length,
                      color: "bg-green-500",
                    },
                    {
                      label: "Scheduled Surgeries",
                      value: uniqueMatches.filter(
                        (m) => m.trackingStatus === "Scheduled"
                      ).length,
                      color: "bg-blue-500",
                    },
                    {
                      label: "In Progress",
                      value: uniqueMatches.filter(
                        (m) =>
                          m.trackingStatus === "Surgery In Progress"
                      ).length,
                      color: "bg-orange-500",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-600 dark:text-gray-400">
                        {stat.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`${stat.color} h-full transition-all duration-1000`}
                            style={{
                              width: `${
                                (stat.value / (uniqueMatches.length || 1)) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="font-bold text-lg w-8 text-right">
                          {stat.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Profile + Team */}
              {doctor && (
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span>👨‍⚕️</span>
                    <span>Doctor Profile</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                        {doctor.fullName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "DR"}
                      </div>
                      <div>
                        <p className="font-bold text-lg">
                          {doctor.fullName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {doctor.specialization || "Specialist"}
                        </p>
                        {doctorHospitalId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {
                              hospitals.find(
                                (h) => h.id === doctorHospitalId
                              )?.name
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="flex items-center gap-2 text-sm">
                        <span>📧</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {doctor.email}
                        </span>
                      </p>
                      <p className="flex items-center gap-2 text-sm">
                        <span>📱</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {doctor.mobile || "Not provided"}
                        </span>
                      </p>
                    </div>

                    {teamDoctors.length > 0 && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-2">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <span>👨‍⚕️👩‍⚕️</span>
                          <span>Team at Your Hospital</span>
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto text-sm">
                          {teamDoctors.slice(0, 6).map((td) => (
                            <div
                              key={td.id}
                              className="flex justify-between text-gray-600 dark:text-gray-300"
                            >
                              <span>{td.fullName}</span>
                              <span className="text-xs text-gray-500">
                                {td.specialization || "Doctor"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hospital Distribution */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 lg:col-span-2">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>🏥</span>
                  <span>Hospital Distribution</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hospitals.slice(0, 6).map((hospital) => {
                    const matchCount = uniqueMatches.filter(
                      (m) => m.hospitalId === hospital.id
                    ).length;
                    const docCount = doctors.filter(
                      (d) => d.hospitalId === hospital.id
                    ).length;
                    return (
                      <div
                        key={hospital.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-xl">
                          🏥
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{hospital.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {hospital.city}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Doctors:{" "}
                            <span className="font-semibold">
                              {docCount}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {matchCount}
                          </p>
                          <p className="text-xs text-gray-500">
                            matches
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 lg:col-span-2">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>🔔</span>
                  <span>Recent Activity</span>
                </h3>
                <div className="space-y-3">
                  {uniqueMatches.slice(0, 5).map((match, idx) => (
                    <div
                      key={match.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.donorName} → {match.recipientName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {match.organType} transplant - {match.bloodGroup}
                          {match.hospital && ` - ${match.hospital}`}
                        </p>
                      </div>
                      <StatusBadge status={match.status} />
                    </div>
                  ))}
                  {uniqueMatches.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Donors Tab */}
          {activeTab === "donors" && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>👥</span>
                <span>Available Donors</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-4 font-semibold">
                        Name
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Blood Group
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Organ
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Age
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Hospital
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonors.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-8 text-gray-500"
                        >
                          No donors found
                        </td>
                      </tr>
                    ) : (
                      filteredDonors.map((donor) => (
                        <tr
                          key={donor.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                        >
                          <td className="py-4 px-4 font-medium">
                            <Highlight
                              text={donor.fullName || "—"}
                              highlight={searchName}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm font-medium">
                              {donor.bloodGroup}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {donor.organType}
                          </td>
                          <td className="py-4 px-4">
                            {donor.age || "—"}
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-sm font-medium">
                                {hospitals.find(
                                  (h) => h.id === donor.hospitalId
                                )?.name || "—"}
                              </p>
                              {donor.hospitalId && (
                                <p className="text-xs text-gray-500">
                                  {
                                    hospitals.find(
                                      (h) => h.id === donor.hospitalId
                                    )?.city
                                  }
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recipients Tab */}
          {activeTab === "recipients" && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>🏥</span>
                <span>Waiting Recipients</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-4 font-semibold">
                        Name
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Blood Group
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Organ Needed
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Age
                      </th>
                      <th className="text-left py-4 px-4 font-semibold">
                        Hospital
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipients.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-8 text-gray-500"
                        >
                          No recipients found
                        </td>
                      </tr>
                    ) : (
                      filteredRecipients.map((recipient) => (
                        <tr
                          key={recipient.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                        >
                          <td className="py-4 px-4 font-medium">
                            <Highlight
                              text={recipient.fullName || "—"}
                              highlight={searchName}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm font-medium">
                              {recipient.bloodGroup}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {recipient.organType}
                          </td>
                          <td className="py-4 px-4">
                            {recipient.age || "—"}
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-sm font-medium">
                                {hospitals.find(
                                  (h) => h.id === recipient.hospitalId
                                )?.name || "—"}
                              </p>
                              {recipient.hospitalId && (
                                <p className="text-xs text-gray-500">
                                  {
                                    hospitals.find(
                                      (h) => h.id === recipient.hospitalId
                                    )?.city
                                  }
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

           {/* Matches Tab */}
  {activeTab === "matches" && (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>🔗</span>
        <span>Transplant Matches</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-4 px-4 font-semibold">Donor</th>
              <th className="text-left py-4 px-4 font-semibold">Recipient</th>
              <th className="text-left py-4 px-4 font-semibold">Organ</th>
              <th className="text-left py-4 px-4 font-semibold">Blood</th>
              <th className="text-left py-4 px-4 font-semibold">Score</th>
              <th className="text-left py-4 px-4 font-semibold">Status</th>
              <th className="text-left py-4 px-4 font-semibold">Tracking</th>
              <th className="text-left py-4 px-4 font-semibold">Hospital</th>
              <th className="text-left py-4 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  {uniqueMatches.length === 0
                    ? 'No matches yet. Click "AI Match" to generate matches.'
                    : "No matches found with current filters."}
                </td>
              </tr>
            ) : (
              filteredMatches.map((match) => (
                <tr
                  key={match.id}
                  className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${
                    updatedMatches[match.id] ? "bg-green-100 dark:bg-green-900/30" : ""
                  }`}
                >
                  <td className="py-4 px-4 font-medium">
                    <Highlight text={match.donorName} highlight={searchName} />
                  </td>
                  <td className="py-4 px-4 font-medium">
                    <Highlight text={match.recipientName} highlight={searchName} />
                  </td>
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
                    <div>
                      <p className="text-sm font-medium">{match.hospital || "Not Assigned"}</p>
                      {match.hospitalId && (
                        <p className="text-xs text-gray-500">
                          {hospitals.find((h) => h.id === match.hospitalId)?.city}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2 flex-wrap">
                      {match.status === "Pending" && (
                        <>
                          <button
                            onClick={() => updateMatchStatus(match.id, "Approved")}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateMatchStatus(match.id, "Rejected")}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm"
                      >
                        Track
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* 🚨 Document Review Tab (Now Correctly Placed) */}
  {activeTab === "documents" && (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
      <DoctorReviewDashboard
        matches={matches}
        doctors={doctors}
        hospitals={hospitals}
      />
    </div>
  )}

</div> {/* END of Tab Content */}
</div>
</div>
);
}