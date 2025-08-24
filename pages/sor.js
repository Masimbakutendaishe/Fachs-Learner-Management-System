import { useEffect, useState } from "react";
import {supabase} from "../lib/supabase";

export default function SOR() {
  const [sors, setSors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSors();
  }, []);

  const fetchSors = async () => {
    const user = supabase.auth.user();
    const { data, error } = await supabase
      .from("sors")
      .select("*")
      .eq("user_id", user.id);

    if (error) console.error(error);
    else setSors(data);

    setLoading(false);
  };

  if (loading) return <div className="p-6">Loading SORs...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">My Statements of Results</h1>

      {sors.length === 0 ? (
        <p>No SORs available yet. Complete your modules first.</p>
      ) : (
        sors.map((sor) => (
          <div key={sor.id} className="p-6 bg-white rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2">{sor.module_name}</h2>
            <p>Status: {sor.status}</p>
            <a
              href={`https://YOUR_SUPABASE_STORAGE_URL/${sor.file_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline mt-2 inline-block"
            >
              View PDF
            </a>
            <div className="mt-4">
              <img
                src="/qr-placeholder.png"
                alt="QR code placeholder"
                className="w-20 h-20"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
