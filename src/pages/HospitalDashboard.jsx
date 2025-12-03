import React, { useState, useEffect } from "react";
import { Building2, MapPin, Phone, Mail, Users, Activity, Plus, Edit2, Trash2, Save, X, Search, Filter, Download, FileText } from "lucide-react";

// Mock Firebase - Replace with actual Firebase imports
const db = {
  collection: () => ({}),
};

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, bgColor }) {
  return (
    <div className={`${bgColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="bg-white/20 p-4 rounded-lg">
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}

function HospitalModal({ hospital, onClose, onSave }) {
  const [formData, setFormData] = useState(
    hospital || {
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      website: "",
      type: "Multi-Specialty",
      beds: "",
      departments: [],
      facilities: [],
      emergencyContact: "",
      established: "",
      accreditation: "",
      status: "Active",
    }
  );

  const hospitalTypes = [
    "Multi-Specialty",
    "Super Specialty",
    "General Hospital",
    "Specialty Hospital",
    "Teaching Hospital",
  ];

  const commonDepartments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Oncology",
    "Pediatrics",
    "Gynecology",
    "Emergency",
    "ICU",
    "Transplant Unit",
    "Radiology",
  ];

  const commonFacilities = [
    "24/7 Emergency",
    "ICU",
    "NICU",
    "Blood Bank",
    "Pharmacy",
    "Laboratory",
    "Imaging Center",
    "Operation Theater",
    "Dialysis",
    "Ambulance Service",
  ];

  const handleDepartmentToggle = (dept) => {
    setFormData({
      ...formData,
      departments: formData.departments.includes(dept)
        ? formData.departments.filter((d) => d !== dept)
        : [...formData.departments, dept],
    });
  };

  const handleFacilityToggle = (facility) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.includes(facility)
        ? formData.facilities.filter((f) => f !== facility)
        : [...formData.facilities, facility],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              <span>{hospital ? "Edit Hospital" : "Add New Hospital"}</span>
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                  placeholder="Metropolitan Medical Center"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                  placeholder="123 Medical Center Drive"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Pincode *</label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hospital Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                >
                  {hospitalTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Emergency Contact *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Total Beds</label>
                <input
                  type="number"
                  value={formData.beds}
                  onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Established</label>
                <input
                  type="text"
                  value={formData.established}
                  onChange={(e) =>
                    setFormData({ ...formData, established: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                  placeholder="1995"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Accreditation</label>
                <input
                  type="text"
                  value={formData.accreditation}
                  onChange={(e) =>
                    setFormData({ ...formData, accreditation: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
                  placeholder="NABH, JCI"
                />
              </div>
            </div>
          </div>

          {/* Departments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Departments</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {commonDepartments.map((dept) => (
                <label
                  key={dept}
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={formData.departments.includes(dept)}
                    onChange={() => handleDepartmentToggle(dept)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{dept}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Facilities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Facilities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {commonFacilities.map((facility) => (
                <label
                  key={facility}
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={formData.facilities.includes(facility)}
                    onChange={() => handleFacilityToggle(facility)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{facility}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-blue-500 outline-none transition-all"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              {hospital ? "Update Hospital" : "Add Hospital"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HospitalDashboard() {
  const [hospitals, setHospitals] = useState([
    {
      id: "1",
      name: "Metropolitan Medical Center",
      address: "123 Medical Center Drive",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      phone: "+91-22-12345678",
      emergencyContact: "+91-22-87654321",
      email: "info@mmc.com",
      website: "www.mmc.com",
      type: "Multi-Specialty",
      beds: "500",
      departments: ["Cardiology", "Neurology", "Orthopedics", "Transplant Unit", "Emergency", "ICU"],
      facilities: ["24/7 Emergency", "ICU", "Blood Bank", "Pharmacy", "Laboratory", "Operation Theater"],
      established: "1995",
      accreditation: "NABH, JCI",
      status: "Active",
    },
    {
      id: "2",
      name: "City General Hospital",
      address: "456 Healthcare Avenue",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      phone: "+91-11-98765432",
      emergencyContact: "+91-11-23456789",
      email: "contact@citygeneral.com",
      website: "www.citygeneral.com",
      type: "General Hospital",
      beds: "300",
      departments: ["Emergency", "ICU", "Pediatrics", "Gynecology", "Radiology"],
      facilities: ["24/7 Emergency", "NICU", "Blood Bank", "Ambulance Service"],
      established: "2005",
      accreditation: "NABH",
      status: "Active",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const cities = [...new Set(hospitals.map((h) => h.city))];
  const types = [...new Set(hospitals.map((h) => h.type))];

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = !filterCity || h.city === filterCity;
    const matchesType = !filterType || h.type === filterType;
    const matchesStatus = !filterStatus || h.status === filterStatus;

    return matchesSearch && matchesCity && matchesType && matchesStatus;
  });

  const handleSaveHospital = (hospitalData) => {
    if (selectedHospital) {
      setHospitals(
        hospitals.map((h) =>
          h.id === selectedHospital.id ? { ...hospitalData, id: h.id } : h
        )
      );
    } else {
      setHospitals([
        ...hospitals,
        { ...hospitalData, id: Date.now().toString() },
      ]);
    }
  };

  const handleDeleteHospital = (id) => {
    if (window.confirm("Are you sure you want to delete this hospital?")) {
      setHospitals(hospitals.filter((h) => h.id !== id));
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "City", "State", "Type", "Phone", "Emergency", "Beds", "Status"];
    const rows = filteredHospitals.map((h) => [
      h.name,
      h.city,
      h.state,
      h.type,
      h.phone,
      h.emergencyContact,
      h.beds,
      h.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hospitals.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 dark:text-white">
      {showModal && (
        <HospitalModal
          hospital={selectedHospital}
          onClose={() => {
            setShowModal(false);
            setSelectedHospital(null);
          }}
          onSave={handleSaveHospital}
        />
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Hospital Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage hospital information and facilities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Building2}
            label="Total Hospitals"
            value={hospitals.length}
            bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            icon={Activity}
            label="Active Hospitals"
            value={hospitals.filter((h) => h.status === "Active").length}
            bgColor="bg-gradient-to-br from-green-500 to-emerald-600"
          />
          <StatCard
            icon={Users}
            label="Total Beds"
            value={hospitals.reduce((sum, h) => sum + (parseInt(h.beds) || 0), 0)}
            bgColor="bg-gradient-to-br from-purple-500 to-indigo-600"
          />
          <StatCard
            icon={MapPin}
            label="Cities Covered"
            value={cities.length}
            bgColor="bg-gradient-to-br from-orange-500 to-red-600"
          />
        </div>

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search hospitals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm("");
                setFilterCity("");
                setFilterType("");
                setFilterStatus("");
              }}
              className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Reset
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedHospital(null);
                setShowModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Hospital
            </button>

            <button
              onClick={exportToCSV}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Hospitals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredHospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{hospital.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      hospital.status === "Active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                    }`}
                  >
                    {hospital.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedHospital(hospital);
                      setShowModal(true);
                    }}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHospital(hospital.id)}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {hospital.address}, {hospital.city}, {hospital.state} -{" "}
                    {hospital.pincode}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {hospital.phone}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {hospital.email || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-semibold">{hospital.type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Beds:</span>
                    <span className="ml-2 font-semibold">{hospital.beds}</span>
                  </div>
                </div>

                {hospital.departments.length > 0 && (
                  <div className="pt-3">
                    <p className="text-sm font-semibold mb-2">Departments:</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.departments.slice(0, 4).map((dept) => (
                        <span
                          key={dept}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs"
                        >
                          {dept}
                        </span>
                      ))}
                      {hospital.departments.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          +{hospital.departments.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {hospital.facilities.length > 0 && (
                  <div className="pt-3">
                    <p className="text-sm font-semibold mb-2">Facilities:</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.facilities.slice(0, 3).map((facility) => (
                        <span
                          key={facility}
                          className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs"
                        >
                          {facility}
                        </span>
                      ))}
                      {hospital.facilities.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          +{hospital.facilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredHospitals.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-500">
              No hospitals found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}