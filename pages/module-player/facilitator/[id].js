"use client";
 import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { createClient } from "../../../lib/supabase/client";
import Portal from "../../../components/Portal";
import { Plus, Pencil, Eye, Calendar, ArrowLeft } from "lucide-react";

const FIELDS = [
  { key: "facilitator_intro", label: "Facilitator's Intro", type: "textarea" },
  { key: "teams_session_link", label: "Teams / Live Session Link", type: "url" },
  { key: "video_url", label: "Video Link (optional, if separate)", type: "url" },
  { key: "learner_guide_url", label: "Learner Guide", type: "file" },
  { key: "learner_workbook_url", label: "Learner Workbook", type: "file" },
  { key: "knowledge_module_url", label: "Knowledge Module", type: "file" },
  { key: "summative_assessment_url", label: "Summative Assessment", type: "file" },
];

const ACTIVITY_LABELS = {
  workbook: "Learner Workbook",
  knowledge: "Knowledge Module",
  summative: "Summative Assessment",
  practical: "Practical Evidence",
};

function getWeekStatus(week) {
  const today = new Date().toISOString().split("T")[0];
  if (week.week_end_date < today) return "past";
  if (week.week_start_date > today) return "upcoming";
  return "current";
}

const STATUS_STYLE = {
  current: { background: "#ECFDF5", color: "#047857", label: "Current Week" },
  upcoming: { background: "var(--seal-gold-soft)", color: "var(--seal-gold)", label: "Upcoming" },
  past: { background: "#F3F4F6", color: "#6B7280", label: "Past" },
};

export default function FacilitatorCoursePage() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = createClient();

  const [programme, setProgramme] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [enrolledLearners, setEnrolledLearners] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("content");
  const [editingWeek, setEditingWeek] = useState(null);
  const [generatingOpen, setGeneratingOpen] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState("submitted");

  useEffect(() => {
    if (id) fetchAll();
  }, [id, submissionFilter]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: prog } = await supabase
      .from("programmes")
      .select("*")
      .eq("id", id)
      .single();

    if (!prog || prog.facilitator_id !== user?.id) {
      setProgramme(null);
      setLoading(false);
      return;
    }
    setProgramme(prog);

    const { data: weeksData } = await supabase
      .from("unit_weeks")
      .select("*")
      .eq("programme_id", id)
      .order("week_start_date", { ascending: true });
    setWeeks(weeksData || []);

    let subQuery = supabase
      .from("submissions")
      .select(`
        id, activity_type, file_url, answers, status, grade, feedback, submitted_at,
        profiles ( id, first_name, surname ),
        unit_weeks ( unit_standard_title )
      `)
      .eq("programme_id", id)
      .order("submitted_at", { ascending: false });

    if (submissionFilter !== "all") subQuery = subQuery.eq("status", submissionFilter);

    const { data: subsData } = await subQuery;
    setSubmissions(subsData || []);

    const { data: enrollmentsData } = await supabase
      .from("enrollments")
      .select("user_id, profiles ( id, first_name, surname )")
      .eq("programme_id", id);
    setEnrolledLearners(enrollmentsData || []);

    setLoading(false);
  };

  useEffect(() => {
    if (programme && attendanceDate) fetchAttendance();
  }, [programme, attendanceDate]);

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("daily_attendance")
      .select("user_id, status")
      .eq("programme_id", id)
      .eq("date", attendanceDate);
    const map = {};
    (data || []).forEach((r) => { map[r.user_id] = r.status; });
    setAttendanceRecords(map);
  };

  const markAttendance = async (userId, status) => {
    setAttendanceRecords((prev) => ({ ...prev, [userId]: status }));
  };

  const saveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = enrolledLearners.map((e) => ({
        programme_id: programme.id,
        institution_id: programme.institution_id,
        user_id: e.user_id,
        date: attendanceDate,
        status: attendanceRecords[e.user_id] || "absent",
        marked_by: user.id,
      }));
      const { error } = await supabase
        .from("daily_attendance")
        .upsert(rows, { onConflict: "programme_id,user_id,date" });
      if (error) throw error;
      alert("Attendance saved.");
    } catch (err) {
      alert("Could not save attendance: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleWeekSaved = () => {
    setEditingWeek(null);
    fetchAll();
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading course...</p>;

  if (!programme) {
    return (
      <div className="paper p-8 text-center text-gray-500 text-sm">
        This course could not be found, or you don't have access to manage it.
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <button
        onClick={() => router.push("/facilitator/dashboard")}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">FACILITATOR</p>
      <h1 className="font-display text-3xl font-semibold mb-6" style={{ color: "var(--text)" }}>{programme.name}</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("content")}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={tab === "content" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
        >
          Weekly Content
        </button>
        <button
          onClick={() => setTab("submissions")}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={tab === "submissions" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
        >
          Submissions and Grading
        </button>
        <button
          onClick={() => setTab("attendance")}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={tab === "attendance" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
        >
          Attendance
        </button>
        <button
          onClick={() => setTab("messages")}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={tab === "messages" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
        >
          Messages
        </button>
      </div>

      {tab === "content" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setEditingWeek({ programme_id: programme.id, institution_id: programme.institution_id })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
              style={{ background: "var(--brand-color)" }}
            >
              <Plus size={16} /> Add Week
            </button>
            <button
              onClick={() => setGeneratingOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
            >
              <Calendar size={16} /> Auto-Generate Weeks
            </button>
          </div>

          {weeks.length === 0 ? (
            <div className="paper p-8 text-center text-gray-500 text-sm">No weeks published yet for this course.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeks.map((w) => {
                const status = getWeekStatus(w);
                const isPast = status === "past";
                return (
                  <div
                    key={w.id}
                    className="paper p-5"
                    style={status === "current" ? { border: "1.5px solid #047857" } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>{w.unit_standard_title}</h3>
                      <button
                        onClick={() => setEditingWeek({ ...w, readOnly: isPast })}
                        className="text-gray-400 hover:text-gray-700"
                        title={isPast ? "View (locked, week has passed)" : "Edit"}
                      >
                        {isPast ? <Eye size={16} /> : <Pencil size={16} />}
                      </button>
                    </div>
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2" style={STATUS_STYLE[status]}>
                      {STATUS_STYLE[status].label}
                    </span>
                    <p className="text-xs text-gray-400 font-mono mb-3">{w.week_start_date} to {w.week_end_date}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{w.facilitator_intro || "No intro added yet."}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "submissions" && (
        <>
          <div className="flex gap-2 mb-6">
            {[
              { key: "submitted", label: "Awaiting Grading" },
              { key: "graded", label: "Graded" },
              { key: "all", label: "All" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSubmissionFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={submissionFilter === f.key ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {submissions.length === 0 ? (
            <div className="paper p-8 text-center text-gray-500 text-sm">
              No submissions {submissionFilter === "submitted" ? "awaiting grading" : submissionFilter === "graded" ? "graded yet" : "yet"} for this course.
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <SubmissionRow key={sub.id} sub={sub} supabase={supabase} onGraded={fetchAll} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "daily_attendance" && (
        <>
          <div className="paper p-4 mb-4 flex items-center gap-3">
            <label className="text-sm text-[var(--text-muted)]">Date</label>
            <input
              type="date" value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
            />
            <button
              onClick={saveAttendance} disabled={savingAttendance}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--brand-color)" }}
            >
              {savingAttendance ? "Saving..." : "Save Attendance"}
            </button>
          </div>

          {enrolledLearners.length === 0 ? (
            <div className="paper p-8 text-center text-gray-500 text-sm">No learners enrolled in this course yet.</div>
          ) : (
            <div className="paper overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                    <th className="px-4 py-3 font-medium text-gray-500">Learner</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledLearners.map((e) => {
                    const name = e.profiles ? `${e.profiles.first_name || ""} ${e.profiles.surname || ""}`.trim() : "Unknown";
                    const status = attendanceRecords[e.user_id] || "absent";
                    return (
                      <tr key={e.user_id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                        <td className="px-4 py-3" style={{ color: "var(--text)" }}>{name}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {["present", "late", "absent"].map((s) => (
                              <button
                                key={s}
                                onClick={() => markAttendance(e.user_id, s)}
                                className="px-3 py-1 rounded-lg text-xs font-medium capitalize"
                                style={
                                  status === s
                                    ? s === "present" ? { background: "#ECFDF5", color: "#047857" } : s === "late" ? { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" } : { background: "#FEF2F2", color: "#B91C1C" }
                                    : { background: "var(--paper-muted)", color: "var(--text-muted)" }
                                }
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "messages" && (
        <FacilitatorMessages programme={programme} enrolledLearners={enrolledLearners} />
      )}

      {editingWeek && (
        <WeekModal week={editingWeek} onClose={() => setEditingWeek(null)} onSaved={handleWeekSaved} />
      )}

      {generatingOpen && (
        <GenerateWeeksModal
          programme={programme}
          onClose={() => setGeneratingOpen(false)}
          onGenerated={() => { setGeneratingOpen(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function FacilitatorMessages({ programme, enrolledLearners }) {
  const supabase = createClient();
  const [selectedLearner, setSelectedLearner] = useState(enrolledLearners[0]?.user_id || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (selectedLearner) fetchMessages();
  }, [selectedLearner]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("programme_id", programme.id)
      .eq("learner_id", selectedLearner)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    await supabase
      .from("chat_messages")
      .update({ read_by_facilitator: true })
      .eq("programme_id", programme.id)
      .eq("learner_id", selectedLearner)
      .eq("read_by_facilitator", false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedLearner) return;
    const { data: { user } } = await supabase.auth.getUser();
    const text = input;
    setInput("");
    const { error } = await supabase.from("chat_messages").insert({
      programme_id: programme.id,
      institution_id: programme.institution_id,
      learner_id: selectedLearner,
      sender_id: user.id,
      body: text,
    });
    if (error) alert("Could not send: " + error.message);
    else fetchMessages();
  };

  if (enrolledLearners.length === 0) {
    return <div className="paper p-8 text-center text-gray-500 text-sm">No learners enrolled yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
      <div className="paper p-3 h-fit">
        <p className="text-xs font-mono text-gray-400 mb-2 px-1">LEARNERS</p>
        <ul className="space-y-1">
          {enrolledLearners.map((l) => {
            const name = l.profiles ? `${l.profiles.first_name || ""} ${l.profiles.surname || ""}`.trim() : "Unknown";
            return (
              <li key={l.user_id}>
                <button
                  onClick={() => setSelectedLearner(l.user_id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm"
                  style={selectedLearner === l.user_id ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text)" }}
                >
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="paper p-4 flex flex-col">
        <div className="h-72 overflow-y-auto rounded-xl p-3 mb-3 flex flex-col gap-2" style={{ background: "var(--paper-muted)" }}>
          {messages.length === 0 ? (
            <p className="text-xs text-gray-400 m-auto">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded-xl text-sm max-w-[80%] ${m.sender_id !== selectedLearner ? "self-end text-white" : "self-start"}`}
                style={m.sender_id !== selectedLearner ? { background: "var(--brand-color)" } : { background: "var(--paper)", color: "var(--text)", border: "1px solid var(--border-soft)" }}
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
            placeholder="Reply..." className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border-soft)" }}
          />
          <button onClick={sendMessage} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--brand-color)" }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ sub, supabase, onGraded }) {
  const [draft, setDraft] = useState({ grade: sub.grade ?? "", feedback: sub.feedback ?? "" });
  const [saving, setSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);

  const learnerName = sub.profiles ? `${sub.profiles.first_name || ""} ${sub.profiles.surname || ""}`.trim() : "Unknown learner";

  const openFile = async () => {
    if (fileUrl) { window.open(fileUrl, "_blank"); return; }
    const { data, error } = await supabase.storage.from("submissions").createSignedUrl(sub.file_url, 3600);
    if (error) { alert("Could not load file: " + error.message); return; }
    setFileUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from("submissions")
        .update({
          grade: draft.grade,
          feedback: draft.feedback,
          status: "graded",
          graded_at: new Date().toISOString(),
        })
        .eq("id", sub.id)
        .select("user_id, institution_id")
        .single();
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: updated.user_id,
        institution_id: updated.institution_id,
        type: "grade",
        title: "You've been graded",
        body: `${ACTIVITY_LABELS[sub.activity_type] || sub.activity_type} has been graded.`,
        link: "/progress",
      });

      onGraded();
    } catch (err) {
      alert("Could not save grade: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="paper p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>{learnerName}</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {sub.unit_weeks?.unit_standard_title || "Unknown week"} - {ACTIVITY_LABELS[sub.activity_type] || sub.activity_type}
          </p>
          <p className="text-xs text-gray-400 font-mono">Submitted {new Date(sub.submitted_at).toLocaleDateString()}</p>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={sub.status === "graded" ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}
        >
          {sub.status === "graded" ? "Graded" : "Awaiting grading"}
        </span>
      </div>

      {sub.file_url ? (
        <button onClick={openFile} className="text-sm font-medium mb-3 inline-block" style={{ color: "var(--brand-color)" }}>
          View uploaded file
        </button>
      ) : sub.answers ? (
        <div className="p-4 rounded-xl mb-3 text-sm text-gray-600 space-y-2" style={{ background: "var(--paper-muted)" }}>
          {Object.entries(sub.answers).map(([q, a]) => (
            <p key={q}><span className="font-medium text-gray-800">Q{Number(q) + 1}:</span> {a}</p>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-[100px_1fr_auto] gap-3 items-start">
        <input
          type="number" placeholder="Grade" value={draft.grade}
          onChange={(e) => setDraft((p) => ({ ...p, grade: e.target.value }))}
          className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
        />
        <textarea
          placeholder="Feedback for the learner..." value={draft.feedback}
          onChange={(e) => setDraft((p) => ({ ...p, feedback: e.target.value }))}
          rows={2} className="px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: "var(--border-soft)" }}
        />
        <button
          onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: "var(--brand-color)" }}
        >
          {saving ? "Saving..." : "Save Grade"}
        </button>
      </div>
    </div>
  );
}

function WeekModal({ week, onClose, onSaved }) {
  const supabase = createClient();
  const readOnly = !!week.readOnly;
  const toLocalInput = (v) => {
    if (!v) return "";
    const d = new Date(v);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    unit_standard_title: week.unit_standard_title || "",
    week_start_date: week.week_start_date || "",
    week_end_date: week.week_end_date || "",
    facilitator_intro: week.facilitator_intro || "",
    teams_session_link: week.teams_session_link || "",
    session_datetime: toLocalInput(week.session_datetime),
    video_url: week.video_url || "",
    learner_guide_url: week.learner_guide_url || "",
    learner_workbook_url: week.learner_workbook_url || "",
    knowledge_module_url: week.knowledge_module_url || "",
    summative_assessment_url: week.summative_assessment_url || "",
  });
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [questions, setQuestions] = useState(week.activity_questions || { workbook: [], knowledge: [], summative: [], practical: [] });
  const [newQuestionText, setNewQuestionText] = useState({ workbook: "", knowledge: "", summative: "", practical: "" });

  const handleFieldChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleScheduleTeamsMeeting = async () => {
    setSchedulingMeeting(true);
    try {
      const start = new Date(form.session_datetime);
      const end = new Date(start.getTime() + 60 * 60000);
      const res = await fetch("/api/create-teams-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.unit_standard_title || "Class Session",
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          institutionId: week.institution_id,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      handleFieldChange("teams_session_link", data.joinUrl);
      alert("Teams meeting scheduled and linked.");
    } catch (err) {
      alert("Could not schedule Teams meeting: " + err.message);
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const addQuestion = (activityKey) => {
    const text = newQuestionText[activityKey]?.trim();
    if (!text) return;
    setQuestions((prev) => ({ ...prev, [activityKey]: [...(prev[activityKey] || []), text] }));
    setNewQuestionText((prev) => ({ ...prev, [activityKey]: "" }));
  };

  const removeQuestion = (activityKey, index) => {
    setQuestions((prev) => ({ ...prev, [activityKey]: prev[activityKey].filter((_, i) => i !== index) }));
  };

  const handleFileUpload = async (key, file) => {
    setUploading(key);
    try {
      const path = `${week.programme_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("programme-content").upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("programme-content").getPublicUrl(path);
      handleFieldChange(key, data.publicUrl);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        session_datetime: form.session_datetime ? new Date(form.session_datetime).toISOString() : null,
        programme_id: week.programme_id,
        institution_id: week.institution_id,
        activity_questions: questions,
      };
      const isNewWeek = !week.id;
      const { error } = isNewWeek
        ? await supabase.from("unit_weeks").insert([payload])
        : await supabase.from("unit_weeks").update(payload).eq("id", week.id);
      if (error) throw error;

      if (isNewWeek) {
        const { data: learners } = await supabase
          .from("enrollments")
          .select("user_id")
          .eq("programme_id", week.programme_id);
        if (learners?.length) {
          await supabase.from("notifications").insert(
            learners.map((l) => ({
              user_id: l.user_id,
              institution_id: week.institution_id,
              type: "content",
              title: "New week published",
              body: form.unit_standard_title,
              link: "/progress",
            }))
          );
        }
      }

      onSaved();
    } catch (err) {
      alert("Could not save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8" style={{ background: "var(--paper)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">X</button>

          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">{readOnly ? "PAST WEEK" : week.id ? "EDIT WEEK" : "NEW WEEK"}</p>
          <h2 className="font-display text-xl font-semibold mb-5" style={{ color: "var(--text)" }}>
            {readOnly ? "Week Content (locked)" : week.id ? "Edit Weekly Content" : "Add Weekly Content"}
          </h2>

          {readOnly && (
            <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "var(--paper-muted)", color: "var(--text-muted)" }}>
              This week has already passed. Deadlines and learner submissions may already be tied to it, so it's locked for editing. You can still view everything that was published.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="text" placeholder="Week title (e.g. Week 3: Budgeting Basics)"
              value={form.unit_standard_title} onChange={(e) => handleFieldChange("unit_standard_title", e.target.value)}
              required disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Start date</label>
                <input type="date" value={form.week_start_date} onChange={(e) => handleFieldChange("week_start_date", e.target.value)} required disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">End date</label>
                <input type="date" value={form.week_end_date} onChange={(e) => handleFieldChange("week_end_date", e.target.value)} required disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Live session date &amp; time</label>
              <input
                type="datetime-local" value={form.session_datetime}
                onChange={(e) => handleFieldChange("session_datetime", e.target.value)}
                disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }}
              />
              {!readOnly && (
                <button
                  type="button"
                  disabled={!form.session_datetime || schedulingMeeting}
                  onClick={handleScheduleTeamsMeeting}
                  className="mt-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
                >
                  {schedulingMeeting ? "Scheduling..." : "Schedule Teams Meeting"}
                </button>
              )}
              {form.teams_session_link && (
                <p className="text-xs mt-1" style={{ color: "var(--seal-gold)" }}>Meeting link ready</p>
              )}
            </div>

            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea value={form[f.key]} onChange={(e) => handleFieldChange(f.key, e.target.value)} rows={3} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
                ) : f.type === "url" ? (
                  <input type="url" value={form[f.key]} onChange={(e) => handleFieldChange(f.key, e.target.value)} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} placeholder="https://..." />
                ) : readOnly ? (
                  form[f.key] ? (
                    <a href={form[f.key]} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>View file</a>
                  ) : (
                    <span className="text-xs text-gray-400">Nothing uploaded</span>
                  )
                ) : (
                  <div className="flex items-center gap-3">
                    <input type="file" onChange={(e) => e.target.files[0] && handleFileUpload(f.key, e.target.files[0])} className="text-sm text-gray-500" />
                    {uploading === f.key && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
                    {form[f.key] && uploading !== f.key && (
                      <a href={form[f.key]} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>Uploaded</a>
                    )}
                  </div>
                )}
              </div>
            ))}

            {["workbook", "knowledge", "summative", "practical"].map((activityKey) => (
              <div key={activityKey} className="pt-2 border-t" style={{ borderColor: "var(--border-soft)" }}>
                <label className="block text-xs text-[var(--text-muted)] mb-1 capitalize">{activityKey} Questions</label>
                {readOnly ? (
                  (questions[activityKey] || []).length === 0 ? (
                    <span className="text-xs text-gray-400">No questions set</span>
                  ) : (
                    <ul className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      {questions[activityKey].map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  )
                ) : (
                  <>
                    <ul className="space-y-1 mb-2">
                      {(questions[activityKey] || []).map((q, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                          <span className="text-gray-700">{i + 1}. {q}</span>
                          <button type="button" onClick={() => removeQuestion(activityKey, i)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text" placeholder="Type a question and press Add"
                        value={newQuestionText[activityKey]}
                        onChange={(e) => setNewQuestionText((prev) => ({ ...prev, [activityKey]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(activityKey); } }}
                        className={inputClass} style={{ borderColor: "var(--border-soft)" }}
                      />
                      <button type="button" onClick={() => addQuestion(activityKey)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                        Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {!readOnly && (
              <button
                type="submit" disabled={saving}
                className="w-full py-3 mt-2 rounded-xl text-white font-medium transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--brand-color)" }}
              >
                {saving ? "Saving..." : week.id ? "Save Changes" : "Publish Week"}
              </button>
            )}
          </form>
        </div>
      </div>
    </Portal>
  );
}

function GenerateWeeksModal({ programme, onClose, onGenerated }) {
  const supabase = createClient();
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [numWeeks, setNumWeeks] = useState(10);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const rows = [];
      const start = new Date(startDate);
      for (let i = 0; i < Number(numWeeks); i++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        rows.push({
          programme_id: programme.id,
          institution_id: programme.institution_id,
          unit_standard_title: `Week ${i + 1}`,
          week_start_date: weekStart.toISOString().split("T")[0],
          week_end_date: weekEnd.toISOString().split("T")[0],
        });
      }
      const { error } = await supabase.from("unit_weeks").insert(rows);
      if (error) throw error;
      onGenerated();
    } catch (err) {
      alert("Could not generate weeks: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-8" style={{ background: "var(--paper)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">X</button>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">AUTO-GENERATE</p>
          <h2 className="font-display text-xl font-semibold mb-5" style={{ color: "var(--text)" }}>Generate Weeks</h2>
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Number of weeks</label>
              <input type="number" min="1" max="52" value={numWeeks} onChange={(e) => setNumWeeks(e.target.value)} required className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }} />
            </div>
            <p className="text-xs text-gray-400">
              Creates Week 1 through Week {numWeeks}, each running 7 days from the start date, back to back. You can edit titles and content for each afterward.
            </p>
            <button type="submit" disabled={saving} className="w-full py-3 mt-2 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: "var(--brand-color)" }}>
              {saving ? "Generating..." : `Generate ${numWeeks} Weeks`}
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}