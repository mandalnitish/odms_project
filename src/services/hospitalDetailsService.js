import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

// ------------------ Hospital Details ------------------
export const getHospitalById = async (id) => {
  const snap = await getDoc(doc(db, "hospitals", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ------------------ Departments ------------------
export const subscribeDepartments = (hospitalId, callback) => {
  const ref = collection(db, "hospitals", hospitalId, "departments");
  return onSnapshot(ref, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addDepartment = async (hospitalId, data) => {
  await addDoc(collection(db, "hospitals", hospitalId, "departments"), data);
};

export const updateDepartment = async (hospitalId, id, data) => {
  await updateDoc(doc(db, "hospitals", hospitalId, "departments", id), data);
};

export const deleteDepartment = async (hospitalId, id) => {
  await deleteDoc(doc(db, "hospitals", hospitalId, "departments", id));
};

// ------------------ Doctors ------------------
export const subscribeDoctors = (hospitalId, callback) => {
  const ref = collection(db, "hospitals", hospitalId, "doctors");
  return onSnapshot(ref, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addDoctor = async (hospitalId, data) => {
  await addDoc(collection(db, "hospitals", hospitalId, "doctors"), data);
};

export const updateDoctor = async (hospitalId, id, data) => {
  await updateDoc(doc(db, "hospitals", hospitalId, "doctors", id), data);
};

export const deleteDoctor = async (hospitalId, id) => {
  await deleteDoc(doc(db, "hospitals", hospitalId, "doctors", id));
};
