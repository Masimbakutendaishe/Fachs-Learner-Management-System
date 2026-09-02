import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";

export default function AdminReviewers() {
  const supabase = createClient();
  const { institution } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("assessor");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institution) fetchAll();
  }, [institution]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: progData } = await supabase
      .from("programmes")
      .select("id, name")
      .eq("institution_id", institution.id)
      .not("qualification_type", "is", null)
      .order("name");
    setProgrammes(progData || []);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, first_name, surname, role")
      .eq("institution_id", institution.id)
      .neq("role", "learner");
    setUsers(usersData || []);

    const { data: reviewersData } = await supabase
      .from("qualification_reviewers")
      .select("id, programme_id, user_id, reviewer_role, profiles ( first_name, surname )")
      .eq("institution_id", institution.id);
    setReviewers(reviewersData || []);

    setLoading(false);
  };

  const assign = async (programmeId) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("qualification_reviewers").insert({
        programme_id: programmeId,
        user_id: selectedUser,
        reviewer_role: selectedRole,
        institution_id: institution.id,
      });
      if (error) throw error;

      await supabase.from("profiles").update({ role: selectedRole }).eq("id", selectedUser);

      setAssigning(null);
      setSelectedUser("");
      fetchAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeReviewer = async (id) => {
    const { error } = await supabase.from("qualification_reviewers").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchAll();
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">QUALITY ASSURANCE</p>
      <h1 className="font-display text-3xl font-semibold mb-6" style={{ color: "var(--text)" }}>Assessors &amp; Moderators</h1>

      {programmes.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">No training-provider qualifications yet.</div>
      ) : (
        <div className="space-y-4">
          {programmes.map((p) => {
            const assigned = reviewers.filter((r) => r.programme_id === p.id);
            return (
              <div key={p.id} className="paper p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>{p.name}</h3>
                  <button
                    onClick={() => { setAssigning(assigning === p.id ? null : p.id); setSelectedUser(""); }}
                    className="text-xs font-medium" style={{ color: "var(--brand-color)" }}
                  >
                    + Assign Reviewer
                  </button>
                </div>

                {assigned.length === 0 ? (
                  <p className="text-xs text-gray-400">No assessor or moderator assigned yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {assigned.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ background: "var(--paper-muted)" }}>
                        <span className="text-gray-700 capitalize">
                          {r.profiles?.first_name} {r.profiles?.surname} - {r.reviewer_role}
                        </span>
                        <button onClick={() => removeReviewer(r.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}

                {assigning === p.id && (
                  <div className="mt-3 p-3 rounded-lg flex items-center gap-2 flex-wrap" style={{ background: "var(--paper-muted)" }}>
                    <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="px-3 py-2 rounded-lg border text-sm flex-1" style={{ borderColor: "var(--border-soft)" }}>
                      <option value="">Select a person...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.first_name} {u.surname} ({u.role})</option>
                      ))}
                    </select>
                    <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}>
                      <option value="assessor">Assessor</option>
                      <option value="moderator">Moderator</option>
                    </select>
                    <button onClick={() => assign(p.id)} disabled={saving || !selectedUser} className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--brand-color)" }}>
                      {saving ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
