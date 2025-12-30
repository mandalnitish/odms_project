// src/pages/HospitalDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Activity,
  Stethoscope,
  Plus,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/* -------------------- Small UI helpers -------------------- */

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gradient-to-br from-blue-600/80 via-indigo-600/80 to-purple-600/80 rounded-2xl p-5 shadow-lg flex items-center justify-between">
      <div>
        <p className="text-sm text-white/80 mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className="bg-white/20 rounded-xl p-4">
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mr-2 mb-2">
      {children}
    </span>
  );
}

/* -------------------- Doctor Modal -------------------- */

function DoctorModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || {
      fullName: "",
      speciality: "",
      email: "",
      phone: "",
      experienceYears: "",
      onCall: true,
    }
  );

  useEffect(() => {
    if (initial) {
      setForm({
        fullName: initial.fullName || "",
        speciality: initial.speciality || "",
        email: initial.email || "",
        phone: initial.phone || "",
        experienceYears: initial.experienceYears || "",
        onCall: initial.onCall ?? true,
      });
    } else {
      setForm({
        fullName: "",
        speciality: "",
        email: "",
        phone: "",
        experienceYears: "",
        onCall: true,
      });
    }
  }, [initial, open]);

  if (!open) return null;

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-500" />
            {initial ? "Edit Doctor" : "Add Doctor"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Dr. Hathi"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Speciality *</label>
            <input
              type="text"
              required
              value={form.speciality}
              onChange={(e) => handleChange("speciality", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Nephrologist"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Experience (years)</label>
              <input
                type="number"
                min="0"
                value={form.experienceYears}
                onChange={(e) =>
                  handleChange("experienceYears", e.target.value)
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <input
                id="onCall"
                type="checkbox"
                checked={form.onCall}
                onChange={(e) => handleChange("onCall", e.target.checked)}
                className="w-4 h-4 rounded text-purple-600"
              />
              <label htmlFor="onCall" className="text-sm">
                Available for emergency / on-call
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl"
            >
              {initial ? "Save Changes" : "Add Doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- Main Page -------------------- */

export default function HospitalDetailsPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const [hospital, setHospital] = useState(null);
  const [loadingHospital, setLoadingHospital] = useState(true);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  const [error, setError] = useState("");

  /* ---- Load hospital once ---- */
  useEffect(() => {
    async function fetchHospital() {
      try {
        const ref = doc(db, "hospitals", hospitalId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Hospital not found.");
        } else {
          setHospital({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load hospital.");
      } finally {
        setLoadingHospital(false);
      }
    }
    fetchHospital();
  }, [hospitalId]);

  /* ---- Subscribe to doctors sub-collection ---- */
  useEffect(() => {
    if (!hospitalId) return;
    const colRef = collection(db, "hospitals", hospitalId, "doctors");

    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDoctors(list);
        setLoadingDoctors(false);
      },
      (err) => {
        console.error(err);
        setLoadingDoctors(false);
      }
    );

    return () => unsub();
  }, [hospitalId]);

  /* ---- CRUD Doctor handlers ---- */

  const handleAddDoctorClick = () => {
    setEditingDoctor(null);
    setDoctorModalOpen(true);
  };

  const handleEditDoctorClick = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorModalOpen(true);
  };

  const handleSaveDoctor = async (data) => {
    try {
      setLoadingDoctors(true);
      if (editingDoctor) {
        const ref = doc(
          db,
          "hospitals",
          hospitalId,
          "doctors",
          editingDoctor.id
        );
        await updateDoc(ref, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        const colRef = collection(db, "hospitals", hospitalId, "doctors");
        await addDoc(colRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setDoctorModalOpen(false);
      setEditingDoctor(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save doctor: " + e.message);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm("Delete this doctor from hospital?")) return;
    try {
      setLoadingDoctors(true);
      const ref = doc(db, "hospitals", hospitalId, "doctors", id);
      await deleteDoc(ref);
    } catch (e) {
      console.error(e);
      alert("Failed to delete doctor: " + e.message);
    } finally {
      setLoadingDoctors(false);
    }
  };

  /* ---- Render helpers ---- */

  const departments = hospital?.departments || [];
  const facilities = hospital?.facilities || [];

  const totalBeds = hospital?.totalBeds || hospital?.beds || "-";

  if (loadingHospital) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="max-w-md text-center">
          <p className="text-red-400 mb-2">{error || "Hospital not found."}</p>
          <button
            onClick={() => navigate("/hospitals")}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hospitals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-gray-100">
      <DoctorModal
        open={doctorModalOpen}
        onClose={() => {
          setDoctorModalOpen(false);
          setEditingDoctor(null);
        }}
        onSave={handleSaveDoctor}
        initial={editingDoctor}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/hospitals")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hospitals
          </button>

          <Link
            to="/doctor"
            className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-sm"
          >
            Go to Doctor Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/80 via-indigo-600/80 to-purple-600/80 rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {hospital.name}
                </h1>
                <p className="flex items-center text-blue-50 text-sm md:text-base">
                  <MapPin className="w-4 h-4 mr-1 opacity-80" />
                  {hospital.city}, {hospital.state}{" "}
                  {hospital.pincode ? `- ${hospital.pincode}` : ""}
                </p>
                <p className="mt-2 inline-flex px-3 py-1 rounded-full bg-white/15 text-xs font-semibold uppercase tracking-wide">
                  {hospital.type || "Multi-Specialty"}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-sm text-blue-50">
              {hospital.phone && (
                <p className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {hospital.phone}
                </p>
              )}
              {hospital.emergencyNumber && (
                <p className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Emergency: {hospital.emergencyNumber}
                </p>
              )}
              {hospital.email && (
                <p className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {hospital.email}
                </p>
              )}
              {hospital.website && (
                <a
                  href={
                    hospital.website.startsWith("http")
                      ? hospital.website
                      : `https://${hospital.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center hover:underline"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  {hospital.website}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard icon={Users} label="Doctors" value={doctors.length} />
          <StatCard
            icon={Activity}
            label="Total Beds"
            value={totalBeds || "-"}
          />
          <StatCard
            icon={Building2}
            label="Departments"
            value={departments.length}
          />
        </div>

        {/* Main layout: Overview + Doctors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address & general info */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Overview
              </h2>
              <p className="text-sm text-gray-300 mb-3">
                {hospital.addressLine1 || hospital.address}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">
                    Established
                  </p>
                  <p>{hospital.established || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">
                    Accreditation
                  </p>
                  <p>{hospital.accreditation || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">
                    Status
                  </p>
                  <p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        hospital.status === "Inactive"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-emerald-500/15 text-emerald-300"
                      }`}
                    >
                      {hospital.status || "Active"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Departments */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-lg font-semibold mb-3">Departments</h2>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No departments listed for this hospital.
                </p>
              ) : (
                <div className="flex flex-wrap">
                  {departments.map((d) => (
                    <Badge key={d}>{d}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Facilities */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-lg font-semibold mb-3">Facilities</h2>
              {facilities.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No facilities listed for this hospital.
                </p>
              ) : (
                <div className="flex flex-wrap">
                  {facilities.map((f) => (
                    <Badge key={f}>{f}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Doctors section */}
          <div className="space-y-4">
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-purple-400" />
                    Doctors
                  </h2>
                  <p className="text-xs text-gray-400">
                    Doctors associated with this hospital.
                  </p>
                </div>
                <button
                  onClick={handleAddDoctorClick}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Doctor
                </button>
              </div>

              {loadingDoctors ? (
                <Spinner />
              ) : doctors.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No doctors added yet. Click{" "}
                  <span className="font-semibold">Add Doctor</span> to create
                  one.
                </p>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {doctors.map((docItem) => (
                    <div
                      key={docItem.id}
                      className="bg-gray-800/80 rounded-xl p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-semibold">
                          {docItem.fullName?.[0]?.toUpperCase() || "D"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {docItem.fullName}
                          </p>
                          <p className="text-xs text-purple-300">
                            {docItem.speciality}
                          </p>
                          <div className="mt-1 text-xs text-gray-300 space-y-0.5">
                            {docItem.phone && <p>📞 {docItem.phone}</p>}
                            {docItem.email && <p>✉️ {docItem.email}</p>}
                            {docItem.experienceYears && (
                              <p>
                                🩺 {docItem.experienceYears} years experience
                              </p>
                            )}
                            <p>
                              Status:{" "}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  docItem.onCall
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-gray-500/15 text-gray-300"
                                }`}
                              >
                                {docItem.onCall ? "On-call" : "Regular"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleEditDoctorClick(docItem)}
                          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                          title="Edit doctor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(docItem.id)}
                          className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                          title="Remove doctor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 text-xs text-gray-400">
              <p>
                Tip: You can link these doctors logically with your{" "}
                <span className="font-semibold text-purple-300">
                  Doctor Dashboard
                </span>{" "}
                by storing the <code>hospitalId</code> inside your main{" "}
                <code>users</code> collection as well, and using it for
                filtering.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
