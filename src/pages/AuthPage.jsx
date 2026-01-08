// src/pages/AuthPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import logo from "../assets/logo.png";
import { Eye, EyeOff } from "lucide-react";

export default function AuthPage({ showLogo = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState("login");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
    bloodGroup: "",
    organType: "",
    role: "donor",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "signup") setTab("signup");
  }, [location.search]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ---------------- Login ----------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      const docSnap = await getDoc(doc(db, "users", user.uid));
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const role = userData.role || "donor";
        
        // Check if documents are verified
        if (!userData.documentsVerified && (role === 'donor' || role === 'recipient')) {
          // Redirect to document verification page
          navigate("/verify-documents");
        } else {
          // Documents verified or not required (doctor/admin), go to dashboard
          navigate(`/${role}`);
        }
      } else {
        setError("User data not found. Contact admin.");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ---------------- Signup ----------------
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      
      // Create user document with documentsVerified flag
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        organType: formData.organType,
        role: formData.role,
        documentsVerified: false, // New users need to verify documents
        documentsUploaded: false,
        createdAt: serverTimestamp(),
      });
      
      // Redirect based on role
      if (formData.role === 'donor' || formData.role === 'recipient') {
        // Donors and recipients must upload documents first
        navigate("/verify-documents");
      } else {
        // Doctors and admins can go directly to dashboard
        navigate(`/${formData.role}`);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ---------------- Forgot Password ----------------
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Enter your email to reset password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, formData.email);
      alert("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <div className="max-w-md w-full p-8 rounded-xl shadow-lg bg-white dark:bg-gray-800">
        {showLogo && (
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo" className="w-20 h-20 object-contain" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setTab("login")}
            className={`px-4 py-2 rounded-l-md font-semibold transition-colors duration-500 ${
              tab === "login"
                ? "bg-green-600 text-white dark:bg-green-500 dark:text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`px-4 py-2 rounded-r-md font-semibold transition-colors duration-500 ${
              tab === "signup"
                ? "bg-green-600 text-white dark:bg-green-500 dark:text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            Signup
          </button>
        </div>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        {/* ---------------- Login Form ---------------- */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full p-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500 dark:text-gray-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 dark:bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-400"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p
              className="text-sm text-right text-blue-600 cursor-pointer"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </p>
          </form>
        )}

        {/* ---------------- Signup Form ---------------- */}
        {tab === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full p-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500 dark:text-gray-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
            </div>

            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Mobile Number"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Blood Group Dropdown */}
            <select
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Blood Group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Organ Type Dropdown */}
            <select
              name="organType"
              value={formData.organType}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Organ</option>
              {["Kidney", "Heart", "Liver", "Lung", "Eye"].map((o) => (
                <option key={o} value={o.toLowerCase()}>
                  {o}
                </option>
              ))}
            </select>

            {/* Role Dropdown */}
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="donor">Donor</option>
              <option value="recipient">Recipient</option>
              <option value="doctor">Doctor</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 dark:bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-400"
            >
              {loading ? "Signing up..." : "Signup"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}