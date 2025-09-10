// src/pages/HomePage.jsx
import AboutSection from "../components/AboutSection";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (user) {
      switch (role) {
        case "admin":
          navigate("/admin");
          break;
        case "doctor":
          navigate("/doctor");
          break;
        case "donor":
          navigate("/donor");
          break;
        case "recipient":
          navigate("/recipient");
          break;
        default:
          navigate("/");
      }
    }
  }, [user, role, navigate]);

  const infoCards = [
    {
      icon: "❤️",
      title: "Why Donate?",
      desc: "Understand the impact of organ donation and how you can save lives.",
      path: "/why-donate",
    },
    {
      icon: "📊",
      title: "How It Works?",
      desc: "Learn about the organ donation process from registration to transplant.",
      path: "/how-it-works",
    },
    {
      icon: "🤝",
      title: "Eligibility",
      desc: "Check if you qualify to become a donor and help others in need.",
      path: "/eligibility",
    },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center h-screen flex items-center justify-center text-white transition-colors duration-700 ease-in-out"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1584515933487-779824d29309?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black/50 dark:bg-black/70 transition-colors duration-700 ease-in-out"></div>

        {/* Hero Text */}
        <div className="relative z-10 text-center px-6 max-w-3xl transition-all duration-700 ease-in-out">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 transition-transform duration-500 ease-in-out hover:scale-105">
            Give the Gift of Life
          </h1>
          <p className="text-lg md:text-xl mb-8 transition-transform duration-500 ease-in-out hover:scale-105">
            Every organ donor can save up to 8 lives. Be a hero today and make a difference.
          </p>

          {/* Pulsing, glowing button */}
          <a
            href="/auth?tab=signup&role=donor"
            className="relative inline-block bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-lg
                       transform transition-all duration-500 ease-in-out hover:scale-105 animate-pulse-slow
                       before:absolute before:inset-0 before:rounded-lg before:bg-green-500/40 before:opacity-0 before:transition-opacity before:duration-500
                       hover:before:opacity-30"
          >
            Become a Donor
          </a>
        </div>
      </section>

      {/* Info Cards Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto transition-colors duration-700 ease-in-out">
        <h2 className="text-3xl font-bold text-center text-green-700 dark:text-green-400 mb-12 transition-colors duration-700 ease-in-out">
          Why Organ Donation Matters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {infoCards.map((card, index) => (
            <a
              key={index}
              href={card.path}
              className="flex flex-col items-center bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center border-t-4 border-green-600
                         hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-500 ease-in-out
                         relative before:absolute before:inset-0 before:rounded-xl before:bg-green-500/20 before:opacity-0 hover:before:opacity-30"
            >
              <div className="text-green-600 dark:text-green-400 text-5xl mb-4 transition-transform duration-500 ease-in-out hover:scale-110">
                {card.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100 transition-colors duration-700 ease-in-out">
                {card.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-700 ease-in-out">
                {card.desc}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* About Section */}
      <AboutSection />
    </div>
  );
}
