import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase/client";

export default function ParentSignup() {
  const supabase = createClient();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            onboarding_action: "link_as_parent",
            parent_invite_code: code.trim().toUpperCase(),
            first_name: firstName,
            surname,
          },
        },
      });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/parent/dashboard");
      } else {
        setMessage("Account created. Check your email to confirm, then sign in.");
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  return (
    <div className="max-w-sm mx-auto py-16 px-4 animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1 text-center">PARENT ACCESS</p>
      <h1 className="font-display text-2xl font-semibold mb-2 text-center" style={{ color: "var(--text)" }}>
        Create a Parent Account
      </h1>
      <p className="text-sm text-center text-gray-500 mb-6">Ask your child for their Parent Invite Code, found on their "My Progress & Marks" page.</p>

      <form onSubmit={handleSubmit} className="paper p-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
          <input type="text" placeholder="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
        </div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
        <input type="text" placeholder="Parent Invite Code" value={code} onChange={(e) => setCode(e.target.value)} required className={`${inputClass} font-mono`} style={{ borderColor: "var(--border-soft)" }} />
        <button type="submit" disabled={submitting} className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {submitting ? "Creating account..." : "Create Account"}
        </button>
        {message && <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{message}</p>}
      </form>
    </div>
  );
}
