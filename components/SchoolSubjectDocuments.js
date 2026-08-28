"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";

export default function SchoolSubjectDocuments({ programme, onUpdated }) {
  const supabase = createClient();
  const [syllabusUrl, setSyllabusUrl] = useState(programme.curriculum_document_url || "");
  const [syllabusTopics, setSyllabusTopics] = useState(programme.syllabus_topics || []);
  const [newTopic, setNewTopic] = useState({ week_label: "", topic: "", description: "" });
  const [textbooks, setTextbooks] = useState(programme.textbooks || []);
  const [questions, setQuestions] = useState(programme.activity_book_questions || []);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingTextbook, setAddingTextbook] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", author: "", edition: "", published_year: "", file_url: "" });
  const [uploadingBookFile, setUploadingBookFile] = useState(false);
  const [extractingFor, setExtractingFor] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateFromId, setGenerateFromId] = useState("");
  const [newQ, setNewQ] = useState({ text: "", type: "free", marks: "", options: [] });
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    setSyllabusUrl(programme.curriculum_document_url || "");
    setSyllabusTopics(programme.syllabus_topics || []);
    setTextbooks(programme.textbooks || []);
    setQuestions(programme.activity_book_questions || []);
  }, [programme.id]);

    useEffect(() => {
    setSyllabusUrl(programme.curriculum_document_url || "");
    setSyllabusTopics(programme.syllabus_topics || []);
    setTextbooks(programme.textbooks || []);
    setQuestions(programme.activity_book_questions || []);
  }, [programme.id]);

  const addTopic = () => {
    if (!newTopic.topic.trim()) return;
    setSyllabusTopics((prev) => [...prev, newTopic]);
    setNewTopic({ week_label: "", topic: "", description: "" });
  };
  const removeTopic = (i) => setSyllabusTopics((prev) => prev.filter((_, idx) => idx !== i));

  const uploadFile = async (file, prefix) => {
    const path = `${prefix}/${programme.id}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("programme-content").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("programme-content").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSyllabusUpload = async (file) => {
    setUploadingSyllabus(true);
    try {
      const url = await uploadFile(file, "syllabus");
      setSyllabusUrl(url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingSyllabus(false);
    }
  };

  const handleNewBookFileUpload = async (file) => {
    setUploadingBookFile(true);
    try {
      const url = await uploadFile(file, "textbook");
      setNewBook((p) => ({ ...p, file_url: url }));
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingBookFile(false);
    }
  };

  const addTextbook = () => {
    if (!newBook.title.trim()) return alert("Give the textbook a title first.");
    setTextbooks((prev) => [...prev, { id: crypto.randomUUID(), ...newBook, chapters: [] }]);
    setNewBook({ title: "", author: "", edition: "", published_year: "", file_url: "" });
    setAddingTextbook(false);
  };

  const removeTextbook = (id) => setTextbooks((prev) => prev.filter((b) => b.id !== id));

  const extractChaptersFor = async (bookId) => {
    const book = textbooks.find((b) => b.id === bookId);
    if (!book?.file_url) return alert("Upload a file for this textbook first.");
    setExtractingFor(bookId);
    try {
      const res = await fetch("/api/generate-chapters-from-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: book.file_url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTextbooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, chapters: data.chapters } : b)));
    } catch (err) {
      alert("Could not extract chapters: " + err.message);
    } finally {
      setExtractingFor(null);
    }
  };

  const removeChapter = (bookId, i) => {
    setTextbooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, chapters: b.chapters.filter((_, idx) => idx !== i) } : b)));
  };

  const generateQuestions = async () => {
    const book = textbooks.find((b) => b.id === generateFromId);
    if (!book?.file_url) return alert("Pick a textbook with an uploaded file first.");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-questions-from-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: book.file_url, activityType: "activity book" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newQuestions = (data.questions || []).map((text) => ({ text, type: "free", marks: null, media: null, options: [] }));
      setQuestions((prev) => [...prev, ...newQuestions]);
    } catch (err) {
      alert("Could not generate questions: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setNewQ((p) => ({ ...p, options: [...p.options, newOption] }));
    setNewOption("");
  };
  const removeOption = (i) => setNewQ((p) => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));

  const addQuestion = () => {
    if (!newQ.text.trim()) return;
    setQuestions((prev) => [...prev, { text: newQ.text, type: newQ.type, marks: newQ.marks ? Number(newQ.marks) : null, media: null, options: newQ.options }]);
    setNewQ({ text: "", type: "free", marks: "", options: [] });
  };
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
            const { error } = await supabase
        .from("programmes")
        .update({
          curriculum_document_url: syllabusUrl,
          syllabus_topics: syllabusTopics,
          textbooks,
          activity_book_questions: questions,
        })
        .eq("id", programme.id);
      if (error) throw error;
      onUpdated();
      alert("Saved.");
    } catch (err) {
      alert("Could not save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  return (
    <div className="space-y-4">
      <div className="paper p-6 space-y-3">
        <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>Syllabus</h2>
        <p className="text-sm text-gray-500">The term/year plan for this subject.</p>
        <div className="flex items-center gap-3">
          <input type="file" onChange={(e) => e.target.files[0] && handleSyllabusUpload(e.target.files[0])} className="text-sm text-gray-500" />
          {uploadingSyllabus && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
                    {syllabusUrl && !uploadingSyllabus && (
            <>
              <a href={syllabusUrl} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>View current file</a>
              <button onClick={() => setSyllabusUrl("")} className="text-xs text-red-500 hover:underline">Remove</button>
            </>
          )}
        </div>

        <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--border-soft)" }}>
          <p className="text-xs text-[var(--text-muted)]">Term Plan (topics mapped to weeks)</p>
          {syllabusTopics.length > 0 && (
            <ul className="space-y-1">
              {syllabusTopics.map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                  <div>
                    <span className="font-medium" style={{ color: "var(--text)" }}>{t.week_label || `Topic ${i + 1}`}: </span>
                    <span className="text-gray-700">{t.topic}</span>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  </div>
                  <button onClick={() => removeTopic(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input type="text" placeholder="Week (e.g. Week 3)" value={newTopic.week_label} onChange={(e) => setNewTopic((p) => ({ ...p, week_label: e.target.value }))} className={`${inputClass} w-32`} style={{ borderColor: "var(--border-soft)" }} />
            <input type="text" placeholder="Topic" value={newTopic.topic} onChange={(e) => setNewTopic((p) => ({ ...p, topic: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
          </div>
          <input type="text" placeholder="Description (optional)" value={newTopic.description} onChange={(e) => setNewTopic((p) => ({ ...p, description: e.target.value }))} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
          <button onClick={addTopic} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add Topic</button>
        </div>
      </div>

      <div className="paper p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>Textbooks</h2>
          {!addingTextbook && (
            <button onClick={() => setAddingTextbook(true)} className="text-xs font-medium" style={{ color: "var(--brand-color)" }}>+ Add Textbook</button>
          )}
        </div>

        {textbooks.length === 0 && !addingTextbook && (
          <p className="text-sm text-gray-400">No textbooks added yet.</p>
        )}

        {textbooks.map((book) => (
          <div key={book.id} className="p-4 rounded-xl" style={{ background: "var(--paper-muted)" }}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{book.title}</p>
                <p className="text-xs text-gray-500">
                  {[book.author, book.edition, book.published_year].filter(Boolean).join(" - ") || "No additional details"}
                </p>
              </div>
              <button onClick={() => removeTextbook(book.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {book.file_url ? (
                <a href={book.file_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--brand-color)" }}>View file</a>
              ) : (
                <span className="text-xs text-gray-400">No file uploaded</span>
              )}
              {book.file_url && (
                <button onClick={() => extractChaptersFor(book.id)} disabled={extractingFor === book.id} className="text-xs font-medium disabled:opacity-50" style={{ color: "var(--seal-gold)" }}>
                  {extractingFor === book.id ? "Extracting..." : "Extract Chapters"}
                </button>
              )}
            </div>
            {book.chapters?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {book.chapters.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-white">
                    <span className="truncate text-gray-700">{i + 1}. {c.title}</span>
                    <button onClick={() => removeChapter(book.id, i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {addingTextbook && (
          <div className="p-4 rounded-xl space-y-2" style={{ background: "var(--paper-muted)" }}>
            <input type="text" placeholder="Title (required)" value={newBook.title} onChange={(e) => setNewBook((p) => ({ ...p, title: e.target.value }))} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            <input type="text" placeholder="Author(s) (optional)" value={newBook.author} onChange={(e) => setNewBook((p) => ({ ...p, author: e.target.value }))} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            <div className="flex gap-2">
              <input type="text" placeholder="Edition / Version (optional)" value={newBook.edition} onChange={(e) => setNewBook((p) => ({ ...p, edition: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
              <input type="text" placeholder="Published year (optional)" value={newBook.published_year} onChange={(e) => setNewBook((p) => ({ ...p, published_year: e.target.value }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
            </div>
            <div className="flex items-center gap-3">
              <input type="file" onChange={(e) => e.target.files[0] && handleNewBookFileUpload(e.target.files[0])} className="text-sm text-gray-500" />
              {uploadingBookFile && <span className="text-xs text-[var(--seal-gold)] font-mono">Uploading...</span>}
              {newBook.file_url && !uploadingBookFile && <span className="text-xs text-emerald-600">File attached</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={addTextbook} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "var(--brand-color)" }}>Add</button>
              <button onClick={() => setAddingTextbook(false)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="paper p-6 space-y-3">
        <h2 className="font-display font-semibold" style={{ color: "var(--text)" }}>Activity Book</h2>
        <p className="text-sm text-gray-500">Practice exercises and worksheet questions for this subject.</p>

        {textbooks.some((b) => b.file_url) && (
          <div className="flex items-center gap-2">
            <select value={generateFromId} onChange={(e) => setGenerateFromId(e.target.value)} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }}>
              <option value="">Generate from a textbook...</option>
              {textbooks.filter((b) => b.file_url).map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <button onClick={generateQuestions} disabled={!generateFromId || generating} className="text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50" style={{ border: "1px solid var(--border-soft)", color: "var(--seal-gold)" }}>
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        )}

        {questions.length > 0 && (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                <span className="text-gray-700">{i + 1}. {q.text} <span className="text-xs text-gray-400 capitalize">({q.type.replace("_", " ")}{q.marks != null ? `, ${q.marks} marks` : ""})</span></span>
                <button onClick={() => removeQuestion(i)} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <input type="text" placeholder="Question or exercise text" value={newQ.text} onChange={(e) => setNewQ((p) => ({ ...p, text: e.target.value }))} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
          <div className="flex gap-2">
            <select value={newQ.type} onChange={(e) => setNewQ((p) => ({ ...p, type: e.target.value, options: [] }))} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }}>
              <option value="free">Free text</option>
              <option value="mcq">Multiple choice (single answer)</option>
              <option value="multi_select">Multiple choice (select several)</option>
              <option value="yesno">Yes / No</option>
              <option value="image_answer">Image upload</option>
              <option value="audio_answer">Audio recording</option>
            </select>
            <input type="number" placeholder="Marks" value={newQ.marks} onChange={(e) => setNewQ((p) => ({ ...p, marks: e.target.value }))} className={`${inputClass} w-24`} style={{ borderColor: "var(--border-soft)" }} />
            <button onClick={addQuestion} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add</button>
          </div>
          {(newQ.type === "mcq" || newQ.type === "multi_select") && (
            <div className="p-3 rounded-lg" style={{ background: "var(--paper-muted)" }}>
              <p className="text-xs text-[var(--text-muted)] mb-2">Answer options</p>
              {newQ.options.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {newQ.options.map((opt, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm p-1.5 rounded bg-white">
                      <span>{opt}</span>
                      <button onClick={() => removeOption(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input type="text" placeholder="Add an option" value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }} className={`${inputClass} flex-1`} style={{ borderColor: "var(--border-soft)" }} />
                <button onClick={addOption} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>Add Option</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
