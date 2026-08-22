"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClient } from "../../../../lib/supabase/client";
import { ArrowLeft } from "lucide-react";

const MODULE_LABELS = {
  knowledge: "Knowledge Module",
  practical: "Practical Module",
  workplace: "Workplace Module (Logbook)",
};

export default function QualificationModulesPage() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = createClient();

  const [programme, setProgramme] = useState(null);
  const [modules, setModules] = useState({});
  const [logbookEntries, setLogbookEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState("knowledge");

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: prog } = await supabase.from("programmes").select("*").eq("id", id).single();
    if (!prog || prog.facilitator_id !== user?.id) {
      setProgramme(null);
      setLoading(false);
      return;
    }
    setProgramme(prog);

    const { data: modulesData } = await supabase.from("qualification_modules").select("*").eq("programme_id", id);
    const byType = {};
    (modulesData || []).forEach((m) => { byType[m.module_type] = m; });
    setModules(byType);

    const { data: logbookData } = await supabase
      .from("logbook_entries")
      .select("*, profiles ( first_name, surname )")
      .eq("programme_id", id)
      .order("entry_date", { ascending: false });
    setLogbookEntries(logbookData || []);

    setLoading(false);
  };

  const signOffEntry = async (entryId, currentlySignedOff) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("logbook_entries")
      .update({ signed_off: !currentlySignedOff, signed_off_by: user.id })
      .eq("id", entryId);
    if (error) alert(error.message);
    else fetchAll();
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;
  if (!programme) return <div className="paper p-8 text-center text-gray-500 text-sm">Qualification not found, or you don't have access.</div>;

  return (
    <div className="animate-fade-up">
      <Link href={`/module-player/facilitator/${id}`} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 w-fit">
        <ArrowLeft size={16} /> Back to course
      </Link>

      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">QUALIFICATION MODULES</p>
      <h1 className="font-display text-3xl font-semibold mb-1" style={{ color: "var(--text)" }}>{programme.name}</h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{programme.qualification_type?.replace("_", " ")}</p>

        <div className="flex justify-center mb-6">
        <div className="paper p-1.5 flex gap-1 rounded-2xl flex-wrap justify-center">
          {Object.keys(MODULE_LABELS).map((key) => (
            <button
              key={key}
              onClick={() => setActiveModule(key)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={activeModule === key ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text-muted)" }}
            >
              {MODULE_LABELS[key]}
            </button>
          ))}
          {(programme.qualification_type === "full" || programme.qualification_type === "part") && (
            <button
              onClick={() => setActiveModule("isa")}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={activeModule === "isa" ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text-muted)" }}
            >
              ISA Criteria
            </button>
          )}
          {programme.qualification_type === "skills_programme" && (
            <button
              onClick={() => setActiveModule("fisa")}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={activeModule === "fisa" ? { background: "var(--brand-color)", color: "white" } : { color: "var(--text-muted)" }}
            >
              FISA
            </button>
          )}
        </div>
      </div>

      {activeModule === "workplace" ? (
        <WorkplaceLogbookReview entries={logbookEntries} module={modules.workplace} programme={programme} onSignOff={signOffEntry} onGuideUpdated={fetchAll} />
      ) : activeModule === "isa" ? (
        <IsaCriteriaEditor programme={programme} />
      ) : activeModule === "fisa" ? (
        <FisaEditor programme={programme} />
      ) : (
        <ModuleEditor
          key={activeModule}
          module={modules[activeModule]}
          moduleType={activeModule}
          programme={programme}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

function ModuleEditor({ module, moduleType, programme, onSaved }) {
  const supabase = createClient();
  const isPractical = moduleType === "practical";

  const [guideUrl, setGuideUrl] = useState(module?.guide_url || "");
  const [chapters, setChapters] = useState(module?.guide_chapters || []);
  const [questions, setQuestions] = useState(module?.questions || []);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newQ, setNewQ] = useState({ scenario: "", text: "", type: "free", marks: "" });

  const handleGuideUpload = async (file) => {
    setUploading(true);
    try {
      const path = `modules/${programme.id}/${moduleType}_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("programme-content").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("programme-content").getPublicUrl(path);
      setGuideUrl(data.publicUrl);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const extractChapters = async () => {
    if (!guideUrl) return alert("Upload the guide first.");
    setExtracting(true);
    try {
      const res = await fetch("/api/generate-chapters-from-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: guideUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChapters(data.chapters);
    } catch (err) {
      alert("Could not extract chapters: " + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const generateQuestions = async () => {
    if (!guideUrl) return alert("Upload the guide first.");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-questions-from-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: guideUrl, activityType: moduleType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newQuestions = (data.questions || []).map((text) => ({ text, type: "free", marks: null, media: null, options: [], scenario: isPractical ? "" : undefined }));
      setQuestions((prev) => [...prev, ...newQuestions]);
    } catch (err) {
      alert("Could not generate questions: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const addQuestion = () => {
    if (!newQ.text.trim()) return;
    setQuestions((prev) => [...prev, {
      text: newQ.text,
      scenario: isPractical ? newQ.scenario : undefined,
      type: newQ.type,
      marks: newQ.marks ? Number(newQ.marks) : null,
      media: null,
      options: [],
    }]);
    setNewQ({ scenario: "", text: "", type: "free", marks: "" });
  };

  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("qualification_modules")
        .update({ guide_url: guideUrl, guide_chapters: chapters, questions })
        .eq("id", module.id);
      if (error) throw error;
      onSaved();
      alert(`${MODULE_LABELS_INLINE[moduleType]} saved.`);
    } catch (err) {
      alert("Could not save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  if (!module) return <div className="paper p-8 text-center text-gray-500 text-sm">Module record not found for this qualification.</div>;

  return (
    <div className="space-y-4">
      <div className="paper p-6 space-y-3">
        <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>
          {isPractical ? "Practical Textbook (scenarios)" : "Learner Guide"}
        </h2>
        <div className="flex items-center gap-3">
          <input type="file" onChange={(e) => e.target.files[0] && handleGuideUpload(e.target.files[0])} className="text-sm text-gray-500" />
          {uploading && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
          {guideUrl && !uploading && <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>View current file</a>}
        </div>

        <div className="pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[var(--text-muted)]">Chapters</label>
            {guideUrl && (
              <button onClick={extractChapters} disabled={extracting} className="text-xs font-medium disabled:opacity-50" style={{ color: "var(--seal-gold)" }}>
                {extracting ? "Extracting..." : "Extract from PDF"}
              </button>
            )}
          </div>
          {chapters.length === 0 ? (
            <p className="text-xs text-gray-400">No chapters yet.</p>
          ) : (
            <ul className="space-y-1">
              {chapters.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                  <span className="truncate text-gray-700">{i + 1}. {c.title}</span>
                  <button onClick={() => setChapters((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="paper p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>
            {isPractical ? "Scenario Questions" : "Questions"}
          </h2>
          {guideUrl && (
            <button onClick={generateQuestions} disabled={generating} className="text-xs font-medium disabled:opacity-50" style={{ color: "var(--seal-gold)" }}>
              {generating ? "Generating..." : "Generate from PDF"}
            </button>
          )}
        </div>

        {questions.length > 0 && (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="p-3 rounded-lg text-sm" style={{ background: "var(--paper-muted)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isPractical && q.scenario && <p className="text-xs text-gray-500 italic mb-1">Scenario: {q.scenario}</p>}
                    <p className="text-gray-700">{i + 1}. {q.text}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{q.type} {q.marks != null ? `- ${q.marks} marks` : ""}</p>
                  </div>
                  <button onClick={() => removeQuestion(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--border-soft)" }}>
          {isPractical && (
            <input type="text" placeholder="Scenario description" value={newQ.scenario} onChange={(e) => setNewQ((p) => ({ ...p, scenario: e.target.value }))} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
          )}
          <input type="text" placeholder="Question text" value={newQ.text} onChange={(e) => setNewQ((p) => ({ ...p, text: e.target.value }))} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
          <div className="flex gap-2">
            <select value={newQ.type} onChange={(e) => setNewQ((p) => ({ ...p, type: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }}>
              <option value="free">Free text</option>
              <option value="mcq">Multiple choice</option>
              <option value="yesno">Yes / No</option>
            </select>
            <input type="number" placeholder="Marks" value={newQ.marks} onChange={(e) => setNewQ((p) => ({ ...p, marks: e.target.value }))} className={`${inputClass} w-24`} style={{ borderColor: "var(--border-soft)" }} />
            <button onClick={addQuestion} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add</button>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
        {saving ? "Saving..." : "Save Module"}
      </button>
    </div>
const MODULE_LABELS_INLINE = MODULE_LABELS;

function IsaCriteriaEditor({ programme }) {
  const supabase = createClient();
  const [criteria, setCriteria] = useState([]);
  const [newCriterion, setNewCriterion] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriteria();
  }, []);

  const fetchCriteria = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("qualification_isa_criteria")
      .select("*")
      .eq("programme_id", programme.id)
      .order("sort_order");
    setCriteria(data || []);
    setLoading(false);
  };

  const addCriterion = async () => {
    if (!newCriterion.trim()) return;
    const { error } = await supabase.from("qualification_isa_criteria").insert({
      programme_id: programme.id,
      institution_id: programme.institution_id,
      criterion_text: newCriterion,
      sort_order: criteria.length,
    });
    if (error) return alert(error.message);
    setNewCriterion("");
    fetchCriteria();
  };

  const removeCriterion = async (id) => {
    const { error } = await supabase.from("qualification_isa_criteria").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchCriteria();
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="paper p-6 space-y-3">
      <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>ISA Criteria</h2>
      <p className="text-sm text-gray-500">
        The checklist tied to this qualification's Knowledge, Practical, and Workplace requirements. You'll tick these off per learner as they meet each one.
      </p>
      {criteria.length === 0 ? (
        <p className="text-xs text-gray-400">No criteria added yet.</p>
      ) : (
        <ul className="space-y-2">
          {criteria.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
              <span className="text-gray-700">{c.criterion_text}</span>
              <button onClick={() => removeCriterion(c.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 pt-2">
        <input
          type="text" placeholder="e.g. Learner demonstrates correct use of PPE"
          value={newCriterion} onChange={(e) => setNewCriterion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCriterion()}
          className="flex-1 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
        />
        <button onClick={addCriterion} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add</button>
      </div>
    </div>
  );
}

function FisaEditor({ programme }) {
  const supabase = createClient();
  const [fisa, setFisa] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [duration, setDuration] = useState("");
  const [invigilated, setInvigilated] = useState(false);
  const [newQ, setNewQ] = useState({ text: "", marks: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFisa();
  }, []);

  const fetchFisa = async () => {
    setLoading(true);
    const { data } = await supabase.from("qualification_fisa").select("*").eq("programme_id", programme.id).single();
    setFisa(data);
    setQuestions(data?.questions || []);
    setDuration(data?.duration_minutes ?? "");
    setInvigilated(data?.invigilated || false);
    setLoading(false);
  };

  const addQuestion = () => {
    if (!newQ.text.trim()) return;
    setQuestions((prev) => [...prev, { text: newQ.text, marks: newQ.marks ? Number(newQ.marks) : null, type: "free", media: null, options: [] }]);
    setNewQ({ text: "", marks: "" });
  };

  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("qualification_fisa")
      .update({ questions, duration_minutes: duration ? Number(duration) : null, invigilated })
      .eq("id", fisa.id);
    if (error) alert(error.message);
    else alert("FISA saved.");
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;
  if (!fisa) return <div className="paper p-8 text-center text-gray-500 text-sm">No FISA record found for this qualification.</div>;

  return (
    <div className="space-y-4">
      <div className="paper p-6 space-y-3">
        <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>Final Integrated Summative Assessment</h2>
        <p className="text-sm text-gray-500">The final exam integrating all modules for this Skills Programme.</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Duration (minutes)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-32 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-5">
            <input type="checkbox" checked={invigilated} onChange={(e) => setInvigilated(e.target.checked)} /> Invigilated
          </label>
        </div>
      </div>

      <div className="paper p-6 space-y-3">
        <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>Questions</h2>
        {questions.length > 0 && (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                <span className="text-gray-700">{i + 1}. {q.text} {q.marks != null && <span className="text-gray-400">({q.marks} marks)</span>}</span>
                <button onClick={() => removeQuestion(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input type="text" placeholder="Question text" value={newQ.text} onChange={(e) => setNewQ((p) => ({ ...p, text: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
          <input type="number" placeholder="Marks" value={newQ.marks} onChange={(e) => setNewQ((p) => ({ ...p, marks: e.target.value }))} className={`${inputClass} w-24`} style={{ borderColor: "var(--border-soft)" }} />
          <button onClick={addQuestion} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add</button>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
        {saving ? "Saving..." : "Save FISA"}
      </button>
    </div>
  );
}

function WorkplaceLogbookReview({ entries, module, programme, onSignOff, onGuideUpdated }) {
  const supabase = createClient();
  const [guideUrl, setGuideUrl] = useState(module?.guide_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const handleGuideUpload = async (file) => {
    setUploading(true);
    try {
      const path = `modules/${programme.id}/workplace_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("programme-content").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("programme-content").getPublicUrl(path);
      setGuideUrl(data.publicUrl);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveGuide = async () => {
    setSaving(true);
    const { error } = await supabase.from("qualification_modules").update({ guide_url: guideUrl }).eq("id", module.id);
    if (error) alert(error.message);
    else { alert("Workplace guide saved."); onGuideUpdated(); }
    setSaving(false);
  };

  const filtered = entries.filter((e) => filter === "all" || (filter === "signed" ? e.signed_off : !e.signed_off));

  return (
    <div className="space-y-4">
      <div className="paper p-6 space-y-3">
        <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>Workplace Guide (what learners should log)</h2>
        <div className="flex items-center gap-3">
          <input type="file" onChange={(e) => e.target.files[0] && handleGuideUpload(e.target.files[0])} className="text-sm text-gray-500" />
          {uploading && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
          {guideUrl && !uploading && <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>View current file</a>}
        </div>
        <button onClick={saveGuide} disabled={saving} className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
          {saving ? "Saving..." : "Save Guide"}
        </button>
      </div>

      <div className="flex gap-2">
        {["all", "unsigned", "signed"].map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
            style={filter === f ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">No logbook entries {filter !== "all" ? `(${filter})` : ""} yet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div key={entry.id} className="paper p-5 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium" style={{ color: "var(--text)" }}>
                  {entry.profiles?.first_name} {entry.profiles?.surname}
                  <span className="text-xs text-gray-400 font-mono ml-2">{new Date(entry.entry_date).toLocaleDateString()}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                {entry.proof_url && (
                  <a href={entry.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs mt-1 inline-block" style={{ color: "var(--brand-color)" }}>View attached proof</a>
                )}
              </div>
              <button
                onClick={() => onSignOff(entry.id, entry.signed_off)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
                style={entry.signed_off ? { background: "#ECFDF5", color: "#047857" } : { border: "1px solid var(--border-soft)", color: "var(--text)" }}
              >
                {entry.signed_off ? "Signed Off [done]" : "Sign Off"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
