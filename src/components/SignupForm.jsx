// src/components/SignupForm.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Update display name
      await updateProfile(userCredential.user, { displayName: fullName });
      navigate("/"); // redirect after signup
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="input-glass"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-glass"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-glass"
      />
      <button
        type="submit"
        className="bg-pink-700 hover:bg-pink-800 text-white py-3 rounded transition"
      >
        Sign Up
      </button>
    </form>
  );
}
