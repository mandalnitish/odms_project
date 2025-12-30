// src/pages/HospitalsPage.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
} from "firebase/firestore";

import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  CheckCircle,
} from "lucide-react";

// --------------------------------------------------
// Modal for Add / Edit Hospital
// --------------------------------------------------
function HospitalModal({ editData, onClose, onSave }) {
  const [form, setForm] = useState(
    editData || {
      name: "",
      addressLine1: "",
      city: "",
      state: "",
      pincode: "",
      type: "Government",
      contactNumber: "",
      emergencyNumber: "",
      totalBeds: "",
      facilities: [],
      status: "Active",
    }
  );

  const facilityOptions = [
    "ICU",
    "NICU",
    "Blood Bank",
    "Dialysis",
    "Ambulance Service",
    "Operation Theater",
    "Transplant Unit",
  ];

  const toggleFacility = (val) => {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(val)
        ? prev.facilities.filter((f) => f !== val)
        : [...prev.facilities, val],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editData ? "Edit Hospital" : "Add Hospital"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Inputs */}
          <input
            type="text"
            required
            placeholder="Hospital Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
          />

          <input
            type="text"
            required
            placeholder="Address"
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            className="w-full bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
          />

          <div className="grid grid-cols-3 gap-3">
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
            />
            <input
              required
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
            />
            <input
              required
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Phone"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
            />

            <input
              required
              placeholder="Emergency Number"
              value={form.emergencyNumber}
              onChange={(e) =>
                setForm({ ...form, emergencyNumber: e.target.value })
              }
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
            />
          </div>

          {/* Facilities = Organs */}
          <div>
            <p className="font-semibold mb-2">Facilities (Organs)</p>
            <div className="grid grid-cols-2 gap-2">
              {facilityOptions.map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.facilities.includes(f)}
                    onChange={() => toggleFacility(f)}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          {/* Beds */}
          <input
            type="number"
            placeholder="Total Beds"
            value={form.totalBeds}
            onChange={(e) => setForm({ ...form, totalBeds: e.target.value })}
            className="w-full bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
          />

          {/* Status */}
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <button className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold mt-4">
            {editData ? "Update Hospital" : "Add Hospital"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Main Hospitals Page
// --------------------------------------------------
export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editHospital, setEditHospital] = useState(null);
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const ref = collection(db, "hospitals");

    const unsub = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHospitals(list);
    });

    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditHospital(null);
    setShowModal(true);
  };

  const saveHospital = async (data) => {
    if (editHospital) {
      await updateDoc(doc(db, "hospitals", editHospital.id), data);
      setSuccessMsg("Hospital updated successfully ✔️");
    } else {
      await addDoc(collection(db, "hospitals"), data);
      setSuccessMsg("Hospital added successfully ✔️");
    }

    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const removeHospital = async (id) => {
    if (!window.confirm("Delete hospital?")) return;
    await deleteDoc(doc(db, "hospitals", id));
  };

  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen px-6 py-10 text-white bg-gray-900">
      <h1 className="text-4xl font-bold mb-3">Hospital Management</h1>
      <p className="text-gray-400 mb-6">
        Add and manage all partner hospitals with detailed information.
      </p>

      {successMsg && (
        <div className="bg-green-700 p-3 mb-4 rounded-lg flex items-center gap-2">
          <CheckCircle /> {successMsg}
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-xl mb-6">
        <button
          onClick={openAdd}
          className="bg-teal-600 px-6 py-3 rounded-lg font-semibold hover:bg-teal-700"
        >
          Add Hospital
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <Search />
        <input
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 p-3 rounded-lg flex-1"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">City</th>
              <th className="p-3">Type</th>
              <th className="p-3">Organs</th>
              <th className="p-3">Beds</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-t border-gray-700">
                <td className="p-3">{h.name}</td>
                <td className="p-3">{h.city}</td>
                <td className="p-3">{h.type}</td>

                {/* Organs = facilities */}
                <td className="p-3">
                  {h.facilities?.length > 0
                    ? h.facilities.slice(0, 3).join(", ") +
                      (h.facilities.length > 3
                        ? ` +${h.facilities.length - 3} more`
                        : "")
                    : "-"}
                </td>

                <td className="p-3">{h.totalBeds || "-"}</td>

                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => {
                      setEditHospital(h);
                      setShowModal(true);
                    }}
                    className="bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => removeHospital(h.id)}
                    className="bg-red-600 px-3 py-2 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-400">
                  No hospitals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <HospitalModal
          editData={editHospital}
          onSave={saveHospital}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
