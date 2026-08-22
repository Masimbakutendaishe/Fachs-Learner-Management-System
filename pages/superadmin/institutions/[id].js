import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function InstitutionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = createClient();

  const [institution, setInstitution] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialDays, setTrialDays] = useState(14);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: inst } = await supabase.from("institutions").select("*").eq("id", id).single();
    setInstitution(inst);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, first_name, surname, role, is_active")
      .eq("institution_id", id);
    setUsers(usersData || []);

    const { data: plansData } = await supabase.from("plans").select("*").order("price");
    setPlans(plansData || []);

    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*, plans(name, max_users)")
      .eq("institution_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(subData);

    setLoading(false);
  };

  const toggleStatus = async () => {
    setBusy(true);
    const newStatus = institution.status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("institutions").update({ status: newStatus, trial_ends_at: null }).eq("id", id);
    if (error) alert(error.message);
    else fetchAll();
    setBusy(false);
  };

  const startTrial = async () => {
    setBusy(true);
    const endsAt = new Date(Date.now() + Number(trialDays) * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("institutions").update({ status: "trial", trial_ends_at: endsAt }).eq("id", id);
    if (error) alert(error.message);
    else fetchAll();
    setBusy(false);
  };

  const assignPlan = async (planId) => {
    if (!planId) return;
    setBusy(true);
    const { error } = await supabase.from("subscriptions").insert({
      institution_id: id,
      plan_id: planId,
      status: "active",
    });
    if (error) alert(error.message);
    else fetchAll();
    setBusy(false);
  };

  const toggleUserActive = async (userId, current) => {
    const { error } = await supabase.from("profiles").update({ is_active: !current }).eq("id", userId);
    if (error) alert(error.message);
    else fetchAll();
  };

  const sendReset = async (userEmail) => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) alert(error.message);
    else alert(`Reset email sent to ${userEmail}`);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;
  if (!institution) return <div className="paper p-8 text-center text-gray-500 text-sm">Institution not found.</div>;

  const statusColor = (status) => {
    if (status === "active") return { background: "#ECFDF5", color: "#047857" };
    if (status === "suspended") return { background: "#FEF2F2", color: "#B91C1C" };
    return { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" };
  };

  return (
    <div className="animate-fade-up">
      <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4 w-fit">
        <ArrowLeft size={16} /> Back to institutions
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">PLATFORM ADMIN</p>
          <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--text)" }}>{institution.name}</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{institution.institution_type?.replace("_", " ")}</p>
        </div>
        <span className="text-sm font-medium px-3 py-1.5 rounded-full capitalize" style={statusColor(institution.status)}>
          {institution.status}
          {institution.status === "trial" && institution.trial_ends_at && ` (ends ${new Date(institution.trial_ends_at).toLocaleDateString()})`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="paper p-5">
          <h2 className="font-display font-semibold mb-3" style={{ color: "var(--text)" }}>Account Status</h2>
          <button
            onClick={toggleStatus} disabled={busy}
            className="w-full py-2 rounded-lg text-sm font-medium mb-3 disabled:opacity-50"
            style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}
          >
            {institution.status === "suspended" ? "Reactivate Institution" : "Suspend Institution"}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-20 px-2 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
            />
            <button
              onClick={startTrial} disabled={busy}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--brand-color)", color: "white" }}
            >
              Set Trial ({trialDays} days)
            </button>
          </div>
        </div>

        <div className="paper p-5">
          <h2 className="font-display font-semibold mb-3" style={{ color: "var(--text)" }}>Plan</h2>
          <p className="text-sm text-gray-500 mb-3">
            Current: <span className="font-medium" style={{ color: "var(--text)" }}>{subscription?.plans?.name || "No plan assigned"}</span>
            {subscription?.plans?.max_users && ` (max ${subscription.plans.max_users} users)`}
          </p>
          <p className="text-xs text-gray-400 mb-3">Users: {users.length}{subscription?.plans?.max_users ? ` / ${subscription.plans.max_users}` : ""}</p>
          <select
            onChange={(e) => assignPlan(e.target.value)} defaultValue=""
            className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
          >
            <option value="" disabled>Assign a plan...</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (${p.price}/{p.billing_interval}, max {p.max_users || "unlimited"})</option>)}
          </select>
        </div>
      </div>

      <div className="paper overflow-hidden overflow-x-auto">
        <h2 className="font-display font-semibold p-5 pb-3" style={{ color: "var(--text)" }}>Users ({users.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
              <th className="px-5 py-3 font-medium text-gray-500">Name</th>
              <th className="px-5 py-3 font-medium text-gray-500">Role</th>
              <th className="px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                <td className="px-5 py-3 font-medium" style={{ color: "var(--text)" }}>{u.first_name} {u.surname}</td>
                <td className="px-5 py-3 text-gray-500 capitalize">{u.role?.replace("_", " ")}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={u.is_active ? { background: "#ECFDF5", color: "#047857" } : { background: "#FEF2F2", color: "#B91C1C" }}>
                    {u.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => toggleUserActive(u.id, u.is_active)} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}