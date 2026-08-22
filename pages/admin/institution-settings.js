import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../../lib/supabase/client";
import { Building2, Copy, Check, Palette } from "lucide-react";

const COLOR_FIELDS = [
  {
    key: "theme_color",
    label: "Primary Color",
    hint: "Your main brand color. Used for the navbar, primary buttons (Sign In, Save, Continue), and links across your entire site.",
    default: "#52525B",
  },
  {
    key: "secondary_color",
    label: "Secondary Color",
    hint: "Used for secondary buttons, borders, and supporting UI elements alongside your primary color.",
    default: "#71717A",
  },
  {
    key: "accent_color",
    label: "Accent Color",
    hint: "Used for highlights, badges, and callouts, things like NQF level badges, credit counts, and achievement indicators.",
    default: "#B8873B",
  },
];

export default function InstitutionSettings() {
  const supabase = createClient();
  const { institution, profile } = useAuth();

  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [institutionType, setInstitutionType] = useState("training_provider");
  const [colors, setColors] = useState({ theme_color: "#52525B", secondary_color: "#71717A", accent_color: "#B8873B" });
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [teamsOrganizerEmail, setTeamsOrganizerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (institution) {
      setName(institution.name || "");
      setInstitutionType(institution.institution_type || "training_provider");
      setColors({
        theme_color: institution.theme_color || "#52525B",
        secondary_color: institution.secondary_color || "#71717A",
        accent_color: institution.accent_color || "#B8873B",
      });
      setLogoUrl(institution.logo_url || null);
      setTeamsOrganizerEmail(institution.teams_organizer_email || "");
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
          motto,
          institution_type: institutionType,
          theme_color: colors.theme_color,
          secondary_color: colors.secondary_color,
          accent_color: colors.accent_color,
          logo_url: newLogoUrl,
          teams_organizer_email: teamsOrganizerEmail,
        })
        .eq("id", institution.id);

      if (error) throw error;

      document.documentElement.style.setProperty("--brand-color", colors.theme_color);
      document.documentElement.style.setProperty("--brand-secondary", colors.secondary_color);
      document.documentElement.style.setProperty("--brand-accent", colors.accent_color);
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
      <div className="max-w-lg mx-auto py-16 text-center text-gray-500 text-sm">
        Only institution admins can access this page.
      </div>
    );
  }

  if (!institution) {
    return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--paper-muted)" }}>
          <Building2 size={20} style={{ color: "var(--brand-color)" }} />
        </div>
        <div>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-0.5">INSTITUTION ADMIN</p>
          <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--text)" }}>Institution Settings</h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="paper p-6 space-y-5">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Basics</h2>

                    <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motto / Tagline</label>
            <input
              type="text" value={motto} onChange={(e) => setMotto(e.target.value)}
              placeholder="e.g. Excellence in every learner" className={inputClass} style={{ borderColor: "var(--border-soft)" }}
            />
            <p className="text-xs text-gray-500 mt-1">Shown on the homepage for your own signed-in learners and staff.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution Type</label>
            <select value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} className={inputClass} style={{ borderColor: "var(--border-soft)" }}>
              <option value="training_provider">Skills / Workplace Training Provider</option>
              <option value="school">School (Primary / High School / College)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">This determines which features and dashboards your facilitators see.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <div className="flex items-center gap-4 flex-wrap">
              {logoUrl && (
                <img src={logoUrl} alt="Current logo" className="h-12 w-auto object-contain rounded border p-1" style={{ borderColor: "var(--border-soft)" }} />
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="text-sm text-gray-600" />
            </div>
          </div>
        </div>

        <div className="paper p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Palette size={16} style={{ color: "var(--brand-color)" }} />
            <h2 className="font-display font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Branding Colors</h2>
          </div>

          {COLOR_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors[f.key]}
                  onChange={(e) => setColors((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-12 h-10 rounded-lg border cursor-pointer"
                  style={{ borderColor: "var(--border-soft)" }}
                />
                <span className="text-sm text-gray-600 font-mono">{colors[f.key]}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{f.hint}</p>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            {COLOR_FIELDS.map((f) => (
              <div key={f.key} className="flex-1 h-10 rounded-lg" style={{ background: colors[f.key] }} title={f.label} />
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">Preview: primary, secondary, accent</p>
        </div>

        <div className="paper p-6 space-y-5">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Live Sessions</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teams Organizer Email</label>
            <input
              type="email" value={teamsOrganizerEmail} onChange={(e) => setTeamsOrganizerEmail(e.target.value)}
              placeholder="scheduling@yourinstitution.com" className={inputClass} style={{ borderColor: "var(--border-soft)" }}
            />
            <p className="text-xs text-gray-500 mt-1">
              A real Microsoft 365 account with a Teams license. All meetings scheduled through the site will be created under this account.
            </p>
          </div>
        </div>

        <div className="paper p-6 space-y-3">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Team Access</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facilitator Invite Code</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "var(--paper-muted)", border: "1px solid var(--border-soft)" }}>
                {institution.invite_code}
              </code>
              <button type="button" onClick={copyInviteCode} className="px-3 py-2 rounded-lg" style={{ border: "1px solid var(--border-soft)" }}>
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Share this with new facilitators so they can join your institution.</p>
          </div>
        </div>

        <button
          type="submit" disabled={saving}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all hover:brightness-110"
          style={{ backgroundColor: colors.theme_color }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}