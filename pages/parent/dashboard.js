import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../context/AuthContext";

const ACTIVITY_LABELS = {
  workbook: "Workbook",
  knowledge: "Knowledge",
  summative: "Summative",
  practical: "Practical",
  activity_book: "Activity Book",
};

export default function ParentDashboard() {
  const supabase = createClient();
  const { user, institution } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) fetchChildData();
  }, [selectedChildId]);

  const fetchChildren = async () => {
    const { data: links, error: linksError } = await supabase
      .from("parent_learner_links")
      .select("learner_id")
      .eq("parent_id", user.id);

    if (linksError || !links?.length) {
      setChildren([]);
      setLoading(false);
      return;
    }

    const learnerIds = links.map((l) => l.learner_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, surname")
      .in("id", learnerIds);

    const enriched = links.map((l) => ({
      learner_id: l.learner_id,
      profiles: profiles?.find((p) => p.id === l.learner_id) || null,
    }));

    setChildren(enriched);
    setSelectedChildId(enriched[0].learner_id);
  };

  const fetchChildData = async () => {
    setLoading(true);

    const { data: gradesData } = await supabase
      .from("submissions")
      .select("activity_type, status, grade, feedback, submitted_at, programmes ( name )")
      .eq("user_id", selectedChildId)
      .order("submitted_at", { ascending: false })
      .limit(20);
    setGrades(gradesData || []);

    const { data: attendanceData } = await supabase
      .from("daily_attendance")
      .select("date, status, programmes ( name )")
      .eq("user_id", selectedChildId)
      .order("date", { ascending: false })
      .limit(14);
    setAttendance(attendanceData || []);

    if (institution?.id) {
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .eq("institution_id", institution.id)
        .eq("audience", "everyone")
        .order("created_at", { ascending: false })
        .limit(5);
      setAnnouncements(announcementsData || []);
    }

    setLoading(false);
  };

  if (!user) return null;

  if (children.length === 0 && !loading) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-sm text-gray-500">No children linked to your account yet. Ask them for their Parent Invite Code from their "My Progress & Marks" page.</p>
      </div>
    );
  }

  const selectedChild = children.find((c) => c.learner_id === selectedChildId);
  const childName = selectedChild?.profiles ? `${selectedChild.profiles.first_name || ""} ${selectedChild.profiles.surname || ""}`.trim() : "";

  return (
    <div className="space-y-8 animate-fade-up">
      <header>
        <p className="text-xs font-mono text-[var(--text-muted)] mb-1">PARENT PORTAL</p>
        <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--text)" }}>{childName ? `${childName}'s Progress` : "Progress"}</h1>
      </header>

      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((c) => {
            const name = c.profiles ? `${c.profiles.first_name || ""} ${c.profiles.surname || ""}`.trim() : "Unknown";
            return (
              <button
                key={c.learner_id}
                onClick={() => setSelectedChildId(c.learner_id)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={selectedChildId === c.learner_id ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>
      ) : (
        <>
          <section>
            <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Grades</h2>
            {grades.length === 0 ? (
              <div className="paper p-6 text-center text-gray-500 text-sm">No submissions yet.</div>
            ) : (
              <div className="paper overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                      <th className="px-4 py-3 font-medium text-gray-500">Subject</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Activity</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Grade</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g, i) => (
                      <tr key={i} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                        <td className="px-4 py-3" style={{ color: "var(--text)" }}>{g.programmes?.name}</td>
                        <td className="px-4 py-3 text-gray-500">{ACTIVITY_LABELS[g.activity_type] || g.activity_type}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={g.status === "graded" ? { background: "#ECFDF5", color: "#047857" } : { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>
                            {g.status === "graded" ? "Graded" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: "var(--text)" }}>{g.grade ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{g.feedback || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {attendance.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Attendance</h2>
              <div className="paper p-5">
                <div className="flex flex-wrap gap-2">
                  {attendance.map((a, i) => (
                    <div
                      key={i}
                      title={`${a.programmes?.name || ""} - ${a.status}`}
                      className="text-xs font-medium px-3 py-2 rounded-lg text-center"
                      style={
                        a.status === "present" ? { background: "#ECFDF5", color: "#047857" } :
                        a.status === "late" ? { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" } :
                        { background: "#FEF2F2", color: "#B91C1C" }
                      }
                    >
                      <div className="font-mono">{new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                      <div className="capitalize mt-0.5">{a.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {announcements.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Announcements</h2>
              <div className="paper p-6">
                <ul className="space-y-3">
                  {announcements.map((a) => (
                    <li key={a.id} className="p-3 rounded-xl text-sm" style={{ background: "var(--paper-muted)" }}>
                      <p className="font-medium" style={{ color: "var(--text)" }}>{a.title}</p>
                      {a.body && <p className="text-gray-600 mt-1">{a.body}</p>}
                      <p className="text-xs text-gray-400 mt-1 font-mono">{new Date(a.created_at).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
