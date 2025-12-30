// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";

// ---------------------------
// Your Firebase config
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCSFvwCO0DLk6PlCTqP-JpHyGov0IG2S5Q",
  authDomain: "organ-donor-management-system.firebaseapp.com",
  projectId: "organ-donor-management-system",
  storageBucket: "organ-donor-management-system.appspot.com",
  messagingSenderId: "487567344580",
  appId: "1:487567344580:web:2f2143ed93ae8709cc5a91",
  measurementId: "G-28R5PRZ92V",
};

// ---------------------------
// Initialize Firebase
// ---------------------------
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { serverTimestamp };

// ---------------------------
// Invisible reCAPTCHA
// ---------------------------
export const setupRecaptcha = (containerId = "recaptcha-container") => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(
      containerId,
      { size: "invisible", callback: () => {} },
      auth
    );
  }
  return window.recaptchaVerifier;
};

// ================================
// Organ Transport Firestore Helpers
// ================================

/**
 * Save or update an organ transport record
 */
export const saveOrganTransport = async (transportId, data) => {
  const ref = doc(db, "organTransports", transportId);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

/**
 * Update transport status or location
 */
export const updateOrganTransport = async (transportId, updates) => {
  const ref = doc(db, "organTransports", transportId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
};

/**
 * Get a single transport record
 */
export const getOrganTransport = async (transportId) => {
  const ref = doc(db, "organTransports", transportId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

/**
 * Reference to full collection
 */
export const organTransportsRef = collection(db, "organTransports");

/**
 * Real-time listener (Live Map)
 */
export const listenToOrganTransport = (transportId, callback) => {
  const ref = doc(db, "organTransports", transportId);
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) callback(docSnap.data());
  });
};

// ======================================================
// 🚀 NEW: HOSPITAL MODULE FIRESTORE HELPERS
// ======================================================

// -----------------------------
// Get single hospital by id
// -----------------------------
export const getHospital = async (hospitalId) => {
  const ref = doc(db, "hospitals", hospitalId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// -----------------------------
// Departments Subcollection
// Path: hospitals/{id}/departments/{deptId}
// -----------------------------

export const departmentsRef = (hospitalId) =>
  collection(db, "hospitals", hospitalId, "departments");

export const addDepartmentFS = async (hospitalId, data) => {
  const ref = doc(departmentsRef(hospitalId));
  await setDoc(ref, data);
};

export const updateDepartmentFS = async (hospitalId, deptId, data) => {
  const ref = doc(db, "hospitals", hospitalId, "departments", deptId);
  await updateDoc(ref, data);
};

export const deleteDepartmentFS = async (hospitalId, deptId) => {
  const ref = doc(db, "hospitals", hospitalId, "departments", deptId);
  await deleteDoc(ref);
};

export const listenDepartmentsFS = (hospitalId, callback) => {
  return onSnapshot(departmentsRef(hospitalId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// -----------------------------
// Doctors Subcollection
// Path: hospitals/{id}/doctors/{doctorId}
// -----------------------------

export const doctorsRef = (hospitalId) =>
  collection(db, "hospitals", hospitalId, "doctors");

export const addDoctorFS = async (hospitalId, data) => {
  const ref = doc(doctorsRef(hospitalId));
  await setDoc(ref, data);
};

export const updateDoctorFS = async (hospitalId, doctorId, data) => {
  const ref = doc(db, "hospitals", hospitalId, "doctors", doctorId);
  await updateDoc(ref, data);
};

export const deleteDoctorFS = async (hospitalId, doctorId) => {
  const ref = doc(db, "hospitals", hospitalId, "doctors", doctorId);
  await deleteDoc(ref);
};

export const listenDoctorsFS = (hospitalId, callback) => {
  return onSnapshot(doctorsRef(hospitalId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
