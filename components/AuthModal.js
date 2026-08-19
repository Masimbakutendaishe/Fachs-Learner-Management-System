"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/router";
import Portal from "./Portal";

export default function AuthModal({ isOpen, onClose, onSelectQualification, mode: initialMode }) {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState(initialMode || "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dob, setDob] = useState("");
  const [qualification, setQualification] = useState("");
  const [qualifications, setQualifications] = useState([]);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const fetchQualifications = async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name, description, nqf_level, credits_total, institution_id");
      if (error) console.error("Error fetching programmes:", error.message);
      else setQualifications(data);
    };
    fetchQualifications();
  }, []);

  const handleProfilePicUpload = async (userId) => {
    if (!profilePicFile) return null;
    setUploadingPic(true);
    try {
      const fileExt = profilePicFile.name.split(".").pop();
      const filePath = `profile_pics/${userId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pics")
        .upload(filePath, profilePicFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("profile_pics")
        .getPublicUrl(filePath);

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ profile_pic: publicUrlData.publicUrl })
        .eq("id", userId);
      if (profileUpdateError) throw profileUpdateError;

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("Profile picture upload failed:", err);
      alert("Profile picture upload failed. You can continue without it.");
      return null;
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
    if (mode === "signup") {
        const selectedProgramme = qualifications.find((q) => q.id === Number(qualification));
        if (!selectedProgramme) return alert("Please select a valid programme.");

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "learner",
              first_name: firstName,
              surname,
              institution_id: selectedProgramme.institution_id,
            },
          },
        });
        if (signUpError) return alert(signUpError.message);

        const userId = signUpData.user.id;

        // The signup trigger already created the profiles row (with institution_id), update the rest
        const { error: profileError } = await supabase.from("profiles").update({
          first_name: firstName,
          surname,
          dob,
        }).eq("id", userId);
        if (profileError) return alert(profileError.message);

        if (profilePicFile) await handleProfilePicUpload(userId);

        const { error: enrollmentError } = await supabase.from("enrollments").insert([{
          user_id: userId,
          programme_id: selectedProgramme.id,
          institution_id: selectedProgramme.institution_id,
          credits_total: selectedProgramme.credits_total || 0,
          progress: 0,
          payment_status: "failed",
        }]);
        if (enrollmentError) return alert(enrollmentError.message);

        alert(`Sign up successful! You have enrolled in "${selectedProgramme.name}". Please sign in to complete your payment.`);
        setMode("signin");
        setEmail("");
        setPassword("");
        setProfilePicFile(null);
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) return alert(signInError.message);

        const userId = signInData.user.id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (profileError) {
          return alert("Error fetching your profile. Please try again.");
        }
        if (!profile || profile.role !== "learner") {
          await supabase.auth.signOut();
          return alert("Access denied. Only learners can sign in here.");
        }

        onSelectQualification?.(userId);

        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("programme_id, payment_status")
          .eq("user_id", userId);

        const pending = enrollments?.find((e) => e.payment_status === "failed");
        onClose();
        if (pending) {
          const programme = qualifications.find((q) => q.id === pending.programme_id);
          alert(`You need to complete payment for "${programme?.name}".`);
          router.push({ pathname: "/qualifications", query: { selected: programme?.id } });
        } else {
          router.push("/dashboard");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2";

  return (
    <Portal>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${
          isOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8 transition-all duration-300 ease-out ${
            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          style={{ background: "var(--paper)" }}
        >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={22} />
        </button>

        <p className="text-xs font-mono text-[var(--text-muted)] mb-1 text-center">
          {mode === "signup" ? "LEARNER SIGN UP" : "LEARNER SIGN IN"}
        </p>
        <h2 className="font-display text-2xl font-semibold mb-6 text-center" style={{ color: "var(--text)" }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>

        {uploadingPic && (
          <p className="text-center text-sm mb-4" style={{ color: "var(--seal-gold)" }}>
            Uploading profile picture...
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" placeholder="First Name" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} required
                  className={inputClass}
                  style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                />
                <input
                  type="text" placeholder="Surname" value={surname}
                  onChange={(e) => setSurname(e.target.value)} required
                  className={inputClass}
                  style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
                />
              </div>
              <input
                type="date" value={dob} onChange={(e) => setDob(e.target.value)} required
                className={inputClass}
                style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              />
              <select
                value={qualification} onChange={(e) => setQualification(e.target.value)} required
                className={inputClass}
                style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
              >
                <option value="">Select Programme</option>
                {qualifications.map((q) => (
                  <option key={q.id} value={q.id}>{q.name} (NQF {q.nqf_level})</option>
                ))}
              </select>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Profile picture (optional)</label>
                <input
                  type="file" accept="image/*"
                  onChange={(e) => setProfilePicFile(e.target.files[0])}
                  className="w-full text-sm text-[var(--text-muted)]"
                />
              </div>
            </>
          )}

          <input
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className={inputClass}
            style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className={inputClass}
            style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
          />

          <button
            type="submit" disabled={submitting}
            className="w-full py-3 mt-2 rounded-xl text-white font-medium transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand-color)" }}
          >
            {submitting ? "Please wait..." : mode === "signup" ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          {mode === "signup" ? (
            <>Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="font-medium" style={{ color: "var(--brand-color)" }}>
                Sign in
              </button>
            </>
          ) : (
            <>Don't have an account?{" "}
              <button onClick={() => setMode("signup")} className="font-medium" style={{ color: "var(--brand-color)" }}>
                Sign up
              </button>
            </>
          )}
        </p>
        </div>
      </div>
    </Portal>
  );
}