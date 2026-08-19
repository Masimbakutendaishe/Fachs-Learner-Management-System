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

  const { enrollmentId } = req.body;
  const admin = createAdminClient();

  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id, user_id, payment_status, programmes(id, name, price)")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || enrollment.user_id !== user.id) {
    return res.status(403).json({ error: "Not your enrollment" });
  }
  if (enrollment.payment_status === "paid") {
    return res.status(400).json({ error: "Already paid" });
  }
  if (!enrollment.programmes?.price || enrollment.programmes.price <= 0) {
    return res.status(400).json({ error: "This programme has no price set yet" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: enrollment.programmes.name },
        unit_amount: Math.round(enrollment.programmes.price * 100),
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=canceled`,
    metadata: { enrollment_id: String(enrollment.id) },
  });

  res.status(200).json({ url: session.url });
}