// src/components/Footer.jsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-200 py-6 mt-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-6">
        {/* Logo / Site Name */}
        <div className="mb-4 md:mb-0 flex items-center">
          <span className="text-xl font-bold text-green-500">OrganDonorMS</span>
        </div>

        {/* Links */}
        <div className="flex space-x-6 mb-4 md:mb-0">
          <Link to="/" className="hover:text-green-500 transition">Home</Link>
          <Link to="/why-donate" className="hover:text-green-500 transition">Why Donate</Link>
          <Link to="/how-it-works" className="hover:text-green-500 transition">How It Works</Link>
          <Link to="/eligibility" className="hover:text-green-500 transition">Eligibility</Link>
        </div>

        {/* Copyright */}
        <div className="text-sm text-gray-400">
          © {new Date().getFullYear()} Organ Donor Management System. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
