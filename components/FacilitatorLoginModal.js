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
      if (!profile || profile.role !== "facilitator") {
        await supabase.auth.signOut();
        return alert("Access denied. Only facilitators can log in here.");
      }

      onClose();
      router.push("/facilitator/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-30" />
      )}

      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-full max-w-md md:max-w-lg
          bg-gradient-to-br from-blue-900 via-gray-900 to-red-900
          rounded-3xl shadow-2xl border border-white/10
          z-40 p-8 transition-all duration-500
          ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-200">
          <X size={26} />
        </button>

        <h2 className="text-3xl font-bold mb-6 text-center text-white drop-shadow-lg">
          {isSignUp ? "Facilitator Sign Up" : "Facilitator Sign In"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none" />
              <input type="text" placeholder="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none" />

              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setOnboardingAction("create_institution")}
                  className={`flex-1 py-2 rounded-lg border ${onboardingAction === "create_institution" ? "bg-white/20 border-white" : "border-white/20 text-gray-300"}`}
                >
                  Start a new institution
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingAction("join_institution")}
                  className={`flex-1 py-2 rounded-lg border ${onboardingAction === "join_institution" ? "bg-white/20 border-white" : "border-white/20 text-gray-300"}`}
                >
                  Join with invite code
                </button>
              </div>

              {onboardingAction === "create_institution" ? (
                <>
                  <input type="text" placeholder="Institution Name" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none" />
                  <select value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-white/20 focus:ring-2 focus:ring-red-500 outline-none">
                    <option value="training_provider">Skills / Workplace Training Provider</option>
                    <option value="school">School (Primary / High School / College)</option>
                  </select>
                </>
              ) : (
                <input type="text" placeholder="Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none" />
              )}
            </>
          )}

          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none" />

          <button type="submit" disabled={submitting} className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-red-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Please wait..." : isSignUp ? "Create Facilitator Account" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-white text-opacity-80">
          {isSignUp ? (
            <>Already registered? <button onClick={() => setIsSignUp(false)} className="text-yellow-300 hover:underline">Sign In</button></>
          ) : (
            <>New facilitator? <button onClick={() => setIsSignUp(true)} className="text-yellow-300 hover:underline">Sign Up</button></>
          )}
        </p>

        <p className="mt-3 text-center text-gray-300 text-sm">
          Are you a learner?{" "}
          <button onClick={() => { onClose(); onSwitchToLearner?.(); }} className="text-blue-300 hover:underline">
            Log in as Learner
          </button>
        </p>
      </div>
    </>
  );
}