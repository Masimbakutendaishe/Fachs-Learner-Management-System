"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setEnrollments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("enrollments")
        .select(
          `
          id,
          progress,
          credits_earned,
          credits_total,
          enrolled_at,
          programme_id,
          payment_status,
          programmes (
            id,
            name
          )
        `
        )
        .eq("user_id", user.id);

      if (error) console.error("❌ Error fetching enrollments:", error);
      setEnrollments(data || []);
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-300 font-semibold">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Greeting */}
      <header className="text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">
          {user?.user_metadata?.full_name || user?.email?.split("@")[0]}{" "}
          s Dashboard
        </h1>
        <p className="text-gray-200 mt-1 font-medium">
          Here is your learning journey today
        </p>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Enrollments */}
        <section className="flex flex-col">
          <h2 className="text-2xl font-bold mb-4 text-white">
            Registered Qualifications
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-gray-400 font-medium">No enrollments found.</p>
          ) : (
            <ul className="grid gap-6 flex-1">
              {enrollments.map((enrollment) => {
                const programmeName =
                  enrollment.programmes?.name ||
                  `Programme #${enrollment.programme_id}`;
                const progress = enrollment.progress ?? 0;
                const creditsEarned = enrollment.credits_earned ?? 0;
                const creditsTotal = enrollment.credits_total ?? 0;

                return (
                  <li
                    key={enrollment.id}
                    className="relative p-5 rounded-2xl shadow-md 
                               bg-gray-900/40 backdrop-blur-md 
                               border border-gray-700 hover:scale-[1.02] 
                               transition transform"
                  >
                    <img
                      src="/dsk.jpg"
                      alt={programmeName}
                      className="w-full h-36 object-cover rounded-xl mb-3 shadow-sm"
                    />

                    <h3 className="text-lg font-bold text-white mb-2">
                      {programmeName}
                    </h3>

                    <p className="text-gray-200 font-medium">
                      Progress: {progress}%
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <p className="text-gray-200 font-medium">
                      Credits: {creditsEarned}/{creditsTotal}
                    </p>
                    <p className="text-gray-400 text-sm font-semibold">
                      Enrolled:{" "}
                      {enrollment.enrolled_at
                        ? new Date(
                            enrollment.enrolled_at
                          ).toLocaleDateString()
                        : "Unknown"}
                    </p>
                    <p
                      className={`text-sm font-bold mt-1 ${
                        enrollment.payment_status === "paid"
                          ? "text-green-400"
                          : enrollment.payment_status === "failed"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      Payment: {enrollment.payment_status}
                    </p>

                    <Link
                      href={`/module-player/${enrollment.id}`} 
                      className="mt-3 inline-block text-blue-400 font-bold hover:underline"
                    >
                      Go to programme →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      {/* Announcements */}
<section className="p-6 rounded-2xl bg-gray-800/60 backdrop-blur-md shadow-md border border-gray-700 flex flex-col">
  <h2 className="text-xl font-extrabold text-white mb-4">
    Announcements
  </h2>
  <ul className="list-disc ml-6 text-gray-200 font-medium space-y-2 flex-1">
    <li>POE submissions for Unit Standards 14917 & 14921 are due this Friday – ensure all evidence is uploaded.</li>
    <li>QCTO moderation visits will take place next week – please have all practical assessments ready.</li>

    <li>New facilitators have joined for the upcoming modules – welcome them and check their office hours for support.</li>
  </ul>
</section>

      </div>

      {/* Study Tips */}
      <section className="p-6 rounded-2xl bg-gray-100 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">💡 Study Tips</h2>
        <ul className="list-disc ml-6 text-gray-800 font-medium space-y-1">
          <li>Break your study sessions into 25-minute chunks.</li>
          <li>Revise with a friend – teaching helps retention.</li>
          <li>Get enough rest! A fresh mind remembers more.</li>
        </ul>
      </section>

      {/* Learner of the Month */}
      <section className="p-6 rounded-2xl bg-gray-50 shadow-md text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          🏆 Learner of the Month
        </h2>
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 p-6 rounded-2xl shadow-md inline-block">
          <img
            src="https://randomuser.me/api/portraits/women/44.jpg"
            alt="Learner of the Month"
            className="w-24 h-24 rounded-full mx-auto shadow-md mb-3"
          />
          <h3 className="font-bold text-lg text-white">Thandiwe Nkosi</h3>
          <p className="text-gray-300 font-medium">
            Completed 95% of her programme 🎉
          </p>
        </div>
      </section>
    </div>
  );
}
