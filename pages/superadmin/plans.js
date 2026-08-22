import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import Portal from "../../components/Portal";
import { Plus, Pencil } from "lucide-react";

export default function PlansPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("price");
    setPlans(data || []);
    setLoading(false);
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">PLATFORM ADMIN</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Plans</h1>
      <p className="text-[var(--text-muted)] mb-6">Manage the subscription plans institutions can be assigned to.</p>

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setEditingPlan({})}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--brand-color)" }}
        >
          <Plus size={16} /> New Plan
        </button>
        <Link href="/superadmin" className="text-sm font-medium" style={{ color: "var(--brand-color)" }}>
          ← Institutions
        </Link>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Loading plans...</p>
      ) : plans.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">No plans yet, create one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="paper p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>{p.name}</h3>
                <button onClick={() => setEditingPlan(p)} className="text-gray-400 hover:text-gray-700">
                  <Pencil size={16} />
                </button>
              </div>
              <p className="text-2xl font-mono font-semibold mb-1" style={{ color: "var(--text)" }}>
                ${p.price}<span className="text-sm text-gray-400">/{p.billing_interval}</span>
              </p>
              <p className="text-sm text-gray-500">{p.max_users ? `Up to ${p.max_users} users` : "Unlimited users"}</p>
            </div>
          ))}
        </div>
      )}

      {editingPlan && (
        <PlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); fetchPlans(); }} />
      )}
    </div>
  );
}

function PlanModal({ plan, onClose, onSaved }) {
  const supabase = createClient();
  const [name, setName] = useState(plan.name || "");
  const [price, setPrice] = useState(plan.price ?? "");
  const [billingInterval, setBillingInterval] = useState(plan.billing_interval || "month");
  const [maxUsers, setMaxUsers] = useState(plan.max_users ?? "");
  const [saving, setSaving] = useState(false);

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        price: Number(price),
        billing_interval: billingInterval,
        max_users: maxUsers === "" ? null : Number(maxUsers),
      };
      const { error } = plan.id
        ? await supabase.from("plans").update(payload).eq("id", plan.id)
        : await supabase.from("plans").insert([payload]);
      if (error) throw error;
      onSaved();
    } catch (err) {
      alert("Could not save plan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-8" style={{ background: "var(--paper)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">X</button>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">{plan.id ? "EDIT PLAN" : "NEW PLAN"}</p>
          <h2 className="font-display text-xl font-semibold mb-5" style={{ color: "var(--text)" }}>{plan.id ? "Edit Plan" : "Create Plan"}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Plan name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
              <select value={billingInterval} onChange={(e) => setBillingInterval(e.target.value)} className={inputClass} style={{ borderColor: "var(--border-soft)" }}>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <input type="number" placeholder="Max users (leave blank for unlimited)" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            <button type="submit" disabled={saving} className="w-full py-3 mt-2 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: "var(--brand-color)" }}>
              {saving ? "Saving..." : plan.id ? "Save Changes" : "Create Plan"}
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}