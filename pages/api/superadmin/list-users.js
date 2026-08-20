import { createAdminClient } from "../../../lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => Object.entries(req.cookies).map(([name, value]) => ({ name, value })),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const admin = createAdminClient();
  const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "superadmin") {
    return res.status(403).json({ error: "Superadmin only" });
  }

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return res.status(500).json({ error: authError.message });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, surname, role, is_active, institutions ( name )");

  const profileMap = {};
  (profiles || []).forEach((p) => { profileMap[p.id] = p; });

  const merged = authData.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    first_name: profileMap[u.id]?.first_name || "",
    surname: profileMap[u.id]?.surname || "",
    role: profileMap[u.id]?.role || "learner",
    is_active: profileMap[u.id]?.is_active ?? true,
    institution: profileMap[u.id]?.institutions?.name || "—",
  }));

  res.status(200).json({ users: merged });
}