"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, User, LayoutDashboard, LogOut } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FacilitatorLoginModal from "./FacilitatorLoginModal"; 
import AuthModal from "./AuthModal"; 

export default function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Browse Qualifications", href: "/qualifications" },
  ];

  return (
 
    <nav className="flex justify-between items-center text-white relative">
      {/* Logo & User Info */}
      <div className="hidden md:flex items-center space-x-4 font-bold text-xl">
        <span>Fachs College LMS</span>

        {/* Dashboard icon */}
        <Link href="/dashboard" className="hover:text-yellow-400">
          <LayoutDashboard size={24} />
        </Link>

        {/* User Dropdown */}
        {user ? (
          <div className="relative group">
            <button className="flex items-center space-x-2 focus:outline-none">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User size={24} />
              )}
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity duration-200">
              <div className="px-4 py-2 border-b border-gray-200">
                {user.user_metadata?.full_name || user.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="hover:text-yellow-400 flex items-center space-x-1"
          >
            <User size={24} />
            <span className="text-sm">Login</span>
          </button>
        )}
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

        {/* Dashboard link (mobile) */}
        <Link
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center space-x-2 text-white hover:underline"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        {/* User info (mobile) */}
        {user ? (
          <div className="flex flex-col text-white space-y-2">
            <div className="flex items-center space-x-2">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User size={24} />
              )}
              <span>{user.user_metadata?.full_name || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-300 hover:text-red-100"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setAuthModalOpen(true);
              setIsOpen(false);
            }}
            className="text-yellow-300 hover:text-yellow-100 flex items-center space-x-1"
          >
            <User size={20} />
            <span>Login</span>
          </button>
        )}

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
        onSwitchToLearner={() => setAuthModalOpen(true)} 
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </nav>
   
  );
}
