"use client";
 import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { createClient } from "../../../lib/supabase/client";
import Portal from "../../../components/Portal";
import Whiteboard from "../../../components/Whiteboard";
import Link from "next/link";
import QualificationModulesTab from "../../../components/QualificationModulesTab";
import SchoolSubjectDocuments from "../../../components/SchoolSubjectDocuments";
import { useFeatures } from "../../../lib/features/useFeatures";
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
  const features = useFeatures();

  const [programme, setProgramme] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [enrolledLearners, setEnrolledLearners] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceMeta, setAttendanceMeta] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("content");
  const [editingWeek, setEditingWeek] = useState(null);
  const [generatingOpen, setGeneratingOpen] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState("submitted");
  const [viewByLearner, setViewByLearner] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id, submissionFilter]);

  const [facilitatorId, setFacilitatorId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setFacilitatorId(user?.id || null);

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
      .select("user_id, status, auto_tracked, joined_at, left_at")
      .eq("programme_id", id)
      .eq("date", attendanceDate);
    const map = {};
    const metaMap = {};
    (data || []).forEach((r) => {
      map[r.user_id] = r.status;
      metaMap[r.user_id] = { auto_tracked: r.auto_tracked, joined_at: r.joined_at, left_at: r.left_at };
    });
    setAttendanceRecords(map);
    setAttendanceMeta(metaMap);
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

  const todayStr = new Date().toISOString().split("T")[0];
  const currentWeek = weeks.find((w) => w.week_start_date <= todayStr && w.week_end_date >= todayStr);

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

      <div className="flex justify-center mb-6">
        <div className="paper p-1.5 flex gap-1 flex-wrap justify-center rounded-2xl">
          {[
            { key: "documents", label: "Main Documents" },
            { key: "content", label: "Weekly Content" },
            { key: "submissions", label: "Submissions and Grading" },
            { key: "daily_attendance", label: "Attendance" },
            { key: "messages", label: "Messages" },
            { key: "whiteboard", label: "Whiteboard" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={tab === t.key ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text-muted)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

            {tab === "documents" && (
              features.hasTimetable
                ? <SchoolSubjectDocuments programme={programme} onUpdated={fetchAll} />
                : <QualificationModulesTab programme={programme} />
            )}

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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-2">
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
            <button
              onClick={() => setViewByLearner((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={viewByLearner ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}
            >
              By Learner
            </button>
          </div>

          {viewByLearner ? (
            <LearnerConsolidatedView
              enrolledLearners={enrolledLearners}
              submissions={submissions}
              weeks={weeks}
              programme={programme}
              supabase={supabase}
              onGraded={fetchAll}
            />
          ) : submissions.length === 0 ? (
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
            <div className="paper overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                                    <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                    <th className="px-4 py-3 font-medium text-gray-500">Learner</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Session Time</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledLearners.map((e) => {
                    const name = e.profiles ? `${e.profiles.first_name || ""} ${e.profiles.surname || ""}`.trim() : "Unknown";
                    const status = attendanceRecords[e.user_id] || "absent";
                    const meta = attendanceMeta[e.user_id];
                    return (
                      <tr key={e.user_id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                        <td className="px-4 py-3" style={{ color: "var(--text)" }}>
                          {name}
                          {meta?.auto_tracked && (
                            <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>Auto</span>
                          )}
                        </td>
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
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {meta?.joined_at ? (
                            <>
                              {new Date(meta.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {meta.left_at && ` - ${new Date(meta.left_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            </>
                          ) : "-"}
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

      {tab === "whiteboard" && (
        currentWeek ? (
          <Whiteboard unitWeekId={currentWeek.id} institutionId={programme.institution_id} userId={facilitatorId} canClear={true} />
        ) : (
          <div className="paper p-8 text-center text-gray-500 text-sm">No current week to open a whiteboard for.</div>
        )
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
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTargets, setBroadcastTargets] = useState("all");
  const [selectedBroadcastLearners, setSelectedBroadcastLearners] = useState([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const toggleBroadcastLearner = (userId) => {
    setSelectedBroadcastLearners((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const sendBroadcast = async () => {
    if (!broadcastText.trim()) return;
    const targets = broadcastTargets === "all" ? enrolledLearners.map((l) => l.user_id) : selectedBroadcastLearners;
    if (targets.length === 0) return alert("Select at least one learner.");
    setSendingBroadcast(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const messageRows = targets.map((learnerId) => ({
        programme_id: programme.id,
        institution_id: programme.institution_id,
        learner_id: learnerId,
        sender_id: user.id,
        body: broadcastText,
      }));
      const { error } = await supabase.from("chat_messages").insert(messageRows);
      if (error) throw error;

      await supabase.from("notifications").insert(
        targets.map((learnerId) => ({
          user_id: learnerId,
          institution_id: programme.institution_id,
          type: "chat",
          title: "New message from your facilitator",
          body: broadcastText.slice(0, 80),
          link: "/progress",
        }))
      );

      setBroadcastText("");
      setSelectedBroadcastLearners([]);
      alert(`Sent to ${targets.length} learner${targets.length === 1 ? "" : "s"}.`);
    } catch (err) {
      alert("Could not send broadcast: " + err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

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

  if (broadcastMode) {
    return (
      <div className="paper p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text)" }}>Broadcast a Message</h2>
          <button onClick={() => setBroadcastMode(false)} className="text-sm font-medium" style={{ color: "var(--brand-color)" }}>Back to chats</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setBroadcastTargets("all")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={broadcastTargets === "all" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper-muted)", color: "var(--text-muted)" }}
          >
            All Learners ({enrolledLearners.length})
          </button>
          <button
            onClick={() => setBroadcastTargets("selected")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={broadcastTargets === "selected" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper-muted)", color: "var(--text-muted)" }}
          >
            Select Learners
          </button>
        </div>

        {broadcastTargets === "selected" && (
          <div className="mb-4 max-h-40 overflow-y-auto p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
            {enrolledLearners.map((l) => {
              const name = l.profiles ? `${l.profiles.first_name || ""} ${l.profiles.surname || ""}`.trim() : "Unknown";
              return (
                <label key={l.user_id} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedBroadcastLearners.includes(l.user_id)} onChange={() => toggleBroadcastLearner(l.user_id)} />
                  {name}
                </label>
              );
            })}
          </div>
        )}

        <textarea
          value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)}
          placeholder="Type your message to send..." rows={4}
          className="w-full px-3 py-2 rounded-lg border text-sm mb-3" style={{ borderColor: "var(--border-soft)" }}
        />
        <button
          onClick={sendBroadcast} disabled={sendingBroadcast}
          className="btn-silver px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {sendingBroadcast ? "Sending..." : "Send Broadcast"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
      <div className="paper p-3 h-fit">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-mono text-gray-400">LEARNERS</p>
          <button onClick={() => setBroadcastMode(true)} className="text-xs font-medium" style={{ color: "var(--brand-color)" }}>Broadcast</button>
        </div>
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

function LearnerConsolidatedView({ enrolledLearners, submissions, weeks, programme, supabase, onGraded }) {
  const [selectedLearner, setSelectedLearner] = useState(enrolledLearners[0]?.user_id || null);
  const [logbookEntries, setLogbookEntries] = useState([]);
  const [modules, setModules] = useState([]);
  const [isaCriteria, setIsaCriteria] = useState([]);
  const [isaProgress, setIsaProgress] = useState({});
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);

  useEffect(() => {
    if (selectedLearner) fetchExtras();
  }, [selectedLearner]);

  const fetchExtras = async () => {
    const { data: logs } = await supabase
      .from("logbook_entries")
      .select("*")
      .eq("user_id", selectedLearner)
      .eq("programme_id", programme.id)
      .order("entry_date", { ascending: false });
    setLogbookEntries(logs || []);

    const { data: modulesData } = await supabase.from("qualification_modules").select("id, module_type, questions").eq("programme_id", programme.id);
    setModules(modulesData || []);

    if (programme.qualification_type === "full" || programme.qualification_type === "part") {
      const { data: enr } = await supabase.from("enrollments").select("id").eq("user_id", selectedLearner).eq("programme_id", programme.id).maybeSingle();
      setSelectedEnrollmentId(enr?.id || null);

      const { data: criteriaData } = await supabase.from("qualification_isa_criteria").select("*").eq("programme_id", programme.id).order("sort_order");
      setIsaCriteria(criteriaData || []);

      if (enr?.id) {
        const { data: progressData } = await supabase.from("isa_criteria_progress").select("criterion_id, met").eq("enrollment_id", enr.id);
        const map = {};
        (progressData || []).forEach((p) => { map[p.criterion_id] = p.met; });
        setIsaProgress(map);
      }
    }
  };

  const toggleCriterion = async (criterionId, currentlyMet) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("isa_criteria_progress").upsert({
      enrollment_id: selectedEnrollmentId,
      criterion_id: criterionId,
      met: !currentlyMet,
      marked_by: user.id,
      marked_at: new Date().toISOString(),
    }, { onConflict: "enrollment_id,criterion_id" });
    if (error) alert(error.message);
    else setIsaProgress((prev) => ({ ...prev, [criterionId]: !currentlyMet }));
  };

   const weekSubs = submissions.filter((s) => s.user_id === selectedLearner);

  const weeksWithActivities = weeks.filter((w) => Object.values(w.activity_questions || {}).some((qs) => qs.length > 0));
  const submittedWeekIds = new Set(weekSubs.filter((s) => s.unit_weeks).map((s) => s.unit_week_id));
  const outstandingWeeks = weeksWithActivities.filter((w) => !submittedWeekIds.has(w.id));

  const submittedModuleIds = new Set(weekSubs.filter((s) => s.module_id).map((s) => s.module_id));
  const outstandingModules = modules.filter((m) => (m.questions || []).length > 0 && !submittedModuleIds.has(m.id));

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

      <div className="space-y-4">
        {(outstandingWeeks.length > 0 || outstandingModules.length > 0) && (
          <div className="paper p-5">
            <h3 className="font-display font-semibold mb-2" style={{ color: "var(--text)" }}>Outstanding</h3>
            <ul className="space-y-1 text-sm">
              {outstandingWeeks.map((w) => (
                <li key={w.id} className="text-gray-600">
                  {w.unit_standard_title} - due {new Date(w.week_end_date).toLocaleDateString()}
                </li>
              ))}
              {outstandingModules.map((m) => (
                <li key={m.id} className="text-gray-600 capitalize">{m.module_type} Module questions</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="font-display font-semibold mb-2" style={{ color: "var(--text)" }}>Submissions</h3>
          {weekSubs.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {weekSubs.map((sub) => (
                <SubmissionRow key={sub.id} sub={sub} supabase={supabase} onGraded={onGraded} />
              ))}
            </div>
          )}
        </div>

                {isaCriteria.length > 0 && (
          <div className="paper p-5">
            <h3 className="font-display font-semibold mb-2" style={{ color: "var(--text)" }}>ISA Criteria</h3>
            <ul className="space-y-2">
              {isaCriteria.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                  <span className="text-gray-700">{c.criterion_text}</span>
                  <button
                    onClick={() => toggleCriterion(c.id, isaProgress[c.id])}
                    className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                    style={isaProgress[c.id] ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
                  >
                    {isaProgress[c.id] ? "Met" : "Not met"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {logbookEntries.length > 0 && (
          <div className="paper p-5">
            <h3 className="font-display font-semibold mb-2" style={{ color: "var(--text)" }}>Logbook Entries</h3>
            <ul className="space-y-2">
              {logbookEntries.map((e) => (
                <li key={e.id} className="text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                  <span className="font-mono text-xs text-gray-400">{new Date(e.entry_date).toLocaleDateString()}</span> - {e.description}
                  <span className="ml-2 text-xs" style={{ color: e.signed_off ? "#047857" : "var(--seal-gold)" }}>{e.signed_off ? "Signed off" : "Pending"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        institution_id: updated.institution_id,
        actor_id: currentUser.id,
        action: "submission_graded",
        details: `${ACTIVITY_LABELS[sub.activity_type] || sub.activity_type} graded ${draft.grade ?? ""}`,
      });

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
    daily_room_url: week.daily_room_url || "",
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
  const [newQuestionType, setNewQuestionType] = useState({ workbook: "free", knowledge: "free", summative: "free", practical: "free" });
  const [newQuestionMarks, setNewQuestionMarks] = useState({ workbook: "", knowledge: "", summative: "", practical: "" });
  const [newQuestionOptions, setNewQuestionOptions] = useState({ workbook: [], knowledge: [], summative: [], practical: [] });
  const [newOptionText, setNewOptionText] = useState({ workbook: "", knowledge: "", summative: "", practical: "" });
  const [activityDeadlines, setActivityDeadlines] = useState(week.activity_deadlines || {});
  const [chapters, setChapters] = useState(week.guide_chapters || []);
  const [extractingChapters, setExtractingChapters] = useState(false);
  const [voiceRecordings, setVoiceRecordings] = useState(week.voice_recordings || []);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [youtubeLinks, setYoutubeLinks] = useState(week.youtube_links || []);
  const [newYoutube, setNewYoutube] = useState({ title: "", url: "" });
  const [readingLinks, setReadingLinks] = useState(week.reading_links || []);
  const [newReading, setNewReading] = useState({ title: "", url: "", viewMode: "modal" });
  const [generatingFor, setGeneratingFor] = useState(null);
  const [step, setStep] = useState(0);

  const STEPS = [
    { key: "basics", label: "Basics" },
    { key: "session", label: "Live Session" },
    { key: "intro", label: "Intro & Links" },
    { key: "materials", label: "Materials" },
    { key: "chapters", label: "Guide Chapters" },
    { key: "resources", label: "Resources" },
    { key: "questions", label: "Questions" },
  ];

  const handleFieldChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleCreateDailyRoom = async () => {
    setSchedulingMeeting(true);
    try {
      const res = await fetch("/api/create-daily-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekTitle: form.unit_standard_title, sessionDatetime: form.session_datetime }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      handleFieldChange("daily_room_url", data.roomUrl);
      alert("In-platform video room created and linked.");
    } catch (err) {
      alert("Could not create video room: " + err.message);
    } finally {
      setSchedulingMeeting(false);
    }
  };

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

  const extractChapters = async () => {
    if (!form.learner_guide_url) return alert("Upload the Learner Guide first.");
    setExtractingChapters(true);
    try {
      const res = await fetch("/api/generate-chapters-from-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: form.learner_guide_url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChapters(data.chapters);
    } catch (err) {
      alert("Could not extract chapters: " + err.message);
    } finally {
      setExtractingChapters(false);
    }
  };

  const removeChapter = (i) => setChapters((prev) => prev.filter((_, idx) => idx !== i));

  const handleVoiceUpload = async (file) => {
    setUploadingVoice(true);
    try {
      const path = `${week.programme_id}/voice_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("programme-content").upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("programme-content").getPublicUrl(path);
      setVoiceRecordings((prev) => [...prev, { url: data.publicUrl, label: file.name }]);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingVoice(false);
    }
  };

  const removeVoice = (i) => setVoiceRecordings((prev) => prev.filter((_, idx) => idx !== i));

  const addYoutube = () => {
    if (!newYoutube.url.trim()) return;
    setYoutubeLinks((prev) => [...prev, { title: newYoutube.title || "Video", url: newYoutube.url }]);
    setNewYoutube({ title: "", url: "" });
  };
  const removeYoutube = (i) => setYoutubeLinks((prev) => prev.filter((_, idx) => idx !== i));

  const addReading = () => {
    if (!newReading.url.trim()) return;
    setReadingLinks((prev) => [...prev, { ...newReading, title: newReading.title || newReading.url }]);
    setNewReading({ title: "", url: "", viewMode: "modal" });
  };
  const removeReading = (i) => setReadingLinks((prev) => prev.filter((_, idx) => idx !== i));

  const generateFromPdf = async (activityKey, fileUrl) => {
    setGeneratingFor(activityKey);
    try {
      const res = await fetch("/api/generate-questions-from-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, activityType: activityKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions((prev) => ({ ...prev, [activityKey]: [...(prev[activityKey] || []), ...data.questions] }));
    } catch (err) {
      alert("Could not generate questions: " + err.message);
    } finally {
      setGeneratingFor(null);
    }
  };

  const addQuestion = (activityKey) => {
    const text = newQuestionText[activityKey]?.trim();
    if (!text) return;
    setQuestions((prev) => ({
      ...prev,
      [activityKey]: [...(prev[activityKey] || []), {
        text,
        type: newQuestionType[activityKey],
        marks: newQuestionMarks[activityKey] ? Number(newQuestionMarks[activityKey]) : null,
        options: newQuestionOptions[activityKey],
        media: null,
      }],
    }));
    setNewQuestionText((prev) => ({ ...prev, [activityKey]: "" }));
    setNewQuestionType((prev) => ({ ...prev, [activityKey]: "free" }));
    setNewQuestionMarks((prev) => ({ ...prev, [activityKey]: "" }));
    setNewQuestionOptions((prev) => ({ ...prev, [activityKey]: [] }));
  };

  const addOptionToQuestion = (activityKey) => {
    const opt = newOptionText[activityKey]?.trim();
    if (!opt) return;
    setNewQuestionOptions((prev) => ({ ...prev, [activityKey]: [...prev[activityKey], opt] }));
    setNewOptionText((prev) => ({ ...prev, [activityKey]: "" }));
  };
  const removeOptionFromQuestion = (activityKey, i) => {
    setNewQuestionOptions((prev) => ({ ...prev, [activityKey]: prev[activityKey].filter((_, idx) => idx !== i) }));
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

  const handleSave = async () => {
    setSaving(true);
    try {
            const payload = {
        ...form,
        session_datetime: form.session_datetime ? new Date(form.session_datetime).toISOString() : null,
        programme_id: week.programme_id,
        institution_id: week.institution_id,
        activity_questions: questions,
        guide_chapters: chapters,
        voice_recordings: voiceRecordings,
        youtube_links: youtubeLinks,
        reading_links: readingLinks,
        activity_deadlines: activityDeadlines,
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

  const canGoNext = () => {
    if (step === 0) return form.unit_standard_title.trim() && form.week_start_date && form.week_end_date;
    return true;
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col" style={{ background: "var(--paper)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10">X</button>

          <div className="p-8 pb-4 flex-shrink-0">
            <p className="text-xs font-mono text-[var(--text-muted)] mb-1">{readOnly ? "PAST WEEK" : week.id ? "EDIT WEEK" : "NEW WEEK"}</p>
            <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>
              {readOnly ? "Week Content (locked)" : week.id ? "Edit Weekly Content" : "Add Weekly Content"}
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStep(i)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    i === step
                      ? { background: "var(--brand-color)", color: "white" }
                      : i < step
                      ? { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }
                      : { background: "var(--paper-muted)", color: "var(--text-muted)" }
                  }
                >
                  {i + 1}. {s.label}
                </button>
              ))}
            </div>

            {readOnly && (
              <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--paper-muted)", color: "var(--text-muted)" }}>
                This week has already passed. Deadlines and learner submissions may already be tied to it, so it's locked for editing. You can still view everything that was published.
              </div>
            )}
          </div>

          <div className="px-8 overflow-y-auto flex-1 space-y-3">
            {step === 0 && (
              <>
                <input
                  type="text" placeholder="Week title (e.g. Week 3: Budgeting Basics)"
                  value={form.unit_standard_title} onChange={(e) => handleFieldChange("unit_standard_title", e.target.value)}
                  disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Start date</label>
                    <input type="date" value={form.week_start_date} onChange={(e) => handleFieldChange("week_start_date", e.target.value)} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">End date</label>
                    <input type="date" value={form.week_end_date} onChange={(e) => handleFieldChange("week_end_date", e.target.value)} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Live session date &amp; time</label>
                <input
                  type="datetime-local" value={form.session_datetime}
                  onChange={(e) => handleFieldChange("session_datetime", e.target.value)}
                  disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }}
                />
                                {!readOnly && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      disabled={!form.session_datetime || schedulingMeeting}
                      onClick={handleScheduleTeamsMeeting}
                      className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
                    >
                      {schedulingMeeting ? "Working..." : "Schedule Teams Meeting"}
                    </button>
                                        <button
                      type="button"
                      disabled={!form.session_datetime || schedulingMeeting}
                      onClick={handleCreateDailyRoom}
                      className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
                    >
                      {schedulingMeeting ? "Working..." : "Create In-Platform Video Room"}
                    </button>
                  </div>
                )}
                {form.teams_session_link && (
                  <p className="text-xs mt-1" style={{ color: "var(--seal-gold)" }}>Teams meeting link ready</p>
                )}
                {form.daily_room_url && (
                  <p className="text-xs mt-1" style={{ color: "var(--seal-gold)" }}>In-platform video room ready</p>
                )}
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Facilitator's Intro</label>
                  <textarea value={form.facilitator_intro} onChange={(e) => handleFieldChange("facilitator_intro", e.target.value)} rows={4} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Teams / Live Session Link</label>
                  <input type="url" value={form.teams_session_link} onChange={(e) => handleFieldChange("teams_session_link", e.target.value)} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Video Link (optional, if separate)</label>
                  <input type="url" value={form.video_url} onChange={(e) => handleFieldChange("video_url", e.target.value)} disabled={readOnly} className={inputClass} style={{ borderColor: "var(--border-soft)" }} placeholder="https://..." />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                {[
                  { key: "learner_guide_url", label: "Learner Guide" },
                  { key: "learner_workbook_url", label: "Learner Workbook" },
                  { key: "knowledge_module_url", label: "Knowledge Module" },
                  { key: "summative_assessment_url", label: "Summative Assessment" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">{f.label}</label>
                    {readOnly ? (
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
              </>
            )}

            {step === 4 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-[var(--text-muted)]">Learner Guide Chapters</label>
                  {!readOnly && form.learner_guide_url && (
                    <button type="button" onClick={extractChapters} disabled={extractingChapters} className="text-xs font-medium disabled:opacity-50" style={{ color: "var(--seal-gold)" }}>
                      {extractingChapters ? "Extracting..." : "Extract from PDF"}
                    </button>
                  )}
                </div>
                {chapters.length === 0 ? (
                  <p className="text-xs text-gray-400">No chapters yet. Upload the Learner Guide in Materials, then extract, or add manually below.</p>
                ) : (
                  <ul className="space-y-1 mb-2">
                    {chapters.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                        <span className="text-gray-700 truncate">{i + 1}. {c.title}</span>
                        {!readOnly && <button type="button" onClick={() => removeChapter(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>}
                      </li>
                    ))}
                  </ul>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setChapters((prev) => [...prev, { title: `Chapter ${prev.length + 1}`, content: "" }])}
                    className="text-xs font-medium" style={{ color: "var(--brand-color)" }}
                  >
                    + Add chapter manually
                  </button>
                )}
              </div>
            )}

            {step === 5 && (
              <>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Voice Recordings</label>
                  {voiceRecordings.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {voiceRecordings.map((v, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                          <a href={v.url} target="_blank" rel="noopener noreferrer" className="truncate" style={{ color: "var(--brand-color)" }}>{v.label}</a>
                          {!readOnly && <button type="button" onClick={() => removeVoice(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!readOnly && (
                    <div className="flex items-center gap-3">
                      <input type="file" accept="audio/*" onChange={(e) => e.target.files[0] && handleVoiceUpload(e.target.files[0])} className="text-sm text-gray-500" />
                      {uploadingVoice && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">YouTube Videos</label>
                  {youtubeLinks.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {youtubeLinks.map((y, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                          <span className="truncate text-gray-700">{y.title}</span>
                          {!readOnly && <button type="button" onClick={() => removeYoutube(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!readOnly && (
                    <div className="flex gap-2">
                      <input type="text" placeholder="Title" value={newYoutube.title} onChange={(e) => setNewYoutube((p) => ({ ...p, title: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
                      <input type="url" placeholder="YouTube URL" value={newYoutube.url} onChange={(e) => setNewYoutube((p) => ({ ...p, url: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
                      <button type="button" onClick={addYoutube} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add</button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Reading Links</label>
                  {readingLinks.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {readingLinks.map((r, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                          <span className="truncate text-gray-700">{r.title} <span className="text-gray-400">({r.viewMode === "modal" ? "in-site" : "new tab"})</span></span>
                          {!readOnly && <button type="button" onClick={() => removeReading(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!readOnly && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder="Title" value={newReading.title} onChange={(e) => setNewReading((p) => ({ ...p, title: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
                        <input type="url" placeholder="URL" value={newReading.url} onChange={(e) => setNewReading((p) => ({ ...p, url: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input type="radio" checked={newReading.viewMode === "modal"} onChange={() => setNewReading((p) => ({ ...p, viewMode: "modal" }))} /> Open in-site
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input type="radio" checked={newReading.viewMode === "newtab"} onChange={() => setNewReading((p) => ({ ...p, viewMode: "newtab" }))} /> Open in new tab
                        </label>
                        <button type="button" onClick={addReading} className="ml-auto px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 6 && (
              <>
                {["workbook", "knowledge", "summative", "practical"].map((activityKey) => (
                  <div key={activityKey} className="pt-2 border-t first:border-0 first:pt-0" style={{ borderColor: "var(--border-soft)" }}>
                                        <div className="flex items-center gap-3 mb-2">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Deadline</label>
                        <input
                          type="date"
                          value={activityDeadlines[activityKey]?.deadline || ""}
                          onChange={(e) => setActivityDeadlines((prev) => ({ ...prev, [activityKey]: { ...prev[activityKey], deadline: e.target.value } }))}
                          disabled={readOnly}
                          className="px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: "var(--border-soft)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Time limit (mins)</label>
                        <input
                          type="number" placeholder="No limit"
                          value={activityDeadlines[activityKey]?.time_limit_minutes || ""}
                          onChange={(e) => setActivityDeadlines((prev) => ({ ...prev, [activityKey]: { ...prev[activityKey], time_limit_minutes: e.target.value ? Number(e.target.value) : null } }))}
                          disabled={readOnly}
                          className="w-24 px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: "var(--border-soft)" }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-[var(--text-muted)] capitalize">{activityKey} Questions</label>
                      {!readOnly && (() => {
                        const urlKey = activityKey === "workbook" ? "learner_workbook_url" : activityKey === "knowledge" ? "knowledge_module_url" : activityKey === "summative" ? "summative_assessment_url" : null;
                        const fileUrl = urlKey ? form[urlKey] : null;
                        if (!fileUrl) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => generateFromPdf(activityKey, fileUrl)}
                            disabled={generatingFor === activityKey}
                            className="text-xs font-medium disabled:opacity-50"
                            style={{ color: "var(--seal-gold)" }}
                          >
                            {generatingFor === activityKey ? "Generating..." : "Generate from PDF"}
                          </button>
                        );
                      })()}
                    </div>
                                        {readOnly ? (
                      (questions[activityKey] || []).length === 0 ? (
                        <span className="text-xs text-gray-400">No questions set</span>
                      ) : (
                        <ul className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                          {questions[activityKey].map((q, i) => <li key={i}>{typeof q === "string" ? q : q.text}</li>)}
                        </ul>
                      )
                    ) : (
                      <>
                        <ul className="space-y-1 mb-2">
                          {(questions[activityKey] || []).map((q, i) => {
                            const qText = typeof q === "string" ? q : q.text;
                            const qType = typeof q === "string" ? "free" : q.type;
                            const qMarks = typeof q === "string" ? null : q.marks;
                            return (
                              <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                                <span className="text-gray-700">{i + 1}. {qText} <span className="text-xs text-gray-400 capitalize">({qType.replace("_", " ")}{qMarks != null ? `, ${qMarks} marks` : ""})</span></span>
                                <button type="button" onClick={() => removeQuestion(activityKey, i)} className="text-xs text-red-500 hover:underline">Remove</button>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="space-y-2">
                          <input
                            type="text" placeholder="Question text"
                            value={newQuestionText[activityKey]}
                            onChange={(e) => setNewQuestionText((prev) => ({ ...prev, [activityKey]: e.target.value }))}
                            className={inputClass} style={{ borderColor: "var(--border-soft)" }}
                          />
                          <div className="flex gap-2">
                            <select
                              value={newQuestionType[activityKey]}
                              onChange={(e) => setNewQuestionType((prev) => ({ ...prev, [activityKey]: e.target.value }))}
                              className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }}
                            >
                              <option value="free">Free text</option>
                              <option value="mcq">Multiple choice (single answer)</option>
                              <option value="multi_select">Multiple choice (select several)</option>
                              <option value="yesno">Yes / No</option>
                              <option value="image_answer">Image upload</option>
                              <option value="audio_answer">Audio recording</option>
                            </select>
                            <input
                              type="number" placeholder="Marks"
                              value={newQuestionMarks[activityKey]}
                              onChange={(e) => setNewQuestionMarks((prev) => ({ ...prev, [activityKey]: e.target.value }))}
                              className={`${inputClass} w-24`} style={{ borderColor: "var(--border-soft)" }}
                            />
                            <button type="button" onClick={() => addQuestion(activityKey)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                              Add
                            </button>
                          </div>
                          {(newQuestionType[activityKey] === "mcq" || newQuestionType[activityKey] === "multi_select") && (
                            <div className="p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                              <p className="text-xs text-[var(--text-muted)] mb-2">Answer options</p>
                              {newQuestionOptions[activityKey].length > 0 && (
                                <ul className="space-y-1 mb-2">
                                  {newQuestionOptions[activityKey].map((opt, i) => (
                                    <li key={i} className="flex items-center justify-between gap-2 text-sm p-1.5 rounded" style={{ background: "white" }}>
                                      <span>{opt}</span>
                                      <button type="button" onClick={() => removeOptionFromQuestion(activityKey, i)} className="text-xs text-red-500 hover:underline">Remove</button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text" placeholder="Add an option"
                                  value={newOptionText[activityKey]}
                                  onChange={(e) => setNewOptionText((prev) => ({ ...prev, [activityKey]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOptionToQuestion(activityKey); } }}
                                  className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }}
                                />
                                <button type="button" onClick={() => addOptionToQuestion(activityKey)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add Option</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="p-8 pt-4 flex-shrink-0 flex items-center justify-between gap-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
            <button
              type="button" onClick={goBack} disabled={step === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
              style={{ color: "var(--text)" }}
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button" onClick={goNext} disabled={!canGoNext()}
                className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--brand-color)" }}
              >
                Next: {STEPS[step + 1].label}
              </button>
            ) : !readOnly ? (
              <button
                type="button" onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--brand-color)" }}
              >
                {saving ? "Saving..." : week.id ? "Save Changes" : "Publish Week"}
              </button>
            ) : (
              <span className="text-xs text-gray-400">Locked</span>
            )}
          </div>
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