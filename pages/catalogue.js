// pages/catalogue.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Catalogue() {
  const supabase = createClientComponentClient();
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgrammes();
  }, []);

  const fetchProgrammes = async () => {
    try {
      const { data, error } = await supabase.from("programmes").select("*");
      if (error) throw error;
      setProgrammes(data);
    } catch (err) {
      console.error("Error fetching programmes:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="p-6 text-center">Loading programmes...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Available Programmes</h1>
      {programmes.length === 0 ? (
        <p>No programmes available at the moment.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {programmes.map((prog) => (
            <div
              key={prog.id}
              className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer"
            >
              <h2 className="text-xl font-semibold mb-2">{prog.name}</h2>
              <p className="mb-4">{prog.description}</p>
              <Link href={`/checkout?programmeId=${prog.id}`}>
                <button className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900">
                  Enroll Now
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
