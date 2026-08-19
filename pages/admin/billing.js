import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";

export default function Billing() {
  const { institution } = useAuth();
  const supabase = createClient();
  const [plans, setPlans] = useState([]);
  const [loadingPlanId, setLoadingPlanId] = useState(null);

  useEffect(() => {
    supabase.from("plans").select("*").order("price").then(({ data }) => setPlans(data || []));
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold text-white mb-1">Billing</h1>
      <p className="text-gray-300 text-sm mb-8">
        {institution?.name}, current status:{" "}
        <span className="font-medium capitalize">{institution?.status}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl p-6 flex flex-col">
            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${plan.price}<span className="text-sm font-normal text-gray-500">/{plan.billing_interval}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {plan.max_users ? `Up to ${plan.max_users} users` : "Unlimited users"}
            </p>
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={loadingPlanId === plan.id}
              className="mt-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-color)" }}
            >
              {loadingPlanId === plan.id ? "Redirecting..." : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}