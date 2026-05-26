import { useEffect, useState } from "react";
import {supabase} from "../../lib/supabase";

export default function SORApproval() {
  const [sors, setSors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSors();
  }, []);

  const fetchSors = async () => {
    const { data } = await supabase.from("sors").select("*").eq("status", "ready");
    setSors(data || []);
    setLoading(false);
  };

  const handleApprove = async (sor) => {
    await supabase.from("sors").update({ status: "approved" }).eq("id", sor.id);
    await supabase.from("qcto_submissions").insert({
      sor_id: sor.id,
      submitted_at: new Date(),
      status: "submitted",
    });
    fetchSors();
  };

  if (loading) return <div className="p-6">Loading SOR approvals...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold mb-6">SOR Approval</h1>

      {sors.length === 0 ? (
        <p>No SORs ready for approval.</p>
      ) : (
        sors.map((sor) => (
          <div key={sor.id} className="p-4 bg-white rounded-xl shadow flex justify-between items-center">
            <p>{sor.module_name} - {sor.user_id}</p>
            <button
              onClick={() => handleApprove(sor)}
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
            >
              Approve & Submit to QCTO
            </button>
          </div>
        ))
      )}
    </div>
  );
}
