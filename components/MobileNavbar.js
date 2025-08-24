"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import FacilitatorLoginModal from "./FacilitatorLoginModal"; // ⬅️ import modal
import AuthModal from "./AuthModal"; // ⬅️ import modal

export default function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Browse Qualifications", href: "/qualifications" },
  ];

  return (
    <nav className="flex justify-between items-center text-white relative">
      {/* Logo */}
      <div className="hidden md:block font-bold text-xl text-left">
        Fachs College LMS
      </div>

      {/* Desktop menu */}
      <div className="hidden md:flex space-x-6">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="relative px-3 py-1 rounded-full hover:bg-white hover:text-black transition-colors duration-300"
          >
            {item.name}
          </Link>
        ))}

        {/* Facilitator modal trigger */}
        <button
          onClick={() => setIsFacilitatorModalOpen(true)}
          className="relative px-3 py-1 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black transition-colors duration-300"
        >
          Not a Learner?
        </button>
      </div>

      {/* Mobile menu button */}
      <button
        className="md:hidden focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile dropdown */}
      <div
        className={`absolute top-16 left-0 w-full md:hidden bg-gradient-to-br from-blue-800 to-red-800 p-6 flex flex-col space-y-4 shadow-xl rounded-b-2xl transform transition-all duration-300 ease-out
        ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 pointer-events-none"}`}
      >
        {menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className="text-white hover:underline"
          >
            {item.name}
          </Link>
        ))}

        {/* Facilitator modal trigger (mobile) */}
        <button
          onClick={() => {
            setIsFacilitatorModalOpen(true);
            setIsOpen(false);
          }}
          className="text-yellow-300 hover:text-yellow-100"
        >
          Not a Learner?
        </button>
      </div>

      {/* Facilitator Login Modal */}
      <FacilitatorLoginModal
  isOpen={isFacilitatorModalOpen}
  onClose={() => setIsFacilitatorModalOpen(false)}
  onSwitchToLearner={() => setAuthModalOpen(true)} // <-- opens learner modal
/>
<AuthModal
  isOpen={isAuthModalOpen}
  onClose={() => setAuthModalOpen(false)}
/>

    </nav>
  );
}
