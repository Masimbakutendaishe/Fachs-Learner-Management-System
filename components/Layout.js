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
      institution?.theme_color || "#2F5FE0"
    );
  }, [institution]);

  return (
    <div className="min-h-screen" style={{ background: "var(--shell)" }}>
      <div className="sticky top-0 z-40 border-b" style={{ borderColor: "var(--border-soft)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
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