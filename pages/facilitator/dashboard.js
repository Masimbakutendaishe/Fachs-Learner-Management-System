"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { PlusCircle, Calendar } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useFeatures } from "../../lib/features/useFeatures";
import { useAuth } from "../context/AuthContext";
import Portal from "../../components/Portal";

export default function FacilitatorDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const features = useFeatures();
  const { profile } = useAuth();
  const [facilitations, setFacilitations] = useState([]);
  const [user, setUser] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserAndFacilitations = async () => {
      const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !sessionUser) {
        router.push("/auth/signin");
        return;
      }

      setUser({
        id: sessionUser.id,
        full_name: sessionUser.user_metadata?.full_name || "Facilitator",
        email: sessionUser.email,
      });

      const { data: programmes, error: progErr } = await supabase
        .from("programmes")
        .select("*")
        .eq("facilitator_id", sessionUser.id);

      if (progErr) console.error("Error fetching programmes:", progErr);
      else
                setFacilitations(
          (programmes || []).map((p) => ({
            id: p.id,
            qualifications: {
              name: p.name,
              nqf_level: p.nqf_level,
              credits: p.credits_total,
              image_url: p.image_url,
            },
            start_date: p.start_date || null,
            end_date: p.end_date || null,
          }))
        );
    };

    fetchUserAndFacilitations();
  }, [supabase]);

  const handleProgrammeCreated = (programme) => {
    setFacilitations((prev) => [
      ...prev,
      {
        id: programme.id,
        qualifications: {
          name: programme.name,
          nqf_level: programme.nqf_level,
          credits: programme.credits_total,
        },
        start_date: programme.start_date || null,
        end_date: programme.end_date || null,
      },
    ]);
    setAddModalOpen(false);
  };

  if (!user) {
    return <p className="text-sm font-mono text-[var(--text-muted)]">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-xs font-mono text-[var(--text-muted)] mb-1">FACILITATOR</p>
        <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--text)" }}>
          {user.full_name}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Manage your qualifications and learner progress</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="animate-fade-up stagger-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text)" }}>
              {features.hasTimetable ? "My Classes" : "Qualifications Facilitating"}
            </h2>
            <div className="flex items-center gap-4">
              {features.hasQctoFields && (
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: "var(--brand-color)" }}
                >
                  <PlusCircle className="w-4 h-4" /> Add Qualification
                </button>
              )}
            </div>
          </div>

          {features.hasTimetable && (
            <div className="mb-4 p-4 rounded-xl paper flex items-center gap-3">
              <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: "var(--brand-color)" }} />
              <span className="text-sm text-gray-600">
                Timetable and class roster management is coming here for school accounts.
              </span>
            </div>
          )}

          {facilitations.length === 0 ? (
            <div className="paper p-8 text-center text-gray-500 text-sm">
              No qualifications assigned yet.
            </div>
          ) : (
            <ul className="grid gap-4">
              {facilitations.map((f, i) => {
                const q = f.qualifications;
                return (
                                              <li
                    key={f.id}
                    className={`paper overflow-hidden card-lift animate-fade-up stagger-${Math.min(i + 1, 4)}`}
                  >
                    {q?.image_url && (
                      <img src={q.image_url} alt={q.name} className="w-full h-32 object-cover" />
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span
                            className="inline-block text-xs font-mono px-2 py-1 rounded-full mb-2"
                            style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}
                          >
                            NQF {q?.nqf_level || "TBA"}
                          </span>
                          <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>
                            {q?.name}
                          </h3>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mb-3">
                        {f.start_date ? new Date(f.start_date).toLocaleDateString() : "Start TBA"} –{" "}
                        {f.end_date ? new Date(f.end_date).toLocaleDateString() : "Ongoing"}
                        {" · "}{q?.credits || "TBA"} credits
                      </p>
                      <Link
                        href={`/module-player/facilitator/${f.id}`}
                        className="text-sm font-medium"
                        style={{ color: "var(--brand-color)" }}
                      >
                        Go to modules →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid grid-rows-2 gap-4 animate-fade-up stagger-2">
          <div className="paper p-5">
            <h2 className="font-display font-semibold mb-3" style={{ color: "var(--text)" }}>
              Announcements
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>QCTO audit visit scheduled for 10 September, prepare learner PoEs.</li>
              <li>Upcoming assessor and moderator allocation, confirm your availability.</li>
              <li>Unit Standard assessments due for moderation this month.</li>
              <li>New compliance checklist uploaded to your facilitator portal.</li>
            </ul>
          </div>

          <div className="paper p-5">
            <h2 className="font-display font-semibold mb-3" style={{ color: "var(--text)" }}>
              My Schedule
            </h2>
            <ul className="space-y-2 text-sm text-gray-600 font-mono">
              <li>09:00–10:00 · Knowledge Module</li>
              <li>10:15–11:15 · Practical Evidence Upload</li>
              <li>11:30–12:30 · Summative Assessment</li>
              <li>13:00–14:00 · MS Teams Session</li>
            </ul>
          </div>
        </section>
      </div>

      {addModalOpen && (
        <AddQualificationModal
          facilitatorId={user.id}
          institutionId={profile?.institution_id}
          onClose={() => setAddModalOpen(false)}
          onCreated={handleProgrammeCreated}
        />
      )}
    </div>
  );
}

function AddQualificationModal({ facilitatorId, institutionId, onClose, onCreated }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [nqfLevel, setNqfLevel] = useState("");
  const [credits, setCredits] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!institutionId) {
      alert("Your account isn't linked to an institution yet.");
      return;
    }
    setSubmitting(true);

    try {
      const { data: existing, error: checkErr } = await supabase
        .from("programmes")
        .select("*")
        .eq("name", name)
        .eq("institution_id", institutionId)
        .maybeSingle();

      if (checkErr) throw checkErr;

            let programme = existing;

      if (!programme) {
        let imageUrl = null;
        if (imageFile) {
          const ext = imageFile.name.split(".").pop();
          const path = `programme-images/${Date.now()}_${imageFile.name}`;
          const { error: uploadError } = await supabase.storage.from("programme-content").upload(path, imageFile);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from("programme-content").getPublicUrl(path);
          imageUrl = publicUrlData.publicUrl;
        }

        const { data: newProg, error: insertErr } = await supabase
          .from("programmes")
          .insert([{
            name,
            nqf_level: Number(nqfLevel) || 1,
            credits_total: Number(credits) || 0,
            price: Number(price) || 0,
            description,
            image_url: imageUrl,
            facilitator_id: facilitatorId,
            institution_id: institutionId,
          }])
          .select()
          .single();

        if (insertErr) throw insertErr;
        programme = newProg;
      }

      onCreated(programme);
    } catch (err) {
      alert("Could not save qualification: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8"
          style={{ background: "var(--paper)" }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
            ✕
          </button>

          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">NEW QUALIFICATION</p>
          <h2 className="font-display text-xl font-semibold mb-5" style={{ color: "var(--text)" }}>
            Add a qualification
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text" placeholder="Qualification name" value={name}
              onChange={(e) => setName(e.target.value)} required
              className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
            />
                        <div className="grid grid-cols-2 gap-3">
              <input
                type="number" placeholder="NQF Level" value={nqfLevel}
                onChange={(e) => setNqfLevel(e.target.value)} required
                className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              />
              <input
                type="number" placeholder="Total credits" value={credits}
                onChange={(e) => setCredits(e.target.value)} required
                className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              />
            </div>
            <input
              type="number" step="0.01" placeholder="Price (e.g. 499.00)" value={price}
              onChange={(e) => setPrice(e.target.value)} required
              className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
            />
            <textarea
              placeholder="Description" value={description}
              onChange={(e) => setDescription(e.target.value)} rows={3}
              className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
            />
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Qualification Image (optional)</label>
              <input
                type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])}
                className="text-sm text-gray-600"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full py-3 mt-2 rounded-xl text-white font-medium transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "var(--brand-color)" }}
            >
              {submitting ? "Saving..." : "Save Qualification"}
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}