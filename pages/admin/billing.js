import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";

export default function Billing() {
  const { institution } = useAuth();
  const supabase = createClient();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (institution) fetchAll();
  }, [institution]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: plansData } = await supabase.from("plans").select("*").order("price");
    setPlans(plansData || []);

    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*, plans(name, price, billing_interval)")
      .eq("institution_id", institution.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(subData);

    setLoading(false);
  };

  const handleSubscribe = async (planId) => {
    setLoadingPlanId(planId);
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else {
      alert(data.error || "Something went wrong");
      setLoadingPlanId(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your current plan? Your institution will be suspended until you subscribe to a new one.")) return;
    setCanceling(true);
    const res = await fetch("/api/cancel-subscription", { method: "POST" });
    const data = await res.json();
    if (data.error) alert(data.error);
    else fetchAll();
    setCanceling(false);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading billing...</p>;

  return (
    <div className="max-w-4xl mx-auto animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">INSTITUTION ADMIN</p>
      <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: "var(--text)" }}>Billing</h1>
      <p className="text-[var(--text-muted)] mb-6">
        {institution?.name}, account status: <span className="font-medium capitalize">{institution?.status}</span>
      </p>

      {subscription ? (
        <div className="paper p-5 mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono text-[var(--text-muted)] mb-1">CURRENT PLAN</p>
            <p className="font-display text-lg font-semibold" style={{ color: "var(--text)" }}>
              {subscription.plans?.name} &middot; ${subscription.plans?.price}/{subscription.plans?.billing_interval}
            </p>
            {subscription.current_period_end && (
              <p className="text-xs text-gray-500 mt-1">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={handleCancel} disabled={canceling}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ border: "1px solid var(--border-soft)", color: "#B91C1C" }}
          >
            {canceling ? "Canceling..." : "Cancel Plan"}
          </button>
        </div>
      ) : (
        <div className="paper p-5 mb-8 text-sm text-gray-500">
          No active plan yet, pick one below to get started.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan_id === plan.id;
          return (
            <div key={plan.id} className="paper p-6 flex flex-col" style={isCurrent ? { border: "1.5px solid var(--brand-color)" } : undefined}>
              <h3 className="font-display font-semibold" style={{ color: "var(--text)" }}>{plan.name}</h3>
              <p className="text-2xl font-bold mt-2" style={{ color: "var(--text)" }}>
                ${plan.price}<span className="text-sm font-normal text-gray-500">/{plan.billing_interval}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {plan.max_users ? `Up to ${plan.max_users} users` : "Unlimited users"}
              </p>

              {isCurrent ? (
                <span className="mt-6 py-2.5 rounded-lg text-sm font-medium text-center" style={{ background: "var(--paper-muted)", color: "var(--text-muted)" }}>
                  Current Plan
                </span>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlanId === plan.id || !!subscription}
                  className="btn-silver mt-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  title={subscription ? "Cancel your current plan first to switch" : ""}
                >
                  {loadingPlanId === plan.id ? "Redirecting..." : subscription ? "Cancel current plan to switch" : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}