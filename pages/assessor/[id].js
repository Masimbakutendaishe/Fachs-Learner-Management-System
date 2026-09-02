import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";
import QaChat from "../../components/QaChat";

const ACTIVITY_LABELS = {
  workbook: "Workbook",
  knowledge: "Knowledge",
  summative: "Summative",
  practical: "Practical",
  activity_book: "Activity Book",
};

export default function AssessorProgrammeReview() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = createClient();
  const { user } = useAuth();
  const [programme, setProgramme] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("awaiting");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("review");

  useEffect(() => {
    if (id && user) fetchAll();
  }, [id, user]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: access } = await supabase
      .from("qualification_reviewers")
      .select("id")
      .eq("programme_id", id)
      .eq("user_id", user.id)
      .eq("reviewer_role", "assessor")
      .maybeSingle();

    if (!access) {
      setProgramme(null);
      setLoading(false);
      return;
    }

    const { data: prog } = await supabase.from("programmes").select("*").eq("id", id).single();
    setProgramme(prog);

    const { data: subsData } = await supabase
      .from("submissions")
      .select(`
        id, activity_type, file_url, answers, grade, status, submitted_at,
        assessor_comment, assessor_signed_off, assessor_signed_at,
        profiles ( first_name, surname ),
        unit_weeks ( unit_standard_title, week_end_date )
      `)
      .eq("programme_id", id)
      .eq("status", "graded")
      .order("submitted_at", { ascending: false });
    setSubmissions(subsData || []);

    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;
  if (!programme) return <div className="paper p-8 text-center text-gray-500 text-sm">Not found, or you're not assigned as assessor for this qualification.</div>;

  const filtered = submissions.filter((s) => {
    if (filter === "awaiting") return !s.assessor_signed_off;
    if (filter === "reviewed") return s.assessor_signed_off;
    return true;
  });

  return (
    <div className="animate-fade-up">
      <Link href="/assessor/dashboard" className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 w-fit">
        <ArrowLeft size={16} /> Back to my qualifications
      </Link>

      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">ASSESSOR</p>
      <h1 className="font-display text-3xl font-semibold mb-6" style={{ color: "var(--text)" }}>{programme.name}</h1>

      <div className="flex justify-center mb-6">
        <div className="paper p-1.5 flex gap-1 rounded-2xl">
          {[
            { key: "review", label: "Review Submissions" },
            { key: "chat", label: "Chat with Facilitator" },
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

      {tab === "review" && (
        <>
          <div className="flex gap-2 mb-6">
            {[
              { key: "awaiting", label: "Awaiting Review" },
              { key: "reviewed", label: "Reviewed" },
              { key: "all", label: "All" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={filter === f.key ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="paper p-8 text-center text-gray-500 text-sm">Nothing here right now.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((sub) => (
                <AssessorSubmissionRow key={sub.id} sub={sub} supabase={supabase} onUpdated={fetchAll} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "chat" && (
        <QaChat programmeId={programme.id} institutionId={programme.institution_id} currentUserId={user.id} title="Chat with Facilitator" />
      )}
    </div>
  );
}

function AssessorSubmissionRow({ sub, supabase, onUpdated }) {
  const [comment, setComment] = useState(sub.assessor_comment || "");
  const [saving, setSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);

  const learnerName = sub.profiles ? `${sub.profiles.first_name || ""} ${sub.profiles.surname || ""}`.trim() : "Unknown learner";
  const deadlinePassed = sub.unit_weeks?.week_end_date && sub.submitted_at && new Date(sub.submitted_at) > new Date(sub.unit_weeks.week_end_date);

  const openFile = async () => {
    if (fileUrl) { window.open(fileUrl, "_blank"); return; }
    const { data, error } = await supabase.storage.from("submissions").createSignedUrl(sub.file_url, 3600);
    if (error) { alert("Could not load file: " + error.message); return; }
    setFileUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank");
  };

  const handleSignOff = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("submissions")
        .update({
          assessor_comment: comment,
          assessor_signed_off: true,
          assessor_signed_by: user.id,
          assessor_signed_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (error) throw error;
      onUpdated();
    } catch (err) {
      alert("Could not save: " + err.message);
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
            {sub.unit_weeks?.unit_standard_title || "Standing work"} - {ACTIVITY_LABELS[sub.activity_type] || sub.activity_type}
          </p>
          <p className="text-xs text-gray-400 font-mono">
            Submitted {new Date(sub.submitted_at).toLocaleDateString()}
            {deadlinePassed && <span className="text-red-500 ml-2">Submitted after deadline</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>Grade: {sub.grade}</span>
          {sub.assessor_signed_off && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#047857" }}>Signed Off</span>
          )}
        </div>
      </div>

      {sub.file_url ? (
        <button onClick={openFile} className="text-sm font-medium mb-3 inline-block" style={{ color: "var(--brand-color)" }}>View uploaded file (POE)</button>
      ) : sub.answers ? (
        <div className="p-4 rounded-xl mb-3 text-sm text-gray-600 space-y-2" style={{ background: "var(--paper-muted)" }}>
          {Object.entries(sub.answers).map(([q, a]) => (
            <p key={q}><span className="font-medium text-gray-800">Q{Number(q) + 1}:</span> {typeof a === "string" ? a : JSON.stringify(a)}</p>
          ))}
        </div>
      ) : null}

      <textarea
        placeholder="Assessor comment..." value={comment} onChange={(e) => setComment(e.target.value)}
        disabled={sub.assessor_signed_off} rows={2}
        className="w-full px-3 py-2 rounded-lg border text-sm mb-3 disabled:opacity-60" style={{ borderColor: "var(--border-soft)" }}
      />

      {!sub.assessor_signed_off && (
        <button onClick={handleSignOff} disabled={saving} className="btn-silver px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? "Signing..." : "Sign Off"}
        </button>
      )}
    </div>
  );
}
