"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";

const ACTIVITY_LABELS = {
  workbook: "Workbook",
  knowledge: "Knowledge",
  summative: "Summative",
  practical: "Practical",
};

export default function SchoolAssignmentCenter({ programme, enrolledLearners }) {
  const supabase = createClient();
  const [weeks, setWeeks] = useState([]);
  const [hasActivityBook, setHasActivityBook] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("by_learner");

  useEffect(() => {
    fetchAll();
  }, [programme.id]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: weeksData } = await supabase
      .from("unit_weeks")
      .select("id, unit_standard_title, week_end_date, activity_questions")
      .eq("programme_id", programme.id);
    setWeeks(weeksData || []);

    const { data: prog } = await supabase.from("programmes").select("activity_book_questions").eq("id", programme.id).single();
    setHasActivityBook((prog?.activity_book_questions || []).length > 0);

    const { data: subsData } = await supabase
      .from("submissions")
      .select("user_id, activity_type, unit_week_id")
      .eq("programme_id", programme.id);
    setSubmissions(subsData || []);

    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  const assignments = [];
  weeks.forEach((w) => {
    Object.entries(w.activity_questions || {}).forEach(([activityType, questions]) => {
      if (questions?.length > 0) {
        assignments.push({
          key: `${w.id}_${activityType}`,
          unitWeekId: w.id,
          activityType,
          label: `${w.unit_standard_title} - ${ACTIVITY_LABELS[activityType] || activityType}`,
          dueDate: w.week_end_date,
        });
      }
    });
  });
  if (hasActivityBook) {
    assignments.push({ key: "activity_book", unitWeekId: null, activityType: "activity_book", label: "Activity Book", dueDate: null });
  }

  const hasSubmitted = (userId, assignment) => {
    return submissions.some((s) => {
      const subKey = s.unit_week_id ? `${s.unit_week_id}_${s.activity_type}` : s.activity_type;
      return s.user_id === userId && subKey === assignment.key;
    });
  };

  const today = new Date().toISOString().split("T")[0];

  if (assignments.length === 0) {
    return <div className="paper p-8 text-center text-gray-500 text-sm">No assignable activities yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("by_learner")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={viewMode === "by_learner" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
        >
          By Learner
        </button>
        <button
          onClick={() => setViewMode("by_assignment")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={viewMode === "by_assignment" ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
        >
          By Assignment
        </button>
      </div>

      {viewMode === "by_learner" ? (
        <div className="space-y-3">
          {enrolledLearners.map((l) => {
            const name = l.profiles ? `${l.profiles.first_name || ""} ${l.profiles.surname || ""}`.trim() : "Unknown";
            const missing = assignments.filter((a) => !hasSubmitted(l.user_id, a));
            if (missing.length === 0) return null;
            return (
              <div key={l.user_id} className="paper p-5">
                <p className="font-medium mb-2" style={{ color: "var(--text)" }}>{name}</p>
                <ul className="space-y-1">
                  {missing.map((a) => {
                    const overdue = a.dueDate && a.dueDate < today;
                    return (
                      <li key={a.key} className="text-sm flex items-center justify-between">
                        <span className="text-gray-600">{a.label}</span>
                        {overdue ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#FEF2F2", color: "#B91C1C" }}>Overdue</span>
                        ) : a.dueDate ? (
                          <span className="text-xs text-gray-400 font-mono">Due {new Date(a.dueDate).toLocaleDateString()}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {enrolledLearners.every((l) => assignments.every((a) => hasSubmitted(l.user_id, a))) && (
            <div className="paper p-8 text-center text-gray-500 text-sm">Everyone's caught up, nothing missing right now.</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const missingLearners = enrolledLearners.filter((l) => !hasSubmitted(l.user_id, a));
            const overdue = a.dueDate && a.dueDate < today;
            return (
              <div key={a.key} className="paper p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium" style={{ color: "var(--text)" }}>{a.label}</p>
                  <span className="text-xs font-mono" style={{ color: overdue ? "#B91C1C" : "var(--text-muted)" }}>
                    {missingLearners.length} of {enrolledLearners.length} missing
                    {a.dueDate && ` - due ${new Date(a.dueDate).toLocaleDateString()}`}
                  </span>
                </div>
                {missingLearners.length === 0 ? (
                  <p className="text-xs text-emerald-600">Everyone has submitted.</p>
                ) : (
                  <p className="text-sm text-gray-600">
                    {missingLearners.map((l) => (l.profiles ? `${l.profiles.first_name || ""} ${l.profiles.surname || ""}`.trim() : "Unknown")).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
