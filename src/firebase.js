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
  collection,
  onSnapshot,
} from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCSFvwCO0DLk6PlCTqP-JpHyGov0IG2S5Q",
  authDomain: "organ-donor-management-system.firebaseapp.com",
  projectId: "organ-donor-management-system",
  storageBucket: "organ-donor-management-system.appspot.com",
  messagingSenderId: "487567344580",
  appId: "1:487567344580:web:2f2143ed93ae8709cc5a91",
  measurementId: "G-28R5PRZ92V",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { serverTimestamp };

// Setup invisible reCAPTCHA correctly
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
 * Get reference to the entire transport collection
 */
export const organTransportsRef = collection(db, "organTransports");

/**
 * Real-time listener for a specific transport (for live map updates)
 */
export const listenToOrganTransport = (transportId, callback) => {
  const ref = doc(db, "organTransports", transportId);
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) callback(docSnap.data());
  });
};
