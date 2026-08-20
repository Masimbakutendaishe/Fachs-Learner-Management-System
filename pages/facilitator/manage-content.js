"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { Plus, Pencil, Eye } from "lucide-react";

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

const FIELDS = [
  { key: "facilitator_intro", label: "Facilitator's Intro", type: "textarea" },
  { key: "teams_session_link", label: "Teams / Live Session Link", type: "url" },
  { key: "video_url", label: "Video Link (optional, if separate)", type: "url" },
  { key: "learner_guide_url", label: "Learner Guide", type: "file" },
  { key: "learner_workbook_url", label: "Learner Workbook", type: "file" },
  { key: "knowledge_module_url", label: "Knowledge Module", type: "file" },
  { key: "summative_assessment_url", label: "Summative Assessment", type: "file" },
];

export default function ManageContent() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [selectedProgramme, setSelectedProgramme] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWeek, setEditingWeek] = useState(null);

  useEffect(() => {
    fetchProgrammes();
  }, []);

  useEffect(() => {
    if (selectedProgramme) fetchWeeks(selectedProgramme.id);
  }, [selectedProgramme]);

  const fetchProgrammes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("programmes").select("*").eq("facilitator_id", user.id).order("name");
    setProgrammes(data || []);
    if (data?.length) setSelectedProgramme(data[0]);
    else setLoading(false);
  };

  const fetchWeeks = async (programmeId) => {
    setLoading(true);
    const { data } = await supabase
      .from("unit_weeks")
      .select("*")
      .eq("programme_id", programmeId)
      .order("week_start_date", { ascending: true });
    setWeeks(data || []);
    setLoading(false);
  };

  const handleSaved = () => {
    setEditingWeek(null);
    fetchWeeks(selectedProgramme.id);
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">FACILITATOR</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Weekly Content</h1>
      <p className="text-[var(--text-muted)] mb-6">Publish each week's materials, sessions, and assessments for your learners.</p>

      {programmes.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">
          You're not facilitating any programmes yet.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select
              value={selectedProgramme?.id || ""}
              onChange={(e) => setSelectedProgramme(programmes.find((p) => p.id === Number(e.target.value)))}
              className="px-4 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border-soft)" }}
            >
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={() => setEditingWeek({ programme_id: selectedProgramme.id, institution_id: selectedProgramme.institution_id })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
              style={{ background: "var(--brand-color)" }}
            >
              <Plus size={16} /> Add Week
            </button>
          </div>

          {loading ? (
            <p className="text-sm font-mono text-[var(--text-muted)]">Loading weeks...</p>
          ) : weeks.length === 0 ? (
            <div className="paper p-8 text-center text-gray-500 text-sm">No weeks published yet for this programme.</div>
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
                    <span
                      className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2"
                      style={STATUS_STYLE[status]}
                    >
                      {STATUS_STYLE[status].label}
                    </span>
                    <p className="text-xs text-gray-400 font-mono mb-3">
                      {w.week_start_date} to {w.week_end_date}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">{w.facilitator_intro || "No intro added yet."}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editingWeek && (
        <WeekModal
          week={editingWeek}
          onClose={() => setEditingWeek(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function WeekModal({ week, onClose, onSaved }) {
  const supabase = createClient();
  const readOnly = !!week.readOnly;
  const [form, setForm] = useState({
    unit_standard_title: week.unit_standard_title || "",
    week_start_date: week.week_start_date || "",
    week_end_date: week.week_end_date || "",
    facilitator_intro: week.facilitator_intro || "",
    teams_session_link: week.teams_session_link || "",
    video_url: week.video_url || "",
    learner_guide_url: week.learner_guide_url || "",
    learner_workbook_url: week.learner_workbook_url || "",
    knowledge_module_url: week.knowledge_module_url || "",
    summative_assessment_url: week.summative_assessment_url || "",
  });
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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
      const payload = { ...form, programme_id: week.programme_id, institution_id: week.institution_id };
      const { error } = week.id
        ? await supabase.from("unit_weeks").update(payload).eq("id", week.id)
        : await supabase.from("unit_weeks").insert([payload]);
      if (error) throw error;
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
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>

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
                    <input
                      type="file"
                      onChange={(e) => e.target.files[0] && handleFileUpload(f.key, e.target.files[0])}
                      className="text-sm text-gray-500"
                    />
                    {uploading === f.key && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
                    {form[f.key] && uploading !== f.key && (
                      <a href={form[f.key]} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>Uploaded ✓</a>
                    )}
                  </div>
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