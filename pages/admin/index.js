import { useEffect, useState } from "react";
import {supabase} from "../../lib/supabase";
import Link from "next/link";

export default function AdminDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [sors, setSors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    const { data: enrollData } = await supabase.from("enrollments").select("*, programme:programmes(name), user:users(email)");
    setEnrollments(enrollData || []);

    const { data: sorsData } = await supabase.from("sors").select("*");
    setSors(sorsData || []);

    const { data: sessionsData } = await supabase.from("sessions").select("*");
    setSessions(sessionsData || []);

    setLoading(false);
  };

  if (loading) return <div className="p-6">Loading admin dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Enrollments</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {enrollments.map((e) => (
            <div key={e.id} className="p-4 bg-white rounded-xl shadow">
              <p>User: {e.user.email}</p>
              <p>Programme: {e.programme.name}</p>
              <p>Status: {e.status}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">SORs</h2>
        <Link href="/admin/sor-approval">
          <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
            Go to SOR Approval
          </button>
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Teams Sessions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="p-4 bg-purple-50 rounded-xl shadow">
              <p>Module ID: {s.module_id}</p>
              <p>User ID: {s.user_id}</p>
              <p>Joined at: {new Date(s.joined_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
