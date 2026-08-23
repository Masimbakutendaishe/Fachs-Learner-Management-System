import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Button from "../components/Button";
import AuthModal from "../components/AuthModal";
import ChatModal from "../components/ChatModal";
import CountUp from "react-countup";
import VisibilitySensor from "react-visibility-sensor";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const { institution, user, role, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "" });
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [pendingGradingCount, setPendingGradingCount] = useState(0);

  const supabase = createClient();

  const fetchHomeData = async () => {
    if (!institution?.id || !user) return;

    let announcementsQuery = supabase
      .from("announcements")
      .select("*, profiles ( first_name, surname )")
      .eq("institution_id", institution.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (role === "learner") {
      const { data: myEnrollments } = await supabase.from("enrollments").select("programme_id").eq("user_id", user.id);
      const myProgrammeIds = (myEnrollments || []).map((e) => e.programme_id);
      announcementsQuery = announcementsQuery.or(
        `audience.eq.everyone${myProgrammeIds.length ? `,and(audience.eq.my_learners,programme_id.in.(${myProgrammeIds.join(",")}))` : ""}`
      );
    }

    const { data: announcementsData } = await announcementsQuery;
    setAnnouncements((announcementsData || []).slice(0, 5));

    if (role === "facilitator") {
      const { data: weeksData } = await supabase
        .from("unit_weeks")
        .select("unit_standard_title, session_datetime, programmes ( name, facilitator_id )")
        .not("session_datetime", "is", null)
        .gte("session_datetime", new Date().toISOString())
        .order("session_datetime", { ascending: true })
        .limit(5);
      setUpcomingSessions((weeksData || []).filter((w) => w.programmes?.facilitator_id === user.id));

      const { data: myProgrammes } = await supabase.from("programmes").select("id").eq("facilitator_id", user.id);
      const programmeIds = (myProgrammes || []).map((p) => p.id);
      if (programmeIds.length > 0) {
        const { count } = await supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .in("programme_id", programmeIds)
          .eq("status", "submitted");
        setPendingGradingCount(count || 0);
      }
    } else if (role === "learner") {
      const { data: enrollments } = await supabase.from("enrollments").select("programme_id").eq("user_id", user.id);
      const programmeIds = (enrollments || []).map((e) => e.programme_id);
      if (programmeIds.length > 0) {
        const { data: weeksData } = await supabase
          .from("unit_weeks")
          .select("unit_standard_title, session_datetime, programmes ( name )")
          .in("programme_id", programmeIds)
          .not("session_datetime", "is", null)
          .gte("session_datetime", new Date().toISOString())
          .order("session_datetime", { ascending: true })
          .limit(5);
        setUpcomingSessions(weeksData || []);
      }
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [institution?.id, user?.id, role]);

  const postAnnouncement = async () => {
    if (!newAnnouncement.title.trim()) return;
    setPostingAnnouncement(true);
    const { data: myProgrammes } = role === "facilitator"
      ? await supabase.from("programmes").select("id").eq("facilitator_id", user.id)
      : { data: null };
    const { error } = await supabase.from("announcements").insert({
      institution_id: institution.id,
      author_id: user.id,
      title: newAnnouncement.title,
      body: newAnnouncement.body,
      audience: newAnnouncement.audience || "everyone",
      programme_id: newAnnouncement.audience === "my_learners" ? myProgrammes?.[0]?.id : null,
    });
    if (error) alert(error.message);
    else {
      setNewAnnouncement({ title: "", body: "", audience: "everyone" });
      fetchHomeData();
    }
    setPostingAnnouncement(false);
  };

  const openModal = (selectedMode) => {
    setMode(selectedMode);
    setIsOpen(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  return (
    <div
      className="w-full"
      style={{
        backgroundImage: `linear-gradient(rgba(244,244,245,0.88), rgba(244,244,245,0.88)), url('/lmsimg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        marginTop: "-2rem",
        marginBottom: "-2rem",
        width: "100vw",
        paddingLeft: "calc(50vw - 50%)",
        paddingRight: "calc(50vw - 50%)",
        paddingTop: "2rem",
        paddingBottom: "2rem",
        position: "relative",
        zIndex: 0,
      }}
    >
      <Head>
        <title>Fachs LMS – Learning Platform for Institutions</title>
        <meta
          name="description"
          content="Explore Fachs LMS: accredited qualifications, live sessions, and a learning platform built for training providers and schools."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/collegelogo.png" />
        <link rel="apple-touch-icon" href="/collegelogo.png" />
        <meta property="og:title" content="Fachs LMS" />
        <meta property="og:description" content="A learning platform built for training providers and schools." />
        <meta property="og:image" content="/collegelogo.png" />
        <meta property="og:type" content="website" />
      </Head>

        {sessionUser ? (
        <section className="max-w-5xl mx-auto pt-8 pb-8 animate-fade-up">
          <p className="text-xs font-mono tracking-wide text-[var(--text-muted)] mb-2">
            {institution?.name || "FACHS LMS"}
          </p>
          <h1 className="font-display text-3xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ""}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {role === "facilitator" && `You're facilitating ${institution?.name || "your institution"}'s courses.`}
            {role === "learner" && "Here's what's happening across your courses."}
            {role === "institution_admin" && "Here's an overview of your institution."}
            {role === "superadmin" && "Platform overview."}
          </p>
        </section>
      ) : (
        <section className="text-center max-w-3xl mx-auto pt-8 pb-16 animate-fade-up">
          <p className="text-xs font-mono tracking-wide text-[var(--text-muted)] mb-4">
            MULTI-INSTITUTION LEARNING PLATFORM
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4" style={{ color: "var(--text)" }}>
            {institution?.name ? `Welcome to ${institution.name}` : "Learning, built for how your institution actually runs"}
          </h1>
          <p className="text-lg text-[var(--text-muted)] mb-8">
            {institution?.motto || "Qualifications, live sessions, assessments, and progress, all in one place. Built for training providers and schools alike."}
          </p>

          <div className="flex items-center justify-center gap-3 mb-8">
            <Button
              className="btn-silver font-medium px-6 py-3 rounded-xl transition-all hover:brightness-110"
              onClick={() => openModal("signup")}
            >
              Get Started
            </Button>
            <Button
              className="bg-white border font-medium px-6 py-3 rounded-xl transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              onClick={() => openModal("signin")}
            >
              Sign In
            </Button>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono" style={{ background: "var(--seal-gold-soft)", color: "var(--seal-gold)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--seal-gold)" }} />
            QCTO & SETA Accredited Programmes
          </div>
        </section>
      )}

      <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} mode={mode} />

            {sessionUser ? (
        <section className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
          <div className="paper p-6 animate-fade-up stagger-1">
            <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>
              Announcements
            </h2>
                       {(role === "institution_admin" || role === "superadmin" || role === "facilitator") && (
              <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: "var(--paper-muted)" }}>
                <input
                  type="text" placeholder="Announcement title" value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
                />
                               <textarea
                  placeholder="Details (optional)" value={newAnnouncement.body} rows={2}
                  onChange={(e) => setNewAnnouncement((p) => ({ ...p, body: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
                />
                {role === "facilitator" && (
                  <select
                    value={newAnnouncement.audience || "everyone"}
                    onChange={(e) => setNewAnnouncement((p) => ({ ...p, audience: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
                  >
                    <option value="everyone">Everyone in {institution?.name || "the institution"}</option>
                    <option value="my_learners">Just my learners</option>
                  </select>
                )}
                <button onClick={postAnnouncement} disabled={postingAnnouncement} className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: "var(--brand-color)", color: "white" }}>
                  {postingAnnouncement ? "Posting..." : "Post Announcement"}
                </button>
              </div>
            )}
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400">No announcements yet.</p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="p-3 rounded-xl text-sm" style={{ background: "var(--paper-muted)" }}>
                    <p className="font-medium" style={{ color: "var(--text)" }}>{a.title}</p>
                    {a.body && <p className="text-gray-600 mt-1">{a.body}</p>}
                    <p className="text-xs text-gray-400 mt-1 font-mono">{new Date(a.created_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="paper p-6 animate-fade-up stagger-2">
            <h2 className="font-display text-xl font-semibold mb-4" style={{ color: "var(--text)" }}>
              {role === "facilitator" ? "My Schedule" : "Upcoming Sessions"}
            </h2>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing scheduled right now.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingSessions.map((s, i) => (
                  <li key={i} className="p-3 rounded-xl text-sm" style={{ background: "var(--paper-muted)" }}>
                    <p className="font-medium" style={{ color: "var(--text)" }}>{s.programmes?.name}</p>
                    <p className="text-gray-600">{s.unit_standard_title}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{new Date(s.session_datetime).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
          <div className="paper p-6 card-lift flex flex-col justify-center items-center text-center animate-fade-up stagger-2">
            <h2 className="font-display text-xl font-semibold mb-6" style={{ color: "var(--text)" }}>
              What Our Clients Say
            </h2>
            <img
              src="/pg.jpg"
              alt="Client"
              className="w-16 h-16 rounded-full object-cover mb-4"
              style={{ border: "2px solid var(--seal-gold)" }}
            />
            <p className="text-base font-medium mb-2" style={{ color: "var(--text)" }}>
              "Fachs LMS transformed our learning process!"
            </p>
            <span className="text-sm text-[var(--text-muted)]">— Sphiwe, Tshwane Municipality</span>
          </div>
        </section>
      )}

        {sessionUser && (
        <section className="max-w-5xl mx-auto mb-16">
          <h2 className="font-display text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {role === "learner" && (
              <>
                <Link href="/dashboard" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Continue Learning</Link>
                <Link href="/progress" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>My Progress &amp; Marks</Link>
              </>
            )}
            {role === "facilitator" && (
              <>
                <Link href="/facilitator/dashboard" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>My Courses</Link>
                <div className="paper p-5">
                  <p className="text-2xl font-mono font-semibold" style={{ color: "var(--brand-color)" }}>{pendingGradingCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Awaiting Grading</p>
                </div>
              </>
            )}
            {role === "institution_admin" && (
              <>
                <Link href="/admin/institution-settings" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Institution Settings</Link>
                <Link href="/admin/users" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Manage Users</Link>
                <Link href="/admin/fees" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Fees &amp; Invoices</Link>
                <Link href="/admin/billing" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Billing</Link>
              </>
            )}
            {role === "superadmin" && (
              <>
                <Link href="/superadmin" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Institutions</Link>
                <Link href="/superadmin/users" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Users</Link>
                <Link href="/superadmin/plans" className="paper p-5 card-lift text-sm font-medium" style={{ color: "var(--text)" }}>Plans</Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* Stats */}
      {!sessionUser && (
      <section className="max-w-5xl mx-auto mb-16">
        <div className="paper p-8 animate-fade-up stagger-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--brand-color)" }}>
                <CountUp end={200} duration={2}>
                  {({ countUpRef, start }) => (
                    <VisibilitySensor onChange={start} delayedCall>
                      <span><span ref={countUpRef} />+</span>
                    </VisibilitySensor>
                  )}
                </CountUp>
              </span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Qualifications</p>
            </div>

            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--brand-color)" }}>
                <CountUp end={50} duration={2}>
                  {({ countUpRef, start }) => (
                    <VisibilitySensor onChange={start} delayedCall>
                      <span><span ref={countUpRef} />+</span>
                    </VisibilitySensor>
                  )}
                </CountUp>
              </span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Facilitators</p>
            </div>

            <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--seal-gold)" }}>QCTO</span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Accredited</p>
            </div>

                        <div>
              <span className="font-mono text-3xl font-semibold" style={{ color: "var(--seal-gold)" }}>SETA</span>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Programmes</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="btn-silver fixed bottom-6 left-6 z-40 md:z-50 font-medium px-4 md:px-5 py-2 md:py-3 rounded-full flex items-center space-x-2 shadow-lg hover:scale-105 hover:shadow-xl transition max-w-[90%] md:max-w-[300px]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8c-4.418 0-8-3.134-8-7s3.582-7 8-7 8 3.134 8 7c0 1.386-.39 2.685-1.07 3.77L21 20l-4.26-1.705A7.963 7.963 0 0113 20z" />
        </svg>
        <span className="hidden sm:inline">Ask Fachs AI</span>
        <span className="sm:hidden">Ask AI</span>
      </button>

      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}