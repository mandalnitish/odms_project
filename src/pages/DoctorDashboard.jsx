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
  setDoc,
  where,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import DoctorReviewDashboard from "../components/DoctorReviewDashboard.jsx";
import TrackingPage from './TrackingPage';
import PoliceVerificationAdmin from '../components/PoliceVerificationAdmin'; 


const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let trackingGoogleMapsPromise = null;

function loadTrackingGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (trackingGoogleMapsPromise) return trackingGoogleMapsPromise;

  trackingGoogleMapsPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error("VITE_GOOGLE_MAPS_API_KEY is missing from .env"));
      return;
    }

    const callback = "__trackingGoogleMapsReady";
    window[callback] = () => {
      delete window[callback];
      resolve(window.google);
    };

    const script = document.createElement("script");
    script.dataset.trackingGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        GOOGLE_MAPS_API_KEY
      )}&loading=async&libraries=places&callback=${callback}`;
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });

  return trackingGoogleMapsPromise;
}

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

// ---------------- Modern Tracking Modal ----------------
function TrackingModal({ match, onClose, onSave, hospitals, doctors }) {
  const [locating, setLocating] = useState(false);
  const [dynamicDepartments, setDynamicDepartments] = useState([]);
  const [dynamicDoctors, setDynamicDoctors] = useState([]);
  const [medicalTeamLoading, setMedicalTeamLoading] = useState(false);
  const [medicalTeamError, setMedicalTeamError] = useState("");
  const [pickupSearch, setPickupSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [locationSearchLoading, setLocationSearchLoading] = useState("");
  const [locationSearchError, setLocationSearchError] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

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
    donorLocation: match.donorLocation || { lat: "", lng: "", address: "" },
    recipientLocation: match.recipientLocation || { lat: "", lng: "", address: "" },
    vehicleLocation: match.vehicleLocation || null,
  });

  const trackingStatuses = [
    "Scheduled",
    "Pre-Op Preparation",
    "Surgery In Progress",
    "Post-Op Recovery",
    "Completed",
    "Cancelled",
  ];

  const selectedHospital = hospitals.find((h) => h.id === trackingData.hospitalId);

  // Prefer dynamically fetched Firestore data. Fall back to data already loaded
  // by the dashboard so older hospital records continue to work.
  const fallbackDoctors = doctors.filter(
    (d) => d.hospitalId === trackingData.hospitalId
  );

  const hospitalDoctors =
    dynamicDoctors.length > 0 ? dynamicDoctors : fallbackDoctors;

  const documentDepartments =
    selectedHospital && Array.isArray(selectedHospital.departments)
      ? selectedHospital.departments
      : [];

  const hospitalDepartments =
    dynamicDepartments.length > 0
      ? dynamicDepartments
      : documentDepartments;

  // Dynamically load medical-team data whenever the selected hospital changes.
  // Supports BOTH:
  //   hospitals/{hospitalId}.departments (array field)
  //   hospitals/{hospitalId}/departments/{departmentId} (subcollection)
  // Doctors are loaded from:
  //   hospitals/{hospitalId}/doctors/{doctorId}
  useEffect(() => {
    let active = true;

    async function loadMedicalTeam() {
      const hospitalId = trackingData.hospitalId;

      if (!hospitalId) {
        setDynamicDepartments([]);
        setDynamicDoctors([]);
        setMedicalTeamError("");
        return;
      }

      setMedicalTeamLoading(true);
      setMedicalTeamError("");

      try {
        const hospital = hospitals.find((h) => h.id === hospitalId);

        const departmentNames = new Set(
          Array.isArray(hospital?.departments)
            ? hospital.departments.filter(Boolean)
            : []
        );

        // Load department subcollection if it exists.
        try {
          const departmentSnapshot = await getDocs(
            collection(db, "hospitals", hospitalId, "departments")
          );

          departmentSnapshot.docs.forEach((departmentDoc) => {
            const data = departmentDoc.data() || {};
            const name =
              data.name ||
              data.departmentName ||
              data.title ||
              data.specialization ||
              "";

            if (name) departmentNames.add(name);
          });
        } catch (departmentError) {
          console.warn(
            `Could not load departments for hospital ${hospitalId}:`,
            departmentError
          );
        }

        // Load doctors directly from the selected hospital.
        const doctorsSnapshot = await getDocs(
          collection(db, "hospitals", hospitalId, "doctors")
        );

        const loadedDoctors = doctorsSnapshot.docs.map((doctorDoc) => {
          const data = doctorDoc.data() || {};

          return {
            id: doctorDoc.id,
            ...data,
            hospitalId,
            fullName:
              data.fullName ||
              data.name ||
              data.doctorName ||
              "",
            specialization:
              data.specialization ||
              data.speciality ||
              data.department ||
              "",
          };
        });

        // If departments were not configured separately, derive them from
        // doctors' department/specialization fields.
        loadedDoctors.forEach((doctor) => {
          const department =
            doctor.department ||
            doctor.specialization ||
            doctor.speciality ||
            "";

          if (department) departmentNames.add(department);
        });

        if (!active) return;

        setDynamicDepartments(Array.from(departmentNames));
        setDynamicDoctors(loadedDoctors);
      } catch (error) {
        console.error("Failed to dynamically load medical team:", error);

        if (active) {
          setDynamicDepartments([]);
          setDynamicDoctors([]);
          setMedicalTeamError(
            "Could not load departments or surgeons for this hospital."
          );
        }
      } finally {
        if (active) setMedicalTeamLoading(false);
      }
    }

    loadMedicalTeam();

    return () => {
      active = false;
    };
  }, [trackingData.hospitalId, hospitals]);

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all";

  const addTimelineEvent = () => {
    if (!trackingData.trackingStatus) return;
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
  };

  const handleHospitalChange = (hospitalId) => {
    const hospital = hospitals.find((h) => h.id === hospitalId);

    if (!hospital) {
      setTrackingData((prev) => ({
        ...prev,
        hospitalId: "",
        hospital: "",
        hospitalAddress: "",
        surgeon: "",
        surgeonId: "",
        department: "",
        recipientLocation: { lat: "", lng: "", address: "" },
      }));
      return;
    }

    const address = [
      hospital.addressLine1,
      hospital.addressLine2,
      hospital.city,
      hospital.state,
      hospital.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    const lat =
      hospital.lat ?? hospital.latitude ?? hospital.location?.lat ?? "";
    const lng =
      hospital.lng ?? hospital.longitude ?? hospital.location?.lng ?? "";

    setTrackingData((prev) => ({
      ...prev,
      hospitalId: hospital.id,
      hospital: hospital.name || "",
      hospitalAddress: address,
      surgeon: "",
      surgeonId: "",
      department: "",
      recipientLocation: {
        lat,
        lng,
        address,
      },
    }));
  };

  const handleSurgeonChange = (doctorId) => {
    const selectedDoctor = hospitalDoctors.find((d) => d.id === doctorId);
    setTrackingData((prev) => ({
      ...prev,
      surgeonId: selectedDoctor?.id || "",
      surgeon:
        selectedDoctor?.fullName ||
        selectedDoctor?.name ||
        selectedDoctor?.doctorName ||
        "",
    }));
  };

  const searchLocation = async (type) => {
    const searchText =
      type === "donorLocation" ? pickupSearch : destinationSearch;

    if (!searchText.trim()) {
      setLocationSearchError("Enter a location to search.");
      return;
    }

    setLocationSearchLoading(type);
    setLocationSearchError("");

    try {
      const google = await loadTrackingGoogleMaps();
      const { Place } = await google.maps.importLibrary("places");

      const { places } = await Place.searchByText({
        textQuery: searchText.trim(),
        fields: ["id", "displayName", "formattedAddress", "location"],
        maxResultCount: 5,
        region: "IN",
        language: "en",
      });

      const suggestions = (places || [])
        .filter((place) => place.location)
        .map((place) => ({
          id: place.id,
          name: place.displayName || "",
          address: place.formattedAddress || place.displayName || searchText,
          lat: place.location.lat(),
          lng: place.location.lng(),
        }));

      if (type === "donorLocation") {
        setPickupSuggestions(suggestions);
      } else {
        setDestinationSuggestions(suggestions);
      }

      if (!suggestions.length) {
        setLocationSearchError(
          "No Google Places results found. Try adding city, state, or pincode."
        );
      }
    } catch (error) {
      console.error("Google Places search failed:", error);
      setLocationSearchError(
        error?.message ||
          "Google Places search failed. Make sure Places API (New) is enabled."
      );
    } finally {
      setLocationSearchLoading("");
    }
  };

  const selectSearchedLocation = (type, place) => {
    const location = {
      address: place.address,
      lat: Number(place.lat),
      lng: Number(place.lng),
    };

    setTrackingData((prev) => ({
      ...prev,
      [type]: location,
      ...(type === "donorLocation"
        ? { vehicleLocation: { lat: location.lat, lng: location.lng } }
        : {}),
    }));

    if (type === "donorLocation") {
      setPickupSearch(place.name || place.address);
      setPickupSuggestions([]);
    } else {
      setDestinationSearch(place.name || place.address);
      setDestinationSuggestions([]);
    }

    setLocationSearchError("");
  };

  const useCurrentPickupLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setTrackingData((prev) => ({
          ...prev,
          donorLocation: {
            ...prev.donorLocation,
            lat,
            lng,
            address: prev.donorLocation?.address || "Current pickup location",
          },
          vehicleLocation: { lat, lng },
        }));
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        alert(`Unable to get current location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const setLocationField = (type, field, value) => {
    setTrackingData((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [field]:
          field === "lat" || field === "lng"
            ? value === ""
              ? ""
              : Number(value)
            : value,
      },
    }));
  };

  const validCoordinate = (value) =>
    value !== "" && value !== null && value !== undefined && !Number.isNaN(Number(value));

  const handleSave = () => {
    if (!trackingData.hospitalId) {
      alert("Please select a hospital.");
      return;
    }

    if (
      !validCoordinate(trackingData.donorLocation?.lat) ||
      !validCoordinate(trackingData.donorLocation?.lng)
    ) {
      alert("Please add valid donor / pickup latitude and longitude.");
      return;
    }

    if (
      !validCoordinate(trackingData.recipientLocation?.lat) ||
      !validCoordinate(trackingData.recipientLocation?.lng)
    ) {
      alert(
        "Destination coordinates are missing. Add latitude and longitude for the selected hospital."
      );
      return;
    }

    const payload = {
      ...trackingData,
      donorLocation: {
        ...trackingData.donorLocation,
        lat: Number(trackingData.donorLocation.lat),
        lng: Number(trackingData.donorLocation.lng),
      },
      recipientLocation: {
        ...trackingData.recipientLocation,
        lat: Number(trackingData.recipientLocation.lat),
        lng: Number(trackingData.recipientLocation.lng),
      },
      vehicleLocation:
        trackingData.vehicleLocation &&
        validCoordinate(trackingData.vehicleLocation.lat) &&
        validCoordinate(trackingData.vehicleLocation.lng)
          ? {
              lat: Number(trackingData.vehicleLocation.lat),
              lng: Number(trackingData.vehicleLocation.lng),
            }
          : {
              lat: Number(trackingData.donorLocation.lat),
              lng: Number(trackingData.donorLocation.lng),
            },
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md">
      <div className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-3xl bg-gray-50 dark:bg-gray-950 shadow-2xl border border-white/20">
        {/* Modern Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-5 sm:px-7 py-5 rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xl shadow-lg">
                  🏥
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Transplant Tracking
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {match.organType || "Organ"} • {match.bloodGroup || "Blood group not set"}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* Donor to Recipient Flow */}
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Donor</p>
              <p className="font-bold truncate">{match.donorName || "—"}</p>
            </div>
            <div className="text-center">
              <div className="text-xl">🚑</div>
              <div className="w-10 sm:w-20 h-0.5 bg-gradient-to-r from-emerald-500 to-rose-500" />
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 text-right">
              <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold">Recipient</p>
              <p className="font-bold truncate">{match.recipientName || "—"}</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Status */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Tracking Status</label>
                <select
                  value={trackingData.trackingStatus}
                  onChange={(e) =>
                    setTrackingData((prev) => ({ ...prev, trackingStatus: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Select Status</option>
                  {trackingStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addTimelineEvent}
                disabled={!trackingData.trackingStatus}
                className="px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold disabled:opacity-40"
              >
                + Add to Timeline
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule + Medical Team */}
            <div className="space-y-6">
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">🗓️ Schedule</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      value={trackingData.scheduledDate}
                      onChange={(e) =>
                        setTrackingData((prev) => ({ ...prev, scheduledDate: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Estimated Duration</label>
                    <input
                      type="text"
                      value={trackingData.estimatedDuration}
                      onChange={(e) =>
                        setTrackingData((prev) => ({ ...prev, estimatedDuration: e.target.value }))
                      }
                      placeholder="4-6 hours"
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">👨‍⚕️ Medical Team</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Department</label>
                    <select
                      value={trackingData.department}
                      onChange={(e) =>
                        setTrackingData((prev) => ({ ...prev, department: e.target.value }))
                      }
                      disabled={!trackingData.hospitalId || hospitalDepartments.length === 0}
                      className={`${inputClass} disabled:opacity-50`}
                    >
                      <option value="">
                        {!trackingData.hospitalId
                          ? "Select a hospital first"
                          : hospitalDepartments.length === 0
                          ? medicalTeamLoading
                            ? "Loading departments..."
                            : "No departments available"
                          : "Select Department"}
                      </option>
                      {hospitalDepartments.map((department, index) => (
                        <option key={`${department}-${index}`} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Surgeon / Team Lead</label>
                    <select
                      value={trackingData.surgeonId}
                      onChange={(e) => handleSurgeonChange(e.target.value)}
                      disabled={!trackingData.hospitalId || hospitalDoctors.length === 0}
                      className={`${inputClass} disabled:opacity-50`}
                    >
                      <option value="">
                        {!trackingData.hospitalId
                          ? "Select a hospital first"
                          : hospitalDoctors.length === 0
                          ? medicalTeamLoading
                            ? "Loading surgeons..."
                            : "No surgeons available at this hospital"
                          : "Select Surgeon"}
                      </option>
                      {hospitalDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.fullName || doctor.name || doctor.doctorName || "Unnamed Doctor"}
                          {doctor.specialization || doctor.department
                            ? ` (${doctor.specialization || doctor.department})`
                            : ""}
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
                      className={`${inputClass} mt-2`}
                    />
                    {medicalTeamError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {medicalTeamError}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Hospital */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">🏥 Destination Hospital</h3>
              <select
                value={trackingData.hospitalId}
                onChange={(e) => handleHospitalChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Select Hospital</option>
                {hospitals
                  .filter((h) => !h.status || h.status === "Active")
                  .map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} - {hospital.city}
                    </option>
                  ))}
              </select>

              {selectedHospital && (
                <div className="mt-4 rounded-2xl bg-blue-50 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900 p-4">
                  <p className="font-bold text-blue-900 dark:text-blue-200">{selectedHospital.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {trackingData.hospitalAddress || "Address not available"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-semibold">{selectedHospital.contactNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Emergency</p>
                      <p className="text-sm font-semibold text-red-600">{selectedHospital.emergencyNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Beds</p>
                      <p className="text-sm font-semibold">{selectedHospital.totalBeds ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ICU</p>
                      <p className="text-sm font-semibold">{selectedHospital.icuBeds ?? "—"}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Transport Locations */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2">📍 Transport Locations</h3>
              <p className="text-sm text-gray-500 mt-1">
                Search and select the pickup and destination locations. Coordinates are filled automatically for live tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pickup Search */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-300 mb-3">
                  🟢 Donor / Pickup Location
                </h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pickupSearch}
                    onChange={(e) => setPickupSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchLocation("donorLocation");
                      }
                    }}
                    placeholder="Search pickup location..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => searchLocation("donorLocation")}
                    disabled={locationSearchLoading === "donorLocation"}
                    className="px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                  >
                    {locationSearchLoading === "donorLocation" ? "..." : "🔍"}
                  </button>
                </div>

                {pickupSuggestions.length > 0 && (
                  <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-lg">
                    {pickupSuggestions.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => selectSearchedLocation("donorLocation", place)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        <p className="font-semibold text-sm">{place.name || "Location"}</p>
                        <p className="text-xs text-gray-500 mt-1">{place.address}</p>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={useCurrentPickupLocation}
                  disabled={locating}
                  className="mt-3 w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold disabled:opacity-50"
                >
                  {locating ? "Getting Current Location..." : "◎ Use My Current Location"}
                </button>

                {trackingData.donorLocation?.address && (
                  <div className="mt-3 rounded-xl bg-white/80 dark:bg-gray-900/70 p-3 border border-emerald-100 dark:border-emerald-900">
                    <p className="text-xs text-gray-500">Selected pickup</p>
                    <p className="text-sm font-semibold mt-1">
                      {trackingData.donorLocation.address}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {trackingData.donorLocation.lat}, {trackingData.donorLocation.lng}
                    </p>
                  </div>
                )}
              </div>

              {/* Destination Search */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 p-4">
                <h4 className="font-bold text-rose-700 dark:text-rose-300 mb-3">
                  🔴 Recipient / Hospital Destination
                </h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchLocation("recipientLocation");
                      }
                    }}
                    placeholder="Search hospital or destination..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => searchLocation("recipientLocation")}
                    disabled={locationSearchLoading === "recipientLocation"}
                    className="px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
                  >
                    {locationSearchLoading === "recipientLocation" ? "..." : "🔍"}
                  </button>
                </div>

                {destinationSuggestions.length > 0 && (
                  <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-lg">
                    {destinationSuggestions.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => selectSearchedLocation("recipientLocation", place)}
                        className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        <p className="font-semibold text-sm">{place.name || "Location"}</p>
                        <p className="text-xs text-gray-500 mt-1">{place.address}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedHospital && (
                  <button
                    type="button"
                    onClick={() => {
                      const query =
                        trackingData.hospitalAddress ||
                        `${selectedHospital.name || ""}, ${selectedHospital.city || ""}, ${selectedHospital.state || ""}`;
                      setDestinationSearch(query);
                    }}
                    className="mt-3 w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold"
                  >
                    🏥 Use Selected Hospital Address
                  </button>
                )}

                {trackingData.recipientLocation?.address && (
                  <div className="mt-3 rounded-xl bg-white/80 dark:bg-gray-900/70 p-3 border border-rose-100 dark:border-rose-900">
                    <p className="text-xs text-gray-500">Selected destination</p>
                    <p className="text-sm font-semibold mt-1">
                      {trackingData.recipientLocation.address}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {trackingData.recipientLocation.lat}, {trackingData.recipientLocation.lng}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {locationSearchError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {locationSearchError}
              </p>
            )}

            <div className="mt-4 rounded-2xl bg-gray-900 text-white p-4 flex items-center justify-between gap-3 overflow-hidden">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Transport route</p>
                <p className="font-semibold truncate">
                  {trackingData.donorLocation?.address || "Search pickup location"} →{" "}
                  {trackingData.recipientLocation?.address ||
                    trackingData.hospital ||
                    "Search destination"}
                </p>
              </div>
              <div className="text-2xl flex-shrink-0">🫀 ─ 🚑 ─ 🏥</div>
            </div>
          </section>

          {/* Notes + Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="font-bold text-lg mb-3">📝 Notes</h3>
              <textarea
                value={trackingData.notes}
                onChange={(e) =>
                  setTrackingData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Additional notes or special considerations..."
                rows="7"
                className={`${inputClass} resize-none`}
              />
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="font-bold text-lg mb-3">🕐 Timeline</h3>
              <div className="max-h-56 overflow-y-auto">
                {!trackingData.timeline?.length ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-3xl mb-2">🕐</div>
                    No timeline events yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trackingData.timeline.map((event, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{event.status}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-5 sm:px-7 py-4 flex justify-end gap-3 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl"
          >
            Save & Track
          </button>
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
        // Doctors stored in the main users collection
        const userDoctors = all
          .filter((u) => u.role === "doctor")
          .map((u) => ({
            ...u,
            source: "users",
          }));

        const currentDoctor =
          userDoctors.find((u) => u.id === auth.currentUser?.uid) || null;
        setDoctor(currentDoctor);

        // Load hospitals first
        const hospitalsCol = collection(db, "hospitals");
        const hospitalsSnap = await getDocs(hospitalsCol);

        const hospitalList = hospitalsSnap.docs.map((hospitalDoc) => {
          const h = hospitalDoc.data() || {};

          return {
            id: hospitalDoc.id,
            ...h,

            // Normalize fields because HospitalDashboard may save these
            // under slightly different names.
            addressLine1: h.addressLine1 || h.address || "",
            contactNumber: h.contactNumber || h.phone || "",
            emergencyNumber:
              h.emergencyNumber || h.emergencyContact || "",
            totalBeds:
              h.totalBeds != null
                ? h.totalBeds
                : h.beds != null && h.beds !== ""
                ? Number(h.beds)
                : null,
            departments: Array.isArray(h.departments)
              ? h.departments
              : [],
          };
        });

        setHospitals(hospitalList);

        // IMPORTANT:
        // Doctors added from Hospital Details are stored at:
        // hospitals/{hospitalId}/doctors/{doctorId}
        // Load doctors from every hospital subcollection.
        const hospitalDoctorLists = await Promise.all(
          hospitalList.map(async (hospital) => {
            try {
              const doctorsSnap = await getDocs(
                collection(db, "hospitals", hospital.id, "doctors")
              );

              return doctorsSnap.docs.map((doctorDoc) => {
                const doctorData = doctorDoc.data() || {};

                return {
                  id: doctorDoc.id,
                  ...doctorData,
                  hospitalId: hospital.id,
                  hospitalName: hospital.name || "",
                  source: "hospitalSubcollection",

                  // Support different doctor-name field names
                  fullName:
                    doctorData.fullName ||
                    doctorData.name ||
                    doctorData.doctorName ||
                    "",
                  specialization:
                    doctorData.specialization ||
                    doctorData.department ||
                    doctorData.speciality ||
                    "",
                };
              });
            } catch (doctorErr) {
              console.error(
                `Failed to load doctors for hospital ${hospital.id}:`,
                doctorErr
              );
              return [];
            }
          })
        );

        const subcollectionDoctors = hospitalDoctorLists.flat();

        // Merge user doctors and hospital-subcollection doctors.
        // The tracking modal can now find surgeons using hospitalId.
        const mergedDoctors = [...userDoctors, ...subcollectionDoctors];

        setDoctors(mergedDoctors);
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
      const matchRef = doc(db, "matches", matchId);

      // Keep the existing match document updated.
      await updateDoc(matchRef, {
        ...trackingData,
        updatedAt: new Date(),
      });

      // Also create/update the live-tracking document using the SAME match ID.
      // OrganTrackingMap / TrackingPage can listen to the organTransfers collection.
      const currentMatch = matches.find((m) => m.id === matchId) || {};

      const transportStatusMap = {
        Scheduled: "harvested",
        "Pre-Op Preparation": "harvested",
        "Surgery In Progress": "in_transit",
        "Post-Op Recovery": "arrived",
        Completed: "delivered",
        Cancelled: "cancelled",
      };

      await setDoc(
        doc(db, "organTransfers", matchId),
        {
          matchId,
          donorId: currentMatch.donorId || "",
          donorName: currentMatch.donorName || "",
          recipientId: currentMatch.recipientId || "",
          recipientName: currentMatch.recipientName || "",
          organType: currentMatch.organType || "",
          bloodGroup: currentMatch.bloodGroup || "",
          hospitalId: trackingData.hospitalId || "",
          hospital: trackingData.hospital || "",
          department: trackingData.department || "",
          surgeon: trackingData.surgeon || "",
          trackingStatus: trackingData.trackingStatus || "",
          status:
            transportStatusMap[trackingData.trackingStatus] ||
            currentMatch.transportStatus ||
            "harvested",
          donorLocation: trackingData.donorLocation,
          recipientLocation: trackingData.recipientLocation,
          vehicleLocation:
            trackingData.vehicleLocation || trackingData.donorLocation,
          scheduledDate: trackingData.scheduledDate || "",
          estimatedDuration: trackingData.estimatedDuration || "",
          notes: trackingData.notes || "",
          timeline: trackingData.timeline || [],
          updatedAt: new Date(),
        },
        { merge: true }
      );
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
<div className="grid grid-cols-5 gap-2 mb-6">
  {[
    {
      label: "Total Donors",
      value: donors.length,
      icon: "👥",
      gradient: "from-blue-500 to-blue-600",
      bg: "from-blue-500/20 to-blue-600/10",
    },
    {
      label: "Recipients",
      value: recipients.length,
      icon: "🏥",
      gradient: "from-purple-500 to-purple-600",
      bg: "from-purple-500/20 to-purple-600/10",
    },
    {
      label: "Active Matches",
      value: uniqueMatches.length,
      icon: "🔗",
      gradient: "from-green-500 to-green-600",
      bg: "from-green-500/20 to-green-600/10",
    },
    {
      label: "Completed",
      value: uniqueMatches.filter((m) => m.trackingStatus === "Completed").length,
      icon: "✅",
      gradient: "from-emerald-500 to-emerald-600",
      bg: "from-emerald-500/20 to-emerald-600/10",
    },
    {
      label: "Hospitals",
      value: hospitals.filter((h) => !h.status || h.status === "Active").length,
      icon: "🏢",
      gradient: "from-orange-500 to-red-600",
      bg: "from-orange-500/20 to-red-600/10",
    },
  ].map((stat) => (
    <div
      key={stat.label}
      className={`bg-gradient-to-br ${stat.bg} backdrop-blur-xl rounded-xl p-3 shadow-lg border border-white/10 hover:scale-105 transition-transform cursor-default`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-9 h-9 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center text-sm shadow-lg flex-shrink-0`}
        >
          {stat.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent leading-none`}
          >
            {stat.value}
          </p>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
            {stat.label}
          </p>
        </div>
      </div>
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
<div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-2 mb-6 flex gap-1 shadow-lg border border-white/20 w-full">
  {[
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "donors", label: "Donors", icon: "👥" },
    { id: "recipients", label: "Recipients", icon: "🏥" },
    { id: "matches", label: "Matches", icon: "🔗" },
    { id: "documents", label: "Document Review", icon: "📄" },
    { id: "tracking",   label: "Live Tracking",      icon: "🗺️" },
    { id: "police",     label: "Police Verification", icon: "🚔" },
  ].map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex-1 px-3 py-3 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${
        activeTab === tab.id
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
      }`}
    >
      <span className="flex items-center justify-center gap-2">
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

  {activeTab === "tracking" && (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
      <TrackingPage />
    </div>
  )}

  {activeTab === "police" && (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20">
      <PoliceVerificationAdmin />
    </div>
  )}

</div> {/* END of Tab Content */}
</div>
</div>
);
}