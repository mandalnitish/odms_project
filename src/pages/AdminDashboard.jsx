// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Users,
  Activity,
  Heart,
  FileText,
  Download,
  Search,
  Filter,
  Edit2,
  Trash2,
  Save,
  X,
  TrendingUp,
  UserCheck,
  Calendar,
  Building2,
  MapPin,
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Link } from "react-router-dom";

// ----------------- UI HELPERS -----------------
function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, bgColor, trend }) {
  return (
    <div
      className={`${bgColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-white/90 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="bg-white/20 p-4 rounded-lg">
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}

function BloodGroupChart({ users }) {
  const bloodGroups = users.reduce((acc, u) => {
    if (u.bloodGroup) {
      acc[u.bloodGroup] = (acc[u.bloodGroup] || 0) + 1;
    }
    return acc;
  }, {});

  const total = Object.values(bloodGroups).reduce((a, b) => a + b, 0);
  const colors = [
    "bg-red-500",
    "bg-pink-500",
    "bg-purple-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-green-500",
  ];

  if (!total) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-500" />
          Blood Group Distribution
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No blood group data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Heart className="w-5 h-5 mr-2 text-red-500" />
        Blood Group Distribution
      </h3>
      <div className="space-y-3">
        {Object.entries(bloodGroups)
          .sort((a, b) => b[1] - a[1])
          .map(([group, count], idx) => (
            <div key={group} className="flex items-center">
              <span className="w-16 text-sm font-medium">{group}</span>
              <div className="flex-1 mx-3 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                <div
                  className={`${colors[idx % colors.length]} h-full flex items-center justify-end px-2 transition-all duration-500`}
                  style={{ width: `${(count / total) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-white">
                    {count}
                  </span>
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                {((count / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/** ✅ Organ types merged case-insensitively (Heart/heart → Heart) */
function OrganTypeChart({ users }) {
  const organs = users.reduce((acc, u) => {
    if (!u.organType) return acc;
    const key = u.organType.trim().toLowerCase();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (Object.keys(organs).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-500" />
          Organ Types
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No organ type data available yet.
        </p>
      </div>
    );
  }

  const labelMap = {
    heart: "Heart",
    kidney: "Kidney",
    lung: "Lung",
    liver: "Liver",
    eye: "Eye",
    cornea: "Cornea",
    pancreas: "Pancreas",
  };

  const prettyLabel = (key) => {
    if (labelMap[key]) return labelMap[key];
    return key.replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Activity className="w-5 h-5 mr-2 text-blue-500" />
        Organ Types
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(organs).map(([key, count]) => (
          <div
            key={key}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 text-center"
          >
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {count}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {prettyLabel(key)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ users }) {
  const recentUsers = [...users].slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-green-500" />
        Recent Users
      </h3>
      <div className="space-y-3">
        {recentUsers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No recent users yet.
          </p>
        ) : (
          recentUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {user.fullName?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="font-medium text-sm">{user.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {user.bloodGroup || "—"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** 🏥 Hospitals overview panel in Overview tab */
function HospitalsOverview({ hospitals, loading }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold">Hospitals Overview</h3>
        </div>

        {/* 🔗 Use Link instead of navigate() */}
        <Link
          to="/hospitals"
          className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1"
        >
          Manage
        </Link>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {hospitals.length} hospital{hospitals.length === 1 ? "" : "s"} in
        system
      </p>

      {loading ? (
        <div className="py-6">
          <Spinner />
        </div>
      ) : hospitals.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          No hospitals found. Add hospitals from your{" "}
          <span className="font-semibold">Hospital Management</span> page.
        </p>
      ) : (
        <div className="space-y-3 flex-1">
          {hospitals.slice(0, 4).map((h) => (
            <div
              key={h.id}
              className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex items-start justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-sm">{h.name}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {h.city || "—"}, {h.state || "—"}
                  </span>
                </div>
                {h.type && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {h.type}
                  </p>
                )}
              </div>
              <div className="text-right text-xs">
                {h.totalBeds != null && (
                  <p className="text-gray-600 dark:text-gray-300">
                    Beds:{" "}
                    <span className="font-semibold">
                      {h.totalBeds || h.beds || "—"}
                    </span>
                  </p>
                )}
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    (h.status || "Active") === "Active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300"
                  }`}
                >
                  {h.status || "Active"}
                </span>
              </div>
            </div>
          ))}
          {hospitals.length > 4 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              +{hospitals.length - 4} more hospitals…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------- MAIN COMPONENT -----------------
export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);

  const [filterRole, setFilterRole] = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [searchName, setSearchName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [viewMode, setViewMode] = useState("overview");

  // 👥 Real-time users
  useEffect(() => {
    setLoading(true);
    const qUsers = query(collection(db, "users"), orderBy("fullName"));
    const unsub = onSnapshot(
      qUsers,
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load users:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 🏥 Real-time hospitals for overview
  useEffect(() => {
    setHospitalsLoading(true);
    const qHosp = query(collection(db, "hospitals"), orderBy("name"));
    const unsub = onSnapshot(
      qHosp,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const h = d.data() || {};
          return {
            id: d.id,
            name: h.name || "",
            city: h.city || "",
            state: h.state || "",
            status: h.status || "Active",
            totalBeds:
              h.totalBeds != null
                ? h.totalBeds
                : h.beds != null
                ? Number(h.beds) || null
                : null,
            type: h.type || h.hospitalType || "",
          };
        });
        setHospitals(list);
        setHospitalsLoading(false);
      },
      (err) => {
        console.error("Failed to load hospitals:", err);
        setHospitals([]);
        setHospitalsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (
      filterBlood &&
      u.bloodGroup?.toLowerCase() !== filterBlood.toLowerCase()
    )
      return false;
    if (
      searchName &&
      !u.fullName?.toLowerCase().includes(searchName.toLowerCase())
    )
      return false;
    return true;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const exportToExcel = (list) => {
    const headers = ["Name", "Email", "Role", "Blood Group", "Organ", "Mobile"];
    const rows = list.map((u) => [
      u.fullName,
      u.email || "—",
      u.role,
      u.bloodGroup || "—",
      u.organType || "—",
      u.mobile || "—",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (list) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("User Management Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Users: ${list.length}`, 14, 38);
    doc.text(`Donors: ${roleCounts.donor || 0}`, 14, 45);
    doc.text(`Recipients: ${roleCounts.recipient || 0}`, 14, 52);
    doc.text(`Doctors: ${roleCounts.doctor || 0}`, 14, 59);

    const tableData = list.map((u) => [
      u.fullName || "—",
      u.email || "—",
      u.role || "—",
      u.bloodGroup || "—",
      u.organType || "—",
      u.mobile || "—",
    ]);

    doc.autoTable({
      head: [["Name", "Email", "Role", "Blood Group", "Organ", "Mobile"]],
      body: tableData,
      startY: 68,
      theme: "grid",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    doc.save(`users_report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const startEditing = (user) => {
    setEditId(user.id);
    setEditData({
      fullName: user.fullName || "",
      bloodGroup: user.bloodGroup || "",
      organType: user.organType || "",
      mobile: user.mobile || "",
    });
  };

  const cancelEditing = () => {
    setEditId(null);
    setEditData({});
  };

  const saveEditing = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), editData);
      setEditId(null);
      setEditData({});
    } catch (err) {
      alert("Failed to update user: " + err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
      } catch (err) {
        alert("Failed to delete user: " + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 dark:text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive user management and analytics
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-1 rounded-lg w-fit shadow-md">
          <button
            onClick={() => setViewMode("overview")}
            className={`px-6 py-2 rounded-md transition-all font-medium ${
              viewMode === "overview"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-6 py-2 rounded-md transition-all font-medium ${
              viewMode === "table"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            User Table
          </button>
        </div>

        {viewMode === "overview" ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={Users}
                label="Total Users"
                value={users.length}
                bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
                trend="+12% this month"
              />
              <StatCard
                icon={Heart}
                label="Donors"
                value={roleCounts.donor || 0}
                bgColor="bg-gradient-to-br from-red-500 to-pink-600"
              />
              <StatCard
                icon={UserCheck}
                label="Recipients"
                value={roleCounts.recipient || 0}
                bgColor="bg-gradient-to-br from-green-500 to-emerald-600"
              />
              <StatCard
                icon={Activity}
                label="Doctors"
                value={roleCounts.doctor || 0}
                bgColor="bg-gradient-to-br from-purple-500 to-indigo-600"
              />
            </div>

            {/* Charts + Hospitals Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BloodGroupChart users={users} />
                <OrganTypeChart users={users} />
              </div>
              <HospitalsOverview
                hospitals={hospitals}
                loading={hospitalsLoading}
              />
            </div>

            {/* Recent Activity */}
            <RecentActivity users={users} />
          </>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Roles</option>
                  <option value="donor">Donor</option>
                  <option value="recipient">Recipient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={filterBlood}
                  onChange={(e) => setFilterBlood(e.target.value)}
                  className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <button
                  onClick={() => {
                    setSearchName("");
                    setFilterRole("");
                    setFilterBlood("");
                  }}
                  className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Reset
                </button>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => exportToExcel(filteredUsers)}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportToPDF(filteredUsers)}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        "Name",
                        "Email",
                        "Role",
                        "Blood Group",
                        "Organ",
                        "Mobile",
                        "Actions",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          No users found
                        </td>
                      </tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editId === u.id ? (
                            <input
                              type="text"
                              value={editData.fullName}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  fullName: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                            />
                          ) : (
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold mr-3">
                                {u.fullName?.charAt(0) || "U"}
                              </div>
                              <span className="font-medium">
                                {u.fullName || "—"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {u.email || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              u.role === "donor"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : u.role === "recipient"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : u.role === "doctor"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editId === u.id ? (
                            <select
                              value={editData.bloodGroup}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  bloodGroup: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                            >
                              <option value="">Select</option>
                              {[
                                "A+",
                                "A-",
                                "B+",
                                "B-",
                                "AB+",
                                "AB-",
                                "O+",
                                "O-",
                              ].map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {u.bloodGroup || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editId === u.id ? (
                            <input
                              type="text"
                              value={editData.organType}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  organType: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                            />
                          ) : (
                            <span className="capitalize">
                              {u.organType || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editId === u.id ? (
                            <input
                              type="text"
                              value={editData.mobile}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  mobile: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                            />
                          ) : (
                            u.mobile || "—"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {editId === u.id ? (
                              <>
                                <button
                                  onClick={() => saveEditing(u.id)}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(u)}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
