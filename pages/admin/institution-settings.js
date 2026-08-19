import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";
import { Building2, Copy, Check } from "lucide-react";

export default function InstitutionSettings() {
  const supabase = createClient();
  const { institution, profile } = useAuth();

  const [name, setName] = useState("");
  const [institutionType, setInstitutionType] = useState("training_provider");
  const [themeColor, setThemeColor] = useState("#7f1d1d");
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (institution) {
      setName(institution.name || "");
      setInstitutionType(institution.institution_type || "training_provider");
      setThemeColor(institution.theme_color || "#7f1d1d");
      setLogoUrl(institution.logo_url || null);
    }
  }, [institution]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!institution) return;
    setSaving(true);

    try {
      let newLogoUrl = logoUrl;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${institution.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("institution-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("institution-logos")
          .getPublicUrl(path);
        newLogoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from("institutions")
        .update({
          name,
          institution_type: institutionType,
          theme_color: themeColor,
          logo_url: newLogoUrl,
        })
        .eq("id", institution.id);

      if (error) throw error;

      document.documentElement.style.setProperty("--brand-color", themeColor);
      alert("Institution settings saved.");
    } catch (err) {
      alert("Could not save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(institution?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (profile?.role !== "institution_admin" && profile?.role !== "superadmin") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center text-gray-300">
        Only institution admins can access this page.
      </div>
    );
  }

  if (!institution) {
    return <div className="max-w-lg mx-auto py-16 text-center text-gray-300">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
          <Building2 size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Institution Settings</h1>
          <p className="text-sm text-gray-400">Branding, type, and team access</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Institution Type</label>
          <select
            value={institutionType}
            onChange={(e) => setInstitutionType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none"
          >
            <option value="training_provider">Skills / Workplace Training Provider</option>
            <option value="school">School (Primary / High School / College)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This determines which features and dashboards your facilitators see.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
            />
            <span className="text-sm text-gray-600 font-mono">{themeColor}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Current logo" className="h-12 w-auto object-contain rounded border border-gray-100 p-1" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files[0])}
              className="text-sm text-gray-600"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">Facilitator Invite Code</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono">
              {institution.invite_code}
            </code>
            <button
              type="button"
              onClick={copyInviteCode}
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Share this with new facilitators so they can join your institution.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: themeColor }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}