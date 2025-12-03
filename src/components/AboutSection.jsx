// src/components/AboutSection.jsx
import { useState } from "react";
import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";
import aboutImage from "../assets/about-image.jpg"; // local image

export default function AboutSection() {
  const [hasAnimated, setHasAnimated] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  if (inView && !hasAnimated) {
    setHasAnimated(true);
  }

  const stats = [
    { icon: "❤️", title: "Donors Registered", value: 12345 },
    { icon: "🩺", title: "Hospitals Partnered", value: 85 },
    { icon: "💖", title: "Lives Saved", value: 7890 },
    { icon: "🤖", title: "AI Matches Done", value: 3210 },
  ];

  return (
    <section
      ref={ref}
      className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-700 ease-in-out"
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center md:space-x-12">
        {/* Image */}
        <div className="md:w-1/2 mb-8 md:mb-0" data-aos="fade-right">
          <img
            src={aboutImage}
            alt="About Us"
            className="rounded-xl shadow-lg w-full object-cover transition-transform duration-700 ease-in-out hover:scale-105"
          />
        </div>

        {/* Text */}
        <div className="md:w-1/2 text-center md:text-left" data-aos="fade-left">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            About Our Platform
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Our mission is to make organ donation simple, transparent, and impactful.
            We connect donors, recipients, and medical professionals to save lives efficiently.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            By providing real-time information, role-based dashboards, and AI-powered matching,
            we aim to create a community where everyone can contribute to saving lives and raising awareness about organ donation.
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-green-600
                  transform transition-all duration-500 ease-in-out
                  opacity-0 translate-y-6
                  ${inView ? "opacity-100 translate-y-0" : ""}
                  hover:shadow-2xl hover:scale-105 hover:shadow-green-500/40`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="text-4xl mb-2 text-green-600 dark:text-green-400">
                  {stat.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {stat.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-lg font-bold mt-1">
                  {hasAnimated ? (
                    <CountUp end={stat.value} duration={2} separator="," />
                  ) : (
                    0
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
