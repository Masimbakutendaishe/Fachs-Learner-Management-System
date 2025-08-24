"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function FacilitatorDashboard() {
  const supabase = createClientComponentClient();

  const [facilitations, setFacilitations] = useState([]);
  const [user, setUser] = useState(null);

  // Fetch authenticated user on load
  useEffect(() => {
    const fetchUserAndFacilitations = async () => {
      const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !sessionUser) {
        console.error("Error fetching authenticated user:", userErr);
        return;
      }

      setUser({
        id: sessionUser.id,
        full_name: sessionUser.user_metadata?.full_name || "Facilitator",
        email: sessionUser.email,
      });

      // Fetch facilitator-linked programmes
      const { data: programmes, error: progErr } = await supabase
        .from("programmes")
        .select("*")
        .eq("facilitator_id", sessionUser.id);

      if (progErr) console.error("Error fetching programmes:", progErr);
      else
        setFacilitations(
          programmes.map((p) => ({
            id: p.id,
            qualifications: {
              name: p.name,
              nqf_level: p.nqf_level,
              credits: p.credits_total,
            },
            start_date: p.start_date || null,
            end_date: p.end_date || null,
          }))
        );
    };

    fetchUserAndFacilitations();
  }, [supabase]);

  // Add or link a qualification
  const handleAddQualification = async () => {
    if (!user) return;

    const qualificationName = prompt("Enter Qualification Name:");
    if (!qualificationName) return;

    // Check if programme exists
    const { data: existing, error: checkErr } = await supabase
      .from("programmes")
      .select("*")
      .eq("name", qualificationName)
      .single();

    if (checkErr && checkErr.code !== "PGRST116") {
      console.error("Error checking programme:", checkErr);
      return;
    }

    let programme;

    if (!existing) {
      // Prompt for missing details
      const nqfLevel = prompt("Enter NQF Level (e.g., 4, 5, 6):") || 1;
      const credits = prompt("Enter total credits:") || 0;
      const description = prompt("Enter programme description:") || "";

      // Insert new programme linked to facilitator
      const { data: newProg, error: insertErr } = await supabase
        .from("programmes")
        .insert([
          {
            name: qualificationName,
            nqf_level: Number(nqfLevel),
            credits_total: Number(credits),
            description,
            facilitator_id: user.id, // assign authenticated user ID
          },
        ])
        .select()
        .single();

      if (insertErr) {
        console.error("Error creating programme:", insertErr);
        return;
      }

      programme = newProg;
      alert("New programme created and linked to your profile.");
    } else {
      programme = existing;
      alert("Qualification exists: linked to your profile.");
    }

    // Update UI immediately
    setFacilitations((prev) => [
      ...prev,
      {
        id: programme.id,
        qualifications: {
          name: programme.name,
          nqf_level: programme.nqf_level,
          credits: programme.credits_total,
        },
        start_date: programme.start_date || null,
        end_date: programme.end_date || null,
      },
    ]);
  };

  if (!user) return <p className="text-white p-6">Loading dashboard...</p>;

  return (
    <div className="p-6 space-y-8">
      {/* Greeting */}
      <header className="text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">
          {user?.full_name || user?.email?.split("@")[0]}s Dashboard
        </h1>
        <p className="text-gray-200 mt-1 font-medium">
          Manage your qualifications and learner progress here
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Qualifications Facilitating */}
        <section className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">
              Qualifications Facilitating
            </h2>
            <button
              onClick={handleAddQualification}
              className="flex items-center gap-2 text-blue-400 font-bold hover:underline"
            >
              <PlusCircle className="w-5 h-5" /> Add Qualification
            </button>
          </div>

          {facilitations.length === 0 ? (
            <p className="text-gray-400 font-medium">No qualifications assigned yet.</p>
          ) : (
            <ul className="grid gap-6 flex-1">
              {facilitations.map((f) => {
                const q = f.qualifications;
                return (
                  <li
                    key={f.id}
                    className="relative p-5 rounded-2xl shadow-md bg-gray-900/40 backdrop-blur-md border border-gray-700 hover:scale-[1.02] transition transform"
                  >
                    <img src="/dsk.jpg" alt={q?.name} className="w-full h-36 object-cover rounded-xl mb-3 shadow-sm" />
                    <h3 className="text-lg font-bold text-white mb-2">{q?.name}</h3>
                    <p className="text-gray-200 font-medium">NQF Level: {q?.nqf_level || "TBA"}</p>
                    <p className="text-gray-200 font-medium">Credits: {q?.credits || "TBA"}</p>
                    <p className="text-gray-400 text-sm font-semibold">
                      Period: {f.start_date ? new Date(f.start_date).toLocaleDateString() : "Start TBA"} -{" "}
                      {f.end_date ? new Date(f.end_date).toLocaleDateString() : "Ongoing"}
                    </p>
                    <Link href={`/module-player/facilitator/${f.id}`} className="mt-3 inline-block text-blue-400 font-bold hover:underline">
                      Go to modules →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Announcements & My Schedule */}
        <section className="p-6 rounded-2xl bg-gray-800/60 backdrop-blur-md shadow-md border border-gray-700 flex flex-col h-full">
          <div className="flex-1 grid grid-rows-2 gap-4">
            {/* Top Half: Announcements */}
            <div className="p-4 bg-blue-900/30 rounded-lg flex flex-col">
              <h2 className="text-xl font-extrabold text-white mb-2">Announcements</h2>
              <ul className="list-disc ml-6 text-gray-200 font-medium space-y-2 flex-1">
                <li>QCTO audit visit scheduled for 10 September – prepare learner PoEs.</li>
                <li>Upcoming assessor and moderator allocation – confirm your availability.</li>
                <li>Unit Standard assessments due for moderation this month.</li>
                <li>New compliance checklist uploaded to your facilitator portal.</li>
              </ul>
            </div>

            {/* Bottom Half: My Schedule */}
            <div className="p-4 bg-green-900/30 rounded-lg flex flex-col">
              <h2 className="text-xl font-extrabold text-white mb-2">My Schedule</h2>
              <ul className="text-gray-200 font-medium list-disc ml-6 flex-1 space-y-1">
                <li>09:00 - 10:00: Knowledge Module</li>
                <li>10:15 - 11:15: Practical Evidence Upload</li>
                <li>11:30 - 12:30: Summative Assessment</li>
                <li>13:00 - 14:00: MS Teams Session</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
