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
  const { data: profile } = await admin
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "institution_admin") {
    return res.status(403).json({ error: "Only an institution admin can manage billing" });
  }

  const { planId } = req.body;
  const { data: plan } = await admin.from("plans").select("*").eq("id", planId).single();
  if (!plan?.stripe_price_id) return res.status(400).json({ error: "Invalid plan" });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?canceled=true`,
    metadata: {
      institution_id: profile.institution_id,
      plan_id: plan.id,
    },
  });

  res.status(200).json({ url: session.url });
}