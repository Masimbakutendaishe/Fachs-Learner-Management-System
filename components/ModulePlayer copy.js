"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./AuthModal";
import {
  MessageCircle,
  Video as VideoIcon,
  Cpu,
  Mic,
  MicOff,
  Video as Cam,
  VideoOff,
} from "lucide-react";

/* ---------- Header ---------- */
const UnitWeekIntro = ({ unitWeek }) => (
  <div className="p-6 bg-white shadow-lg rounded-lg mb-6 text-gray-900">
    <h1 className="text-3xl font-bold text-red-900">
      {unitWeek.unit_standard_title}
    </h1>
    <p className="text-gray-600 text-lg mt-2">
      Week: {new Date(unitWeek.week_start_date).toLocaleDateString()} –{" "}
      {new Date(unitWeek.week_end_date).toLocaleDateString()}
    </p>
  </div>
);

/* ---------- Link Card (kept) ---------- */
const ResourceCard = ({ label, url }) => {
  if (!url) return null;
  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mb-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 font-medium hover:underline"
      >
        {label}
      </a>
    </div>
  );
};

/* ---------- Teams Session ---------- */
const TeamsSession = ({ url, startDate, endDate }) => {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (camOn) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setHasPermission(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => setHasPermission(false));
    } else if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [camOn]);

  const dateStr = new Date(startDate).toLocaleDateString();
  const startTime = "09:00";
  const endTime = "10:00";
  const duration = "60 min";

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900 mb-4">
      <h2 className="text-2xl font-bold mb-2">Microsoft Teams Meeting</h2>
      <p className="text-gray-700 mb-1">{dateStr}</p>
      <p className="text-gray-500 mb-4">
        {startTime} – {endTime} • Duration: {duration}
      </p>

      <div className="w-full h-56 bg-gray-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {hasPermission && camOn ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-500">[ Camera Preview ]</span>
        )}
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setMicOn((v) => !v)}
          className={`px-4 py-2 rounded-full text-white shadow ${
            micOn ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          onClick={() => setCamOn((v) => !v)}
          className={`px-4 py-2 rounded-full text-white shadow ${
            camOn ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {camOn ? <Cam size={20} /> : <VideoOff size={20} />}
        </button>
      </div>

      <div className="flex justify-center">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          >
            Join Meeting
          </a>
        ) : (
          <p className="text-sm text-red-600">No Teams/Video link found.</p>
        )}
      </div>
    </div>
  );
};
/* ---------- Practical Evidence Upload ---------- */
const PracticalEvidenceUpload = ({ title, questions, onComplete }) => {
  const [step, setStep] = useState(0);
  const [uploads, setUploads] = useState({});

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setUploads((prev) => ({ ...prev, [step]: file }));
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900 mb-4">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      {questions?.length > 0 && (
        <>
          <p className="text-red-600 font-semibold mb-5">
            ⚠ Please upload your evidence for each question below.
          </p>

          <div className="p-4 border rounded-lg bg-gray-50">
            <p className="mb-3 font-medium">{questions[step]}</p>

            <input
              type="file"
              onChange={handleFileChange}
              className="mb-4"
            />
            {uploads[step] && (
              <p className="text-green-700 text-sm mb-4">
                Selected file: {uploads[step].name}
              </p>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>

              {step < questions.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => onComplete?.(uploads)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Submit Evidence
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-3 text-center">
            Question {step + 1} of {questions.length}
          </p>
        </>
      )}
    </div>
  );
};

/* ---------- Generic LearningResource ---------- */
const LearningResource = ({ title, url, questions, onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900 mb-4">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-3 px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
        >
          {title.includes("Assessment") ? "Open Assessment (PDF)" : `Download ${title}`}
        </a>
      ) : (
        <p className="text-sm text-red-600 mb-3">No {title} link available.</p>
      )}

      {questions?.length > 0 && (
        <>
          <p className="text-red-600 font-semibold mb-5">
            ⚠ Please read the {title.toLowerCase()} fully before answering below.
          </p>

          <div className="p-4 border rounded-lg bg-gray-50">
            <p className="mb-3 font-medium">{questions[step]}</p>
            <textarea
              className="w-full p-2 border rounded mb-4"
              value={answers[step] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [step]: e.target.value }))
              }
              placeholder="Type your answer here..."
            />

            <div className="flex justify-between">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>

              {step < questions.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => onComplete?.()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ---------- Learner Guide with Chapter Navigation ---------- */
const LearnerGuide = ({ title, url, chapters, onComplete }) => {
  const [currentChapter, setCurrentChapter] = useState(0);

  if (!chapters?.length) return <p className="text-red-600">No notes available.</p>;

  const chapter = chapters[currentChapter];

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900 mb-4">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-6 px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
        >
          Download PDF
        </a>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{chapter.title}</h3>
        <p className="text-gray-700 whitespace-pre-line">{chapter.content}</p>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentChapter((c) => c - 1)}
          disabled={currentChapter === 0}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous Chapter
        </button>

        {currentChapter < chapters.length - 1 ? (
          <button
            onClick={() => setCurrentChapter((c) => c + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-15"
          >
            Next Chapter
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mark as Read
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-3 text-center">
        Chapter {currentChapter + 1} of {chapters.length}
      </p>
    </div>
  );
};



/* ---------- ModulePlayer ---------- */
export default function ModulePlayer() {
  const [unitWeek, setUnitWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [completed, setCompleted] = useState({});

  const alwaysAccessible = [
    { key: "chat", label: "Chat with facilitators", icon: <MessageCircle size={24} /> },
    { key: "teams", label: "Join Teams Session", icon: <VideoIcon size={24} /> },
    { key: "ask_ai", label: "Ask Fachs AI", icon: <Cpu size={24} /> },
  ];

  useEffect(() => {
    async function fetchUnitWeek() {
      setLoading(true);
      try {
        let userId = getCurrentUserId();
        if (!userId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { setLoading(false); return; }
          userId = session.user.id;
        }

        const { data: enrollmentsData } = await supabase
          .from("enrollments")
          .select("programme_id")
          .eq("user_id", userId);

        if (!enrollmentsData?.length) { setLoading(false); return; }
        const programmeIds = enrollmentsData.map((e) => e.programme_id);

        const { data: unitWeeksData } = await supabase
          .from("unit_weeks")
          .select("*")
          .in("programme_id", programmeIds)
          .order("week_start_date", { ascending: true });

        const today = new Date();
        const currentWeek =
          unitWeeksData.find(
            (w) =>
              new Date(w.week_start_date) <= today &&
              new Date(w.week_end_date) >= today
          ) || unitWeeksData[0];

        setUnitWeek(currentWeek);
      } finally {
        setLoading(false);
      }
    }

    fetchUnitWeek();
  }, []);

  const handleComplete = (key) => {
    setCompleted((prev) => ({ ...prev, [key]: true }));
    setCurrentActivity(null);
  };

  if (loading) return <p className="p-8 text-gray-500">Loading module…</p>;
  if (!unitWeek) return <p className="p-8 text-gray-500">No module data found.</p>;

  const activities = [
    { key: "intro", label: "Facilitator Intro", url: null },
    { key: "teams", label: "Teams Session / Video", url: unitWeek.video_url || unitWeek.teams_session_link },
    { key: "guide", label: "Learner Guide", url: unitWeek.learner_guide_url },
    { key: "workbook", label: "Learner Workbook", url: unitWeek.learner_workbook_url },
    { key: "knowledge", label: "Knowledge Module", url: unitWeek.knowledge_module_url },
    { key: "summative", label: "Summative Assessment", url: unitWeek.summative_assessment_url },
    { key: "practical", label: "Practical Evidence Upload", url: unitWeek.practical_evidence_url },
    { key: "ai", label: "AI Help Panel", url: unitWeek.ai_help_doc_id },
    { key: "sor", label: "SOR Viewer", url: unitWeek.sor_pdf_url },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-800 text-white border-r p-4">
        <h2 className="text-xl font-bold mb-4">This Week’s Learning</h2>
        <h2 className="text-xs font-bold mb-2">{unitWeek.unit_standard_title}</h2>
        <ul>
          {activities.map((a) => (
            <li key={a.key} className="mb-2">
              <button
                onClick={() => setCurrentActivity(a.key)}
                className={`w-full text-left px-3 py-2 rounded transition-colors duration-200 ${
                  currentActivity === a.key
                    ? "bg-red-800 text-white font-semibold"
                    : "bg-gray-700 text-gray-200 hover:bg-red-900 hover:text-white"
                }`}
              >
                {a.label}
                {completed[a.key] && <span className="ml-2 text-red-700 font-bold">✔</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto h-full bg-gray-50">
        <UnitWeekIntro unitWeek={unitWeek} />

        {currentActivity === "intro" && (
          <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900 mb-4">
            <h2 className="text-2xl font-bold mb-2">Facilitator’s Intro</h2>
            <p>{unitWeek.facilitator_intro}</p>
            <button
              onClick={() => handleComplete("intro")}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Mark as Complete
            </button>
          </div>
        )}

        {currentActivity === "guide" && (
  <LearnerGuide
    title="Learner Guide"
    url={unitWeek.learner_guide_url}
    chapters={[
      { title: "Chapter 1: Introduction", content: "This chapter explains the overview and key concepts..." },
      { title: "Chapter 2: Core Principles", content: "Here we discuss the main ideas with examples..." },
      { title: "Chapter 3: Practical Applications", content: "This chapter shows how to apply the concepts in real scenarios..." },
      // add more chapters as needed
    ]}
    onComplete={() => handleComplete("guide")}
  />
)}


        {currentActivity === "teams" && (
          <>
            <TeamsSession url={unitWeek.video_url || unitWeek.teams_session_link} startDate={unitWeek.week_start_date} endDate={unitWeek.week_end_date} />
            <ResourceCard label="Open Teams / Video link" url={unitWeek.video_url || unitWeek.teams_session_link} />
          </>
        )}

        {["workbook","knowledge","summative"].includes(currentActivity) && (
          <LearningResource
            title={activities.find(a => a.key === currentActivity).label}
            url={activities.find(a => a.key === currentActivity).url}
            questions={[
              "1) Describe the key points.",
              "2) How will you apply this in practice?",
            ]}
            onComplete={() => handleComplete(currentActivity)}
          />
        )}

     {currentActivity === "practical" && (
  <PracticalEvidenceUpload
    title="Practical Evidence Upload"
    questions={[
      "Upload evidence for Question 1: Explain the process...",
      "Upload evidence for Question 2: Show screenshots of your setup...",
      "Upload evidence for Question 3: Provide files demonstrating results...",
      // add more questions as needed
    ]}
    onComplete={(uploads) => {
      console.log("Uploaded files:", uploads);
      handleComplete("practical");
    }}
  />
)}


        {currentActivity === "ai" && (
          <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900">
            <h2 className="text-2xl font-bold mb-2">AI Help Panel</h2>
            <p>Knowledge base: {unitWeek.ai_help_doc_id}</p>
          </div>
        )}

        {currentActivity === "sor" && (
          <div className="p-6 bg-white shadow-lg rounded-lg text-gray-900">
            <h2 className="text-2xl font-bold mb-2">Statement of Results (SOR)</h2>
            <a href={unitWeek.sor_pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View SOR PDF
            </a>
            {unitWeek.sor_qr_placeholder && <img src={unitWeek.sor_qr_placeholder} alt="QR placeholder" className="mt-4 w-32 h-32" />}
          </div>
        )}
      </main>

      {/* Always-accessible buttons */}
      <div className="fixed bottom-6 right-8 flex flex-col space-y-4 z-50">
        {alwaysAccessible.map((a) => (
          <div key={a.key} className="group relative">
            <button
              onClick={() => setCurrentActivity(a.key)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg text-2xl transition-transform duration-300 hover:scale-110 hover:bg-white/40"
            >
              {a.icon}
            </button>
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/70 text-gray-800 text-sm font-semibold px-3 py-1 rounded shadow-lg whitespace-nowrap">
              {a.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
