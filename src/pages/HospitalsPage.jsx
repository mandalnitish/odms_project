// src/pages/HospitalsPage.jsx

import React, { useEffect, useRef, useState } from "react";
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
  Edit2,
  Trash2,
  Search,
  X,
  CheckCircle,
  MapPin,
} from "lucide-react";

// ======================================================
// GOOGLE MAPS CONFIG
// ======================================================

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let googleMapsPromise = null;

// ======================================================
// GOOGLE MAPS BOOTSTRAP LOADER
// ======================================================

function loadGoogleMaps() {
  // Already fully loaded
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  // Loading already started
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(
        new Error(
          "Google Maps API key missing. Check VITE_GOOGLE_MAPS_API_KEY in your .env file."
        )
      );
      return;
    }

    // Check if another Google Maps script was already loaded
    const existingGoogleScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingGoogleScript && !window.google?.maps?.importLibrary) {
      console.warn(
        "An older Google Maps script is already loaded. Remove Google Maps script tags from index.html."
      );
    }

    // Official-style bootstrap loader
    ((g) => {
      let h;
      let a;
      let k;

      const p = "The Google Maps JavaScript API";
      const c = "google";
      const l = "importLibrary";
      const q = "__ib__";
      const m = document;

      let b = window;

      b = b[c] || (b[c] = {});

      const d = b.maps || (b.maps = {});
      const r = new Set();
      const e = new URLSearchParams();

      const u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          a = m.createElement("script");

          e.set("libraries", [...r] + "");

          for (k in g) {
            e.set(
              k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
              g[k]
            );
          }

          e.set("callback", c + ".maps." + q);

          a.src =
            `https://maps.${c}apis.com/maps/api/js?` +
            e.toString();

          d[q] = f;

          a.onerror = () => {
            h = null;

            n(
              new Error(
                p + " could not load. Check your API key and internet connection."
              )
            );
          };

          a.nonce =
            m.querySelector("script[nonce]")?.nonce || "";

          m.head.append(a);
        }));

      if (d[l]) {
        console.warn(
          p +
            " only loads once. Existing importLibrary function will be used."
        );
      } else {
        d[l] = (f, ...n) => {
          r.add(f);

          return u().then(() => d[l](f, ...n));
        };
      }
    })({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
    });

    if (!window.google?.maps?.importLibrary) {
      reject(
        new Error(
          "Google Maps importLibrary could not be initialized."
        )
      );
      return;
    }

    window.google.maps
      .importLibrary("places")
      .then(() => {
        resolve(window.google);
      })
      .catch((error) => {
        console.error(
          "Google Maps Places loading error:",
          error
        );

        reject(
          new Error(
            error?.message ||
              "Google Places library could not be loaded."
          )
        );
      });
  });

  return googleMapsPromise;
}

// ======================================================
// ADDRESS COMPONENT HELPER
// ======================================================

function getAddressComponent(addressComponents, type) {
  if (!Array.isArray(addressComponents)) {
    return "";
  }

  const component = addressComponents.find((item) =>
    item.types?.includes(type)
  );

  return (
    component?.longText ||
    component?.long_name ||
    ""
  );
}

// ======================================================
// HOSPITAL MODAL
// ======================================================

function HospitalModal({
  editData,
  onClose,
  onSave,
}) {
  const autocompleteContainerRef = useRef(null);

  const [placesLoading, setPlacesLoading] =
    useState(false);

  const [placesError, setPlacesError] =
    useState("");

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

      // Google Places fields
      placeId: "",
      latitude: null,
      longitude: null,
      googleMapsURI: "",
      websiteURI: "",
    }
  );

  // ====================================================
  // FACILITIES
  // ====================================================

  const facilityOptions = [
    "ICU",
    "NICU",
    "Blood Bank",
    "Dialysis",
    "Ambulance Service",
    "Operation Theater",
    "Transplant Unit",
  ];

  const toggleFacility = (facility) => {
    setForm((prev) => ({
      ...prev,

      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(
            (item) => item !== facility
          )
        : [...prev.facilities, facility],
    }));
  };

  // ====================================================
  // GOOGLE PLACES AUTOCOMPLETE
  // ====================================================

  useEffect(() => {
    let active = true;
    let autocompleteElement = null;

    async function initializePlaces() {
      // Don't show Google search while editing
      if (editData) {
        return;
      }

      if (!autocompleteContainerRef.current) {
        return;
      }

      try {
        setPlacesLoading(true);
        setPlacesError("");

        // --------------------------------------------
        // LOAD GOOGLE MAPS
        // --------------------------------------------

        const google = await loadGoogleMaps();

        if (!active) {
          return;
        }

        // --------------------------------------------
        // IMPORT PLACES
        // --------------------------------------------

        const placesLibrary =
          await google.maps.importLibrary("places");

        if (!active) {
          return;
        }

        const {
          PlaceAutocompleteElement,
        } = placesLibrary;

        if (!PlaceAutocompleteElement) {
          throw new Error(
            "PlaceAutocompleteElement is not available. Check that Places API (New) is enabled for your API key."
          );
        }

        // --------------------------------------------
        // CREATE AUTOCOMPLETE
        // --------------------------------------------

        autocompleteElement =
          new PlaceAutocompleteElement();

        autocompleteElement.placeholder =
          "Type hospital name...";

        // Restrict results to India
        autocompleteElement.includedRegionCodes = [
          "in",
        ];

        autocompleteElement.style.width =
          "100%";

        autocompleteElement.style.display =
          "block";

        // Clear container
        autocompleteContainerRef.current.innerHTML =
          "";

        // Add autocomplete
        autocompleteContainerRef.current.appendChild(
          autocompleteElement
        );

        // --------------------------------------------
        // PLACE SELECTED
        // --------------------------------------------

        autocompleteElement.addEventListener(
          "gmp-select",

          async (event) => {
            try {
              setPlacesError("");

              const prediction =
                event.placePrediction;

              if (!prediction) {
                throw new Error(
                  "No place was selected."
                );
              }

              // --------------------------------------
              // CONVERT PREDICTION TO PLACE
              // --------------------------------------

              const place =
                prediction.toPlace();

              // --------------------------------------
              // FETCH PLACE DETAILS
              // --------------------------------------

              await place.fetchFields({
                fields: [
                  "id",
                  "displayName",
                  "formattedAddress",
                  "addressComponents",
                  "location",
                  "nationalPhoneNumber",
                  "internationalPhoneNumber",
                  "googleMapsURI",
                  "websiteURI",
                  "types",
                ],
              });

              if (!active) {
                return;
              }

              // --------------------------------------
              // ADDRESS COMPONENTS
              // --------------------------------------

              const components =
                place.addressComponents || [];

              // City
              const city =
                getAddressComponent(
                  components,
                  "locality"
                ) ||
                getAddressComponent(
                  components,
                  "administrative_area_level_3"
                ) ||
                getAddressComponent(
                  components,
                  "administrative_area_level_2"
                ) ||
                getAddressComponent(
                  components,
                  "sublocality"
                );

              // State
              const state =
                getAddressComponent(
                  components,
                  "administrative_area_level_1"
                );

              // Pincode
              const pincode =
                getAddressComponent(
                  components,
                  "postal_code"
                );

              // --------------------------------------
              // PHONE
              // --------------------------------------

              const phone =
                place.nationalPhoneNumber ||
                place.internationalPhoneNumber ||
                "";

              // --------------------------------------
              // LOCATION
              // --------------------------------------

              let latitude = null;
              let longitude = null;

              if (place.location) {
                if (
                  typeof place.location.lat ===
                  "function"
                ) {
                  latitude =
                    place.location.lat();

                  longitude =
                    place.location.lng();
                } else {
                  latitude =
                    place.location.lat ??
                    null;

                  longitude =
                    place.location.lng ??
                    null;
                }
              }

              // --------------------------------------
              // NAME
              // --------------------------------------

              let hospitalName = "";

              if (
                typeof place.displayName ===
                "string"
              ) {
                hospitalName =
                  place.displayName;
              } else {
                hospitalName =
                  place.displayName?.text ||
                  "";
              }

              // --------------------------------------
              // AUTO FILL FORM
              // --------------------------------------

              setForm((prev) => ({
                ...prev,

                name:
                  hospitalName ||
                  prev.name,

                addressLine1:
                  place.formattedAddress ||
                  prev.addressLine1,

                city:
                  city ||
                  prev.city,

                state:
                  state ||
                  prev.state,

                pincode:
                  pincode ||
                  prev.pincode,

                contactNumber:
                  phone ||
                  prev.contactNumber,

                placeId:
                  place.id ||
                  "",

                latitude,

                longitude,

                googleMapsURI:
                  place.googleMapsURI ||
                  "",

                websiteURI:
                  place.websiteURI ||
                  "",
              }));
            } catch (error) {
              console.error(
                "Place details error:",
                error
              );

              setPlacesError(
                "Could not load hospital details: " +
                  (error.message ||
                    "Unknown error")
              );
            }
          }
        );

        if (active) {
          setPlacesLoading(false);
        }
      } catch (error) {
        console.error(
          "Google Places initialization error:",
          error
        );

        if (active) {
          setPlacesLoading(false);

          setPlacesError(
            error.message ||
              "Google Places could not be initialized."
          );
        }
      }
    }

    initializePlaces();

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      active = false;

      if (
        autocompleteElement &&
        autocompleteElement.parentNode
      ) {
        autocompleteElement.parentNode.removeChild(
          autocompleteElement
        );
      }
    };
  }, [editData]);

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await onSave(form);

      onClose();
    } catch (error) {
      console.error(
        "Hospital save error:",
        error
      );

      alert(
        "Failed to save hospital: " +
          error.message
      );
    }
  };

  // ====================================================
  // MODAL UI
  // ====================================================

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">

      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl w-full max-w-2xl shadow-xl max-h-[95vh] overflow-y-auto">

        {/* HEADER */}

        <div className="flex justify-between items-center mb-4">

          <h2 className="text-xl font-bold">

            {editData
              ? "Edit Hospital"
              : "Add Hospital"}

          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
          >

            <X />

          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* ======================================== */}
          {/* GOOGLE HOSPITAL SEARCH */}
          {/* ======================================== */}

          {!editData && (

            <div>

              <label className="flex items-center gap-2 text-sm font-semibold mb-2">

                <MapPin size={18} />

                Search Hospital on Google

              </label>

              {/* LOADING */}

              {placesLoading && (

                <div className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg text-slate-400">

                  Loading Google Places...

                </div>

              )}

              {/* GOOGLE AUTOCOMPLETE */}

              <div
                ref={
                  autocompleteContainerRef
                }
                className={
                  placesLoading
                    ? "hidden"
                    : "w-full"
                }
              />

              <p className="text-xs text-slate-400 mt-2">

                Start typing a hospital name and
                select the correct hospital from
                Google's suggestions. Available
                details will be filled automatically.

              </p>

              {/* ERROR */}

              {placesError && (

                <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">

                  {placesError}

                </div>

              )}

            </div>

          )}

          {/* ======================================== */}
          {/* HOSPITAL NAME */}
          {/* ======================================== */}

          <input
            type="text"
            required
            placeholder="Hospital Name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,

                name:
                  event.target.value,
              }))
            }
            className="w-full bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
          />

          {/* ======================================== */}
          {/* ADDRESS */}
          {/* ======================================== */}

          <input
            type="text"
            required
            placeholder="Address"
            value={
              form.addressLine1
            }
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,

                addressLine1:
                  event.target.value,
              }))
            }
            className="w-full bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
          />

          {/* ======================================== */}
          {/* CITY / STATE / PINCODE */}
          {/* ======================================== */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,

                  city:
                    event.target.value,
                }))
              }
              className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
            />

            <input
              required
              placeholder="State"
              value={form.state}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,

                  state:
                    event.target.value,
                }))
              }
              className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
            />

            <input
              required
              placeholder="Pincode"
              value={form.pincode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,

                  pincode:
                    event.target.value,
                }))
              }
              className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
            />

          </div>

          {/* ======================================== */}
          {/* CONTACT */}
          {/* ======================================== */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <input
              placeholder="Phone"
              value={
                form.contactNumber
              }
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,

                  contactNumber:
                    event.target.value,
                }))
              }
              className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
            />

            <input
              placeholder="Emergency Number"
              value={
                form.emergencyNumber
              }
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,

                  emergencyNumber:
                    event.target.value,
                }))
              }
              className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
            />

          </div>

          {/* ======================================== */}
          {/* FACILITIES */}
          {/* ======================================== */}

          <div>

            <p className="font-semibold mb-2">

              Facilities (Organs)

            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

              {facilityOptions.map(
                (facility) => (

                  <label
                    key={
                      facility
                    }
                    className="flex items-center gap-2 bg-gray-100 dark:bg-slate-900 p-2 rounded-lg cursor-pointer"
                  >

                    <input
                      type="checkbox"
                      checked={
                        form.facilities.includes(
                          facility
                        )
                      }
                      onChange={() =>
                        toggleFacility(
                          facility
                        )
                      }
                    />

                    {facility}

                  </label>

                )
              )}

            </div>

          </div>

          {/* ======================================== */}
          {/* TOTAL BEDS */}
          {/* ======================================== */}

          <input
            type="number"
            min="0"
            placeholder="Total Beds"
            value={
              form.totalBeds
            }
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,

                totalBeds:
                  event.target.value,
              }))
            }
            className="w-full bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
          />

          {/* ======================================== */}
          {/* STATUS */}
          {/* ======================================== */}

          <select
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,

                status:
                  event.target.value,
              }))
            }
            className="w-full bg-gray-100 dark:bg-slate-900 p-3 rounded-lg"
          >

            <option value="Active">

              Active

            </option>

            <option value="Inactive">

              Inactive

            </option>

          </select>

          {/* ======================================== */}
          {/* SUBMIT */}
          {/* ======================================== */}

          <button
            type="submit"
            className="w-full bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500 p-2.5 rounded-xl font-semibold mt-4 transition-all"
          >

            {editData
              ? "Update Hospital"
              : "Add Hospital"}

          </button>

        </form>

      </div>

    </div>
  );
}

// ======================================================
// MAIN HOSPITAL PAGE
// ======================================================

export default function HospitalsPage() {

  const [
    hospitals,
    setHospitals,
  ] = useState([]);

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editHospital,
    setEditHospital,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    successMsg,
    setSuccessMsg,
  ] = useState("");

  // ====================================================
  // FIRESTORE REALTIME LISTENER
  // ====================================================

  useEffect(() => {

    const hospitalsRef =
      collection(
        db,
        "hospitals"
      );

    const unsubscribe =
      onSnapshot(

        hospitalsRef,

        (snapshot) => {

          const list =
            snapshot.docs.map(
              (hospitalDoc) => ({

                id:
                  hospitalDoc.id,

                ...hospitalDoc.data(),

              })
            );

          setHospitals(
            list
          );

        },

        (error) => {

          console.error(
            "Failed to load hospitals:",
            error
          );

        }

      );

    return () =>
      unsubscribe();

  }, []);

  // ====================================================
  // OPEN ADD HOSPITAL
  // ====================================================

  const openAdd = () => {

    setEditHospital(
      null
    );

    setShowModal(
      true
    );

  };

  // ====================================================
  // SAVE HOSPITAL
  // ====================================================

  const saveHospital =
    async (data) => {

      // EDIT

      if (editHospital) {

        await updateDoc(

          doc(
            db,
            "hospitals",
            editHospital.id
          ),

          data

        );

        setSuccessMsg(
          "Hospital updated successfully ✔️"
        );

      }

      // ADD

      else {

        // ============================================
        // DUPLICATE GOOGLE PLACE CHECK
        // ============================================

        if (data.placeId) {

          const duplicate =
            hospitals.find(
              (hospital) =>
                hospital.placeId ===
                data.placeId
            );

          if (duplicate) {

            throw new Error(
              "This hospital is already added."
            );

          }

        }

        // ============================================
        // ADD TO FIRESTORE
        // ============================================

        await addDoc(

          collection(
            db,
            "hospitals"
          ),

          data

        );

        setSuccessMsg(
          "Hospital added successfully ✔️"
        );

      }

      setTimeout(
        () =>
          setSuccessMsg(""),
        3500
      );

    };

  // ====================================================
  // DELETE HOSPITAL
  // ====================================================

  const removeHospital =
    async (id) => {

      if (
        !window.confirm(
          "Delete hospital?"
        )
      ) {

        return;

      }

      try {

        await deleteDoc(

          doc(
            db,
            "hospitals",
            id
          )

        );

      } catch (error) {

        console.error(
          "Delete error:",
          error
        );

        alert(
          "Failed to delete hospital: " +
            error.message
        );

      }

    };

  // ====================================================
  // SEARCH FIRESTORE HOSPITALS
  // ====================================================

  const filtered =
    hospitals.filter(
      (hospital) => {

        const name =
          hospital.name ||
          "";

        const city =
          hospital.city ||
          "";

        const query =
          search
            .trim()
            .toLowerCase();

        return (

          name
            .toLowerCase()
            .includes(query)

          ||

          city
            .toLowerCase()
            .includes(query)

        );

      }
    );

  // ====================================================
  // PAGE UI
  // ====================================================

  return (

    <div className="min-h-screen px-4 sm:px-6 py-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* HEADER */}

      <h1 className="text-3xl font-black tracking-tight mb-1">

        Hospital Management

      </h1>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">

        Add and manage all partner hospitals
        with detailed information.

      </p>

      {/* SUCCESS */}

      {successMsg && (

        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 p-3 mb-4 rounded-xl flex items-center gap-2">

          <CheckCircle />

          {successMsg}

        </div>

      )}

{/* ADD HOSPITAL + SEARCH */}
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5 shadow-sm">
  <div className="flex flex-col md:flex-row gap-3">
    <div className="relative flex-1">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        placeholder="Search existing hospitals by name or city..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="
          w-full
          pl-10 pr-4 py-2.5
          bg-slate-50 dark:bg-slate-950
          text-slate-900 dark:text-white
          placeholder:text-slate-400
          border border-slate-200 dark:border-slate-700
          rounded-xl
          outline-none
          focus:border-emerald-500
          focus:ring-4 focus:ring-emerald-500/10
          transition-all
        "
      />
    </div>

    <button
      onClick={openAdd}
      className="
        inline-flex items-center justify-center gap-2
        px-5 py-2.5
        bg-transparent
        text-emerald-600 dark:text-emerald-400
        border border-emerald-500/40
        rounded-xl
        font-semibold
        hover:bg-emerald-500/10
        hover:border-emerald-500
        transition-all
      "
    >
      Add Hospital
    </button>
  </div>
</div>

      {/* TABLE */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">

        <div className="overflow-x-auto"><table className="w-full text-left">

          <thead className="bg-slate-50 dark:bg-slate-950/60">

            <tr>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Name
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                City
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Type
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Organs
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Beds
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (hospital) => (

                <tr
                  key={
                    hospital.id
                  }
                  className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >

                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">

                    {hospital.name}

                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">

                    {hospital.city}

                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">

                    {hospital.type}

                  </td>

                  {/* FACILITIES */}

                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">

                    {hospital.facilities?.length > 0

                      ? hospital.facilities
                          .slice(0, 3)
                          .join(", ") +

                        (hospital.facilities.length > 3

                          ? ` +${
                              hospital.facilities.length -
                              3
                            } more`

                          : "")

                      : "-"}

                  </td>

                  {/* BEDS */}

                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">

                    {hospital.totalBeds ||
                      "-"}

                  </td>

                  {/* ACTIONS */}

                  <td className="px-4 py-3 flex items-center gap-2">

                    {/* EDIT */}

                    <button
                      onClick={() => {

                        setEditHospital(
                          hospital
                        );

                        setShowModal(
                          true
                        );

                      }}
                      className="p-2 rounded-lg bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all"
                    >

                      <Edit2
                        size={16}
                      />

                    </button>

                    {/* DELETE */}

                    <button
                      onClick={() =>
                        removeHospital(
                          hospital.id
                        )
                      }
                      className="p-2 rounded-lg bg-transparent text-red-600 dark:text-red-400 border border-red-500/40 hover:bg-red-500/10 hover:border-red-500 transition-all"
                    >

                      <Trash2
                        size={16}
                      />

                    </button>

                  </td>

                </tr>

              )
            )}

            {/* EMPTY */}

            {filtered.length ===
              0 && (

              <tr>

                <td
                  colSpan={6}
                  className="text-center p-6 text-slate-400"
                >

                  No hospitals found

                </td>

              </tr>

            )}

          </tbody>

        </table></div>

      </div>

      {/* MODAL */}

      {showModal && (

        <HospitalModal

          editData={
            editHospital
          }

          onSave={
            saveHospital
          }

          onClose={() => {

            setShowModal(
              false
            );

            setEditHospital(
              null
            );

          }}

        />

      )}

    </div>

  );
}