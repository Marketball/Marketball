import Stripe from 'stripe';

const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const updateProfile = async (userId, data) => {
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch(e) {
    return res.status(400).json({ error: `Webhook error: ${e.message}` });
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const { userId, plan } = session.metadata;
      if (!userId || !plan) break;
      await updateProfile(userId, {
        subscription: plan,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        updated_at: new Date().toISOString(),
      });
      break;
    }
    case 'invoice.payment_succeeded': {
      const customerId = session.customer;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const profiles = await response.json();
      if (profiles?.[0]?.id) {
        await updateProfile(profiles[0].id, { updated_at: new Date().toISOString() });
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = session.customer;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const profiles = await response.json();
      if (profiles?.[0]?.id) {
        await updateProfile(profiles[0].id, {
          subscription: 'starter',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        });
      }
      break;
    }
  }

  res.json({ received: true });
}
