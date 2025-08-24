"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function FacilitatorLoginModal({
  isOpen,
  onClose,
  onSwitchToLearner, // ⬅️ opens learner modal
}) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();

    if (isSignUp) {
      // 1️⃣ Facilitator Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "facilitator" } },
      });

      if (error) return alert(error.message);
      const userId = data.user.id;

      // 2️⃣ Insert profile with facilitator role
      const { error: profileError } = await supabase.from("profiles").upsert([
        {
          id: userId,
          role: "facilitator",
          first_name: firstName,
          surname,
        },
      ]);

      if (profileError) return alert(profileError.message);

      alert("✅ Facilitator account created! Please sign in.");
      setIsSignUp(false);
      setEmail("");
      setPassword("");
      setFirstName("");
      setSurname("");
      return;
    }

    // 3️⃣ Facilitator Sign In
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) return alert(signInError.message);

    const userId = signInData.user.id;

    // 4️⃣ Check facilitator role in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError.message);
      return alert("Error verifying your profile. Please try again.");
    }

    if (!profile || profile.role !== "facilitator") {
      await supabase.auth.signOut();
      return alert("❌ Access denied. Only facilitators can log in here.");
    }

    // ✅ Facilitator login successful
    router.push("/facilitator/dashboard");
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-30"
        />
      )}

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
          w-full max-w-md md:max-w-lg
          bg-gradient-to-br from-blue-900 via-gray-900 to-red-900
          rounded-3xl shadow-2xl border border-white/10
          z-40 p-8 transition-all duration-500
          ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-200"
        >
          <X size={26} />
        </button>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-6 text-center text-white drop-shadow-lg">
          {isSignUp ? "Facilitator Sign Up" : "Facilitator Sign In"}
        </h2>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none"
              />
              <input
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-red-500 outline-none"
          />

          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-red-600 to-blue-700
                       text-white font-semibold shadow-lg
                       hover:shadow-2xl hover:scale-105 transform transition-all"
          >
            {isSignUp ? "Create Facilitator Account" : "Sign In"}
          </button>
        </form>

        {/* Toggle */}
        <p className="mt-4 text-center text-white text-opacity-80">
          {isSignUp ? (
            <>
              Already registered?{" "}
              <button
                onClick={() => setIsSignUp(false)}
                className="text-yellow-300 hover:underline"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New facilitator?{" "}
              <button
                onClick={() => setIsSignUp(true)}
                className="text-yellow-300 hover:underline"
              >
                Sign Up
              </button>
            </>
          )}
        </p>

        {/* Switch to learner */}
        <p className="mt-3 text-center text-gray-300 text-sm">
          Are you a learner?{" "}
          <button
            onClick={() => {
              onClose();
              onSwitchToLearner?.();
            }}
            className="text-blue-300 hover:underline"
          >
            Log in as Learner
          </button>
        </p>
      </div>
    </>
  );
}
