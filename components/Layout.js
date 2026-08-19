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
      institution?.theme_color || "#7f1d1d"
    );
  }, [institution]);
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 px-4 overflow-hidden">
      <div className="mt-2 relative w-[95vw] h-[95vh] bg-gradient-to-br from-blue-900 via-red-900 to-blue-700 shadow-2xl flex flex-col rounded-3xl overflow-hidden">
        <div className="flex flex-col flex-grow overflow-y-auto overscroll-contain">
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                        w-48 h-12 bg-gray-100 rounded-b-3xl shadow-md z-20"
          ></div>

          <div className="p-6 z-30 relative">
            <MobileNavbar />
          </div>

          <div className="flex-grow w-full px-6 md:px-12 py-8 z-10 text-white">
            {children}
          </div>

          <div className="p-6 z-20">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}