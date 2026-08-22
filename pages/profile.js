import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "./context/AuthContext";
import { User } from "lucide-react";

export default function ProfilePage() {
  const supabase = createClient();
  const { user, profile } = useAuth();
  const [profilePic, setProfilePic] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfilePic(profile.profile_pic || null);
      setFirstName(profile.first_name || "");
      setSurname(profile.surname || "");
    }
  }, [profile]);

  const handlePicUpload = async (file) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `profile_pics/${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pics")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("profile_pics")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_pic: publicUrlData.publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setProfilePic(publicUrlData.publicUrl);
    } catch (err) {
      alert("Could not upload profile picture: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, surname })
        .eq("id", user.id);
      if (error) throw error;
      alert("Profile updated.");
    } catch (err) {
      alert("Could not save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">ACCOUNT</p>
      <h1 className="font-display text-2xl font-semibold mb-6" style={{ color: "var(--text)" }}>My Profile</h1>

      <div className="paper p-6 space-y-6">
        <div className="flex items-center gap-4">
          {profilePic ? (
            <img src={profilePic} className="w-20 h-20 rounded-full object-cover" style={{ border: "2px solid var(--border-soft)" }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--paper-muted)" }}>
              <User size={32} className="text-gray-400" />
            </div>
          )}
          <div>
            <label className="inline-block px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
              {uploading ? "Uploading..." : "Change Photo"}
              <input
                type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => e.target.files[0] && handlePicUpload(e.target.files[0])}
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">JPG or PNG, square images look best.</p>
          </div>
        </div>

        <form onSubmit={handleSaveDetails} className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border-soft)" }}>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <input
              type="text" placeholder="First Name" value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
            />
            <input
              type="text" placeholder="Surname" value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--border-soft)" }}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Email</label>
            <input type="text" value={user?.email || ""} disabled className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-50 text-gray-400" style={{ borderColor: "var(--border-soft)" }} />
          </div>
          <button type="submit" disabled={saving} className="btn-silver w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}