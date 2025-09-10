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

function Spinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
          <span key={i} className="bg-yellow-300 dark:bg-yellow-600">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function DoctorDashboard() {
  const [donors, setDonors] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatedMatches, setUpdatedMatches] = useState({});
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [searchName, setSearchName] = useState("");
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [doctor, setDoctor] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const usersCol = collection(db, "users");
        const snap = await getDocs(usersCol);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDonors(all.filter((u) => u.role === "donor"));
        setRecipients(all.filter((u) => u.role === "recipient"));
        const currentDoctor = all.find(
          (u) => u.role === "doctor" && u.id === auth.currentUser.uid
        );
        setDoctor(currentDoctor || null);
      } catch (err) {
        console.error("Failed to load users:", err);
        alert(
          "Failed to load users. Make sure your Firestore rules allow reading donors and recipients."
        );
      }
    }
    fetchUsers();
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
        alert(
          "Failed to load matches. Check your Firestore rules for doctor access."
        );
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
        await updateDoc(docRef, { score, status: "Pending", updatedAt: new Date() });
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
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update status: " + err.message);
    }
  }

  async function saveDoctorProfile() {
    if (!doctor) return;
    setProfileLoading(true);
    try {
      const ref = doc(db, "users", doctor.id);
      await updateDoc(ref, {
        fullName: doctor.fullName,
        mobile: doctor.mobile || "",
        specialization: doctor.specialization || "",
      });
      setEditMode(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  function exportToExcel(list) {
    const ws = XLSX.utils.json_to_sheet(
      list.map((m) => ({
        Donor: m.donorName,
        Recipient: m.recipientName,
        Organ: m.organType,
        Blood: m.bloodGroup,
        Score: m.score,
        Status: m.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matches");
    XLSX.writeFile(wb, "matches.xlsx");
  }

  function exportToPDF(list) {
    const doc = new jsPDF();
    doc.text("Matches Report", 14, 20);
    const rows = list.map((m) => [
      m.donorName,
      m.recipientName,
      m.organType,
      m.bloodGroup,
      m.score,
      m.status,
    ]);
    doc.autoTable?.({
      head: [["Donor", "Recipient", "Organ", "Blood", "Score", "Status"]],
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
    doc.save("matches.pdf");
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
      (!filterBlood || d.bloodGroup?.toLowerCase() === filterBlood.toLowerCase()) &&
      (!filterOrgan || d.organType?.toLowerCase() === filterOrgan.toLowerCase()) &&
      (!searchName || d.fullName?.toLowerCase().includes(searchName.toLowerCase()))
  );

  const filteredRecipients = recipients.filter(
    (r) =>
      (!filterBlood || r.bloodGroup?.toLowerCase() === filterBlood.toLowerCase()) &&
      (!filterOrgan || r.organType?.toLowerCase() === filterOrgan.toLowerCase()) &&
      (!searchName || r.fullName?.toLowerCase().includes(searchName.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-purple-200 to-pink-300 dark:from-gray-900 dark:to-gray-800 dark:text-white transition-all relative">
      {loading && <Spinner />}
      <div className="max-w-7xl mx-auto">
        {/* Doctor Profile */}
        {doctor && (
          <div className="card-glass p-4 mb-6 dark:bg-gray-800 rounded-md shadow-md">
            <h2 className="text-2xl font-semibold mb-2">Doctor Profile</h2>
            {editMode ? (
              <div className="flex flex-col gap-3">
                <input
                  className="p-2 rounded dark:bg-gray-700 dark:text-white"
                  value={doctor.fullName || ""}
                  onChange={(e) => setDoctor({ ...doctor, fullName: e.target.value })}
                  placeholder="Full Name"
                />
                <input
                  className="p-2 rounded dark:bg-gray-700 dark:text-white"
                  value={doctor.mobile || ""}
                  onChange={(e) => setDoctor({ ...doctor, mobile: e.target.value })}
                  placeholder="Mobile"
                />
                <input
                  className="p-2 rounded dark:bg-gray-700 dark:text-white"
                  value={doctor.specialization || ""}
                  onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
                  placeholder="Specialization"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveDoctorProfile}
                    disabled={profileLoading}
                    className="px-3 py-2 bg-blue-600 text-white rounded"
                  >
                    {profileLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-2 bg-gray-400 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <p><strong>Name:</strong> {doctor.fullName}</p>
                <p><strong>Email:</strong> {doctor.email}</p>
                <p><strong>Mobile:</strong> {doctor.mobile || "—"}</p>
                <p><strong>Specialization:</strong> {doctor.specialization || "—"}</p>
                <button
                  onClick={() => setEditMode(true)}
                  className="mt-2 px-3 py-2 bg-blue-600 text-white rounded"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        )}

        {/* Header + Run Match + Export */}
        <header className="flex justify-between items-center mb-4 sm:mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Manage donors, recipients, and matches
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={runMatching}
              disabled={loading}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded shadow"
            >
              {loading ? "Matching..." : "Run AI Match"}
            </button>
            <button
              onClick={() => exportToExcel(uniqueMatches)}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded shadow"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportToPDF(uniqueMatches)}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white rounded shadow"
            >
              Export PDF
            </button>
          </div>
        </header>

        {/* Filters + Search */}
        <div className="bg-white/20 dark:bg-gray-700 card-glass p-3 sm:p-4 rounded-md mb-6 flex flex-wrap gap-2 sm:gap-3 items-center">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="p-2 rounded flex-1 min-w-[120px] dark:bg-gray-800 dark:text-white"
          />
          <select
            value={filterBlood}
            onChange={(e) => setFilterBlood(e.target.value)}
            className="p-2 rounded cursor-pointer dark:bg-gray-800 dark:text-white"
          >
            <option value="">All blood groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={filterOrgan}
            onChange={(e) => setFilterOrgan(e.target.value)}
            className="p-2 rounded cursor-pointer dark:bg-gray-800 dark:text-white max-h-40 overflow-y-auto"
          >
            <option value="">All Organs</option>
            {["Kidney", "Heart", "Liver", "Lung", "Eye", "Pancreas"].map((organ) => (
              <option key={organ} value={organ}>{organ}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setFilterBlood("");
              setFilterOrgan("");
              setSearchName("");
            }}
            className="ml-auto p-2 bg-gray-200/30 dark:bg-gray-600 rounded"
          >
            Reset
          </button>
        </div>

        {/* Donors & Recipients */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {[{ title: "Donors", data: filteredDonors, fields: ["Name", "Blood", "Organ"] },
            { title: "Recipients", data: filteredRecipients, fields: ["Name", "Blood", "Organ Needed"] }
          ].map(({ title, data, fields }) => (
            <div key={title} className="card-glass p-3 sm:p-4 dark:bg-gray-800 rounded-md">
              <h2 className="text-xl font-semibold mb-2">{title}</h2>
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left">
                      {fields.map((f) => (
                        <th key={f} className="p-2">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={fields.length} className="text-center py-4">
                          No {title.toLowerCase()} found
                        </td>
                      </tr>
                    ) : (
                      data.map((d) => (
                        <tr
                          key={d.id}
                          className="odd:bg-white/10 even:bg-white/5 dark:odd:bg-gray-700 dark:even:bg-gray-800"
                        >
                          <td className="p-2">
                            <Highlight text={d.fullName || "—"} highlight={searchName} />
                          </td>
                          <td className="p-2">{d.bloodGroup || "—"}</td>
                          <td className="p-2">{d.organType || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Matches Table */}
        <div className="card-glass p-3 sm:p-4 dark:bg-gray-800 rounded-md overflow-x-auto">
          <h2 className="text-xl font-semibold mb-3">Matches</h2>
          <table className="min-w-full">
            <thead>
              <tr className="text-left bg-white/10 dark:bg-gray-700">
                {["Donor", "Recipient", "Organ", "Blood", "Score", "Status", "Actions"].map((c) => (
                  <th key={c} className="p-2 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueMatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6">
                    No matches yet. Run AI Match.
                  </td>
                </tr>
              ) : (
                uniqueMatches
                  .filter(
                    (m) =>
                      (!filterBlood || m.bloodGroup?.toLowerCase() === filterBlood.toLowerCase()) &&
                      (!filterOrgan || m.organType?.toLowerCase() === filterOrgan.toLowerCase()) &&
                      (!searchName ||
                        m.donorName?.toLowerCase().includes(searchName.toLowerCase()) ||
                        m.recipientName?.toLowerCase().includes(searchName.toLowerCase()))
                  )
                  .map((m) => (
                    <tr
                      key={m.id}
                      className={`odd:bg-white/5 even:bg-white/10 dark:odd:bg-gray-700 dark:even:bg-gray-800 transition-colors duration-700 ${
                        updatedMatches[m.id] ? "bg-green-200 dark:bg-green-800 animate-pulse" : ""
                      }`}
                    >
                      <td className="p-2 whitespace-nowrap">
                        <Highlight text={m.donorName} highlight={searchName} />
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <Highlight text={m.recipientName} highlight={searchName} />
                      </td>
                      <td className="p-2 whitespace-nowrap">{m.organType}</td>
                      <td className="p-2 whitespace-nowrap">{m.bloodGroup}</td>
                      <td className="p-2 whitespace-nowrap">{m.score}</td>
                      <td className="p-2 whitespace-nowrap">{m.status}</td>
                      <td className="p-2 flex gap-2 flex-wrap">
                        <button
                          onClick={() => updateMatchStatus(m.id, "Approved")}
                          className={`px-2 py-1 rounded text-white transition 
                            ${m.status !== "Pending" ? "opacity-50 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
                          disabled={m.status !== "Pending"}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateMatchStatus(m.id, "Rejected")}
                          className={`px-2 py-1 rounded text-white transition 
                            ${m.status !== "Pending" ? "opacity-50 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                          disabled={m.status !== "Pending"}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
