"use client";
<<<<<<< HEAD
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, User, LayoutDashboard, LogOut, Bell } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FacilitatorLoginModal from "./FacilitatorLoginModal";
import AuthModal from "./AuthModal";
=======
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, User, LayoutDashboard, LogOut, Bell } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FacilitatorLoginModal from "./FacilitatorLoginModal"; 
import AuthModal from "./AuthModal"; 
>>>>>>> 421e4ada339fa417b8f051cfa442859455658a42

export default function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
<<<<<<< HEAD
  const [showDropdown, setShowDropdown] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  const supabase = createClientComponentClient();
  const inactivityTimer = useRef(null);
  const dropdownTimeout = useRef(null);
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  // ✅ Auto logout ONLY when user exists
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => handleLogout(), 5 * 60 * 1000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfilePic(null);
      return;
    }
  
    const fetchProfilePic = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_pic")
        .eq("id", user.id)
        .single();
  
      if (!error && data?.profile_pic) {
        setProfilePic(data.profile_pic);
      } else {
        setProfilePic(null);
      }
    };
  
    fetchProfilePic();
  }, [user, supabase]);
  

  const handleLogout = async () => {
    if (!user || isLoggingOut.current) return;

    isLoggingOut.current = true;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    await supabase.auth.signOut();
    setUser(null);
    alert("You’ve been logged out.");
    window.location.href = "/";
  };

  const handleLoginClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      alert("You are already logged in. Please logout first.");
      return;
    }
    setAuthModalOpen(true);
    setIsOpen(false);
  };

  const handleFacilitatorClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      alert("You are already logged in. Logout first to switch roles.");
      return;
    }
    setIsFacilitatorModalOpen(true);
    setIsOpen(false);
  };

  // Dropdown handlers
  const handleMouseEnter = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => setShowDropdown(false), 2000);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest("#user-dropdown")) setShowDropdown(false);
  };

  useEffect(() => {
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);
=======

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
>>>>>>> 421e4ada339fa417b8f051cfa442859455658a42

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Browse Qualifications", href: "/qualifications" },
  ];

  return (
    <nav className="flex justify-between items-center text-white relative">
<<<<<<< HEAD
      <div className="hidden md:flex items-center space-x-4 font-bold text-xl">
        <span>Fachs College LMS</span>
        {user && (
          <div className="flex items-center space-x-3 ml-4">
            <Link href="/dashboard"><LayoutDashboard size={24} /></Link>
            <Bell size={24} />
=======
      {/* Logo & User Info */}
      <div className="hidden md:flex items-center space-x-4 font-bold text-xl">
        <span>Fachs College LMS</span>

        {/* Dashboard icon */}
        <Link href="/dashboard" className="hover:text-yellow-400">
          <LayoutDashboard size={24} />
        </Link>

        {/* Bell icon */}
        <button className="hover:text-yellow-400">
          <Bell size={24} />
        </button>

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
          <div className="relative group">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="hover:text-yellow-400 flex items-center"
            >
              <User size={24} />
            </button>
            {/* Login label only on hover */}
            <div className="absolute right-0 mt-2 px-3 py-1 bg-white text-black text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity duration-200">
              Login
            </div>
>>>>>>> 421e4ada339fa417b8f051cfa442859455658a42
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center space-x-6">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href} className="hover:text-yellow-400">
            {item.name}
          </Link>
        ))}

        {!user ? (
          <>
            <button onClick={handleLoginClick} className="px-3 py-1 rounded-full bg-white text-red-800 font-bold">
              Sign In
            </button>
            <button onClick={handleFacilitatorClick} className="px-3 py-1 rounded-full bg-yellow-500 text-black">
              Not a Learner?
            </button>
          </>
        ) : (
          <div
            id="user-dropdown"
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button className="flex items-center space-x-2">
            {profilePic ? (
  <img
    src={profilePic}
    className="w-8 h-8 rounded-full object-cover"
  />
) : user.user_metadata?.avatar_url ? (
  <img
    src={user.user_metadata.avatar_url}
    className="w-8 h-8 rounded-full object-cover"
  />
) : (
  <User size={24} />
)}

<<<<<<< HEAD
              <span>{user.user_metadata?.full_name || user.email}</span>
            </button>
            <div className={`absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-lg
              ${showDropdown ? "opacity-100 visible" : "opacity-0 invisible"}`}>
              <div className="px-4 py-2 border-b">{user.email}</div>
              <button onClick={handleLogout} className="flex w-full px-4 py-2 hover:bg-gray-100">
                <LogOut size={18} className="mr-2" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>

      <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      <FacilitatorLoginModal isOpen={isFacilitatorModalOpen} onClose={() => setIsFacilitatorModalOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
=======
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
>>>>>>> 421e4ada339fa417b8f051cfa442859455658a42
    </nav>
  );
}
