"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase/client";
import SealProgress from "../components/SealProgress";

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleCompletePayment = async (enrollmentId) => {
    const res = await fetch("/api/create-enrollment-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || "Could not start payment");
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        router.push("/auth/signin");
        return;
      }

      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id, progress, credits_earned, credits_total, enrolled_at, programme_id, payment_status,
          programmes ( id, name )
        `)
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (error) console.error(error);
      setEnrollments(data || []);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="py-24 text-center text-[var(--text-muted)] font-mono text-sm">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-xs font-mono text-[var(--text-muted)] mb-1">DASHBOARD</p>
        <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--text)" }}>
          {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Your qualifications and progress</p>
      </header>

      <section>
        <h2 className="font-display text-lg font-semibold mb-4 animate-fade-up stagger-1" style={{ color: "var(--text)" }}>
          Registered Qualifications
        </h2>

        {enrollments.length === 0 ? (
          <div className="paper p-8 text-center animate-fade-up stagger-1">
            <p className="text-gray-500 text-sm">No enrollments yet.</p>
            <Link href="/qualifications" className="inline-block mt-3 text-sm font-medium" style={{ color: "var(--brand-color)" }}>
              Browse qualifications →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((enrollment, i) => {
              const programmeName = enrollment.programmes?.name || `Programme #${enrollment.programme_id}`;
              return (
                <div
                  key={enrollment.id}
                  className={`paper p-5 card-lift animate-fade-up stagger-${Math.min(i + 1, 4)}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display font-semibold text-gray-900">{programmeName}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Enrolled {enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <SealProgress
                      percent={enrollment.progress ?? 0}
                      size={52}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-gray-500 font-mono text-xs">
                      {enrollment.credits_earned ?? 0}/{enrollment.credits_total ?? 0} credits
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        enrollment.payment_status === "paid"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {enrollment.payment_status === "paid" ? "Paid" : "Payment due"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/module-player/${enrollment.id}`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
                      style={{ background: "var(--brand-color)" }}
                    >
                      Continue →
                    </Link>
                    {enrollment.payment_status !== "paid" && (
                      <button
                        onClick={() => handleCompletePayment(enrollment.id)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-400 text-amber-900 hover:bg-amber-300 transition-colors"
                      >
                        Pay
                      </button>
                    )}
                  </div>

                  <Link href="/popia" className="block mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    POPIA Declaration
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="paper p-6 animate-fade-up stagger-2">
        <h2 className="font-display font-semibold text-gray-900 mb-3">Announcements</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>POE submissions for Unit Standards 14917 & 14921 are due this Friday.</li>
          <li>QCTO moderation visits take place next week, have practical assessments ready.</li>
          <li>New facilitators have joined for upcoming modules.</li>
        </ul>
      </section>
    </div>
  );
}