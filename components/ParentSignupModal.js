"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/router";
import { createClient } from "../lib/supabase/client";
import Portal from "./Portal";

export default function ParentSignupModal({ isOpen, onClose }) {
  const supabase = createClient();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("signup");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");

    if (mode === "signin") {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role !== "parent") {
          await supabase.auth.signOut();
          throw new Error("This isn't a parent account. Use the regular Sign In instead.");
        }

        onClose();
        window.location.href = "/parent/dashboard";
      } catch (err) {
        setMessage(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
        onClose();
        window.location.href = "/parent/dashboard";
      } else {
        setMessage("Account created. Check your email to confirm, then sign in.");
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2";

  return (
    <Portal>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${
          isOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8 transition-all duration-300 ease-out ${
            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          style={{ background: "var(--paper)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={22} />
          </button>

                   <p className="text-xs font-mono text-[var(--text-muted)] mb-1 text-center">PARENT ACCESS</p>
          <h2 className="font-display text-2xl font-semibold mb-2 text-center" style={{ color: "var(--text)" }}>
            {mode === "signup" ? "Create a Parent Account" : "Parent Sign In"}
          </h2>
          {mode === "signup" && (
            <p className="text-sm text-center text-gray-500 mb-6">
              Ask your child for their Parent Invite Code, found on their "My Progress &amp; Marks" page.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            {mode === "signup" && (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3">
                <input
                  type="text" placeholder="First Name" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} required
                  className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                />
                <input
                  type="text" placeholder="Surname" value={surname}
                  onChange={(e) => setSurname(e.target.value)} required
                  className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                />
              </div>
            )}
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
            />
            {mode === "signup" && (
              <input
                type="text" placeholder="Parent Invite Code" value={code}
                onChange={(e) => setCode(e.target.value)} required
                className={`${inputClass} font-mono`} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              />
            )}
            <button
              type="submit" disabled={submitting}
              className="btn-silver w-full py-3 mt-2 rounded-xl font-medium disabled:opacity-50"
            >
              {submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
            {message && <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{message}</p>}
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            {mode === "signup" ? (
              <>Already have a parent account?{" "}
                <button onClick={() => { setMode("signin"); setMessage(""); }} className="font-medium" style={{ color: "var(--brand-color)" }}>
                  Sign in
                </button>
              </>
            ) : (
              <>Need to create one?{" "}
                <button onClick={() => { setMode("signup"); setMessage(""); }} className="font-medium" style={{ color: "var(--brand-color)" }}>
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </Portal>
  );
}
