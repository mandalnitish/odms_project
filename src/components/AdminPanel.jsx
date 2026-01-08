import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { 
  Search, 
  Download, 
  FileText, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle,
  Filter,
  Users,
  Activity,
  AlertCircle,
  TrendingUp
} from "lucide-react";

// Spinner component
function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function AdminPanel() {
  const [usersPages, setUsersPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Filters
  const [filterRole, setFilterRole] = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("all"); // all, verified, pending

  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [isEnd, setIsEnd] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    donors: 0,
    recipients: 0,
    doctors: 0,
    pendingVerification: 0,
  });

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    address: "",
    bloodGroup: "",
    organType: "",
    role: "",
  });

  // Fetch statistics
  async function fetchStats() {
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      
      let donors = 0, recipients = 0, doctors = 0, pending = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.role === 'donor') donors++;
        if (data.role === 'recipient') recipients++;
        if (data.role === 'doctor') doctors++;
        if (!data.documentsVerified && (data.role === 'donor' || data.role === 'recipient')) {
          pending++;
        }
      });

      setStats({
        totalUsers: snapshot.size,
        donors,
        recipients,
        doctors,
        pendingVerification: pending,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  // Fetch page from Firestore
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
          setUsersPages([[]]);
          setCurrentPage(0);
        }
        setIsEnd(true);
        setLoading(false);
        return;
      }

      let usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Client-side filters
      if (filterBlood) {
        usersData = usersData.filter((u) =>
          u.bloodGroup?.toLowerCase().includes(filterBlood.toLowerCase())
        );
      }
      if (filterOrgan) {
        usersData = usersData.filter((u) =>
          u.organType?.toLowerCase().includes(filterOrgan.toLowerCase())
        );
      }
      if (searchQuery) {
        usersData = usersData.filter((u) =>
          u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.mobile?.includes(searchQuery)
        );
      }
      if (verificationFilter === 'verified') {
        usersData = usersData.filter((u) => u.documentsVerified === true);
      } else if (verificationFilter === 'pending') {
        usersData = usersData.filter((u) => u.documentsVerified === false);
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
  }, [filterRole, filterBlood, filterOrgan, searchQuery, verificationFilter]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // View user details
  const handleView = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Edit user
  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      mobile: user.mobile || "",
      address: user.address || "",
      bloodGroup: user.bloodGroup || "",
      organType: user.organType || "",
      role: user.role || "",
    });
    setShowEditModal(true);
  };

  // Save edited user
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      await updateDoc(userRef, editFormData);
      
      alert("User updated successfully!");
      setShowEditModal(false);
      
      // Refresh data
      setUsersPages([]);
      setLastDoc(null);
      setIsEnd(false);
      fetchPage(null, false);
      fetchStats();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    }
    setLoading(false);
  };

  // Delete user
  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, "users", selectedUser.id));
      
      alert("User deleted successfully!");
      setShowDeleteModal(false);
      
      // Refresh data
      setUsersPages([]);
      setLastDoc(null);
      setIsEnd(false);
      fetchPage(null, false);
      fetchStats();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
    setLoading(false);
  };

  // Verify user documents
  const handleVerify = async (userId, currentStatus) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        documentsVerified: !currentStatus
      });
      
      alert(`User ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
      
      // Refresh data
      setUsersPages([]);
      setLastDoc(null);
      setIsEnd(false);
      fetchPage(null, false);
      fetchStats();
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("Failed to update verification status");
    }
    setLoading(false);
  };

  // Pagination
  function handleNext() {
    if (!isEnd) {
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

  const currentUsers = usersPages[currentPage] || [];

  // Export Excel
  const exportExcel = (data) => {
    const ws = XLSX.utils.json_to_sheet(
      data.map(({ fullName, email, mobile, role, bloodGroup, organType, documentsVerified }) => ({
        Name: fullName,
        Email: email,
        Mobile: mobile,
        Role: role,
        Blood: bloodGroup,
        Organ: organType,
        Verified: documentsVerified ? 'Yes' : 'No',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export PDF
  const exportPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Users Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const rows = data.map(({ fullName, email, mobile, role, bloodGroup, organType, documentsVerified }) => [
      fullName,
      email,
      mobile,
      role,
      bloodGroup,
      organType,
      documentsVerified ? 'Yes' : 'No',
    ]);
    
    doc.autoTable({
      startY: 35,
      head: [["Name", "Email", "Mobile", "Role", "Blood", "Organ", "Verified"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`users_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Admin Panel
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage users, verify documents, and monitor system activity
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalUsers}</p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Donors</p>
                <p className="text-2xl font-bold text-blue-600">{stats.donors}</p>
              </div>
              <Activity className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recipients</p>
                <p className="text-2xl font-bold text-purple-600">{stats.recipients}</p>
              </div>
              <TrendingUp className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Doctors</p>
                <p className="text-2xl font-bold text-green-600">{stats.doctors}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</p>
              </div>
              <AlertCircle className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Filters & Search</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, email, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="donor">Donor</option>
              <option value="recipient">Recipient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>

            {/* Blood Group Filter */}
            <select
              value={filterBlood}
              onChange={(e) => setFilterBlood(e.target.value)}
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Blood Groups</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Verification Filter */}
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending Verification</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => exportExcel(currentUsers)}
              disabled={loading || currentUsers.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export Excel
            </button>
            <button
              onClick={() => exportPDF(currentUsers)}
              disabled={loading || currentUsers.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={18} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Blood
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentUsers.length > 0 ? (
                    currentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.fullName || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{u.email || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{u.mobile || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            u.role === 'donor' ? 'bg-blue-100 text-blue-800' :
                            u.role === 'recipient' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'doctor' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {u.role || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{u.bloodGroup || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.role === 'donor' || u.role === 'recipient' ? (
                            <button
                              onClick={() => handleVerify(u.id, u.documentsVerified)}
                              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
                                u.documentsVerified 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                              } transition-colors`}
                            >
                              {u.documentsVerified ? (
                                <><CheckCircle size={14} /> Verified</>
                              ) : (
                                <><XCircle size={14} /> Pending</>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleView(u)}
                              className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(u)}
                              className="text-green-600 hover:text-green-900 dark:hover:text-green-400 transition-colors"
                              title="Edit User"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              className="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <Users className="mx-auto mb-2 text-gray-300" size={48} />
                        <p>No users found matching your filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing page <span className="font-semibold">{currentPage + 1}</span>
              {isEnd && " (Last page)"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={currentPage === 0 || loading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={isEnd || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* View Modal */}
        {showViewModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">User Details</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.fullName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Mobile</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.mobile || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                    <p className="font-semibold text-gray-800 dark:text-white capitalize">{selectedUser.role || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Blood Group</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.bloodGroup || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Organ Type</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.organType || "—"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedUser.address || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Document Status</p>
                    <p className={`font-semibold ${selectedUser.documentsVerified ? 'text-green-600' : 'text-orange-600'}`}>
                      {selectedUser.documentsVerified ? 'Verified' : 'Pending Verification'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt.toDate()).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Edit User</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mobile
                    </label>
                    <input
                      type="text"
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({...editFormData, mobile: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <textarea
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                      rows="3"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Blood Group
                      </label>
                      <select
                        value={editFormData.bloodGroup}
                        onChange={(e) => setEditFormData({...editFormData, bloodGroup: e.target.value})}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Blood Group</option>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Organ Type
                      </label>
                      <select
                        value={editFormData.organType}
                        onChange={(e) => setEditFormData({...editFormData, organType: e.target.value})}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Organ</option>
                        {["Kidney", "Heart", "Liver", "Lung", "Eye"].map((o) => (
                          <option key={o} value={o.toLowerCase()}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="donor">Donor</option>
                      <option value="recipient">Recipient</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-2">
                  Delete User?
                </h3>
                
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete <span className="font-semibold">{selectedUser.fullName}</span>? 
                  This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={loading}
                    className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}