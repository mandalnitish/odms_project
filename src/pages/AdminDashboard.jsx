// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminDashboard() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterRole, setFilterRole] = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [searchName, setSearchName] = useState(""); 

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const hideLogoutButton = true; // Removed Logout

  // Fetch users
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), orderBy("fullName"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterBlood && u.bloodGroup?.toLowerCase() !== filterBlood.toLowerCase())
      return false;
    if (searchName && !u.fullName?.toLowerCase().includes(searchName.toLowerCase()))
      return false;
    return true;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const exportToExcel = (list) => {
    const ws = XLSX.utils.json_to_sheet(
      list.map((u) => ({
        Name: u.fullName,
        Email: u.email || "—",
        Role: u.role,
        "Blood Group": u.bloodGroup || "—",
        Organ: u.organType || "—",
        Mobile: u.mobile || "—",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "users.xlsx");
  };

  const exportToPDF = (list) => {
    const doc = new jsPDF();
    doc.text("Users Report", 14, 20);
    const rows = list.map((u) => [
      u.fullName,
      u.email || "—",
      u.role,
      u.bloodGroup || "—",
      u.organType || "—",
      u.mobile || "—",
    ]);
    doc.autoTable({
      head: [["Name", "Email", "Role", "Blood Group", "Organ", "Mobile"]],
      body: rows,
      startY: 28,
    });
    doc.save("users.pdf");
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

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-green-200 to-blue-300 dark:from-gray-900 dark:to-gray-800 dark:text-white transition-all">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Manage all users and data
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {["admin", "doctor", "donor", "recipient"].map((role) => (
                <div
                  key={role}
                  className="px-4 py-2 rounded shadow bg-white/20 dark:bg-gray-700 text-black dark:text-white whitespace-nowrap"
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}: {roleCounts[role] || 0}
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Filters + Export */}
        <div className="bg-white/20 dark:bg-gray-700 card-glass p-4 rounded-md mb-6 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="p-2 rounded dark:bg-gray-800 dark:text-white flex-1 min-w-[120px]"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2 rounded cursor-pointer dark:bg-gray-800 dark:text-white"
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
            className="p-2 rounded cursor-pointer dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Blood Groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchName("");
              setFilterRole("");
              setFilterBlood("");
            }}
            className="ml-auto p-2 bg-gray-200/30 dark:bg-gray-600 rounded"
          >
            Reset Filters
          </button>
          <button
            onClick={() => exportToExcel(filteredUsers)}
            className="px-4 py-2 bg-green-600 text-white rounded shadow"
          >
            Export Excel
          </button>
          <button
            onClick={() => exportToPDF(filteredUsers)}
            className="px-4 py-2 bg-red-600 text-white rounded shadow"
          >
            Export PDF
          </button>
        </div>

        {/* Users Table */}
        {loading ? (
          <Spinner />
        ) : (
          <div className="card-glass p-4 overflow-auto max-h-[600px] rounded">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300 dark:border-gray-700">
                <thead className="bg-white/10 dark:bg-gray-800">
                  <tr>
                    {["Name", "Email", "Role", "Blood Group", "Organ", "Mobile", "Actions"].map(
                      (col) => (
                        <th
                          key={col}
                          className="p-2 border border-gray-300 dark:border-gray-700 text-left whitespace-nowrap"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-600 dark:text-gray-400">
                        No users found
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="odd:bg-white/10 even:bg-white/5 dark:odd:bg-gray-800 dark:even:bg-gray-700"
                    >
                      <td className="p-2 border border-gray-300 dark:border-gray-700 whitespace-nowrap">
                        {editId === u.id ? (
                          <input
                            type="text"
                            value={editData.fullName}
                            onChange={(e) =>
                              setEditData({ ...editData, fullName: e.target.value })
                            }
                            className="w-full p-1 rounded text-black dark:text-white dark:bg-gray-700"
                          />
                        ) : (
                          u.fullName || "—"
                        )}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-700 whitespace-nowrap">
                        {u.email || "—"}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-700 capitalize whitespace-nowrap">
                        {u.role}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-700 whitespace-nowrap">
                        {editId === u.id ? (
                          <select
                            value={editData.bloodGroup}
                            onChange={(e) =>
                              setEditData({ ...editData, bloodGroup: e.target.value })
                            }
                            className="w-full p-1 rounded text-black dark:text-white dark:bg-gray-700"
                          >
                            <option value="">Select</option>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        ) : (
                          u.bloodGroup || "—"
                        )}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-700 whitespace-nowrap">
                        {editId === u.id ? (
                          <input
                            type="text"
                            value={editData.organType}
                            onChange={(e) =>
                              setEditData({ ...editData, organType: e.target.value })
                            }
                            className="w-full p-1 rounded text-black dark:text-white dark:bg-gray-700"
                          />
                        ) : (
                          u.organType || "—"
                        )}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-700 whitespace-nowrap">
                        {editId === u.id ? (
                          <input
                            type="text"
                            value={editData.mobile}
                            onChange={(e) =>
                              setEditData({ ...editData, mobile: e.target.value })
                            }
                            className="w-full p-1 rounded text-black dark:text-white dark:bg-gray-700"
                          />
                        ) : (
                          u.mobile || "—"
                        )}
                      </td>
                      <td className="p-2 border border-gray-300 dark:border-gray-700 flex gap-1 flex-wrap">
                        {editId === u.id ? (
                          <>
                            <button
                              onClick={() => saveEditing(u.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-2 py-1 bg-gray-600 text-white rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(u)}
                              className="px-2 py-1 bg-yellow-500 text-black rounded dark:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
