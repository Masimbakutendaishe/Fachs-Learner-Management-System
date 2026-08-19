"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/router";

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

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-30 transition-opacity" />}

      <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md md:max-w-lg bg-gradient-to-br from-navy-800 to-red-800 rounded-3xl shadow-2xl z-40 p-8 transition-all duration-700 ease-in-out scale-90 opacity-0 ${isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-200">
          <X size={28} />
        </button>

        <h2 className="text-3xl font-bold mb-6 text-center text-white drop-shadow-lg">
          {mode === "signup" ? "Create an Account" : "Sign In"}
        </h2>

        {uploadingPic && (
          <p className="text-center text-yellow-300 mb-4 animate-pulse font-semibold">Uploading profile picture, please wait...</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white placeholder-white border border-white border-opacity-30 backdrop-blur-md" />
              <input type="text" placeholder="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white placeholder-white border border-white border-opacity-30 backdrop-blur-md" />
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white placeholder-white border border-white border-opacity-30 backdrop-blur-md" />
              <select value={qualification} onChange={(e) => setQualification(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white border border-white border-opacity-30 backdrop-blur-md">
                <option value="">Select Programme</option>
                {qualifications.map((q) => (
                  <option key={q.id} value={q.id}>{q.name} (NQF {q.nqf_level})</option>
                ))}
              </select>
              <input type="file" accept="image/*" onChange={(e) => setProfilePicFile(e.target.files[0])} className="w-full text-white" />
            </>
          )}

          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white placeholder-white border border-white border-opacity-30 backdrop-blur-md" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 text-white placeholder-white border border-white border-opacity-30 backdrop-blur-md" />

          <button type="submit" disabled={submitting} className="w-full py-3 mt-2 rounded-2xl bg-white bg-opacity-20 text-white font-semibold shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Please wait..." : mode === "signup" ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-white text-opacity-80">
          {mode === "signup" ? (
            <>Already have an account? <button onClick={() => setMode("signin")} className="text-yellow-300 hover:underline">Sign in</button></>
          ) : (
            <>Don't have an account? <button onClick={() => setMode("signup")} className="text-yellow-300 hover:underline">Sign up</button></>
          )}
        </p>
      </div>
    </>
  );
}