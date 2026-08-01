// src/components/AdminAddDoctor.jsx
import React, { useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfig } from "../firebase";
import { UserPlus, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw } from "lucide-react";

function generatePassword() {
  // Simple readable temp password: e.g. "Doctor-7f3k9d"
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Doctor-${suffix}`;
}

export default function AdminAddDoctor() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: generatePassword(),
    mobile: "",
    address: "",
    specialization: "",
    hospital: "",
  });

  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null); // { email, password } on success

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleRegeneratePassword = () => {
    setFormData((prev) => ({ ...prev, password: generatePassword() }));
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      password: generatePassword(),
      mobile: "",
      address: "",
      specialization: "",
      hospital: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // A temporary, isolated Firebase app instance — this lets us call
    // createUserWithEmailAndPassword to make the doctor's account
    // WITHOUT signing the currently logged-in admin out of their own
    // session. The admin's real session lives on the default app
    // (imported as `auth`/`db` elsewhere); this one is thrown away
    // immediately after use.
    const tempAppName = `doctor-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      // Step 1: create the Auth account on the temporary app instance
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        formData.email.trim().toLowerCase(),
        formData.password
      );
      const newUser = userCredential.user;

      await updateProfile(newUser, {
        displayName: formData.fullName.trim(),
      });

      // Step 2: write the Firestore profile using the ADMIN's normal,
      // already-authenticated `db` connection — this is what your
      // Firestore rules check against (getUserRole() on the admin's
      // uid), so the "doctor/admin have write access" rule applies.
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        specialization: formData.specialization.trim(),
        hospital: formData.hospital.trim(),
        role: "doctor",
        documentsVerified: true,
        accountStatus: "active",
        createdAt: serverTimestamp(),
      });

      // Step 3: clean up the temporary auth session/app so it doesn't
      // linger in memory or in the browser's IndexedDB auth storage.
      await signOut(tempAuth);
      await deleteApp(tempApp);

      setSuccess({ email: formData.email, password: formData.password });
      resetForm();
    } catch (err) {
      console.error("Failed to create doctor account:", err);

      switch (err.code) {
        case "auth/email-already-in-use":
          setError("An account already exists with this email address.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password is too weak. Please use at least 6 characters.");
          break;
        default:
          setError(err.message || "Failed to create doctor account.");
      }

      // Best-effort cleanup even on failure
      try {
        await deleteApp(tempApp);
      } catch (_) {
        /* ignore cleanup errors */
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Add Doctor Account
        </h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Doctor accounts can only be created by an admin. Share the generated
        password with the doctor securely and ask them to change it after
        first login.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
            <CheckCircle size={16} />
            Doctor account created
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            Email: <span className="font-semibold">{success.email}</span>
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Temporary password:{" "}
            <span className="font-mono font-semibold">{success.password}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-xs">
            This password is only shown once — copy it now if you haven't
            already shared it.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Temporary Password
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full p-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleRegeneratePassword}
              title="Generate new password"
              className="px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Specialization
            </label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              placeholder="e.g. Nephrology"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hospital
            </label>
            <input
              type="text"
              name="hospital"
              value={formData.hospital}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <UserPlus size={18} />
          {loading ? "Creating..." : "Create Doctor Account"}
        </button>
      </form>
    </div>
  );
}