import { stripe } from "../../lib/stripe/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

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
  const { data: profile } = await admin.from("profiles").select("role, institution_id").eq("id", user.id).single();

  if (profile?.role !== "institution_admin") {
    return res.status(403).json({ error: "Only an institution admin can manage billing" });
  }

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("*")
    .eq("institution_id", profile.institution_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription) return res.status(400).json({ error: "No active subscription to cancel" });

  try {
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    }
    await admin.from("subscriptions").update({ status: "canceled" }).eq("id", subscription.id);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}