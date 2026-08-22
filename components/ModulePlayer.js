"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../pages/context/AuthContext";
import SealProgress from "./SealProgress";
import Portal from "./Portal";
import Whiteboard from "./Whiteboard";
import { MessageCircle, Video as VideoIcon, Cpu, Mic, MicOff, Video as Cam, VideoOff, ChevronLeft, ChevronRight } from "lucide-react";

const ACTIVITY_LABELS = {
  workbook: "Learner Workbook",
  knowledge: "Knowledge Module",
  summative: "Summative Assessment",
  practical: "Practical Evidence",
};

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

const UnitWeekIntro = ({ unitWeek, programmeName, isPast }) => (
  <div className="paper p-6 mb-6">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">{programmeName}</p>
      {isPast && (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#F3F4F6", color: "#6B7280" }}>
          Past week
        </span>
      )}
    </div>
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

const TeamsSession = ({ url, startDate, sessionDatetime }) => {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [countdown, setCountdown] = useState("");
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

  useEffect(() => {
    if (!sessionDatetime) return;
    const target = new Date(sessionDatetime).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCountdown("Session time has arrived"); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(`Starts in ${hrs}h ${mins}m`);
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [sessionDatetime]);

  const dateStr = startDate ? new Date(startDate).toLocaleDateString() : "N/A";

  return (
    <div className="paper p-6 mb-4">
      <h2 className="font-display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Microsoft Teams Meeting</h2>
      <p className="text-sm text-gray-500 mb-1 font-mono">{dateStr}</p>
      {sessionDatetime && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--seal-gold)" }}>
          {new Date(sessionDatetime).toLocaleString()} - {countdown}
        </p>
      )}
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

const SubmissionStatus = ({ submission }) => {
  if (!submission) return null;
  return (
    <div className="p-4 rounded-xl mb-4 flex items-center justify-between" style={{ background: "var(--paper-muted)" }}>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
          {submission.status === "graded" ? "Graded" : "Submitted, awaiting grading"}
        </p>
        {submission.status === "graded" && (
          <p className="text-xs text-gray-500 mt-0.5">
            Grade: <span className="font-mono font-medium">{submission.grade ?? "-"}</span>
            {submission.feedback && ` - ${submission.feedback}`}
          </p>
        )}
      </div>
      <span
        className="text-xs font-medium px-2.5 py-1 rounded-full"
        style={submission.status === "graded" ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}
      >
        {submission.status === "graded" ? "Graded" : "Pending"}
      </span>
    </div>
  );
};

function normalizeQuestion(q) {
  if (typeof q === "string") return { text: q, type: "free", marks: null, media: null, options: [] };
  return { type: "free", marks: null, media: null, options: [], ...q };
}

const QuestionMedia = ({ media }) => {
  const [showVideo, setShowVideo] = useState(false);
  if (!media?.url) return null;
  if (media.type === "image") return <img src={media.url} alt="" className="rounded-lg mb-3 max-h-56 object-contain" />;
  if (media.type === "voice") return <audio controls src={media.url} className="w-full mb-3" />;
  if (media.type === "youtube") {
    return (
      <>
        <button type="button" onClick={() => setShowVideo(true)} className="text-xs font-medium mb-3 inline-block" style={{ color: "var(--brand-color)" }}>
          Watch attached video
        </button>
        {showVideo && <YoutubeModal video={{ url: media.url }} onClose={() => setShowVideo(false)} />}
      </>
    );
  }
  return null;
};

const PracticalEvidenceUpload = ({ title, questions, onComplete, enrollment, unitWeek, existingSubmission, readOnly }) => {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [uploads, setUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const normQuestions = (questions || []).map(normalizeQuestion);

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
      <SubmissionStatus submission={existingSubmission} />
      {existingSubmission ? (
        <p className="text-sm text-gray-500">You've already submitted this activity for this week.</p>
      ) : readOnly ? (
        <p className="text-sm text-gray-400">This week has passed and no submission was made.</p>
      ) : questions?.length === 0 ? (
        <p className="text-sm text-gray-400">Your facilitator hasn't added questions for this activity yet.</p>
      ) : (
        <>
                    <p className="text-xs font-mono text-[var(--seal-gold)] mb-4">Upload your evidence for each question below</p>
          <div className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{normQuestions[step].text}</p>
              {normQuestions[step].marks != null && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>{normQuestions[step].marks} marks</span>
              )}
            </div>
            <QuestionMedia media={normQuestions[step].media} />
            <input type="file" onChange={handleFileChange} className="mb-3 text-sm text-gray-500" />
            {uploads[step] && <p className="text-emerald-600 text-xs mb-4">Selected: {uploads[step].name}</p>}
            <div className="flex justify-between">
              <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
              {step < normQuestions.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next</button>
              ) : (
                <button onClick={handleSubmitEvidence} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Submitting..." : "Submit Evidence"}</button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center font-mono">Question {step + 1} of {normQuestions.length}</p>
        </>
      )}
    </div>
  );
};

const LearningResource = ({ title, url, questions, onComplete, activityType, enrollment, unitWeek, existingSubmission, readOnly }) => {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const normQuestions = (questions || []).map(normalizeQuestion);

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
      <div className="mt-4">
        <SubmissionStatus submission={existingSubmission} />
      </div>
            {existingSubmission ? (
        <div className="p-4 rounded-xl text-sm text-gray-600 space-y-2" style={{ background: "var(--paper-muted)" }}>
          {existingSubmission.answers && Object.entries(existingSubmission.answers).map(([q, a]) => (
            <p key={q}><span className="font-medium text-gray-800">Q{Number(q) + 1}:</span> {a}</p>
          ))}
        </div>
      ) : readOnly ? (
        <p className="text-sm text-gray-400">This week has passed and no submission was made.</p>
      ) : normQuestions.length === 0 ? (
        <p className="text-sm text-gray-400">Your facilitator hasn't added questions for this activity yet.</p>
      ) : (
        <>
          <p className="text-xs font-mono text-[var(--seal-gold)] mb-4">Read the material fully before answering below</p>
          <div className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{normQuestions[step].text}</p>
              {normQuestions[step].marks != null && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>{normQuestions[step].marks} marks</span>
              )}
            </div>
            <QuestionMedia media={normQuestions[step].media} />

            {normQuestions[step].type === "mcq" ? (
              <div className="space-y-2 mb-4">
                {(normQuestions[step].options || []).map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: answers[step] === opt ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
                    <input type="radio" name={`q-${step}`} checked={answers[step] === opt} onChange={() => setAnswers((prev) => ({ ...prev, [step]: opt }))} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : normQuestions[step].type === "yesno" ? (
              <div className="flex gap-3 mb-4">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt} type="button" onClick={() => setAnswers((prev) => ({ ...prev, [step]: opt }))}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                    style={answers[step] === opt ? { background: "var(--brand-color)", color: "white" } : { background: "white", border: "1px solid var(--border-soft)", color: "var(--text)" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea className="w-full p-3 rounded-lg border text-sm mb-4" style={{ borderColor: "var(--border-soft)" }} value={answers[step] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [step]: e.target.value }))} placeholder="Type your answer here..." rows={4} />
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
              {step < normQuestions.length - 1 ? (
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

const YoutubeModal = ({ video, onClose }) => {
  const videoId = (() => {
    try {
      const url = new URL(video.url);
      if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
      return url.searchParams.get("v") || "";
    } catch {
      return "";
    }
  })();

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl">
          <button onClick={onClose} className="absolute -top-10 right-0 text-white text-sm">Close</button>
          <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white text-sm text-gray-500">
                Couldn't load this video, <a href={video.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">open it directly</a>.
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

const ReadingModal = ({ link, onClose }) => (
  <Portal>
    <div onClick={onClose} className="fixed inset-0 bg-black/60 z-30" />
    <div className="fixed inset-4 md:inset-10 z-40 rounded-xl overflow-hidden bg-white flex flex-col">
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border-soft)" }}>
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{link.title}</p>
        <div className="flex items-center gap-3">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>Open in new tab</a>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>
      </div>
      <iframe src={link.url} className="flex-1 w-full" />
    </div>
  </Portal>
);

const ResourcesPanel = ({ unitWeek }) => {
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeReading, setActiveReading] = useState(null);
  const voiceRecordings = unitWeek?.voice_recordings || [];
  const youtubeLinks = unitWeek?.youtube_links || [];
  const readingLinks = unitWeek?.reading_links || [];

  if (voiceRecordings.length === 0 && youtubeLinks.length === 0 && readingLinks.length === 0) {
    return <div className="paper p-8 text-center text-gray-500 text-sm">No extra resources added for this week yet.</div>;
  }

  return (
    <div className="space-y-4">
      {voiceRecordings.length > 0 && (
        <div className="paper p-6">
          <h2 className="font-display text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>Voice Recordings</h2>
          <div className="space-y-3">
            {voiceRecordings.map((v, i) => (
              <div key={i}>
                <p className="text-xs text-gray-500 mb-1">{v.label}</p>
                <audio controls src={v.url} className="w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {youtubeLinks.length > 0 && (
        <div className="paper p-6">
          <h2 className="font-display text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {youtubeLinks.map((y, i) => (
              <button key={i} onClick={() => setActiveVideo(y)} className="p-4 rounded-xl text-left text-sm font-medium hover:opacity-80" style={{ background: "var(--paper-muted)", color: "var(--text)" }}>
                Watch: {y.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {readingLinks.length > 0 && (
        <div className="paper p-6">
          <h2 className="font-display text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>Further Reading</h2>
          <ul className="space-y-2">
            {readingLinks.map((r, i) => (
              <li key={i}>
                {r.viewMode === "modal" ? (
                  <button onClick={() => setActiveReading(r)} className="text-sm font-medium hover:underline" style={{ color: "var(--brand-color)" }}>{r.title}</button>
                ) : (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: "var(--brand-color)" }}>{r.title}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeVideo && <YoutubeModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      {activeReading && <ReadingModal link={activeReading} onClose={() => setActiveReading(null)} />}
    </div>
  );
};

const LogbookPanel = ({ enrollment }) => {
  const supabase = createClient();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("logbook_entries")
      .select("*")
      .eq("enrollment_id", enrollment.id)
      .order("entry_date", { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let proofUrl = null;
      if (proofFile) {
        const path = `${enrollment.id}/logbook_${Date.now()}_${proofFile.name}`;
        const { error: uploadError } = await supabase.storage.from("submissions").upload(path, proofFile);
        if (uploadError) throw uploadError;
        proofUrl = path;
      }
      const { error } = await supabase.from("logbook_entries").insert({
        enrollment_id: enrollment.id,
        programme_id: enrollment.programme_id,
        institution_id: enrollment.institution_id,
        user_id: enrollment.user_id,
        entry_date: entryDate,
        description,
        proof_url: proofUrl,
      });
      if (error) throw error;
      setDescription("");
      setProofFile(null);
      fetchEntries();
    } catch (err) {
      alert("Could not save logbook entry: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="paper p-6">
        <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>Add Logbook Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you do?" required rows={3} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }} />
          <input type="file" onChange={(e) => setProofFile(e.target.files[0])} className="text-sm text-gray-500" />
          <button type="submit" disabled={submitting} className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {submitting ? "Saving..." : "Add Entry"}
          </button>
        </form>
      </div>

      <div className="paper p-6">
        <h2 className="font-display text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>My Entries</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-400">No entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="p-3 rounded-lg text-sm" style={{ background: "var(--paper-muted)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-400">{new Date(e.entry_date).toLocaleDateString()}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={e.signed_off ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>
                    {e.signed_off ? "Signed off" : "Pending sign-off"}
                  </span>
                </div>
                <p className="text-gray-700 mt-1">{e.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const ChatPanel = ({ enrollment }) => {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat-${enrollment.programme_id}-${enrollment.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `learner_id=eq.${enrollment.user_id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("programme_id", enrollment.programme_id)
      .eq("learner_id", enrollment.user_id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
    await supabase
      .from("chat_messages")
      .update({ read_by_learner: true })
      .eq("programme_id", enrollment.programme_id)
      .eq("learner_id", enrollment.user_id)
      .eq("read_by_learner", false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    const { error } = await supabase.from("chat_messages").insert({
      programme_id: enrollment.programme_id,
      institution_id: enrollment.institution_id,
      learner_id: enrollment.user_id,
      sender_id: enrollment.user_id,
      body: text,
    });
    if (error) alert("Could not send message: " + error.message);
    else fetchMessages();
  };

  return (
    <div className="paper p-6">
      <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>Chat with Facilitators</h2>
      <div className="h-72 overflow-y-auto rounded-xl p-3 mb-3 flex flex-col gap-2" style={{ background: "var(--paper-muted)" }}>
        {loading ? (
          <p className="text-xs text-gray-400 m-auto">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 m-auto text-center px-4">No messages yet. Ask your facilitator a question below.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`p-2.5 rounded-xl text-sm max-w-[80%] ${m.sender_id === enrollment.user_id ? "self-end text-white" : "self-start"}`}
              style={m.sender_id === enrollment.user_id ? { background: "var(--brand-color)" } : { background: "var(--paper)", color: "var(--text)", border: "1px solid var(--border-soft)" }}
            >
              {m.body}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--border-soft)" }}
        />
        <button onClick={sendMessage} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--brand-color)" }}>Send</button>
      </div>
    </div>
  );
};

const GradesPanel = ({ submissions }) => (
  <div className="paper p-6">
    <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>My Grades for This Course</h2>
    {submissions.length === 0 ? (
      <p className="text-sm text-gray-400">No submissions yet for this programme.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
              <th className="py-2 pr-4 font-medium text-gray-500">Activity</th>
              <th className="py-2 pr-4 font-medium text-gray-500">Submitted</th>
              <th className="py-2 pr-4 font-medium text-gray-500">Status</th>
              <th className="py-2 pr-4 font-medium text-gray-500">Grade</th>
              <th className="py-2 font-medium text-gray-500">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                <td className="py-2 pr-4" style={{ color: "var(--text)" }}>{ACTIVITY_LABELS[s.activity_type] || s.activity_type}</td>
                <td className="py-2 pr-4 text-gray-500 font-mono">{new Date(s.submitted_at).toLocaleDateString()}</td>
                <td className="py-2 pr-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full" style={s.status === "graded" ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>
                    {s.status === "graded" ? "Graded" : "Pending"}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono" style={{ color: "var(--text)" }}>{s.grade ?? "-"}</td>
                <td className="py-2 text-gray-500">{s.feedback || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default function ModulePlayer({ enrollmentId }) {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState(null);
  const [allWeeks, setAllWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);

  const alwaysAccessible = [
    { key: "chat", label: "Chat with facilitators", icon: <MessageCircle size={20} /> },
    { key: "teams", label: "Join Teams Session", icon: <VideoIcon size={20} /> },
    { key: "whiteboard", label: "Whiteboard", icon: <span className="font-mono text-xs">WB</span> },
    { key: "ai", label: "Ask Fachs AI", icon: <Cpu size={20} /> },
        { key: "grades", label: "My Grades", icon: <SealProgress percent={0} size={18} /> },
    { key: "logbook", label: "Logbook", icon: <span className="font-mono text-xs">LB</span> },
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
        setAllWeeks(weeksArray);

        const today = new Date();
        const currentWeek =
          weeksArray.find((w) => w.week_start_date && w.week_end_date && new Date(w.week_start_date) <= today && new Date(w.week_end_date) >= today) ||
          weeksArray[weeksArray.length - 1] ||
          null;
        setSelectedWeekId(currentWeek?.id || null);

        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("*")
          .eq("user_id", userId)
          .eq("programme_id", enrollmentData.programme_id);
        setMySubmissions(submissionsData || []);
      } catch (err) {
        console.error("Error loading module:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [enrollmentId]);

  const refreshSubmissions = async () => {
    if (!enrollment) return;
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", enrollment.user_id)
      .eq("programme_id", enrollment.programme_id);
    setMySubmissions(data || []);
    setCurrentActivity(null);
  };

  const unitWeek = allWeeks.find((w) => w.id === selectedWeekId) || null;
  const weekIndex = allWeeks.findIndex((w) => w.id === selectedWeekId);
  const isPastWeek = unitWeek ? new Date(unitWeek.week_end_date) < new Date().setHours(0, 0, 0, 0) : false;

  const findSubmission = (activityType) =>
    mySubmissions.find((s) => s.unit_week_id === unitWeek?.id && s.activity_type === activityType) || null;

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading module...</p>;

  if (!enrollment) {
    return (
      <div className="paper p-8 text-center">
        <p className="text-gray-500 text-sm">This enrollment could not be found, or you do not have access to it.</p>
      </div>
    );
  }

  if (allWeeks.length === 0) {
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
    { key: "resources", label: "Resources" },
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-xs font-mono text-[var(--text-muted)]">MODULE PLAYER</p>
        <SealProgress percent={progressPercent} size={44} />
      </div>

      <div className="paper p-3 mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => weekIndex > 0 && setSelectedWeekId(allWeeks[weekIndex - 1].id)}
          disabled={weekIndex <= 0}
          className="p-2 rounded-lg disabled:opacity-30"
          style={{ color: "var(--text)" }}
        >
          <ChevronLeft size={18} />
        </button>
        <select
          value={selectedWeekId || ""}
          onChange={(e) => { setSelectedWeekId(Number.isNaN(Number(e.target.value)) ? e.target.value : e.target.value); setCurrentActivity(null); }}
          className="flex-1 text-sm font-medium text-center bg-transparent outline-none"
          style={{ color: "var(--text)" }}
        >
          {allWeeks.map((w, i) => (
            <option key={w.id} value={w.id}>
              Week {i + 1}: {w.unit_standard_title} {new Date(w.week_end_date) < new Date().setHours(0,0,0,0) ? "(past)" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => weekIndex < allWeeks.length - 1 && setSelectedWeekId(allWeeks[weekIndex + 1].id)}
          disabled={weekIndex >= allWeeks.length - 1}
          className="p-2 rounded-lg disabled:opacity-30"
          style={{ color: "var(--text)" }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="hidden lg:block paper p-4 h-fit lg:sticky lg:top-24">
          <p className="text-xs font-mono text-gray-400 mb-3 px-1">THIS WEEK</p>
          <ul className="space-y-1">
            {activities.map((a) => {
              const sub = findSubmission(a.key);
              return (
                <li key={a.key}>
                  <button onClick={() => setCurrentActivity(a.key)} className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between" style={currentActivity === a.key ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text)" }}>
                    <span className={currentActivity === a.key ? "" : "hover:opacity-70"}>{a.label}</span>
                    {sub && <span style={{ color: currentActivity === a.key ? "white" : sub.status === "graded" ? "#047857" : "var(--seal-gold)" }}>{sub.status === "graded" ? `[done] ${sub.grade ?? ""}` : "[done]"}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="lg:hidden -mt-2">
          <select className="w-full p-3 rounded-xl border text-sm" style={{ borderColor: "var(--border-soft)" }} value={currentActivity || ""} onChange={(e) => setCurrentActivity(e.target.value)}>
            <option value="">Select activity...</option>
            {activities.map((a) => {
              const sub = findSubmission(a.key);
              return <option key={a.key} value={a.key}>{a.label}{sub ? " (submitted)" : ""}</option>;
            })}
          </select>
        </div>

        <main>
          <UnitWeekIntro unitWeek={unitWeek} programmeName={enrollment.programmes?.name} isPast={isPastWeek} />

          {currentActivity === "intro" && (
            <div className="paper p-6 mb-4">
              <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Facilitator's Intro</h2>
              <p className="text-sm text-gray-600">{unitWeek?.facilitator_intro || "No intro provided for this week yet."}</p>
            </div>
          )}

                    {currentActivity === "guide" && (
            <LearnerGuide title="Learner Guide" url={unitWeek?.learner_guide_url} chapters={unitWeek?.guide_chapters?.length ? unitWeek.guide_chapters : [{ title: "Chapter 1", content: "No content added for this week's guide yet." }]} onComplete={() => setCurrentActivity(null)} />
          )}

          {currentActivity === "resources" && <ResourcesPanel unitWeek={unitWeek} />}

          {currentActivity === "teams" && (
            <>
              <TeamsSession
                url={unitWeek?.video_url || unitWeek?.teams_session_link}
                startDate={unitWeek?.week_start_date}
                sessionDatetime={unitWeek?.session_datetime}
              />
              <ResourceCard label="Open Teams / Video link" url={unitWeek?.video_url || unitWeek?.teams_session_link} />
            </>
          )}

          {["workbook", "knowledge", "summative"].includes(currentActivity) && (
            <LearningResource
              title={activities.find((a) => a.key === currentActivity)?.label}
              url={unitWeek?.[`${currentActivity === "workbook" ? "learner_workbook" : currentActivity === "knowledge" ? "knowledge_module" : "summative_assessment"}_url`]}
              questions={unitWeek?.activity_questions?.[currentActivity] || []}
              activityType={currentActivity}
              enrollment={enrollment}
              unitWeek={unitWeek}
              existingSubmission={findSubmission(currentActivity)}
              readOnly={isPastWeek}
              onComplete={refreshSubmissions}
            />
          )}

          {currentActivity === "practical" && (
            <PracticalEvidenceUpload
              title="Practical Evidence Upload"
              questions={unitWeek?.activity_questions?.practical || []}
              enrollment={enrollment}
              unitWeek={unitWeek}
              existingSubmission={findSubmission("practical")}
              readOnly={isPastWeek}
              onComplete={refreshSubmissions}
            />
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
              {unitWeek?.sor_pdf_url ? <LinkButton href={unitWeek.sor_pdf_url} variant="link">View SOR PDF</LinkButton> : <p className="text-sm text-gray-400">No SOR document available yet.</p>}
            </div>
          )}

          {currentActivity === "grades" && <GradesPanel submissions={mySubmissions} />}
                    {currentActivity === "chat" && <ChatPanel enrollment={enrollment} />}
          {currentActivity === "logbook" && <LogbookPanel enrollment={enrollment} />}
          {currentActivity === "whiteboard" && (
            <Whiteboard unitWeekId={unitWeek?.id} institutionId={enrollment.institution_id} userId={enrollment.user_id} canClear={false} />
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
              {a.key === "grades" ? <span className="font-mono text-xs">%</span> : a.icon}
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