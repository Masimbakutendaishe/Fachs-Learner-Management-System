"use client";
import { useRef } from "react";
import MobileNavbar from "./MobileNavbar"; // ✅ new navbar
import Footer from "./Footer";

export default function Layout({ children }) {
  const coursesRef = useRef(null);

  const scrollToCourses = () => {
    coursesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 px-4 overflow-hidden">
      {/* Main rectangle */}
      <div className="mt-2 relative w-[95vw] h-[95vh] bg-gradient-to-br from-blue-900 via-red-900 to-blue-700 shadow-2xl flex flex-col rounded-3xl overflow-hidden">
        {/* Inner scrollable content */}
        <div className="flex flex-col flex-grow overflow-y-auto  overscroll-contain">
          {/* Notch */}
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        w-48 h-12 bg-gray-100 rounded-b-3xl shadow-md z-20"
          ></div>

          {/* ✅ Responsive Navbar */}
          <div className="p-6 z-30">
            <MobileNavbar />
          </div>

          {/* Page content (scrollable inside rectangle) */}
          <div className="flex-grow w-full px-6 md:px-12 py-8 z-10 text-white">
            {children}
          </div>

          {/* Footer (sticks at bottom of scrollable area) */}
          <div className="p-6 z-20">
            <Footer />
          </div>
        </div>
      </div>

      {/* Scroll dots (outside rectangle) */}
      <div className="flex space-x-2 mt-3 cursor-pointer">
        {[1, 2, 3].map((dot) => (
          <div
            key={dot}
            onClick={scrollToCourses}
            className="w-3 h-3 bg-gray-400 hover:bg-gray-700 rounded-full transition-colors duration-300"
          ></div>
        ))}
      </div>

      {/* Course cards section */}
      <section
        ref={coursesRef}
        className="w-full max-w-6xl mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 px-4"
      >
        <div className="relative group bg-gradient-to-br from-blue-500 to-indigo-700 text-white rounded-2xl shadow-xl p-6 transform transition duration-500 hover:scale-105 hover:-rotate-1 hover:shadow-2xl">
          <img
            src="/images/techsupport.jpg"
            alt="Technical Support"
            className="w-full h-40 object-cover rounded-lg mb-4"
          />
          <h3 className="text-xl font-bold mb-2">Technical Support (NQF 4)</h3>
          <p>
            Learn the foundations of IT support, troubleshooting, and customer
            care.
          </p>
        </div>

        <div className="relative group bg-gradient-to-br from-green-500 to-emerald-700 text-white rounded-2xl shadow-xl p-6 transform transition duration-500 hover:scale-105 hover:rotate-1 hover:shadow-2xl">
          <img
            src="/images/itmanagement.jpg"
            alt="IT Management"
            className="w-full h-40 object-cover rounded-lg mb-4"
          />
          <h3 className="text-xl font-bold mb-2">IT Management (NQF 5)</h3>
          <p>
            Develop skills in managing IT systems, teams, and business technology
            needs.
          </p>
        </div>

        <div className="relative group bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl shadow-xl p-6 transform transition duration-500 hover:scale-105 hover:-rotate-1 hover:shadow-2xl">
          <img
            src="/images/network.jpg"
            alt="Network Administration"
            className="w-full h-40 object-cover rounded-lg mb-4"
          />
          <h3 className="text-xl font-bold mb-2">Network Administration (NQF 6)</h3>
          <p>
            Gain expertise in setting up, managing, and securing business
            networks.
          </p>
        </div>
      </section>
    </div>
  );
}
