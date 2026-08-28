"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";

const ACTIVITY_LABELS = {
  workbook: "Workbook",
  knowledge: "Knowledge",
  summative: "Summative",
  practical: "Practical",
  activity_book: "Activity Book",
};

export default function SchoolGradebook({ programme, enrolledLearners }) {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [programme.id]);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("submissions")
      .select("user_id, activity_type, grade, status, unit_week_id, unit_weeks ( unit_standard_title )")
      .eq("programme_id", programme.id);
    setSubmissions(data || []);
    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading gradebook...</p>;

  const columns = [];
  const seen = new Set();
  submissions.forEach((s) => {
    const colKey = s.unit_week_id ? `${s.unit_week_id}_${s.activity_type}` : s.activity_type;
    if (!seen.has(colKey)) {
      seen.add(colKey);
      columns.push({
        key: colKey,
        unitWeekId: s.unit_week_id,
        activityType: s.activity_type,
        label: s.unit_weeks
          ? `${s.unit_weeks.unit_standard_title} - ${ACTIVITY_LABELS[s.activity_type] || s.activity_type}`
          : ACTIVITY_LABELS[s.activity_type] || s.activity_type,
      });
    }
  });

  const getCell = (userId, col) => {
    return submissions.find((s) => {
      const colKey = s.unit_week_id ? `${s.unit_week_id}_${s.activity_type}` : s.activity_type;
      return s.user_id === userId && colKey === col.key;
    });
  };

  const getAverage = (userId) => {
    const grades = submissions
      .filter((s) => s.user_id === userId && s.status === "graded" && s.grade != null)
      .map((s) => Number(s.grade));
    if (grades.length === 0) return null;
    return (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1);
  };

  if (columns.length === 0) {
    return <div className="paper p-8 text-center text-gray-500 text-sm">No submissions yet, the gradebook will populate as learners submit and get graded.</div>;
  }

  return (
    <div className="paper overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
            <th className="px-4 py-3 font-medium text-gray-500 sticky left-0" style={{ background: "var(--paper)" }}>Learner</th>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{col.label}</th>
            ))}
            <th className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Average</th>
          </tr>
        </thead>
        <tbody>
          {enrolledLearners.map((l) => {
            const name = l.profiles ? `${l.profiles.first_name || ""} ${l.profiles.surname || ""}`.trim() : "Unknown";
            const avg = getAverage(l.user_id);
            return (
              <tr key={l.user_id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                <td className="px-4 py-3 font-medium sticky left-0" style={{ color: "var(--text)", background: "var(--paper)" }}>{name}</td>
                {columns.map((col) => {
                  const cell = getCell(l.user_id, col);
                  return (
                    <td key={col.key} className="px-4 py-3 text-center font-mono">
                      {!cell ? (
                        <span className="text-gray-300">-</span>
                      ) : cell.status === "graded" ? (
                        <span style={{ color: "var(--text)" }}>{cell.grade}</span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--seal-gold)" }}>Pending</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center font-mono font-semibold" style={{ color: "var(--brand-color)" }}>
                  {avg ?? <span className="text-gray-300 font-normal">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
