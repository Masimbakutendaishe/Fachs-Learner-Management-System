"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "./context/AuthContext";

const ACTIVITY_LABELS = {
  workbook: "Learner Workbook",
  knowledge: "Knowledge Module",
  summative: "Summative Assessment",
  practical: "Practical Evidence",
};

export default function GradeSubmissionsPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("submitted");
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [fileUrls, setFileUrls] = useState({});

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    let query = supabase
      .from("submissions")
      .select(`
        id, activity_type, file_url, answers, status, grade, feedback, submitted_at,
        profiles ( id, first_name, surname ),
        programmes ( id, name ),
        unit_weeks ( unit_standard_title )
      `)
      .order("submitted_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) console.error(error);
    setSubmissions(data || []);
    setLoading(false);
  };

  const getFileUrl = async (submissionId, path) => {
    if (fileUrls[submissionId]) return fileUrls[submissionId];
    const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 3600);
    if (error) {
      alert("Could not load file: " + error.message);
      return null;
    }
    setFileUrls((prev) => ({ ...prev, [submissionId]: data.signedUrl }));
    return data.signedUrl;
  };

  const handleSave = async (submission) => {
    const draft = drafts[submission.id] || {};
    setSavingId(submission.id);
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          grade: draft.grade ?? submission.grade,
          feedback: draft.feedback ?? submission.feedback,
          status: "graded",
          graded_at: new Date().toISOString(),
          graded_by: profile?.id,
        })
        .eq("id", submission.id);
      if (error) throw error;
      fetchSubmissions();
    } catch (err) {
      alert("Could not save grade: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (id, field, value) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">FACILITATOR</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>
        Grade Submissions
      </h1>
      <p className="text-[var(--text-muted)] mb-6">Review learner work and record marks and feedback.</p>

      <div className="flex gap-2 mb-6">
        {[
          { key: "submitted", label: "Awaiting Grading" },
          { key: "graded", label: "Graded" },
          { key: "all", label: "All" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={
              filter === f.key
                ? { background: "var(--brand-color)", color: "white" }
                : { background: "var(--paper)", color: "var(--text-muted)", border: "1px solid var(--border-soft)" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">
          No submissions {filter === "submitted" ? "awaiting grading" : filter === "graded" ? "graded yet" : "yet"}.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const draft = drafts[sub.id] || {};
            const learnerName = sub.profiles ? `${sub.profiles.first_name || ""} ${sub.profiles.surname || ""}`.trim() : "Unknown learner";
            return (
              <div key={sub.id} className="paper p-5">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>{learnerName}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {sub.programmes?.name} {sub.unit_weeks?.unit_standard_title ? `· ${sub.unit_weeks.unit_standard_title}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {ACTIVITY_LABELS[sub.activity_type] || sub.activity_type} · Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={
                      sub.status === "graded"
                        ? { background: "#ECFDF5", color: "#047857" }
                        : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }
                    }
                  >
                    {sub.status === "graded" ? "Graded" : "Awaiting grading"}
                  </span>
                </div>

                {sub.file_url ? (
                  <button
                    onClick={async () => {
                      const url = await getFileUrl(sub.id, sub.file_url);
                      if (url) window.open(url, "_blank");
                    }}
                    className="text-sm font-medium mb-3 inline-block"
                    style={{ color: "var(--brand-color)" }}
                  >
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
                    type="number"
                    placeholder="Grade"
                    defaultValue={sub.grade ?? ""}
                    onChange={(e) => updateDraft(sub.id, "grade", e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border-soft)" }}
                  />
                  <textarea
                    placeholder="Feedback for the learner..."
                    defaultValue={sub.feedback ?? ""}
                    onChange={(e) => updateDraft(sub.id, "feedback", e.target.value)}
                    rows={2}
                    className="px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: "var(--border-soft)" }}
                  />
                  <button
                    onClick={() => handleSave(sub)}
                    disabled={savingId === sub.id}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: "var(--brand-color)" }}
                  >
                    {savingId === sub.id ? "Saving..." : "Save Grade"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}