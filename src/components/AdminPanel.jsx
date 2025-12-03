import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase"; // Adjust path
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Spinner component
function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

const PAGE_SIZE = 5; // Number of users per page

export default function AdminPanel() {
  const [usersPages, setUsersPages] = useState([]); // Array of pages (each page = array of users)
  const [currentPage, setCurrentPage] = useState(0);

  // Filters
  const [filterRole, setFilterRole] = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");

  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [isEnd, setIsEnd] = useState(false);

  // Fetch page from Firestore (with role filter & pagination)
  async function fetchPage(startAfterDoc = null, append = false) {
    setLoading(true);

    try {
      const usersRef = collection(db, "users");

      let constraints = [];
      if (filterRole) constraints.push(where("role", "==", filterRole));
      constraints.push(orderBy("fullName", "asc"));
      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

      const q = query(usersRef, ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        if (!append) {
          // No results, reset pages to empty first page
          setUsersPages([[]]);
          setCurrentPage(0);
        }
        setIsEnd(true);
        setLoading(false);
        return;
      }

      let usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Client-side filters for bloodGroup & organTypes
      if (filterBlood) {
        usersData = usersData.filter((u) =>
          u.bloodGroup?.toLowerCase().includes(filterBlood.toLowerCase())
        );
      }
      if (filterOrgan) {
        usersData = usersData.filter(
          (u) =>
            u.organTypes &&
            u.organTypes.some((organ) =>
              organ.toLowerCase().includes(filterOrgan.toLowerCase())
            )
        );
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      if (append) {
        setUsersPages((prev) => [...prev, usersData]);
        setCurrentPage(usersPages.length);
      } else {
        setUsersPages([usersData]);
        setCurrentPage(0);
      }

      setLastDoc(lastVisible);
      setIsEnd(snapshot.docs.length < PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  }

  // Reset & fetch on filter changes
  useEffect(() => {
    setUsersPages([]);
    setLastDoc(null);
    setIsEnd(false);
    fetchPage(null, false);
  }, [filterRole, filterBlood, filterOrgan]);

  // Pagination controls
  function handleNext() {
    if (!isEnd) {
      // If next page cached, just go to it
      if (usersPages[currentPage + 1]) {
        setCurrentPage(currentPage + 1);
      } else {
        fetchPage(lastDoc, true);
      }
    }
  }

  function handlePrev() {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  }

  // Current page users
  const currentUsers = usersPages[currentPage] || [];

  // Export Excel
  const exportExcel = (data) => {
    const ws = XLSX.utils.json_to_sheet(
      data.map(({ fullName, email, mobile, role, bloodGroup, organTypes }) => ({
        Name: fullName,
        Email: email,
        Mobile: mobile,
        Role: role,
        Blood: bloodGroup,
        Organs: organTypes ? organTypes.join(", ") : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "users_export.xlsx");
  };

  // Export PDF
  const exportPDF = (data) => {
    const doc = new jsPDF();
    const rows = data.map(({ fullName, email, mobile, role, bloodGroup, organTypes }) => [
      fullName,
      email,
      mobile,
      role,
      bloodGroup,
      organTypes ? organTypes.join(", ") : "",
    ]);
    doc.autoTable({
      head: [["Name", "Email", "Mobile", "Role", "Blood", "Organs"]],
      body: rows,
    });
    doc.save("users_export.pdf");
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-200 to-pink-300">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Admin Panel</h2>

        {/* Filters & Export */}
        <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-3 items-center">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">All roles</option>
            <option value="donor">Donor</option>
            <option value="recipient">Recipient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>

          <input
            type="text"
            placeholder="Blood group (e.g. A+)"
            value={filterBlood}
            onChange={(e) => setFilterBlood(e.target.value)}
            className="p-2 border rounded"
          />

          <input
            type="text"
            placeholder="Organ (e.g. kidney)"
            value={filterOrgan}
            onChange={(e) => setFilterOrgan(e.target.value)}
            className="p-2 border rounded"
          />

          <button
            onClick={() => exportExcel(currentUsers)}
            className="ml-auto bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            disabled={loading || currentUsers.length === 0}
          >
            Export Excel
          </button>
          <button
            onClick={() => exportPDF(currentUsers)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            disabled={loading || currentUsers.length === 0}
          >
            Export PDF
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto bg-white rounded shadow">
          {loading ? (
            <Spinner />
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Mobile
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Blood
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Organs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentUsers.length > 0 ? (
                  currentUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{u.fullName || "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.email || "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.mobile || "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.role || "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.bloodGroup || "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {u.organTypes && u.organTypes.length > 0
                          ? u.organTypes.join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={handlePrev}
            disabled={currentPage === 0 || loading}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="pt-2 font-semibold">
            Page {currentPage + 1} {isEnd && "(Last)"}
          </span>
          <button
            onClick={handleNext}
            disabled={isEnd || loading}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  // Pagination handlers must be declared here to be accessible in JSX
  function handleNext() {
    if (!isEnd) {
      // If next page cached, just go to it
      if (usersPages[currentPage + 1]) {
        setCurrentPage(currentPage + 1);
      } else {
        fetchPage(lastDoc, true);
      }
    }
  }

  function handlePrev() {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  }
}
