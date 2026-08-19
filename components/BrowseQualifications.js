"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PaymentModal from "./PaymentModal";
import AuthModal from "./AuthModal";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../pages/context/AuthContext";

function normalizeProgramme(q) {
  return {
    id: q.id,
    institution_id: q.institution_id,
    title: q.name,
    nqf: `NQF Level ${q.nqf_level}`,
    image: q.image || "/dsk.jpg",
    description: q.description || "",
    credits: q.credits_total || 0,
    duration: q.duration || "TBA",
    facilitator: q.facilitator || "TBA",
    applicationDeadline: q.application_deadline || "TBA",
  };
}

export default function BrowseQualifications() {
  const [selected, setSelected] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [programmes, setProgrammes] = useState([]);

  const supabase = createClient();
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useAuth();

  // Fetch programmes
  useEffect(() => {
    const fetchProgrammes = async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("name");

      if (error) console.error("Error fetching programmes:", error);
      else setProgrammes((data || []).map(normalizeProgramme));
    };
    fetchProgrammes();
  }, []);

  // Open qualification via query param
  useEffect(() => {
    if (router.query.selected) {
      const qual = programmes.find((q) => q.id === Number(router.query.selected));
      if (qual) setSelected(qual);
    }
  }, [router.query.selected, programmes]);

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = selected || authOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selected, authOpen]);

  // ✅ FIXED ENROLL LOGIC (wait for sessionLoading)
  const handleEnrollClick = () => {
    if (sessionLoading) return; // do nothing until we know session state

    if (!sessionUser) {
      setAuthOpen(true);
      setAuthMode("signup");
    } else {
      setPaymentOpen(true);
    }
  };

  // Called after PaymentModal closes successfully
  const handleEnrollmentConfirmed = async () => {
    setPaymentOpen(false);

    if (!sessionUser || !selected) {
      console.warn("Enrollment attempt aborted: missing session user or selected qualification.");
      return;
    }

    try {
      const enrollmentPayload = {
        user_id: sessionUser.id,
        programme_id: selected.id,
        institution_id: selected.institution_id,
        progress: 0,
        credits_earned: 0,
        credits_total: selected.credits || 0,
        payment_status: "paid",
        enrolled_at: new Date().toISOString(),
      };


      console.log("Attempting to save enrollment with payload:", enrollmentPayload);

      const { data, error } = await supabase
        .from("enrollments")
        .insert([enrollmentPayload])
        .select();

      if (error) {
        console.error("Supabase returned an error while adding enrollment:", error);
        console.log("Enrollment payload that caused the error:", enrollmentPayload);
        alert("Failed to save enrollment. Check console for details.");
      } else if (data) {
        console.log("Enrollment successfully added:", data);
        alert(`Successfully enrolled in ${selected.title}!`);
      } else {
        console.warn("No error but no data returned from Supabase insert.");
      }
    } catch (err) {
      console.error("Unexpected error during enrollment:", err);
      console.log("Enrollment payload at time of error:", {
        user_id: sessionUser.id,
        programme_id: selected.id,
        progress: 0,
        credits_earned: 0,
        credits_total: selected.credits || 0,
        credits_remaining: selected.credits || 0,
        payment_status: "paid",
        enrolled_at: new Date().toISOString(),
      });
      alert("An unexpected error occurred. Check console for details.");
    }
  };

  const handleSelectQualificationAfterLogin = () => {
    setAuthOpen(false);
    if (selected) setPaymentOpen(true);
  };

  return (
    <div className="text-white px-4 py-8">
      <h2 className="text-3xl font-bold mb-4">Browse Qualifications</h2>
      <p className="text-lg mb-8">
        Explore our accredited qualifications. Hover for quick info or click for
        full details and enrollment.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {programmes.map((q) => (
          <QualificationCard
            key={q.id}
            qualification={q}
            onSelect={() => setSelected(q)}
          />
        ))}
      </div>

      {selected && !paymentOpen && (
        <QualificationModal
          qualification={selected}
          onClose={() => setSelected(null)}
          onEnroll={handleEnrollClick}
        />
      )}

      {paymentOpen && selected && sessionUser && (
        <PaymentModal
          isOpen={paymentOpen}
          onClose={handleEnrollmentConfirmed} // <-- updated callback
          programme={selected}
          userId={sessionUser.id}
          supabase={supabase}
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

// -------------------------
// COMPONENTS
// -------------------------

function QualificationCard({ qualification, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="relative group bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-xl p-6 transform transition duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer border border-white border-opacity-20"
    >
      <img
        src={qualification.image}
        alt={qualification.title}
        className="w-full h-40 object-cover rounded-lg mb-4"
      />
      <h3 className="text-xl font-bold mb-2">
        {qualification.title} ({qualification.nqf})
      </h3>
      <p className="line-clamp-2">{qualification.description}</p>
      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex flex-col justify-center items-center p-4 text-sm rounded-2xl">
        <p>Credits: {qualification.credits}</p>
        <p>Duration: {qualification.duration}</p>
        <p>Deadline: {qualification.applicationDeadline}</p>
        <p>Facilitator: {qualification.facilitator}</p>
        <p className="mt-2 text-xs">(Click for full details)</p>
      </div>
    </div>
  );
}

function QualificationModal({ qualification, onClose, onEnroll }) {
  return (
    <div
      id="modalOverlay"
      onClick={(e) => e.target.id === "modalOverlay" && onClose()}
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex justify-center items-start p-4 overflow-auto"
    >
      <div className="mt-12 bg-gradient-to-br from-white/90 to-gray-100/90 text-gray-900 rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] border border-gray-200 border-opacity-30 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-800 bg-gray-300 px-4 py-2 rounded-full hover:bg-gray-400 transition shadow-lg"
        >
          ✕
        </button>
        <h3 className="text-3xl font-extrabold mb-4 text-center">
          {qualification.title}
        </h3>
        <img
          src={qualification.image}
          alt={qualification.title}
          className="w-full h-64 object-cover rounded-xl mb-6 shadow-lg border border-gray-300"
        />
        <table className="w-full text-left mb-6 border-collapse">
          <tbody>
            <tr className="border-b border-gray-300">
              <th className="py-2 px-4 font-medium">NQF Level</th>
              <td className="py-2 px-4">{qualification.nqf}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50/50">
              <th className="py-2 px-4 font-medium">Credits</th>
              <td className="py-2 px-4">{qualification.credits}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <th className="py-2 px-4 font-medium">Duration</th>
              <td className="py-2 px-4">{qualification.duration}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50/50">
              <th className="py-2 px-4 font-medium">Deadline</th>
              <td className="py-2 px-4">{qualification.applicationDeadline}</td>
            </tr>
            <tr>
              <th className="py-2 px-4 font-medium">Facilitator</th>
              <td className="py-2 px-4">{qualification.facilitator}</td>
            </tr>
          </tbody>
        </table>
        <button
          onClick={onEnroll}
          className="mt-8 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition shadow-xl"
        >
          Enroll Now
        </button>
      </div>
    </div>
  );
}

