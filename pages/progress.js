"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "./context/AuthContext";
import SealProgress from "../components/SealProgress";

const ACTIVITY_LABELS = {
  workbook: "Learner Workbook",
  knowledge: "Knowledge Module",
  summative: "Summative Assessment",
  practical: "Practical Evidence",
};

export default function ProgressPage() {
  const supabase = createClient();
  const { user, institution } = useAuth();
  const [thisWeek, setThisWeek] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [parentCode, setParentCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchExistingParentCode = async () => {
    const { data } = await supabase
      .from("learner_parent_invite_codes")
      .select("code")
      .eq("learner_id", user.id)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setParentCode(data?.code || null);
  };

  const generateParentCode = async () => {
    setGeneratingCode(true);
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error } = await supabase.from("learner_parent_invite_codes").insert({
      learner_id: user.id,
      institution_id: institution.id,
      code,
    });
    if (error) alert(error.message);
    else setParentCode(code);
    setGeneratingCode(false);
  };

  const copyParentCode = () => {
    navigator.clipboard.writeText(parentCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const fetchData = async () => {
    setLoading(true);
    if (institution) fetchExistingParentCode();

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, progress, credits_earned, credits_total, programme_id, programmes ( id, name )")
      .eq("user_id", user.id);

    const today = new Date().toISOString().split("T")[0];
    const weekRows = [];

    for (const e of enrollments || []) {
      const { data: weeks } = await supabase
        .from("unit_weeks")
        .select("id, unit_standard_title, week_start_date, week_end_date")
        .eq("programme_id", e.programme_id)
        .lte("week_start_date", today)
        .gte("week_end_date", today);

      if (weeks?.length) {
        weekRows.push({ ...weeks[0], enrollment: e });
      }
    }
    setThisWeek(weekRows);

    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        id, activity_type, status, grade, feedback, submitted_at, graded_at,
        programmes ( name )
      `)
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    setGrades(submissions || []);

    const { data: attendanceData } = await supabase
      .from("daily_attendance")
      .select("date, status, programmes ( name )")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(14);
    setAttendance(attendanceData || []);

    const { data: invoicesData } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });
    setInvoices(invoicesData || []);

    setLoading(false);
  };

  const payInvoice = async (invoiceId) => {
    const res = await fetch("/api/create-invoice-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || "Could not start payment");
  };

  if (loading) {
    return <p className="text-sm font-mono text-[var(--text-muted)]">Loading your progress...</p>;
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <header>
        <p className="text-xs font-mono text-[var(--text-muted)] mb-1">MY PROGRESS</p>
        <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--text)" }}>This Week &amp; My Marks</h1>
      </header>

      <section>
        <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Due This Week</h2>
        {thisWeek.length === 0 ? (
          <div className="paper p-6 text-center text-gray-500 text-sm">
            Nothing scheduled for this week right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {thisWeek.map((w) => (
              <div key={w.enrollment.id} className="paper p-5 card-lift">
                <p className="text-xs text-gray-400 font-mono mb-1">{w.enrollment.programmes?.name}</p>
                <h3 className="font-display font-semibold mb-2" style={{ color: "var(--text)" }}>{w.unit_standard_title}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Due by <span className="font-medium">{new Date(w.week_end_date).toLocaleDateString()}</span>
                </p>
                <Link
                  href={`/module-player/${w.enrollment.id}`}
                  className="inline-block text-sm font-medium"
                  style={{ color: "var(--brand-color)" }}
                >
                  Continue this week →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {invoices.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>My Fees</h2>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="paper p-5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium" style={{ color: "var(--text)" }}>{inv.description}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    ${inv.amount} {inv.due_date && `- Due ${new Date(inv.due_date).toLocaleDateString()}`}
                  </p>
                </div>
                {inv.status === "paid" ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#047857" }}>Paid</span>
                ) : (
                  <button
                    onClick={() => payInvoice(inv.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
                    style={{ background: "var(--brand-color)" }}
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {attendance.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>My Attendance</h2>
          <div className="paper p-5">
            <div className="flex flex-wrap gap-2">
              {attendance.map((a, i) => (
                <div
                  key={i}
                  title={`${a.programmes?.name || ""} - ${a.status}`}
                  className="text-xs font-medium px-3 py-2 rounded-lg text-center"
                  style={
                    a.status === "present" ? { background: "#ECFDF5", color: "#047857" } :
                    a.status === "late" ? { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" } :
                    { background: "#FEF2F2", color: "#B91C1C" }
                  }
                >
                  <div className="font-mono">{new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  <div className="capitalize mt-0.5">{a.status}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>My Marks</h2>
        {grades.length === 0 ? (
          <div className="paper p-6 text-center text-gray-500 text-sm">
            No submissions yet.
          </div>
        ) : (
          <div className="paper overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                  <th className="px-4 py-3 font-medium text-gray-500">Programme</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Activity</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Submitted</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Grade</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                    <td className="px-4 py-3" style={{ color: "var(--text)" }}>{g.programmes?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{ACTIVITY_LABELS[g.activity_type] || g.activity_type}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{new Date(g.submitted_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={g.status === "graded" ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}
                      >
                        {g.status === "graded" ? "Graded" : "Awaiting grading"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text)" }}>{g.grade ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={g.feedback}>{g.feedback || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Invite a Parent</h2>
        <div className="paper p-6">
          {parentCode ? (
            <div className="flex items-center gap-3 flex-wrap">
              <code className="px-3 py-2 rounded-lg font-mono text-sm" style={{ background: "var(--paper-muted)", border: "1px solid var(--border-soft)" }}>{parentCode}</code>
              <button onClick={copyParentCode} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                {codeCopied ? "Copied!" : "Copy Code"}
              </button>
              <button onClick={generateParentCode} disabled={generatingCode} className="text-xs font-medium disabled:opacity-50" style={{ color: "var(--brand-color)" }}>
                Generate a new code
              </button>
            </div>
          ) : (
            <button onClick={generateParentCode} disabled={generatingCode} className="btn-silver px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {generatingCode ? "Generating..." : "Generate Parent Invite Code"}
            </button>
          )}
          <p className="text-xs text-gray-500 mt-3">Share this code with your parent, they'll enter it when signing up to see your grades, attendance, and announcements.</p>
        </div>
      </section>
    </div>
  );
}