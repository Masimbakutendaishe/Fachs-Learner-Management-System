import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

const ROLES = ["learner", "facilitator", "institution_admin", "superadmin"];

export default function SuperadminUsers() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/superadmin/list-users");
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  const updateRole = async (userId, role) => {
    setBusyId(userId);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) alert("Could not update role: " + error.message);
    else setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    setBusyId(null);
  };

  const toggleActive = async (u) => {
    setBusyId(u.id);
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) alert("Could not update account status: " + error.message);
    else setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    setBusyId(null);
  };

  const sendPasswordReset = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) alert("Could not send reset email: " + error.message);
    else alert(`Password reset email sent to ${email}`);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.surname?.toLowerCase().includes(q) ||
      u.institution?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">PLATFORM ADMIN</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Users</h1>
      <p className="text-[var(--text-muted)] mb-6">Every account across every institution.</p>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or institution..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg border text-sm w-full max-w-sm"
          style={{ borderColor: "var(--border-soft)" }}
        />
        <Link href="/superadmin" className="text-sm font-medium" style={{ color: "var(--brand-color)" }}>
          ← Institutions
        </Link>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Loading users...</p>
      ) : (
        <div className="paper overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500">Institution</th>
                <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{u.first_name} {u.surname}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{u.institution}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={busyId === u.id}
                      className="text-xs px-2 py-1 rounded-lg border capitalize"
                      style={{ borderColor: "var(--border-soft)" }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={u.is_active ? { background: "#ECFDF5", color: "#047857" } : { background: "#FEF2F2", color: "#B91C1C" }}
                    >
                      {u.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={busyId === u.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
                      >
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        onClick={() => sendPasswordReset(u.email)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}