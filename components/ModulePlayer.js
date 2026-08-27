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

const TeamsSession = ({ url, startDate, sessionDatetime, enrollment, dailyRoomUrl }) => {
  const supabase = createClient();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [countdown, setCountdown] = useState("");
  const videoRef = useRef(null);
  const attendanceIdRef = useRef(null);

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
    if (!sessionDatetime || !enrollment) return;
    const sessionDate = new Date(sessionDatetime).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (sessionDate !== today) return;

    const markJoined = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("daily_attendance")
        .upsert({
          programme_id: enrollment.programme_id,
          institution_id: enrollment.institution_id,
          user_id: enrollment.user_id,
          date: today,
          status: "present",
          auto_tracked: true,
          joined_at: now,
        }, { onConflict: "programme_id,user_id,date" })
        .select()
        .single();
      if (!error) attendanceIdRef.current = data.id;
    };
    markJoined();

    return () => {
      if (attendanceIdRef.current) {
        supabase.from("daily_attendance").update({ left_at: new Date().toISOString() }).eq("id", attendanceIdRef.current);
      }
    };
  }, [sessionDatetime, enrollment?.id]);

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
            {dailyRoomUrl ? (
        <div className="rounded-xl overflow-hidden mb-2" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={dailyRoomUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <>
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
            {url ? <LinkButton href={url}>Join Meeting</LinkButton> : <p className="text-sm text-gray-400">No video link set for this week yet.</p>}
          </div>
        </>
      )}
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

const AnswerMediaUpload = ({ accept, value, onChange, label }) => {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const path = `answer-media/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("submissions").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("submissions").createSignedUrl(path, 60 * 60 * 24 * 365);
      onChange(signed?.signedUrl || path);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <input type="file" accept={accept} onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} className="text-sm text-gray-500" disabled={uploading} />
      {uploading && <p className="text-xs text-[var(--seal-gold)] font-mono mt-1">Uploading...</p>}
      {value && !uploading && <p className="text-xs text-emerald-600 mt-1">{label} attached</p>}
    </div>
  );
};

async function notifyFacilitatorOfSubmission(supabase, enrollment, activityLabel) {
  const facilitatorId = enrollment.programmes?.facilitator_id;
  if (!facilitatorId) return;
  await supabase.from("notifications").insert({
    user_id: facilitatorId,
    institution_id: enrollment.institution_id,
    type: "submission",
    title: "New submission",
    body: activityLabel,
    link: `/module-player/facilitator/${enrollment.programme_id}`,
  });
}

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
      await notifyFacilitatorOfSubmission(supabase, enrollment, "Practical Evidence submitted");
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

  const deadlineInfo = unitWeek?.activity_deadlines?.[activityType];
  const deadlinePassed = deadlineInfo?.deadline && new Date(deadlineInfo.deadline) < new Date().setHours(0, 0, 0, 0);
  const [startedAt] = useState(() => Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  useEffect(() => {
    if (!deadlineInfo?.time_limit_minutes || existingSubmission || deadlinePassed) return;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = deadlineInfo.time_limit_minutes * 60 - elapsed;
      setRemainingSeconds(Math.max(0, Math.floor(remaining)));
      if (remaining <= 0) handleSubmitAnswers();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

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
      await notifyFacilitatorOfSubmission(supabase, enrollment, `${activityType} submitted`);
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
      ) : deadlinePassed ? (
        <p className="text-sm text-gray-400">The deadline for this activity ({new Date(deadlineInfo.deadline).toLocaleDateString()}) has passed.</p>
      ) : normQuestions.length === 0 ? (
        <p className="text-sm text-gray-400">Your facilitator hasn't added questions for this activity yet.</p>
      ) : (
        <>
                    <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono text-[var(--seal-gold)]">Read the material fully before answering below</p>
            {deadlineInfo?.time_limit_minutes && remainingSeconds != null && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: remainingSeconds < 60 ? "#FEF2F2" : "var(--seal-gold-soft)", color: remainingSeconds < 60 ? "#B91C1C" : "var(--seal-gold)" }}>
                {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
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
            ) : normQuestions[step].type === "multi_select" ? (
              <div className="space-y-2 mb-4">
                {(normQuestions[step].options || []).map((opt, i) => {
                  const selected = Array.isArray(answers[step]) && answers[step].includes(opt);
                  return (
                    <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: selected ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
                      <input
                        type="checkbox" checked={selected}
                        onChange={() => setAnswers((prev) => {
                          const current = Array.isArray(prev[step]) ? prev[step] : [];
                          return { ...prev, [step]: selected ? current.filter((o) => o !== opt) : [...current, opt] };
                        })}
                      />
                      {opt}
                    </label>
                  );
                })}
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
            ) : normQuestions[step].type === "image_answer" ? (
              <AnswerMediaUpload accept="image/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Image" />
            ) : normQuestions[step].type === "audio_answer" ? (
              <AnswerMediaUpload accept="audio/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Recording" />
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

const ModuleQuestionAnswer = ({ module, enrollment, existingSubmission, onSubmitted }) => {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const normQuestions = (module.questions || []).map(normalizeQuestion);

  const deadlinePassed = module.deadline && new Date(module.deadline) < new Date().setHours(0, 0, 0, 0);
  const [startedAt] = useState(() => Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  useEffect(() => {
    if (!module.time_limit_minutes || existingSubmission || deadlinePassed || normQuestions.length === 0) return;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = module.time_limit_minutes * 60 - elapsed;
      setRemainingSeconds(Math.max(0, Math.floor(remaining)));
      if (remaining <= 0) handleSubmit();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (normQuestions.length === 0) return null;

  if (existingSubmission) {
    return <SubmissionStatus submission={existingSubmission} />;
  }

  if (deadlinePassed) {
    return <p className="text-sm text-gray-400 mt-4">The deadline for this module ({new Date(module.deadline).toLocaleDateString()}) has passed.</p>;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
            const { error } = await supabase.from("submissions").insert({
        enrollment_id: enrollment.id,
        user_id: enrollment.user_id,
        programme_id: enrollment.programme_id,
        institution_id: enrollment.institution_id,
        module_id: module.id,
        activity_type: module.module_type,
        answers,
      });
      if (error) throw error;
      await notifyFacilitatorOfSubmission(supabase, enrollment, `${module.module_type} Module answered`);
      onSubmitted();
    } catch (err) {
      alert("Could not save submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const q = normQuestions[step];

  return (
       <div className="mt-4 p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
      {module.time_limit_minutes && remainingSeconds != null && (
        <div className="flex justify-end mb-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: remainingSeconds < 60 ? "#FEF2F2" : "var(--seal-gold-soft)", color: remainingSeconds < 60 ? "#B91C1C" : "var(--seal-gold)" }}>
            {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{q.text}</p>
        {q.marks != null && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>{q.marks} marks</span>
        )}
      </div>
      {q.scenario && <p className="text-xs text-gray-500 italic mb-2">Scenario: {q.scenario}</p>}
      <QuestionMedia media={q.media} />

            {q.type === "mcq" ? (
        <div className="space-y-2 mb-4">
          {(q.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: answers[step] === opt ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
              <input type="radio" name={`mq-${step}`} checked={answers[step] === opt} onChange={() => setAnswers((prev) => ({ ...prev, [step]: opt }))} />
              {opt}
            </label>
          ))}
        </div>
      ) : q.type === "multi_select" ? (
        <div className="space-y-2 mb-4">
          {(q.options || []).map((opt, i) => {
            const selected = Array.isArray(answers[step]) && answers[step].includes(opt);
            return (
              <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: selected ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
                <input
                  type="checkbox" checked={selected}
                  onChange={() => setAnswers((prev) => {
                    const current = Array.isArray(prev[step]) ? prev[step] : [];
                    return { ...prev, [step]: selected ? current.filter((o) => o !== opt) : [...current, opt] };
                  })}
                />
                {opt}
              </label>
            );
          })}
        </div>
      ) : q.type === "yesno" ? (
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
      ) : q.type === "image_answer" ? (
        <AnswerMediaUpload accept="image/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Image" />
      ) : q.type === "audio_answer" ? (
        <AnswerMediaUpload accept="audio/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Recording" />
      ) : (
        <textarea className="w-full p-3 rounded-lg border text-sm mb-4" style={{ borderColor: "var(--border-soft)" }} value={answers[step] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [step]: e.target.value }))} placeholder="Type your answer here..." rows={4} />
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
        {step < normQuestions.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Submitting..." : "Submit"}</button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center font-mono">Question {step + 1} of {normQuestions.length}</p>
    </div>
  );
};

const SchoolLibraryPanel = ({ enrollment }) => {
  const supabase = createClient();
  const [programme, setProgramme] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openChapters, setOpenChapters] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: prog } = await supabase
      .from("programmes")
      .select("name, curriculum_document_url, syllabus_topics, textbooks, activity_book_questions")
      .eq("id", enrollment.programme_id)
      .single();
    setProgramme(prog);

    const { data: sub } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", enrollment.user_id)
      .eq("programme_id", enrollment.programme_id)
      .eq("activity_type", "activity_book")
      .maybeSingle();
    setExistingSubmission(sub);
    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="space-y-4">
          <div className="paper p-6">
        <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Syllabus</h2>
        {programme?.curriculum_document_url ? (
          <LinkButton href={programme.curriculum_document_url}>Download Syllabus</LinkButton>
        ) : (
          <p className="text-sm text-gray-400">No document uploaded yet.</p>
        )}
        {programme?.syllabus_topics?.length > 0 && (
          <div className="mt-4 space-y-2">
            {programme.syllabus_topics.map((t, i) => (
              <div key={i} className="p-3 rounded-lg text-sm" style={{ background: "var(--paper-muted)" }}>
                <p className="font-medium" style={{ color: "var(--text)" }}>{t.week_label || `Topic ${i + 1}`}: {t.topic}</p>
                {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {(programme?.textbooks || []).map((book) => (
        <div key={book.id} className="paper p-6">
          <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>{book.title}</h2>
          <p className="text-xs text-gray-500 mb-3">
            {[book.author, book.edition, book.published_year].filter(Boolean).join(" - ") || "No additional details"}
          </p>
          {book.file_url ? (
            <LinkButton href={book.file_url}>Download</LinkButton>
          ) : (
            <p className="text-sm text-gray-400">No file available.</p>
          )}
          {book.chapters?.length > 0 && (
            <button
              onClick={() => setOpenChapters(openChapters === book.id ? null : book.id)}
              className="block mt-3 text-sm font-medium"
              style={{ color: "var(--brand-color)" }}
            >
              {openChapters === book.id ? "Hide chapters" : `View ${book.chapters.length} chapters`}
            </button>
          )}
          {openChapters === book.id && (
            <div className="mt-3 space-y-2">
              {book.chapters.map((c, i) => (
                <details key={i} className="p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                  <summary className="text-sm font-medium cursor-pointer" style={{ color: "var(--text)" }}>{i + 1}. {c.title}</summary>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{c.content}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="paper p-6">
        <h2 className="font-display text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>Activity Book</h2>
        <ActivityBookAnswer
          questions={programme?.activity_book_questions || []}
          enrollment={enrollment}
          existingSubmission={existingSubmission}
          onSubmitted={fetchAll}
        />
      </div>
    </div>
  );
};

const ActivityBookAnswer = ({ questions, enrollment, existingSubmission, onSubmitted }) => {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const normQuestions = (questions || []).map(normalizeQuestion);

  if (normQuestions.length === 0) return <p className="text-sm text-gray-400">No activity book questions added yet.</p>;

  if (existingSubmission) {
    return <SubmissionStatus submission={existingSubmission} />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("submissions").insert({
        enrollment_id: enrollment.id,
        user_id: enrollment.user_id,
        programme_id: enrollment.programme_id,
        institution_id: enrollment.institution_id,
        activity_type: "activity_book",
        answers,
      });
      if (error) throw error;
      await notifyFacilitatorOfSubmission(supabase, enrollment, "Activity Book submitted");
      onSubmitted();
    } catch (err) {
      alert("Could not save submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const q = normQuestions[step];

  return (
    <div className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{q.text}</p>
        {q.marks != null && <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>{q.marks} marks</span>}
      </div>
      <QuestionMedia media={q.media} />

      {q.type === "mcq" ? (
        <div className="space-y-2 mb-4">
          {(q.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: answers[step] === opt ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
              <input type="radio" name={`ab-${step}`} checked={answers[step] === opt} onChange={() => setAnswers((prev) => ({ ...prev, [step]: opt }))} />
              {opt}
            </label>
          ))}
        </div>
      ) : q.type === "multi_select" ? (
        <div className="space-y-2 mb-4">
          {(q.options || []).map((opt, i) => {
            const selected = Array.isArray(answers[step]) && answers[step].includes(opt);
            return (
              <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: selected ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
                <input
                  type="checkbox" checked={selected}
                  onChange={() => setAnswers((prev) => {
                    const current = Array.isArray(prev[step]) ? prev[step] : [];
                    return { ...prev, [step]: selected ? current.filter((o) => o !== opt) : [...current, opt] };
                  })}
                />
                {opt}
              </label>
            );
          })}
        </div>
      ) : q.type === "yesno" ? (
        <div className="flex gap-3 mb-4">
          {["Yes", "No"].map((opt) => (
            <button key={opt} type="button" onClick={() => setAnswers((prev) => ({ ...prev, [step]: opt }))} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={answers[step] === opt ? { background: "var(--brand-color)", color: "white" } : { background: "white", border: "1px solid var(--border-soft)", color: "var(--text)" }}>
              {opt}
            </button>
          ))}
        </div>
      ) : q.type === "image_answer" ? (
        <AnswerMediaUpload accept="image/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Image" />
      ) : q.type === "audio_answer" ? (
        <AnswerMediaUpload accept="audio/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Recording" />
      ) : (
        <textarea className="w-full p-3 rounded-lg border text-sm mb-4" style={{ borderColor: "var(--border-soft)" }} value={answers[step] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [step]: e.target.value }))} rows={4} />
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
        {step < normQuestions.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Submitting..." : "Submit"}</button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center font-mono">Question {step + 1} of {normQuestions.length}</p>
    </div>
  );
};

const LibraryPanel = ({ enrollment }) => {
  const supabase = createClient();
  const [programme, setProgramme] = useState(null);
  const [modules, setModules] = useState([]);
  const [moduleSubmissions, setModuleSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openChapters, setOpenChapters] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: prog } = await supabase.from("programmes").select("name, curriculum_document_url, qualification_type").eq("id", enrollment.programme_id).single();
    setProgramme(prog);
    const { data: modulesData } = await supabase.from("qualification_modules").select("*").eq("programme_id", enrollment.programme_id);
    setModules(modulesData || []);
    const { data: subsData } = await supabase.from("submissions").select("*").eq("user_id", enrollment.user_id).eq("programme_id", enrollment.programme_id).not("module_id", "is", null);
    setModuleSubmissions(subsData || []);
    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="paper p-6">
        <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Curriculum Document</h2>
        {programme?.curriculum_document_url ? (
          <LinkButton href={programme.curriculum_document_url}>Download Curriculum Document</LinkButton>
        ) : (
          <p className="text-sm text-gray-400">Not uploaded yet.</p>
        )}
      </div>

      {modules.map((m) => (
        <div key={m.id} className="paper p-6">
          <h2 className="font-display text-lg font-semibold mb-2 capitalize" style={{ color: "var(--text)" }}>
            {m.module_type} Module {m.module_type === "workplace" ? "Guide" : "Textbook"}
          </h2>
          {m.guide_url ? (
            <LinkButton href={m.guide_url}>Download</LinkButton>
          ) : (
            <p className="text-sm text-gray-400">Not uploaded yet.</p>
          )}
          {m.guide_chapters?.length > 0 && (
            <button
              onClick={() => setOpenChapters(openChapters === m.id ? null : m.id)}
              className="block mt-3 text-sm font-medium"
              style={{ color: "var(--brand-color)" }}
            >
              {openChapters === m.id ? "Hide chapters" : `View ${m.guide_chapters.length} chapters`}
            </button>
          )}
                    {openChapters === m.id && (
            <div className="mt-3 space-y-2">
              {m.guide_chapters.map((c, i) => (
                <details key={i} className="p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                  <summary className="text-sm font-medium cursor-pointer" style={{ color: "var(--text)" }}>{i + 1}. {c.title}</summary>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{c.content}</p>
                </details>
              ))}
            </div>
          )}
          {m.module_type !== "workplace" && (
            <ModuleQuestionAnswer
              module={m}
              enrollment={enrollment}
              existingSubmission={moduleSubmissions.find((s) => s.module_id === m.id)}
              onSubmitted={fetchAll}
            />
          )}
        </div>
      ))}
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
      await notifyFacilitatorOfSubmission(supabase, enrollment, "New logbook entry");
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

const IsaChecklistPanel = ({ enrollment }) => {
  const supabase = createClient();
  const [criteria, setCriteria] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: criteriaData } = await supabase
      .from("qualification_isa_criteria")
      .select("*")
      .eq("programme_id", enrollment.programme_id)
      .order("sort_order");
    setCriteria(criteriaData || []);

    const { data: progressData } = await supabase
      .from("isa_criteria_progress")
      .select("criterion_id, met")
      .eq("enrollment_id", enrollment.id);
    const map = {};
    (progressData || []).forEach((p) => { map[p.criterion_id] = p.met; });
    setProgress(map);
    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  const metCount = criteria.filter((c) => progress[c.id]).length;

  return (
    <div className="paper p-6">
      <h2 className="font-display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>ISA Checklist</h2>
      <p className="text-sm text-gray-500 mb-4">{metCount} of {criteria.length} criteria met so far</p>
      {criteria.length === 0 ? (
        <p className="text-sm text-gray-400">Your facilitator hasn't added ISA criteria yet.</p>
      ) : (
        <ul className="space-y-2">
          {criteria.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
              <span
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={progress[c.id] ? { background: "#ECFDF5", color: "#047857" } : { background: "#F3F4F6", color: "#9CA3AF" }}
              >
                {progress[c.id] ? "Y" : "-"}
              </span>
              <span className="text-sm text-gray-700">{c.criterion_text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const FisaPanel = ({ enrollment }) => {
  const supabase = createClient();
  const [fisa, setFisa] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (attempt?.status !== "in_progress" || !fisa?.duration_minutes) return;
    const tick = () => {
      const elapsed = (Date.now() - new Date(attempt.started_at).getTime()) / 1000;
      const remaining = fisa.duration_minutes * 60 - elapsed;
      setRemainingSeconds(Math.max(0, Math.floor(remaining)));
      if (remaining <= 0) handleSubmit(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  const fetchAll = async () => {
    const { data: fisaData } = await supabase.from("qualification_fisa").select("*").eq("programme_id", enrollment.programme_id).single();
    setFisa(fisaData);
    const { data: attemptData } = await supabase.from("fisa_attempts").select("*").eq("enrollment_id", enrollment.id).maybeSingle();
    setAttempt(attemptData);
    if (attemptData?.answers) setAnswers(attemptData.answers);
    setLoading(false);
  };

  const startExam = async () => {
    const { data, error } = await supabase.from("fisa_attempts").insert({
      enrollment_id: enrollment.id,
      programme_id: enrollment.programme_id,
      institution_id: enrollment.institution_id,
      user_id: enrollment.user_id,
    }).select().single();
    if (error) return alert(error.message);
    setAttempt(data);
  };

    const handleSubmit = async (auto) => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("fisa_attempts")
      .update({ answers, status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", attempt.id);
    if (error) alert(error.message);
    else {
      await notifyFacilitatorOfSubmission(supabase, enrollment, "FISA exam submitted");
      if (auto) alert("Time's up, your exam has been submitted automatically.");
      fetchAll();
    }
    setSubmitting(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;
  if (!fisa) return <div className="paper p-8 text-center text-gray-500 text-sm">No FISA has been set up for this qualification yet.</div>;

  const normQuestions = (fisa.questions || []).map(normalizeQuestion);

  if (!attempt) {
    return (
      <div className="paper p-6 text-center">
        <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Final Integrated Summative Assessment</h2>
        <p className="text-sm text-gray-600 mb-1">{normQuestions.length} questions</p>
        {fisa.duration_minutes && <p className="text-sm text-gray-600 mb-1">Time limit: {fisa.duration_minutes} minutes</p>}
        {fisa.invigilated && <p className="text-sm text-gray-600 mb-4">This exam is invigilated.</p>}
        <p className="text-xs text-gray-400 mb-4">Once you start, the timer begins immediately and cannot be paused.</p>
        <button onClick={startExam} className="btn-silver px-6 py-2.5 rounded-lg text-sm font-medium">Start Exam</button>
      </div>
    );
  }

  if (attempt.status !== "in_progress") {
    return (
      <div className="paper p-6">
        <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Final Integrated Summative Assessment</h2>
        <SubmissionStatus submission={{ status: attempt.status === "graded" ? "graded" : "submitted", grade: attempt.grade, feedback: attempt.feedback }} />
      </div>
    );
  }

  const q = normQuestions[step];
  const mins = Math.floor((remainingSeconds || 0) / 60);
  const secs = (remainingSeconds || 0) % 60;

  return (
    <div className="paper p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold" style={{ color: "var(--text)" }}>Final Integrated Summative Assessment</h2>
        {fisa.duration_minutes && (
          <span className="text-sm font-mono px-3 py-1.5 rounded-full" style={{ background: remainingSeconds < 60 ? "#FEF2F2" : "var(--seal-gold-soft)", color: remainingSeconds < 60 ? "#B91C1C" : "var(--seal-gold)" }}>
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        )}
      </div>

      {q && (
        <div className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{q.text}</p>
            {q.marks != null && <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>{q.marks} marks</span>}
          </div>
          <QuestionMedia media={q.media} />

          {q.type === "mcq" ? (
            <div className="space-y-2 mb-4">
              {(q.options || []).map((opt, i) => (
                <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: answers[step] === opt ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
                  <input type="radio" name={`fq-${step}`} checked={answers[step] === opt} onChange={() => setAnswers((prev) => ({ ...prev, [step]: opt }))} />
                  {opt}
                </label>
              ))}
            </div>
          ) : q.type === "multi_select" ? (
            <div className="space-y-2 mb-4">
              {(q.options || []).map((opt, i) => {
                const selected = Array.isArray(answers[step]) && answers[step].includes(opt);
                return (
                  <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg text-sm cursor-pointer" style={{ background: selected ? "var(--seal-gold-soft)" : "white", border: "1px solid var(--border-soft)" }}>
                    <input
                      type="checkbox" checked={selected}
                      onChange={() => setAnswers((prev) => {
                        const current = Array.isArray(prev[step]) ? prev[step] : [];
                        return { ...prev, [step]: selected ? current.filter((o) => o !== opt) : [...current, opt] };
                      })}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          ) : q.type === "yesno" ? (
            <div className="flex gap-3 mb-4">
              {["Yes", "No"].map((opt) => (
                <button key={opt} type="button" onClick={() => setAnswers((prev) => ({ ...prev, [step]: opt }))} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={answers[step] === opt ? { background: "var(--brand-color)", color: "white" } : { background: "white", border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                  {opt}
                </button>
              ))}
            </div>
          ) : q.type === "image_answer" ? (
            <AnswerMediaUpload accept="image/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Image" />
          ) : q.type === "audio_answer" ? (
            <AnswerMediaUpload accept="audio/*" value={answers[step]} onChange={(url) => setAnswers((prev) => ({ ...prev, [step]: url }))} label="Recording" />
          ) : (
            <textarea className="w-full p-3 rounded-lg border text-sm mb-4" style={{ borderColor: "var(--border-soft)" }} value={answers[step] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [step]: e.target.value }))} rows={4} />
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 disabled:opacity-50">Previous</button>
            {step < normQuestions.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "var(--brand-color)" }}>Next</button>
            ) : (
              <button onClick={() => handleSubmit(false)} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Submitting..." : "Submit Exam"}</button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center font-mono">Question {step + 1} of {normQuestions.length}</p>
        </div>
      )}
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
    if (error) return alert("Could not send message: " + error.message);
    fetchMessages();

    const facilitatorId = enrollment.programmes?.facilitator_id;
    if (facilitatorId) {
      await supabase.from("notifications").insert({
        user_id: facilitatorId,
        institution_id: enrollment.institution_id,
        type: "chat",
        title: "New message",
        body: text.slice(0, 80),
        link: `/module-player/facilitator/${enrollment.programme_id}`,
      });
    }
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
    { key: "library", label: "Course Library", icon: <span className="font-mono text-xs">LIB</span> },
    ...((enrollment?.programmes?.qualification_type === "full" || enrollment?.programmes?.qualification_type === "part")
      ? [{ key: "isa", label: "ISA Checklist", icon: <span className="font-mono text-xs">ISA</span> }]
      : []),
    ...(enrollment?.programmes?.qualification_type === "skills_programme"
      ? [{ key: "fisa", label: "Final Exam (FISA)", icon: <span className="font-mono text-xs">EXM</span> }]
      : []),
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
                              .select("id, progress, credits_earned, credits_total, programme_id, user_id, institution_id, programmes ( id, name, qualification_type, facilitator_id )")
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
                enrollment={enrollment}
                dailyRoomUrl={unitWeek?.daily_room_url}
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
                                        {currentActivity === "library" && (
                      enrollment.programmes?.qualification_type
                        ? <LibraryPanel enrollment={enrollment} />
                        : <SchoolLibraryPanel enrollment={enrollment} />
                    )}
          {currentActivity === "isa" && <IsaChecklistPanel enrollment={enrollment} />}
          {currentActivity === "fisa" && <FisaPanel enrollment={enrollment} />}
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