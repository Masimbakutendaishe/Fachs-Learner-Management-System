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

  const { invoiceId } = req.body;
  const admin = createAdminClient();

  const { data: invoice } = await admin.from("invoices").select("*").eq("id", invoiceId).single();

  if (!invoice || invoice.user_id !== user.id) {
    return res.status(403).json({ error: "Not your invoice" });
  }
  if (invoice.status === "paid") {
    return res.status(400).json({ error: "Already paid" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: invoice.description },
        unit_amount: Math.round(invoice.amount * 100),
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/progress?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/progress?payment=canceled`,
    metadata: { invoice_id: String(invoice.id) },
  });

  res.status(200).json({ url: session.url });
}