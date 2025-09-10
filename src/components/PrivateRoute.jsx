// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export default function PrivateRoute({ children, allowedRoles = [] }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show a simple loading state while auth is being checked
    return (
      <motion.div
        className="flex justify-center items-center min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <p>Loading...</p>
      </motion.div>
    );
  }

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(role))) {
    // Redirect unauthorized users to homepage
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Authorized, render children
  return <>{children}</>;
}
