// src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  // Hide login button if on /auth page
  const hideLoginButton = location.pathname.startsWith("/auth");

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center transition-colors duration-500">
      <div className="text-xl font-bold text-green-700 dark:text-green-400">Organ Donor</div>
      <div className="space-x-4">
        {!hideLoginButton && (
          <Link
            to="/auth?tab=login"
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
          >
            Login
          </Link>
        )}
        <Link
          to="/auth?tab=signup"
          className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
        >
          Signup
        </Link>
      </div>
    </nav>
  );
}
