import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase/client";

export default function ResetPassword() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const establishSession = async () => {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          setReady(true);
          setChecked(true);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) setReady(true);
      setChecked(true);
    };

    establishSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setMessage("Passwords don't match.");
    if (password.length < 6) return setMessage("Password must be at least 6 characters.");

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) return setMessage(error.message);
    setMessage("Password updated. Redirecting...");
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  return (
    <div className="max-w-sm mx-auto py-16 px-4">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">ACCOUNT</p>
      <h1 className="font-display text-2xl font-semibold mb-6" style={{ color: "var(--text)" }}>Set a new password</h1>

            {!checked ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Checking your link...</p>
      ) : !ready ? (
        <div className="paper p-6 text-center text-sm text-gray-500">
          This link is invalid or has expired. Go back and request a new reset email, then click it as soon as it arrives.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" placeholder="New password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
          />
          <input
            type="password" placeholder="Confirm new password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
          />
          <button
            type="submit" disabled={submitting}
            className="btn-silver w-full py-3 mt-2 rounded-xl font-medium disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
          {message && <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{message}</p>}
        </form>
      )}
    </div>
  );
}