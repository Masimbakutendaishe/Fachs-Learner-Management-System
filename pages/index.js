import { useState, useEffect } from "react";
import Head from "next/head";
import Button from "../components/Button";
import AuthModal from "../components/AuthModal";
import ChatModal from "../components/ChatModal";
import CountUp from "react-countup";
import VisibilitySensor from "react-visibility-sensor";
import { createClient } from "../lib/supabase/client";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  const supabase = createClient();

  const openModal = (selectedMode) => {
    setMode(selectedMode);
    setIsOpen(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  return (
    <div
      className="w-full"
      style={{
        backgroundImage: `linear-gradient(rgba(244,244,245,0.88), rgba(244,244,245,0.88)), url('/lmsimg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        marginTop: "-2rem",
        marginBottom: "-2rem",
        width: "100vw",
        paddingLeft: "calc(50vw - 50%)",
        paddingRight: "calc(50vw - 50%)",
        paddingTop: "2rem",
        paddingBottom: "2rem",
        position: "relative",
        zIndex: 0,
      }}
    >
      <Head>
        <title>Fachs LMS – Learning Platform for Institutions</title>
        <meta
          name="description"
          content="Explore Fachs LMS: accredited qualifications, live sessions, and a learning platform built for training providers and schools."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/collegelogo.png" />
        <link rel="apple-touch-icon" href="/collegelogo.png" />
        <meta property="og:title" content="Fachs LMS" />
        <meta property="og:description" content="A learning platform built for training providers and schools." />
        <meta property="og:image" content="/collegelogo.png" />
        <meta property="og:type" content="website" />
      </Head>

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-8 pb-16 animate-fade-up">
        <p className="text-xs font-mono tracking-wide text-[var(--text-muted)] mb-4">
          MULTI-INSTITUTION LEARNING PLATFORM
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4" style={{ color: "var(--text)" }}>
          Learning, built for how your institution actually runs
        </h1>
        <p className="text-lg text-[var(--text-muted)] mb-8">
          Qualifications, live sessions, assessments, and progress, all in one place.
          Built for training providers and schools alike.
        </p>

        {!sessionUser && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <Button
              className="btn-silver font-medium px-6 py-3 rounded-xl transition-all hover:brightness-110"
              onClick={() => openModal("signup")}
            >
              Get Started
            </Button>
            <Button
              className="bg-white border font-medium px-6 py-3 rounded-xl transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              onClick={() => openModal("signin")}
            >
              Sign In
            </Button>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--seal-gold)" }} />
          QCTO & SETA Accredited Programmes
        </div>

        <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} mode={mode} />
      </section>

      {/* Qualifications + Testimonial */}
      <section className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
        <div className="paper p-6 card-lift animate-fade-up stagger-1">
          <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>
            Top Qualifications This Year
          </h2>
          <ul className="space-y-3">
            {[
              "NQF Level 4: Municipal Financial Management (MFMP)",
              "NQF Level 5: Insurance",
              "NQF Level 6: Risk Management",
            ].map((course, idx) => (
              <li
                key={idx}
                className="p-4 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50 cursor-pointer"
                style={{ background: "var(--paper-muted)", color: "var(--text)" }}
              >
                {course}
              </li>
            ))}
          </ul>
        </div>

        <div className="paper p-6 card-lift flex flex-col justify-center items-center text-center animate-fade-up stagger-2">
          <h2 className="font-display text-xl font-semibold mb-6" style={{ color: "var(--text)" }}>
            What Our Clients Say
          </h2>
          <img
            src="/pg.jpg"
            alt="Client"
            className="w-16 h-16 rounded-full object-cover mb-4"
            style={{ border: "2px solid var(--seal-gold)" }}
          />
          <p className="text-base font-medium mb-2" style={{ color: "var(--text)" }}>
            "Fachs LMS transformed our learning process!"
          </p>
          <span className="text-sm text-[var(--text-muted)]">— Sphiwe, Tshwane Municipality</span>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto mb-16">
        <div className="paper p-8 animate-fade-up stagger-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--brand-color)" }}>
                <CountUp end={200} duration={2}>
                  {({ countUpRef, start }) => (
                    <VisibilitySensor onChange={start} delayedCall>
                      <span><span ref={countUpRef} />+</span>
                    </VisibilitySensor>
                  )}
                </CountUp>
              </span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Qualifications</p>
            </div>

            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--brand-color)" }}>
                <CountUp end={50} duration={2}>
                  {({ countUpRef, start }) => (
                    <VisibilitySensor onChange={start} delayedCall>
                      <span><span ref={countUpRef} />+</span>
                    </VisibilitySensor>
                  )}
                </CountUp>
              </span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Facilitators</p>
            </div>

            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--seal-gold)" }}>QCTO</span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Accredited</p>
            </div>

            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--seal-gold)" }}>SETA</span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Programmes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="btn-silver fixed bottom-6 left-6 z-40 md:z-50 font-medium px-4 md:px-5 py-2 md:py-3 rounded-full flex items-center space-x-2 shadow-lg hover:scale-105 hover:shadow-xl transition max-w-[90%] md:max-w-[300px]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8c-4.418 0-8-3.134-8-7s3.582-7 8-7 8 3.134 8 7c0 1.386-.39 2.685-1.07 3.77L21 20l-4.26-1.705A7.963 7.963 0 0113 20z" />
        </svg>
        <span className="hidden sm:inline">Ask Fachs AI</span>
        <span className="sm:hidden">Ask AI</span>
      </button>

      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}