"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User, LogOut, LayoutDashboard, Bell } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
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

  // ✅ Only track inactivity when logged in
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
    alert("Logged out successfully.");
    window.location.href = "/";
  };

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

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto flex justify-between px-4 py-3">
        <span className="font-bold">Fachs LMS</span>

        {user && (
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
    alt="Profile"
    className="w-6 h-6 rounded-full object-cover"
  />
) : (
  <User size={24} />
)}

              <span>{user.email}</span>
            </button>
            <div className={`absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-lg
              ${showDropdown ? "opacity-100 visible" : "opacity-0 invisible"}`}>
              <button onClick={handleLogout} className="flex w-full px-4 py-2 hover:bg-gray-100">
                <LogOut size={18} className="mr-2" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
