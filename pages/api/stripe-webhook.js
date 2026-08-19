import { stripe } from "../../lib/stripe/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { buffer } from "micro";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await buffer(req);
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { institution_id, plan_id } = session.metadata;
      await admin.from("subscriptions").insert({
        institution_id,
        plan_id,
        stripe_subscription_id: session.subscription,
        status: "active",
      });
      await admin.from("institutions").update({ status: "active" }).eq("id", institution_id);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      await admin
        .from("subscriptions")
        .update({ status: "active", current_period_end: new Date(invoice.lines.data[0].period.end * 1000) })
        .eq("stripe_subscription_id", invoice.subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const { data: sub } = await admin
        .from("subscriptions")
        .select("institution_id")
        .eq("stripe_subscription_id", invoice.subscription)
        .single();
      if (sub) {
        await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", invoice.subscription);
        await admin.from("institutions").update({ status: "suspended" }).eq("id", sub.institution_id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const { data: sub } = await admin
        .from("subscriptions")
        .select("institution_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();
      if (sub) {
        await admin.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", subscription.id);
        await admin.from("institutions").update({ status: "suspended" }).eq("id", sub.institution_id);
      }
      break;
    }
  }

  res.status(200).json({ received: true });
}