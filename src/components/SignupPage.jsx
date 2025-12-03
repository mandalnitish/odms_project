import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("donor");
  const [bloodGroup, setBloodGroup] = useState("");
  const [organType, setOrganType] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data in Firestore with uid as doc id
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        email,
        mobile,
        address,
        role,
        bloodGroup,
        organType,
        createdAt: new Date(),
      });

      // Redirect to dashboard or auth page after signup
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSignup}>
        <label className="block mb-1">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full mb-3 p-2 border rounded"
        />

        <label className="block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-3 p-2 border rounded"
        />

        <label className="block mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-3 p-2 border rounded"
        />

        <label className="block mb-1">Mobile Number</label>
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <label className="block mb-1">Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <label className="block mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="w-full mb-3 p-2 border rounded"
        >
          <option value="donor">Donor</option>
          <option value="recipient">Recipient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>

        <label className="block mb-1">Blood Group</label>
        <select
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value)}
          required
          className="w-full mb-3 p-2 border rounded"
        >
          <option value="">Select blood group</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>

        {(role === "donor" || role === "recipient") && (
          <>
            <label className="block mb-1">Organ Type</label>
            <select
              value={organType}
              onChange={(e) => setOrganType(e.target.value)}
              required
              className="w-full mb-4 p-2 border rounded"
            >
              <option value="">Select organ</option>
              <option value="kidney">Kidney</option>
              <option value="liver">Liver</option>
              <option value="heart">Heart</option>
              <option value="lung">Lung</option>
              <option value="pancreas">Pancreas</option>
            </select>
          </>
        )}

        <button
          type="submit"
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
