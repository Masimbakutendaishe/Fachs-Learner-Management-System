"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LayoutDashboard, LogOut, Bell } from "lucide-react";
import FacilitatorLoginModal from "./FacilitatorLoginModal";
import AuthModal from "./AuthModal";
import { useAuth } from "../pages/context/AuthContext";

export default function MobileNavbar() {
  const { user, profile, institution, isAuthenticated, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.surname || ""}`.trim()
    : user?.email;

  const handleLoginClick = () => {
    if (isAuthenticated) {
      alert("You are already logged in. Please logout first.");
      return;
    }
    setAuthModalOpen(true);
    setIsOpen(false);
  };

  const handleFacilitatorClick = () => {
    if (isAuthenticated) {
      alert("You are already logged in. Logout first to switch roles.");
      return;
    }
    setIsFacilitatorModalOpen(true);
    setIsOpen(false);
  };

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Browse Qualifications", href: "/qualifications" },
  ];

  return (
    <nav className="flex justify-between items-center text-white relative">
      <div className="hidden md:flex items-center space-x-4 font-bold text-xl">
        {institution?.logo_url ? (
          <img src={institution.logo_url} alt={institution.name} className="h-8 w-auto object-contain" />
        ) : (
          <span>{institution?.name || "Fachs College LMS"}</span>
        )}
        {isAuthenticated && (
          <div className="flex items-center space-x-3 ml-4">
            <Link href="/dashboard"><LayoutDashboard size={24} /></Link>
            <Bell size={24} />
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center space-x-6">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href} className="hover:text-yellow-400">
            {item.name}
          </Link>
        ))}

        {!isAuthenticated ? (
          <>
            <button onClick={handleLoginClick} className="px-3 py-1 rounded-full bg-white font-bold" style={{ color: "var(--brand-color)" }}>
              Sign In
            </button>
            <button onClick={handleFacilitatorClick} className="px-3 py-1 rounded-full bg-yellow-500 text-black">
              Not a Learner?
            </button>
          </>
        ) : (
          <div
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button className="flex items-center space-x-2">
              {profile?.profile_pic ? (
                <img src={profile.profile_pic} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User size={24} />
              )}
              <span>{displayName}</span>
            </button>
            <div className={`absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-lg
              ${showDropdown ? "opacity-100 visible" : "opacity-0 invisible"}`}>
              <div className="px-4 py-2 border-b">{user?.email}</div>
              <div className="px-4 py-2 text-xs text-gray-500 capitalize">{profile?.role}</div>
              <button onClick={signOut} className="flex w-full px-4 py-2 hover:bg-gray-100">
                <LogOut size={18} className="mr-2" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>

      <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full md:hidden bg-black/90 flex flex-col space-y-4 p-4 z-50">
          {menuItems.map((item) => (
            <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)} className="hover:text-yellow-400">
              {item.name}
            </Link>
          ))}

          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center space-x-2 text-white hover:underline">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          {isAuthenticated ? (
            <div className="flex flex-col text-white space-y-2">
              <div className="flex items-center space-x-2">
                {profile?.profile_pic ? (
                  <img src={profile.profile_pic} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User size={24} />
                )}
                <span>{displayName}</span>
              </div>
              <button onClick={signOut} className="flex items-center space-x-2 text-red-300 hover:text-red-100">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button onClick={handleLoginClick} className="text-yellow-300 hover:text-yellow-100 flex items-center space-x-1">
              <User size={20} />
              <span>Login</span>
            </button>
          )}

          <button onClick={handleFacilitatorClick} className="text-yellow-300 hover:text-yellow-100 text-left">
            Not a Learner?
          </button>
        </div>
      )}

      <FacilitatorLoginModal
        isOpen={isFacilitatorModalOpen}
        onClose={() => setIsFacilitatorModalOpen(false)}
        onSwitchToLearner={() => setAuthModalOpen(true)}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </nav>
  );
}