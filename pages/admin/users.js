import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";

export default function AdminUsers() {
  const supabase = createClient();
  const { institution } = useAuth();
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (institution) fetchAll();
  }, [institution]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, first_name, surname, role, is_active")
      .eq("institution_id", institution.id);
    setUsers(usersData || []);

    const { data: activityData } = await supabase
      .from("activity_log")
      .select("action, details, created_at, profiles ( first_name, surname )")
      .eq("institution_id", institution.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setActivity(activityData || []);

    setLoading(false);
  };

  const toggleActive = async (u) => {
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) return alert(error.message);

    await supabase.from("activity_log").insert({
      institution_id: institution.id,
      actor_id: (await supabase.auth.getUser()).data.user.id,
      action: u.is_active ? "user_deactivated" : "user_reactivated",
      details: `${u.first_name} ${u.surname}`,
    });

    fetchAll();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = `${u.first_name} ${u.surname}`.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">INSTITUTION ADMIN</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Users</h1>
      <p className="text-[var(--text-muted)] mb-6">Everyone in {institution?.name}.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <input
              type="text" placeholder="Search by name..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 rounded-lg border text-sm flex-1 min-w-[180px]" style={{ borderColor: "var(--border-soft)" }}
            />
            <select
              value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm capitalize" style={{ borderColor: "var(--border-soft)" }}
            >
              <option value="all">All roles</option>
              <option value="learner">Learner</option>
              <option value="facilitator">Facilitator</option>
            </select>
          </div>

          <div className="paper overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                  <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{u.first_name} {u.surname}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{u.role?.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={u.is_active ? { background: "#ECFDF5", color: "#047857" } : { background: "#FEF2F2", color: "#B91C1C" }}>
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(u)} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="paper p-5 h-fit">
          <h2 className="font-display font-semibold mb-3" style={{ color: "var(--text)" }}>Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="text-xs">
                  <p style={{ color: "var(--text)" }}>
                    <span className="font-medium">{a.profiles?.first_name} {a.profiles?.surname}</span>{" "}
                    {a.action.replace(/_/g, " ")}{a.details ? `: ${a.details}` : ""}
                  </p>
                  <p className="text-gray-400 font-mono mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}