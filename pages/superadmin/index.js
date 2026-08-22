import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function SuperadminDashboard() {
  const supabase = createClient();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    const { data: institutionsData } = await supabase
      .from("institutions")
      .select("*, subscriptions ( status, current_period_end, plans ( name, price ) )")
      .order("name");

    const { data: counts } = await supabase.from("profiles").select("institution_id");
    const countMap = {};
    (counts || []).forEach((p) => {
      if (p.institution_id) countMap[p.institution_id] = (countMap[p.institution_id] || 0) + 1;
    });

    setInstitutions((institutionsData || []).map((inst) => ({ ...inst, userCount: countMap[inst.id] || 0 })));
    setLoading(false);
  };

  const toggleStatus = async (inst) => {
    const newStatus = inst.status === "suspended" ? "active" : "suspended";
    setUpdatingId(inst.id);
    const { error } = await supabase.from("institutions").update({ status: newStatus }).eq("id", inst.id);
    if (error) alert("Could not update status: " + error.message);
    else fetchInstitutions();
    setUpdatingId(null);
  };

  const statusColor = (status) => {
    if (status === "active") return { background: "#ECFDF5", color: "#047857" };
    if (status === "suspended") return { background: "#FEF2F2", color: "#B91C1C" };
    return { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" };
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">PLATFORM ADMIN</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Institutions</h1>
      <p className="text-[var(--text-muted)] mb-6">Every institution on the platform, plan status, and account controls.</p>

      <div className="flex gap-3 mb-6">
        <Link href="/superadmin/users" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text)" }}>
          Manage Users
        </Link>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>
      ) : (
        <div className="paper overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                <th className="px-4 py-3 font-medium text-gray-500">Institution</th>
                <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 font-medium text-gray-500">Users</th>
                <th className="px-4 py-3 font-medium text-gray-500">Plan</th>
                <th className="px-4 py-3 font-medium text-gray-500">Subscription</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => {
                const sub = inst.subscriptions?.[0];
                return (
                  <tr key={inst.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                                        <td className="px-4 py-3 font-medium">
                      <Link href={`/superadmin/institutions/${inst.id}`} style={{ color: "var(--text)" }} className="hover:underline">
                        {inst.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{inst.institution_type?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{inst.userCount}</td>
                    <td className="px-4 py-3 text-gray-500">{sub?.plans?.name || "No plan"}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{sub?.status || "None"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full capitalize" style={statusColor(inst.status)}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(inst)}
                        disabled={updatingId === inst.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
                      >
                        {inst.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}