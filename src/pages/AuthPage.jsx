// src/pages/AuthPage.jsx

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import emailjs from "@emailjs/browser";
import { Eye, EyeOff } from "lucide-react";

import { auth, db } from "../firebase";
import logo from "../assets/logo.png";

export default function AuthPage({ showLogo = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  // =========================================================
  // EMAILJS CONFIGURATION
  // =========================================================

  const EMAILJS_SERVICE_ID =
    import.meta.env.VITE_EMAILJS_SERVICE_ID;

  const EMAILJS_DONOR_TEMPLATE_ID =
    import.meta.env.VITE_EMAILJS_DONOR_TEMPLATE_ID;

  const EMAILJS_RECIPIENT_TEMPLATE_ID =
    import.meta.env.VITE_EMAILJS_RECIPIENT_TEMPLATE_ID;

  const EMAILJS_PUBLIC_KEY =
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  // =========================================================
  // STATES
  // =========================================================

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
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // =========================================================
  // CHECK URL FOR SIGNUP TAB
  // =========================================================

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get("tab") === "signup") {
      setTab("signup");
    }
  }, [location.search]);

  // =========================================================
  // HANDLE INPUT CHANGES
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updatedData = {
        ...prev,
        [name]: value,
      };

      // Doctor does not require organ type
      if (name === "role" && value === "doctor") {
        updatedData.organType = "";
      }

      return updatedData;
    });

    setError("");
    setSuccess("");
  };

  // =========================================================
  // GET EMAILJS TEMPLATE BASED ON ROLE
  // =========================================================

  const getEmailTemplateId = (role) => {
    switch (role) {
      case "donor":
        return EMAILJS_DONOR_TEMPLATE_ID;

      case "recipient":
        return EMAILJS_RECIPIENT_TEMPLATE_ID;

      default:
        // Doctor does not receive EmailJS welcome email
        return null;
    }
  };

  // =========================================================
  // SEND ROLE-BASED WELCOME EMAIL
  // =========================================================

  const sendWelcomeEmail = async () => {
    try {
      // Select Donor or Recipient template
      const templateId = getEmailTemplateId(formData.role);

      // Doctor does not use an EmailJS template
      if (!templateId) {
        console.log(
          `Welcome email skipped for role: ${formData.role}`
        );

        return {
          sent: false,
          skipped: true,
        };
      }

      // Check EmailJS configuration
      if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY) {
        console.error(
          "EmailJS service ID or public key is missing."
        );

        return {
          sent: false,
          skipped: false,
        };
      }

      // EmailJS template variables
      const templateParams = {
        to_email: formData.email.trim(),
        to_name: formData.fullName.trim(),

        role:
          formData.role.charAt(0).toUpperCase() +
          formData.role.slice(1),

        blood_group:
          formData.bloodGroup || "Not specified",

        organ_type: formData.organType
          ? formData.organType.charAt(0).toUpperCase() +
            formData.organType.slice(1)
          : "Not applicable",
      };

      // Send EmailJS email
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        templateId,
        templateParams,
        {
          publicKey: EMAILJS_PUBLIC_KEY,
        }
      );

      console.log(
        `${formData.role} welcome email sent successfully:`,
        response.status,
        response.text
      );

      return {
        sent: true,
        skipped: false,
      };
    } catch (emailError) {
      console.error(
        "Welcome email sending failed:",
        emailError
      );

      // Registration should still succeed
      // even if email sending fails
      return {
        sent: false,
        skipped: false,
      };
    }
  };

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Login with Firebase Authentication
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

      const user = userCredential.user;

      // Get user information from Firestore
      const userDocument = await getDoc(
        doc(db, "users", user.uid)
      );

      if (!userDocument.exists()) {
        setError(
          "User data not found. Please contact administrator."
        );
        return;
      }

      const userData = userDocument.data();

      const role = userData.role || "donor";

      // Donor and Recipient must complete verification
      if (
        !userData.documentsVerified &&
        (role === "donor" || role === "recipient")
      ) {
        navigate("/verify-documents");
      } else {
        // Doctor or verified users
        navigate(`/${role}`);
      }
    } catch (err) {
      console.error("Login Error:", err);

      switch (err.code) {
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;

        case "auth/user-disabled":
          setError(
            "This account has been disabled."
          );
          break;

        case "auth/too-many-requests":
          setError(
            "Too many login attempts. Please try again later."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        default:
          setError(
            err.message ||
              "Unable to login. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SIGNUP
  // =========================================================

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    // Public signup may only create donor/recipient accounts.
    // Doctor accounts must be provisioned by an admin.
    if (formData.role !== "donor" && formData.role !== "recipient") {
      setError(
        "This role cannot be self-registered. Please contact an administrator."
      );
      setLoading(false);
      return;
    }

    try {
      // -----------------------------------------------------
      // STEP 1: Create Firebase Authentication account
      // -----------------------------------------------------

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

      const user = userCredential.user;

      // -----------------------------------------------------
      // STEP 2: Update Firebase Authentication display name
      // -----------------------------------------------------

      await updateProfile(user, {
        displayName: formData.fullName.trim(),
      });

      // -----------------------------------------------------
      // STEP 3: Save user information to Firestore
      // -----------------------------------------------------

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,

        fullName:
          formData.fullName.trim(),

        email:
          formData.email
            .trim()
            .toLowerCase(),

        mobile:
          formData.mobile.trim(),

        address:
          formData.address.trim(),

        bloodGroup:
          formData.bloodGroup,

        organType:
          formData.role === "doctor"
            ? ""
            : formData.organType,

        role:
          formData.role,

        // Donor/Recipient verification
        documentsVerified:
          formData.role === "doctor"
            ? true
            : false,

        documentsUploaded: false,

        accountStatus: "active",

        // Welcome email information
        welcomeEmailSent: false,

        welcomeEmailSkipped:
          formData.role === "doctor",

        createdAt: serverTimestamp(),
      });

      // -----------------------------------------------------
      // STEP 4: Send Donor or Recipient welcome email
      // -----------------------------------------------------

      const emailResult =
        await sendWelcomeEmail();

      // -----------------------------------------------------
      // STEP 5: Update EmailJS status in Firestore
      // -----------------------------------------------------

      if (emailResult.sent) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            welcomeEmailSent: true,
            welcomeEmailSkipped: false,
            welcomeEmailSentAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        console.log(
          `${formData.role} registered successfully and welcome email sent.`
        );
      } else if (emailResult.skipped) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            welcomeEmailSent: false,
            welcomeEmailSkipped: true,
          },
          {
            merge: true,
          }
        );

        console.log(
          `${formData.role} registered successfully. Welcome email skipped.`
        );
      } else {
        console.warn(
          `${formData.role} registered successfully, but welcome email could not be sent.`
        );
      }

      // -----------------------------------------------------
      // STEP 6: Redirect user based on role
      // -----------------------------------------------------

      if (
        formData.role === "donor" ||
        formData.role === "recipient"
      ) {
        navigate("/verify-documents");
      } else {
        navigate(`/${formData.role}`);
      }
    } catch (err) {
      console.error("Signup Error:", err);

      switch (err.code) {
        case "auth/email-already-in-use":
          setError(
            "An account already exists with this email address."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setError(
            "Password is too weak. Please use at least 6 characters."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        default:
          setError(
            err.message ||
              "Unable to create account. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError(
        "Enter your email address to reset your password."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await sendPasswordResetEmail(
        auth,
        formData.email.trim()
      );

      setSuccess(
        "Password reset email sent. Please check your inbox."
      );
    } catch (err) {
      console.error(
        "Password Reset Error:",
        err
      );

      setError(
        err.message ||
          "Unable to send password reset email."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CHANGE LOGIN / SIGNUP TAB
  // =========================================================

  const changeTab = (newTab) => {
    setTab(newTab);
    setError("");
    setSuccess("");
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">

      <div className="max-w-md w-full p-8 rounded-xl shadow-lg bg-white dark:bg-gray-800">

        {/* Logo */}
        {showLogo && (
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="Organ Donor Management System"
              className="w-20 h-20 object-contain"
            />
          </div>
        )}

        {/* Login / Signup Tabs */}
        <div className="flex justify-center mb-6">

          <button
            type="button"
            onClick={() =>
              changeTab("login")
            }
            className={`px-4 py-2 rounded-l-md font-semibold transition-colors duration-500 ${
              tab === "login"
                ? "bg-green-600 text-white dark:bg-green-500"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() =>
              changeTab("signup")
            }
            className={`px-4 py-2 rounded-r-md font-semibold transition-colors duration-500 ${
              tab === "signup"
                ? "bg-green-600 text-white dark:bg-green-500"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            Signup
          </button>

        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        {/* ================================================= */}
        {/* LOGIN FORM */}
        {/* ================================================= */}

        {tab === "login" && (
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              autoComplete="email"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Password */}
            <div className="relative">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full p-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>

            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 dark:bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

            {/* Forgot Password */}
            <button
              type="button"
              onClick={
                handleForgotPassword
              }
              disabled={loading}
              className="block ml-auto text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
            >
              Forgot Password?
            </button>

          </form>
        )}

        {/* ================================================= */}
        {/* SIGNUP FORM */}
        {/* ================================================= */}

        {tab === "signup" && (
          <form
            onSubmit={handleSignup}
            className="space-y-4"
          >

            {/* Full Name */}
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Email */}
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              autoComplete="email"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Password */}
            <div className="relative">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full p-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>

            </div>

            {/* Mobile */}
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Mobile Number"
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Address */}
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Blood Group */}
            <select
              name="bloodGroup"
              value={
                formData.bloodGroup
              }
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >

              <option value="">
                Select Blood Group
              </option>

              {[
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
              ].map((blood) => (
                <option
                  key={blood}
                  value={blood}
                >
                  {blood}
                </option>
              ))}

            </select>

            {/* Role */}
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >

              <option value="donor">
                Donor
              </option>

              <option value="recipient">
                Recipient
              </option>

            </select>

            {/* Organ Type */}
            {/* Only Donor and Recipient */}
            {(formData.role ===
              "donor" ||
              formData.role ===
                "recipient") && (
              <select
                name="organType"
                value={
                  formData.organType
                }
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >

                <option value="">
                  Select Organ
                </option>

                {[
                  "Kidney",
                  "Heart",
                  "Liver",
                  "Lung",
                  "Pancreas",
                  "Eye",
                ].map((organ) => (
                  <option
                    key={organ}
                    value={
                      organ.toLowerCase()
                    }
                  >
                    {organ}
                  </option>
                ))}

              </select>
            )}

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 dark:bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? "Creating Account..."
                : "Signup"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}