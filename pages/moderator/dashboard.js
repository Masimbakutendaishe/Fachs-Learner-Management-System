import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";

export default function ModeratorDashboard() {
  const supabase = createClient();
  const { user } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProgrammes();
  }, [user]);

  const fetchProgrammes = async () => {
    const { data } = await supabase
      .from("qualification_reviewers")
      .select("programme_id, programmes ( id, name, image_url, institution_id )")
      .eq("user_id", user.id)
      .eq("reviewer_role", "moderator");

    const progs = (data || []).map((r) => r.programmes).filter(Boolean);
    setProgrammes(progs);

    const counts = {};
    for (const p of progs) {
      const { count } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("programme_id", p.id)
        .eq("assessor_signed_off", true)
        .eq("moderator_signed_off", false);
      counts[p.id] = count || 0;
    }
    setPendingCounts(counts);
    setLoading(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">MODERATOR</p>
      <h1 className="font-display text-3xl font-semibold mb-6" style={{ color: "var(--text)" }}>My Qualifications</h1>

      {programmes.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">You haven't been assigned as moderator for any qualification yet.</div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programmes.map((p) => (
            <li key={p.id} className="paper overflow-hidden card-lift">
              {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover" />}
              <div className="p-5">
                <h3 className="font-display font-semibold mb-1" style={{ color: "var(--text)" }}>{p.name}</h3>
                <p className="text-xs text-gray-400 font-mono mb-3">
                  {pendingCounts[p.id] > 0 ? `${pendingCounts[p.id]} awaiting moderation` : "All caught up"}
                </p>
                <Link href={`/moderator/${p.id}`} className="text-sm font-medium" style={{ color: "var(--brand-color)" }}>
                  Open ->
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
