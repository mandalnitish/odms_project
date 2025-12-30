// src/services/hospitalService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

const hospitalsCol = collection(db, "hospitals");

// Create new hospital
export async function createHospital(data) {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(hospitalsCol, payload);
  return docRef.id;
}

// Update hospital
export async function updateHospital(id, data) {
  const docRef = doc(db, "hospitals", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Delete hospital
export async function deleteHospital(id) {
  const docRef = doc(db, "hospitals", id);
  await deleteDoc(docRef);
}

// One-time fetch all hospitals
export async function getAllHospitals() {
  const q = query(hospitalsCol, orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Real-time subscribe (for live updates in UI)
export function subscribeToHospitals(callback) {
  const q = query(hospitalsCol, orderBy("name"));
  const unsubscribe = onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
  return unsubscribe;
}
