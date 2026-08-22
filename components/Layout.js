"use client";

import { useEffect } from "react";
import MobileNavbar from "./MobileNavbar";
import Footer from "./Footer";
import { useAuth } from "../pages/context/AuthContext";

export default function Layout({ children }) {
  const { institution } = useAuth();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--brand-color",
      institution?.theme_color || "#52525B"
    );
  }, [institution]);

  return (
    <div className="min-h-screen" style={{ background: "transparent" }}>
      <div
        className="sticky top-0 z-40 border-b"
        style={{ borderColor: "var(--border-soft)", "--text": "#FFFFFF", "--text-muted": "rgba(255,255,255,0.8)" }}
      >
        <div className="navbar-silver-bg" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 relative" style={{ zIndex: 1 }}>
          <MobileNavbar />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}