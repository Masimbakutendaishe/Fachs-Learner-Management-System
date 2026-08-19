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
      alert("You're already signed in. Sign out first to switch accounts.");
      return;
    }
    setAuthModalOpen(true);
    setIsOpen(false);
  };

  const handleFacilitatorClick = () => {
    if (isAuthenticated) {
      alert("You're already signed in. Sign out first to switch accounts.");
      return;
    }
    setIsFacilitatorModalOpen(true);
    setIsOpen(false);
  };

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Qualifications", href: "/qualifications" },
  ];

  return (
    <nav className="flex justify-between items-center h-16 relative" style={{ color: "var(--text)" }}>
      <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg tracking-tight">
        {institution?.logo_url ? (
          <img src={institution.logo_url} alt={institution.name} className="h-8 w-auto object-contain" />
        ) : (
          <span>{institution?.name || "Fachs LMS"}</span>
        )}
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href} className="text-sm text-[var(--text-muted)] hover:text-white transition-colors">
            {item.name}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3">
        {isAuthenticated && (
          <>
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <LayoutDashboard size={18} className="text-[var(--text-muted)]" />
            </Link>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Bell size={18} className="text-[var(--text-muted)]" />
            </button>
          </>
        )}

        {!isAuthenticated ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleFacilitatorClick}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Institutions & Staff
            </button>
            <button
              onClick={handleLoginClick}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
              style={{ background: "var(--brand-color)" }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-black/5 transition-colors">
              {profile?.profile_pic ? (
                <img src={profile.profile_pic} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                  <User size={14} className="text-[var(--text-muted)]" />
                </div>
              )}
              <span className="text-sm font-medium">{displayName}</span>
            </button>
            <div
              className={`absolute right-0 mt-2 w-60 rounded-xl shadow-2xl border overflow-hidden transition-all duration-200 ${
                showDropdown ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"
              }`}
              style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-soft)" }}>
                <p className="text-sm text-white truncate">{user?.email}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize font-mono mt-0.5">{profile?.role?.replace("_", " ")}</p>
              </div>
              {profile?.role === "institution_admin" && (
                <>
                  <Link href="/admin/institution-settings" className="block px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors">
                    Institution Settings
                  </Link>
                  <Link href="/admin/billing" className="block px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors">
                    Billing
                  </Link>
                </>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors text-left"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 md:hidden border-t rounded-b-2xl shadow-2xl p-4 space-y-1 z-50"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
            >
              {item.name}
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors">
                Dashboard
              </Link>
              <button onClick={signOut} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-white/5 transition-colors text-left">
                <LogOut size={15} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={handleLoginClick} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--brand-color)" }}>
                Sign In
              </button>
              <button onClick={handleFacilitatorClick} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors">
                Institutions & Staff
              </button>
            </>
          )}
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