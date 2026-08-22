import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "../../lib/supabase/client";

function homeForRole(role) {
  if (role === "superadmin") return "/superadmin";
  if (role === "institution_admin") return "/admin/institution-settings";
  if (role === "facilitator") return "/facilitator/dashboard";
  return "/dashboard";
}

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data?.session) router.push("/dashboard");
    });
    return () => { mounted = false; };
  }, [router]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMsg("Signing in...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMsg(error.message); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const home = homeForRole(profile?.role);
      const redirectedFrom = router.query.redirectedFrom;
      router.push(redirectedFrom || home);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-16 px-4 animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1 text-center">WELCOME BACK</p>
      <h1 className="font-display text-2xl font-semibold mb-6 text-center" style={{ color: "var(--text)" }}>
        Sign In
      </h1>

      <form onSubmit={handleSignIn} className="paper p-6 space-y-3">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com" required
          className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" required
          className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
        />
        <button
          type="submit" disabled={submitting}
          className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
        {msg && <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{msg}</p>}
      </form>
    </div>
  );
}