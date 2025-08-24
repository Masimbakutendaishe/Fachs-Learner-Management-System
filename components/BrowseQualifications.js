"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PaymentModal from "./PaymentModal";
import AuthModal, { getCurrentUserId } from "./AuthModal";
import { supabase } from "@/lib/supabase"; // ensure this points to your proper client

const hardcodedQualifications = [
  {
    id: 1,
    title: "Certificate in Municipal Financial Management",
    nqf: "NQF Level 6",
    image: "/mf.jpg",
    description: "This qualification equips learners with the skills to manage municipal finances effectively, ensuring compliance with PFMA and MFMA regulations.",
    credits: 240,
    duration: "12 months",
    facilitator: "Dr. Thandi Nkosi",
    applicationDeadline: "30 Sept 2025",
    modules: ["Public Finance", "Municipal Budgeting", "Financial Reporting"],
    practicals: ["Case studies", "Municipal finance simulations"],
    unitStandards: ["119335 - Conduct and apply statistical analyses", "116358 - Apply financial management principles"],
    prerequisites: ["Matric certificate", "Basic accounting knowledge"],
    learningOutcomes: ["Prepare municipal budgets", "Analyse financial statements", "Ensure compliance with financial regulations"],
    assessmentMethods: ["Written assignments", "Practical simulations", "Exams"],
  },
  {
    id: 2,
    title: "National Certificate in Insurance",
    nqf: "NQF Level 3",
    image: "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=800&q=80",
    description: "Prepares learners for careers in the insurance industry with practical knowledge of underwriting, claims, and client relations.",
    credits: 120,
    duration: "6 months",
    facilitator: "Mr. Sipho Dlamini",
    applicationDeadline: "15 Oct 2025",
    modules: ["Insurance Principles", "Claims Processing", "Customer Care"],
    practicals: ["Roleplay exercises", "Policy simulations"],
    unitStandards: ["117129 - Explain insurance principles", "114983 - Handle customer queries"],
    prerequisites: ["Grade 10 or equivalent"],
    learningOutcomes: ["Understand insurance products", "Process claims accurately", "Provide excellent client service"],
    assessmentMethods: ["Quizzes", "Practical roleplays", "Final exam"],
  },
];

export default function BrowseQualifications() {
  const [selected, setSelected] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [programmes, setProgrammes] = useState([]);

  const router = useRouter();

  // Fetch programmes from Supabase
  useEffect(() => {
    const fetchProgrammes = async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("name");

      if (error) console.error("Error fetching programmes:", error);
      else setProgrammes(data || []);
    };
    fetchProgrammes();
  }, []);

  // Open selected qualification from query param
  useEffect(() => {
    if (router.query.selected) {
      const qual = hardcodedQualifications.concat(programmes).find(
        (q) => q.id === Number(router.query.selected)
      );
      if (qual) setSelected(qual);
    }
  }, [router.query.selected, programmes]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = selected || authOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selected, authOpen]);

  const handleEnrollClick = () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setAuthOpen(true);
      setAuthMode("signup");
      return;
    }
    setPaymentOpen(true);
  };

  const handleSelectQualificationAfterLogin = () => {
    setAuthOpen(false);
    if (selected) setPaymentOpen(true);
  };

  return (
    <div className="text-white px-4 py-8">
      <h2 className="text-3xl font-bold mb-4">Browse Qualifications</h2>
      <p className="text-lg mb-8">
        Explore our accredited qualifications. Hover for quick info or click for full details and enrollment.
      </p>

      {/* Hardcoded qualifications at top */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {hardcodedQualifications.map((q) => (
          <QualificationCard key={q.id} qualification={q} onSelect={() => setSelected(q)} />
        ))}
      </div>

      {/* Supabase programmes below */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {programmes.map((q) => (
          <QualificationCard
            key={q.id}
            qualification={{
              id: q.id,
              title: q.name,
              nqf: `NQF Level ${q.nqf_level}`,
              image: q.image || "/dsk.jpg",
              description: q.description || "",
              credits: q.credits_total || 0,
              duration: q.duration || "TBA",
              facilitator: q.facilitator || "TBA",
              applicationDeadline: q.application_deadline || "TBA",
            }}
            onSelect={() => setSelected(q)}
          />
        ))}
      </div>

      {/* Modals */}
      {selected && !paymentOpen && (
        <QualificationModal
          qualification={selected}
          onClose={() => setSelected(null)}
          onEnroll={handleEnrollClick}
        />
      )}

      {paymentOpen && selected && (
        <PaymentModal
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          programme={selected}
          userId={getCurrentUserId()}
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

// Individual card component
function QualificationCard({ qualification, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="relative group bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-xl p-6 transform transition duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer border border-white border-opacity-20"
    >
      <img src={qualification.image} alt={qualification.title} className="w-full h-40 object-cover rounded-lg mb-4" />
      <h3 className="text-xl font-bold mb-2">{qualification.title} ({qualification.nqf})</h3>
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

// Modal for qualification details
function QualificationModal({ qualification, onClose, onEnroll }) {
  return (
    <div
      id="modalOverlay"
      onClick={(e) => e.target.id === "modalOverlay" && onClose()}
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md flex justify-center items-start p-4 overflow-auto"
    >
      <div className="mt-12 bg-gradient-to-br from-white/90 to-gray-100/90 text-gray-900 rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] border border-gray-200 border-opacity-30 backdrop-blur-sm">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-800 bg-gray-300 px-4 py-2 rounded-full hover:bg-gray-400 transition shadow-lg">✕</button>
        <h3 className="text-3xl font-extrabold mb-4 text-center">{qualification.title}</h3>
        <img src={qualification.image} alt={qualification.title} className="w-full h-64 object-cover rounded-xl mb-6 shadow-lg border border-gray-300" />
        <table className="w-full text-left mb-6 border-collapse">
          <tbody>
            <tr className="border-b border-gray-300"><th className="py-2 px-4 font-medium">NQF Level</th><td className="py-2 px-4">{qualification.nqf}</td></tr>
            <tr className="border-b border-gray-300 bg-gray-50/50"><th className="py-2 px-4 font-medium">Credits</th><td className="py-2 px-4">{qualification.credits}</td></tr>
            <tr className="border-b border-gray-300"><th className="py-2 px-4 font-medium">Duration</th><td className="py-2 px-4">{qualification.duration}</td></tr>
            <tr className="border-b border-gray-300 bg-gray-50/50"><th className="py-2 px-4 font-medium">Deadline</th><td className="py-2 px-4">{qualification.applicationDeadline}</td></tr>
            <tr><th className="py-2 px-4 font-medium">Facilitator</th><td className="py-2 px-4">{qualification.facilitator}</td></tr>
          </tbody>
        </table>
        <button onClick={onEnroll} className="mt-8 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition shadow-xl">
          Enroll Now
        </button>
      </div>
    </div>
  );
}
