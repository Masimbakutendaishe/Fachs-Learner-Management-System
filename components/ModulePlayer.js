"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../pages/context/AuthContext";
import SealProgress from "./SealProgress";
import { MessageCircle, Video as VideoIcon, Cpu, Mic, MicOff, Video as Cam, VideoOff } from "lucide-react";

function LinkButton({ href, children, variant = "solid" }) {
  if (!href) return null;
  const style = variant === "solid" ? { background: "var(--brand-color)", color: "white" } : { color: "var(--brand-color)" };
  const cls = variant === "solid" ? "inline-block px-4 py-2 rounded-lg text-sm font-medium" : "font-medium hover:underline";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>
      {children}
    </a>
  );
}

const UnitWeekIntro = ({ unitWeek, programmeName }) => (
  <div className="paper p-6 mb-6">
    <p className="text-xs font-mono text-[var(--text-muted)] mb-1">{programmeName}</p>
    <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--text)" }}>
      {unitWeek?.unit_standard_title || "No unit title yet"}
    </h1>
    {unitWeek?.week_start_date && unitWeek?.week_end_date && (
      <p className="text-gray-500 text-sm mt-2 font-mono">
        {new Date(unitWeek.week_start_date).toLocaleDateString()} to {new Date(unitWeek.week_end_date).toLocaleDateString()}
      </p>
    )}
  </div>
);

const ResourceCard = ({ label, url }) => {
  if (!url) return null;
  return (
    <div className="paper p-5 mb-4">
      <LinkButton href={url} variant="link">{label}</LinkButton>
    </div>
  );
};

const TeamsSession = ({ url, startDate }) => {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (camOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setHasPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch(() => setHasPermission(false));
    } else if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [camOn]);

  const dateStr = startDate ? new Date(startDate).toLocaleDateString() : "N/A";

  return (
    <div className="paper p-6 mb-4">
      <h2 className="font-display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Microsoft Teams Meeting</h2>
      <p className="text-sm text-gray-500 mb-4 font-mono">{dateStr}</p>
      <div className="w-full h-56 rounded-xl mb-4 flex items-center justify-center overflow-hidden" style={{ background: "var(--paper-muted)" }}>
        {hasPermission && camOn ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">Camera preview</span>
        )}
      </div>
      <div className="flex justify-center gap-3 mb-6">
        <button onClick={() => setMicOn((v) => !v)} className={`px-4 py-2 rounded-full text-white shadow transition-colors ${micOn ? "bg-emerald-600" : "bg-red-500"}`}>
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button onClick={() => setCamOn((v) => !v)} className={`px-4 py-2 rounded-full text-white shadow transition-colors ${camOn ? "bg-emerald-600" : "bg-red-500"}`}>
          {camOn ? <Cam size={18} /> : <VideoOff size={18} />}
        </button>
      </div>
      <div className="flex justify-center">
        {url ? <LinkButton href={url}>Join Meeting</LinkButton> : <p className="text-sm text-gray-400">No Teams/video link set for this week yet.</p>}
      </div>
    </div>
  );
};

const PracticalEvidenceUpload = ({ title, questions, onComplete, enrollment, unitWeek }) => {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [uploads, setUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setUploads((prev) => ({ ...prev, [step]: file }));
  };

  const handleSubmitEvidence = async () => {
    setSubmitting(true);
    try {
      const file = uploads[0];
      let fileUrl = null;
      if (file) {
        const path = `${enrollment.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("submissions").upload(path, file);
        if (uploadError) throw uploadError;
        fileUrl = path;
      }
      const { error } = await supabase.from("submissions").insert({
        enrollment_id: enrollment.id,
        user_id: enrollment.user_id,
        programme_id: enrollment.programme_id,
        institution_id: enrollment.institution_id,
        unit_week_id: unitWeek?.id,
        activity_type: "practical",
        file_url: fileUrl,
      });
      if (error) throw error;
      onComplete?.(uploads);
    } catch (err) {
      alert("Could not save submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="paper p-6 mb-4">
      <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>{title}</h2>
      {questions?.length > 0 && (
        <>
          <p className="text-xs font-mono text-[var(--seal-gold)] mb-4">Upload your evidence for each question below</p>
          <div className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
            <p className="mb-3 text-sm font-medium" style={{ color: "var(--text)" }}>{questions[step]}</p>
            <input type="file" onChange={handleFileChange} className="mb-3 text-sm text-gray-500" />
            {uploads[step] && <p className="text-emerald-600 text-xs mb-4">Selected: {uploads[step].name}</p>}
            <div className="flex justify-between">
              <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
              {step < questions.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next</button>
              ) : (
                <button onClick={handleSubmitEvidence} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Submitting..." : "Submit Evidence"}</button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center font-mono">Question {step + 1} of {questions.length}</p>
        </>
      )}
    </div>
  );
};

const LearningResource = ({ title, url, questions, onComplete, activityType, enrollment, unitWeek }) => {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitAnswers = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("submissions").insert({
        enrollment_id: enrollment.id,
        user_id: enrollment.user_id,
        programme_id: enrollment.programme_id,
        institution_id: enrollment.institution_id,
        unit_week_id: unitWeek?.id,
        activity_type: activityType,
        answers,
      });
      if (error) throw error;
      onComplete?.();
    } catch (err) {
      alert("Could not save submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="paper p-6 mb-4">
      <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>{title}</h2>
      {url ? (
        <LinkButton href={url}>{title?.includes("Assessment") ? "Open Assessment (PDF)" : `Download ${title}`}</LinkButton>
      ) : (
        <p className="text-sm text-gray-400 mb-4">No {title} link available yet.</p>
      )}
      {questions?.length > 0 && (
        <>
          <p className="text-xs font-mono text-[var(--seal-gold)] mb-4">Read the material fully before answering below</p>
          <div className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
            <p className="mb-3 text-sm font-medium" style={{ color: "var(--text)" }}>{questions[step]}</p>
            <textarea className="w-full p-3 rounded-lg border text-sm mb-4" style={{ borderColor: "var(--border-soft)" }} value={answers[step] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [step]: e.target.value }))} placeholder="Type your answer here..." rows={4} />
            <div className="flex justify-between">
              <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
              {step < questions.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next</button>
              ) : (
                <button onClick={handleSubmitAnswers} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Submitting..." : "Submit"}</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const LearnerGuide = ({ title, url, chapters, onComplete }) => {
  const [currentChapter, setCurrentChapter] = useState(0);
  if (!chapters?.length) return <p className="text-sm text-gray-400">No notes available.</p>;
  const chapter = chapters[currentChapter];
  return (
    <div className="paper p-6 mb-4">
      <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>{title}</h2>
      {url && <LinkButton href={url}>Download PDF</LinkButton>}
      <div className="mb-5 mt-4">
        <h3 className="font-medium mb-2" style={{ color: "var(--text)" }}>{chapter.title}</h3>
        <p className="text-sm text-gray-600 whitespace-pre-line">{chapter.content}</p>
      </div>
      <div className="flex justify-between items-center">
        <button onClick={() => setCurrentChapter((c) => c - 1)} disabled={currentChapter === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
        {currentChapter < chapters.length - 1 ? (
          <button onClick={() => setCurrentChapter((c) => c + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next Chapter</button>
        ) : (
          <button onClick={onComplete} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500">Mark as Read</button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center font-mono">Chapter {currentChapter + 1} of {chapters.length}</p>
    </div>
  );
};

export default function ModulePlayer({ enrollmentId }) {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState(null);
  const [unitWeek, setUnitWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [completed, setCompleted] = useState({});

  const alwaysAccessible = [
    { key: "chat", label: "Chat with facilitators", icon: <MessageCircle size={20} /> },
    { key: "teams", label: "Join Teams Session", icon: <VideoIcon size={20} /> },
    { key: "ai", label: "Ask Fachs AI", icon: <Cpu size={20} /> },
  ];

  useEffect(() => {
    async function fetchData() {
      if (!enrollmentId) return;
      setLoading(true);
      try {
        let userId = user?.id;
        if (!userId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { router.push("/auth/signin"); return; }
          userId = session.user.id;
        }
        const { data: enrollmentData, error: enrollErr } = await supabase
          .from("enrollments")
          .select("id, progress, credits_earned, credits_total, programme_id, user_id, institution_id, programmes ( id, name )")
          .eq("id", enrollmentId)
          .single();
        if (enrollErr || !enrollmentData || enrollmentData.user_id !== userId) {
          setEnrollment(null);
          setLoading(false);
          return;
        }
        setEnrollment(enrollmentData);
        const { data: unitWeeksData } = await supabase
          .from("unit_weeks")
          .select("*")
          .eq("programme_id", enrollmentData.programme_id)
          .order("week_start_date", { ascending: true });
        const weeksArray = unitWeeksData || [];
        const today = new Date();
        const currentWeek = weeksArray.find((w) => w.week_start_date && w.week_end_date && new Date(w.week_start_date) <= today && new Date(w.week_end_date) >= today) || weeksArray[0] || null;
        setUnitWeek(currentWeek);
      } catch (err) {
        console.error("Error loading module:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [enrollmentId]);

  const handleComplete = (key) => {
    setCompleted((prev) => ({ ...prev, [key]: true }));
    setCurrentActivity(null);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading module...</p>;

  if (!enrollment) {
    return (
      <div className="paper p-8 text-center">
        <p className="text-gray-500 text-sm">This enrollment could not be found, or you do not have access to it.</p>
      </div>
    );
  }

  if (!unitWeek) {
    return (
      <div className="animate-fade-up">
        <UnitWeekIntro unitWeek={null} programmeName={enrollment.programmes?.name} />
        <div className="paper p-8 text-center text-gray-500 text-sm">No module content has been published for this programme yet, check back soon.</div>
      </div>
    );
  }

  const activities = [
    { key: "intro", label: "Facilitator Intro" },
    { key: "teams", label: "Teams Session / Video" },
    { key: "guide", label: "Learner Guide" },
    { key: "workbook", label: "Learner Workbook" },
    { key: "knowledge", label: "Knowledge Module" },
    { key: "summative", label: "Summative Assessment" },
    { key: "practical", label: "Practical Evidence Upload" },
    { key: "ai", label: "AI Help Panel" },
    { key: "sor", label: "SOR Viewer" },
  ];

  const progressPercent = enrollment.credits_total ? Math.min(100, Math.round(((enrollment.credits_earned || 0) / enrollment.credits_total) * 100)) : 0;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono text-[var(--text-muted)]">MODULE PLAYER</p>
        <SealProgress percent={progressPercent} size={44} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="paper p-4 h-fit lg:sticky lg:top-24">
          <p className="text-xs font-mono text-gray-400 mb-3 px-1">THIS WEEK</p>
          <ul className="space-y-1">
            {activities.map((a) => (
              <li key={a.key}>
                <button onClick={() => setCurrentActivity(a.key)} className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between" style={currentActivity === a.key ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text)" }}>
                  <span className={currentActivity === a.key ? "" : "hover:opacity-70"}>{a.label}</span>
                  {completed[a.key] && <span style={{ color: currentActivity === a.key ? "white" : "var(--seal-gold)" }}>done</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="lg:hidden -mt-2">
          <select className="w-full p-3 rounded-xl border text-sm" style={{ borderColor: "var(--border-soft)" }} value={currentActivity || ""} onChange={(e) => setCurrentActivity(e.target.value)}>
            <option value="">Select activity...</option>
            {activities.map((a) => <option key={a.key} value={a.key}>{a.label}{completed[a.key] ? " (done)" : ""}</option>)}
          </select>
        </div>
        <main>
          <UnitWeekIntro unitWeek={unitWeek} programmeName={enrollment.programmes?.name} />
          {currentActivity === "intro" && (
            <div className="paper p-6 mb-4">
              <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Facilitator's Intro</h2>
              <p className="text-sm text-gray-600 mb-4">{unitWeek.facilitator_intro || "No intro provided for this week yet."}</p>
              <button onClick={() => handleComplete("intro")} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500">Mark as Complete</button>
            </div>
          )}
          {currentActivity === "guide" && (
            <LearnerGuide title="Learner Guide" url={unitWeek.learner_guide_url} chapters={unitWeek.chapters || [{ title: "Chapter 1: Intro", content: "No content yet." }]} onComplete={() => handleComplete("guide")} />
          )}
          {currentActivity === "teams" && (
            <>
              <TeamsSession url={unitWeek.video_url || unitWeek.teams_session_link} startDate={unitWeek.week_start_date} />
              <ResourceCard label="Open Teams / Video link" url={unitWeek.video_url || unitWeek.teams_session_link} />
            </>
          )}
          {["workbook", "knowledge", "summative"].includes(currentActivity) && (
            <LearningResource
              title={activities.find((a) => a.key === currentActivity)?.label}
              url={unitWeek[`${currentActivity === "workbook" ? "learner_workbook" : currentActivity === "knowledge" ? "knowledge_module" : "summative_assessment"}_url`]}
              questions={["1) Describe the key points.", "2) How will you apply this in practice?"]}
              activityType={currentActivity}
              enrollment={enrollment}
              unitWeek={unitWeek}
              onComplete={() => handleComplete(currentActivity)}
            />
          )}
          {currentActivity === "practical" && (
            <PracticalEvidenceUpload title="Practical Evidence Upload" questions={["Upload evidence for Question 1", "Upload evidence for Question 2"]} enrollment={enrollment} unitWeek={unitWeek} onComplete={() => handleComplete("practical")} />
          )}
          {currentActivity === "ai" && (
            <div className="paper p-6">
              <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>AI Help Panel</h2>
              <p className="text-sm text-gray-500">Ask Fachs AI questions about this week's content.</p>
            </div>
          )}
          {currentActivity === "sor" && (
            <div className="paper p-6">
              <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Statement of Results</h2>
              {unitWeek.sor_pdf_url ? <LinkButton href={unitWeek.sor_pdf_url} variant="link">View SOR PDF</LinkButton> : <p className="text-sm text-gray-400">No SOR document available yet.</p>}
            </div>
          )}
          {!currentActivity && (
            <div className="paper p-8 text-center text-gray-500 text-sm">Select an activity from the sidebar or dropdown to get started.</div>
          )}
        </main>
      </div>
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-20">
        {alwaysAccessible.map((a) => (
          <div key={a.key} className="group relative">
            <button onClick={() => setCurrentActivity(a.key)} className="w-11 h-11 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105" style={{ background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--brand-color)" }}>
              {a.icon}
            </button>
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap" style={{ background: "var(--paper)", color: "var(--text)" }}>
              {a.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}