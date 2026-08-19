import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "../../lib/supabase/client";

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data?.session) router.push("/dashboard");
    });
    return () => { mounted = false; };
  }, [router]);

  const handleSignIn = async () => {
    setMsg("Signing in...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(`Sign in error: ${error.message}`);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const redirectedFrom = router.query.redirectedFrom;
    if (profile?.role === "facilitator") {
      router.push(redirectedFrom?.startsWith("/facilitator") ? redirectedFrom : "/facilitator/dashboard");
    } else {
      router.push(redirectedFrom && !redirectedFrom.startsWith("/facilitator") ? redirectedFrom : "/dashboard");
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign In</h1>
      <input className="w-full border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" type="email" />
      <input className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
      <button onClick={handleSignIn} className="px-4 py-2 rounded bg-green-600 text-white">Sign In</button>
      {msg && <p className="text-sm opacity-80">{msg}</p>}
    </main>
  );
}