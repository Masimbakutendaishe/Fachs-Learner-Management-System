import { useState } from "react";
import supabase from "../lib/supabase";
import { useRouter } from "next/router";

export default function Popia() {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!consent) return alert("You must accept to continue");
    setLoading(true);
    const user = supabase.auth.user();
    const { error } = await supabase.from("consents").upsert({
      user_id: user.id,
      accepted: consent,
      date: new Date(),
    });
    if (error) console.error(error);
    else router.push("/dashboard");
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">POPIA Consent</h1>
      <p className="mb-6">
        Please read and accept our data privacy declaration before accessing modules.
      </p>
      <label className="flex items-center space-x-3 mb-6">
        <input
          type="checkbox"
          checked={consent}
          onChange={() => setConsent(!consent)}
          className="w-5 h-5"
        />
        <span>I accept and consent to the data privacy terms.</span>
      </label>
      <button
        onClick={handleSubmit}
        className="bg-blue-700 text-white px-6 py-3 rounded-xl hover:bg-blue-800 transition"
        disabled={loading}
      >
        {loading ? "Saving..." : "Continue to Dashboard"}
      </button>
    </div>
  );
}
