import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import {supabase} from "../lib/supabase";

export default function Checkout() {
  const router = useRouter();
  const { programmeId } = router.query;
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (programmeId) fetchProgramme();
  }, [programmeId]);

  const fetchProgramme = async () => {
    const { data } = await supabase.from("programmes").select("*").eq("id", programmeId).single();
    setProgramme(data);
  };

  const handleEnroll = async () => {
    setLoading(true);
    const user = supabase.auth.user();
    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      programme_id: programme.id,
      status: "enrolled",
    });
    if (error) console.error(error);
    else router.push("/popia"); // next step
  };

  if (!programme) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Enroll in {programme.name}</h1>
      <p className="mb-6">{programme.description}</p>
      <button
        onClick={handleEnroll}
        className="bg-green-700 text-white px-6 py-3 rounded-xl hover:bg-green-800 transition"
        disabled={loading}
      >
        {loading ? "Processing..." : "Confirm Enrollment (Dummy Payment)"}
      </button>
    </div>
  );
}
