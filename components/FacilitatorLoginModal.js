"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/router";

export default function FacilitatorLoginModal({ isOpen, onClose, onSwitchToLearner }) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingAction, setOnboardingAction] = useState("create_institution");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("training_provider");
  const [inviteCode, setInviteCode] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "facilitator",
              first_name: firstName,
              surname,
              onboarding_action: onboardingAction,
              institution_name: institutionName,
              institution_type: institutionType,
              invite_code: inviteCode,
            },
          },
        });
        if (error) return alert(error.message);

        const userId = data.user.id;

        const { error: profileError } = await supabase.from("profiles").update({
          first_name: firstName,
          surname,
        }).eq("id", userId);
        if (profileError) return alert(profileError.message);

        if (onboardingAction === "create_institution") {
          alert(`Institution created! Please sign in. Your team invite code will be in Institution Settings once you're logged in.`);
        } else {
          alert("Facilitator account created! Please sign in.");
        }
        setIsSignUp(false);
        setEmail("");
        setPassword("");
        setFirstName("");
        setSurname("");
        setInstitutionName("");
        setInviteCode("");
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) return alert(signInError.message);

      const userId = signInData.user.id;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        return alert("Error verifying your profile. Please try again.");
      }
      if (!profile || !["facilitator", "institution_admin"].includes(profile.role)) {
        await supabase.auth.signOut();
        return alert("Access denied. This login is for facilitators and institution admins only.");
      }

      onClose();
      router.push(profile.role === "institution_admin" ? "/admin/institution-settings" : "/facilitator/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2";

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      )}

      <div
        className={`fixed inset-0 z-40 overflow-y-auto flex items-start md:items-center justify-center p-4 ${
          isOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl my-8 md:my-0 p-8 transition-all duration-300 ease-out ${
            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          style={{ background: "var(--paper)" }}
        >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
          <X size={22} />
        </button>

        <p className="text-xs font-mono text-[var(--text-muted)] mb-1 text-center">
          INSTITUTIONS & STAFF
        </p>
        <h2 className="font-display text-2xl font-semibold mb-6 text-center" style={{ color: "var(--text)" }}>
          {isSignUp ? "Set up your institution" : "Welcome back"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-3">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex gap-2 text-sm p-1 rounded-xl" style={{ background: "var(--paper-muted)" }}>
                <button
                  type="button"
                  onClick={() => setOnboardingAction("create_institution")}
                  className="flex-1 py-2 rounded-lg font-medium transition-colors"
                  style={
                    onboardingAction === "create_institution"
                      ? { background: "var(--paper)", color: "var(--text)", boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  Start a new institution
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingAction("join_institution")}
                  className="flex-1 py-2 rounded-lg font-medium transition-colors"
                  style={
                    onboardingAction === "join_institution"
                      ? { background: "var(--paper)", color: "var(--text)", boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  Join with invite code
                </button>
              </div>

              {onboardingAction === "create_institution" ? (
                <>
                  <input
                    type="text" placeholder="Institution Name" value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)} required
                    className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                  />
                  <select
                    value={institutionType} onChange={(e) => setInstitutionType(e.target.value)}
                    className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                  >
                    <option value="training_provider">Skills / Workplace Training Provider</option>
                    <option value="school">School (Primary / High School / College)</option>
                  </select>
                </>
              ) : (
                <input
                  type="text" placeholder="Invite Code" value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)} required
                  className={`${inputClass} font-mono`} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                />
              )}
            </>
          )}

          <input
            type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required
            className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className={inputClass} style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
          />

          <button
            type="submit" disabled={submitting}
            className="w-full py-3 mt-2 rounded-xl text-white font-medium transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand-color)" }}
          >
            {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          {isSignUp ? (
            <>Already registered?{" "}
              <button onClick={() => setIsSignUp(false)} className="font-medium" style={{ color: "var(--brand-color)" }}>
                Sign In
              </button>
            </>
          ) : (
            <>New institution or facilitator?{" "}
              <button onClick={() => setIsSignUp(true)} className="font-medium" style={{ color: "var(--brand-color)" }}>
                Sign Up
              </button>
            </>
          )}
        </p>

        <p className="mt-3 text-center text-sm text-[var(--text-muted)]">
          Are you a learner?{" "}
          <button
            onClick={() => { onClose(); onSwitchToLearner?.(); }}
            className="font-medium"
            style={{ color: "var(--seal-gold)" }}
          >
            Log in as Learner
          </button>
        </p>
        </div>
      </div>
    </>
  );
}