// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { app } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Signup method
  const signup = async (email, password, extraData = {}) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const userRole = extraData.role || "donor";

    await setDoc(doc(db, "users", firebaseUser.uid), {
      email,
      role: userRole,
      fullName: extraData.fullName || "",
      mobile: extraData.mobile || "",
      address: extraData.address || "",
      bloodGroup: extraData.bloodGroup || "",
      organType: extraData.organType || "",
      createdAt: serverTimestamp(),
    });

    setUser(firebaseUser);
    setRole(userRole);
    return userRole;
  };

  // 🔹 Login method
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    const userRole = userDoc.exists() ? userDoc.data().role : "donor";

    setUser(firebaseUser);
    setRole(userRole);
    return userRole;
  };

  // 🔹 Logout method
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  // 🔹 Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        setRole(userDoc.exists() ? userDoc.data().role : "donor");
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
