// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
      setLoading(false);
    };
    checkUser();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Check if documents need verification
  if (userData && !userData.documentsVerified && 
      (userData.role === 'donor' || userData.role === 'recipient')) {
    return <Navigate to="/verify-documents" />;
  }

  // Check role permissions
  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    return <Navigate to={`/${userData?.role}`} />;
  }

  return children;
};

export default ProtectedRoute;