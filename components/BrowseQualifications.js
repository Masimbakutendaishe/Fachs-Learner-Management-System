"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AuthModal from "./AuthModal";
import Portal from "./Portal";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../pages/context/AuthContext";

function normalizeProgramme(q) {
  return {
    id: q.id,
    institution_id: q.institution_id,
    title: q.name,
    nqf: `NQF Level ${q.nqf_level}`,
    image: q.image_url || "/dsk.jpg",
    description: q.description || "",
    credits: q.credits_total || 0,
    duration: q.duration || "TBA",
    facilitator: q.facilitator || "TBA",
    applicationDeadline: q.application_deadline || "TBA",
  };
}

export default function BrowseQualifications() {
  const [selected, setSelected] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useAuth();

  useEffect(() => {
    const fetchProgrammes = async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("name");

      if (error) console.error("Error fetching programmes:", error);
      else setProgrammes((data || []).map(normalizeProgramme));
      setLoading(false);
    };
    fetchProgrammes();
  }, []);

  useEffect(() => {
    if (router.query.selected) {
      const qual = programmes.find((q) => q.id === Number(router.query.selected));
      if (qual) setSelected(qual);
    }
  }, [router.query.selected, programmes]);

  const handleEnrollClick = async () => {
    if (sessionLoading) return;

    if (!sessionUser) {
      setAuthOpen(true);
      setAuthMode("signup");
      return;
    }

    if (!selected) return;

    const { data: existing } = await supabase
      .from("enrollments")
      .select("id, payment_status")
      .eq("user_id", sessionUser.id)
      .eq("programme_id", selected.id)
      .maybeSingle();

    let enrollmentId = existing?.id;

    if (existing?.payment_status === "paid") {
      alert("You're already enrolled and paid up for this programme.");
      return;
    }

    if (!enrollmentId) {
      const { data: created, error } = await supabase
        .from("enrollments")
        .insert([{
          user_id: sessionUser.id,
          programme_id: selected.id,
          institution_id: selected.institution_id,
          progress: 0,
          credits_earned: 0,
          credits_total: selected.credits || 0,
          payment_status: "failed",
          enrolled_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        alert("Could not start enrollment: " + error.message);
        return;
      }
      enrollmentId = created.id;
    }

    const res = await fetch("/api/create-enrollment-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || "Could not start payment");
  };

  const handleSelectQualificationAfterLogin = () => {
    setAuthOpen(false);
    if (selected) handleEnrollClick();
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">CATALOGUE</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>
        Browse Qualifications
      </h1>
      <p className="text-[var(--text-muted)] mb-8">
        Accredited programmes across our institutions. Select one for full details.
      </p>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] font-mono">Loading catalogue...</p>
      ) : programmes.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500">No qualifications available yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {programmes.map((q, i) => (
            <QualificationCard
              key={q.id}
              qualification={q}
              onSelect={() => setSelected(q)}
              delay={Math.min(i + 1, 4)}
            />
          ))}
        </div>
      )}

      {selected && (
        <QualificationModal
          qualification={selected}
          onClose={() => setSelected(null)}
          onEnroll={handleEnrollClick}
        />
      )}

      {authOpen && (
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          mode={authMode}
          setMode={setAuthMode}
          onSelectQualification={handleSelectQualificationAfterLogin}
        />
      )}
    </div>
  );
}

function QualificationCard({ qualification, onSelect, delay }) {
  return (
    <div
      onClick={onSelect}
      className={`paper overflow-hidden card-lift cursor-pointer animate-fade-up stagger-${delay}`}
    >
      <img
        src={qualification.image}
        alt={qualification.title}
        className="w-full h-36 object-cover"
      />
      <div className="p-5">
        <span
          className="inline-block text-xs font-mono px-2 py-1 rounded-full mb-2"
          style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}
        >
          {qualification.nqf}
        </span>
        <h3 className="font-display font-semibold text-base mb-1.5" style={{ color: "var(--text)" }}>
          {qualification.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2">{qualification.description}</p>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-400 font-mono">
          <span>{qualification.credits} credits</span>
          <span>{qualification.duration}</span>
        </div>
      </div>
    </div>
  );
}

function QualificationModal({ qualification, onClose, onEnroll }) {
  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8"
          style={{ background: "var(--paper)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>

          <span
            className="inline-block text-xs font-mono px-2 py-1 rounded-full mb-3"
            style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}
          >
            {qualification.nqf}
          </span>
          <h2 className="font-display text-2xl font-semibold mb-4" style={{ color: "var(--text)" }}>
            {qualification.title}
          </h2>

          <img
            src={qualification.image}
            alt={qualification.title}
            className="w-full h-56 object-cover rounded-xl mb-6"
          />

          <p className="text-sm text-gray-600 mb-6">{qualification.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-3 rounded-xl" style={{ background: "var(--paper-muted)" }}>
              <p className="text-xs text-gray-400 font-mono mb-1">CREDITS</p>
              <p className="font-medium" style={{ color: "var(--text)" }}>{qualification.credits}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--paper-muted)" }}>
              <p className="text-xs text-gray-400 font-mono mb-1">DURATION</p>
              <p className="font-medium" style={{ color: "var(--text)" }}>{qualification.duration}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--paper-muted)" }}>
              <p className="text-xs text-gray-400 font-mono mb-1">DEADLINE</p>
              <p className="font-medium" style={{ color: "var(--text)" }}>{qualification.applicationDeadline}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--paper-muted)" }}>
              <p className="text-xs text-gray-400 font-mono mb-1">FACILITATOR</p>
              <p className="font-medium" style={{ color: "var(--text)" }}>{qualification.facilitator}</p>
            </div>
          </div>

          <button
            onClick={onEnroll}
            className="w-full py-3 rounded-xl text-white font-medium transition-all hover:brightness-110"
            style={{ background: "var(--brand-color)" }}
          >
            Enroll Now
          </button>
        </div>
      </div>
    </Portal>
  );
}