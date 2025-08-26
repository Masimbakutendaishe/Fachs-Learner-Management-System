// pages/index.js
import { useState } from "react";
import Head from "next/head";
import Button from "../components/Button";
import AuthModal from "../components/AuthModal";
import ChatModal from "../components/ChatModal";
import CountUp from "react-countup";
import VisibilitySensor from "react-visibility-sensor";
export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openModal = (selectedMode) => {
    setMode(selectedMode);
    setIsOpen(true);
  };

  return (
    <div className="flex flex-col items-center w-full text-center relative">
      <Head>
        <title>Fachs College LMS – Your Learning Hub</title>
        <meta
          name="description"
          content="Explore Fachs College LMS: Access accredited qualifications, manage your modules, and experience AI-powered learning."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/collegelogo.png" />
        <link rel="apple-touch-icon" href="/collegelogo.png" />
        <meta property="og:title" content="Fachs College LMS" />
        <meta
          property="og:description"
          content="AI-enhanced learning, accredited qualifications, and a seamless student experience."
        />
        <meta property="og:image" content="/collegelogo.png" />
        <meta property="og:type" content="website" />
      </Head>
      {/* Fachs Logo */}
      <div className="mb-2">
         <img
          src="/collegelogo.png"
          alt="Fachs College Logo"
          className="w-20 -mt-10 md:-mt-20 mx-auto"
        />
      </div>

      <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
        Welcome to the Fachs College LMS
      </h1>
      <p className="text-xl -mt-2 mb-8 drop-shadow-md">
        Explore our qualifications, access your modules, and experience our AI help and live Teams sessions—all in one place!
      </p>

{/* Trigger Modal */}
<div className="space-x-4 -mt-5 mb-12">
  <Button
    className="bg-white border-2 border-red-800 text-red-800 font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-red-800 hover:border-white hover:text-white hover:scale-105 transition"
    onClick={() => openModal("signup")}
  >
    Get Started
  </Button>
  <Button
    className="bg-white border-2 border-red-800 text-red-800 font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-red-800 hover:border-white hover:text-white hover:scale-105 transition"
    onClick={() => openModal("signin")}
  >
    Sign In
  </Button>
</div>



      {/* Section container */}
      <div className="w-full max-w-5xl mx-auto mb-5 -mt-8 relative h-auto">
        {/* Original Section */}
        <div
          className={`grid md:grid-cols-2 gap-8 transition-all duration-700 ${
            isOpen
              ? "-translate-x-full opacity-0 scale-90 pointer-events-none"
              : "translate-x-0 opacity-100 scale-100"
          }`}
        >
          {/* Left: Qualifications */}
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold mb-4 drop-shadow-lg text-white">
              Top Qualifications This Year
            </h2>
            <ul className="space-y-4">
              {[
                "NQF Level 4: Municipal Financial Management (MFMP)",
                "NQF Level 5: Insurance",
                "NQF Level 6: Risk Management",
              ].map((course, idx) => (
                <li
                  key={idx}
                  className="p-6 bg-white bg-opacity-20 backdrop-blur-md rounded-xl shadow-lg transform transition duration-500 hover:scale-105 hover:rotate-2 hover:shadow-2xl cursor-pointer text-white"
                >
                  {course}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Testimonials */}
          <div className="relative bg-white bg-opacity-20 backdrop-blur-md rounded-xl shadow-2xl p-6 flex flex-col justify-center items-center text-white">
            <h2 className="text-2xl font-semibold mb-6 drop-shadow-lg">
              What Our Clients Say
            </h2>
            <div className="w-full">
              <div className="relative w-full overflow-hidden">
                <div className="flex flex-col items-center text-center space-y-4 animate-slide">
                  <img
                    src="/pg.jpg"
                    alt="Client 1"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white"
                  />
                  <p className="text-lg font-medium drop-shadow-lg">
                    "Fachs College LMS transformed our learning process!"
                  </p>
                  <span className="text-sm opacity-70">
                    - Sphiwe, Tshwane Municipality
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Modal slides in over the section */}
        <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} mode={mode} />
      </div>
<section className="w-full max-w-6xl mx-auto mt-5">
  <div className="backdrop-blur-md bg-white/10 rounded-3xl shadow-lg p-8">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">

      <div>
        <span className="text-4xl font-extrabold">
          <CountUp end={200} duration={2}>
            {({ countUpRef, start }) => (
              <VisibilitySensor onChange={start} delayedCall>
                <span>
                  <span ref={countUpRef} />+
                </span>
              </VisibilitySensor>
            )}
          </CountUp>
        </span>
        <p className="mt-2 text-lg">Qualifications</p>
      </div>

      <div>
        <span className="text-4xl font-extrabold">
          <CountUp end={50} duration={2}>
            {({ countUpRef, start }) => (
              <VisibilitySensor onChange={start} delayedCall>
                <span>
                  <span ref={countUpRef} />+
                </span>
              </VisibilitySensor>
            )}
          </CountUp>
        </span>
        <p className="mt-2 text-lg">Facilitators</p>
      </div>

      <div>
        <span className="text-4xl font-extrabold">QCTO</span>
        <p className="mt-2 text-lg">Accredited</p>
      </div>

      <div>
        <span className="text-4xl font-extrabold">SETA</span>
        <p className="mt-2 text-lg">Programmes</p>
      </div>

    </div>
  </div>
</section>



 
{/* Floating Chat Button */}
<button
  onClick={() => setIsChatOpen(true)}
  className="fixed bottom-6 left-6 z-40 md:z-50 bg-gradient-to-r from-red-700 to-red-900 text-white font-semibold px-4 md:px-5 py-2 md:py-3 rounded-full flex items-center space-x-2 hover:scale-105 hover:shadow-xl transition max-w-[90%] md:max-w-[300px]"
>
  {/* Chat Icon */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5 md:w-6 md:h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 8h10M7 12h4m1 8c-4.418 0-8-3.134-8-7s3.582-7 8-7 8 3.134 8 7c0 1.386-.39 2.685-1.07 3.77L21 20l-4.26-1.705A7.963 7.963 0 0113 20z"
    />
  </svg>

  {/* Shorten text on small screens */}
  <span className="hidden sm:inline">Ask Fachs AI</span>
  <span className="sm:hidden">Ask AI</span>
</button>




{/* Chat Modal */}
<ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

    </div>
  );
}
