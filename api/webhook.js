import Stripe from 'stripe';

// IMPORTANT: Vercel parse automatiquement le body en JSON, ce qui casse
// la vérification de signature Stripe. On désactive ce comportement.
export const config = {
  api: { bodyParser: false },
};

const SUPABASE_URL = "https://aiesvzdvlownkcjbkgjv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const updateProfile = async (userId, data) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[webhook] updateProfile failed for ${userId}:`, res.status, text);
  }
};

// Lit le body brut depuis le stream (nécessaire pour Stripe)
const getRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error('[webhook] Signature invalide:', e.message);
    return res.status(400).json({ error: `Webhook error: ${e.message}` });
  }

  const obj = event.data.object;
  console.log('[webhook] Event reçu:', event.type);

  switch (event.type) {
    case 'checkout.session.completed': {
      const { userId, plan } = obj.metadata || {};
      if (!userId || !plan) {
        console.warn('[webhook] checkout.session.completed: metadata manquante', obj.metadata);
        break;
      }
      console.log(`[webhook] Activation abonnement ${plan} pour user ${userId}`);
      await updateProfile(userId, {
        subscription: plan,
        stripe_customer_id: obj.customer,
        stripe_subscription_id: obj.subscription,
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      // Renouvellement mensuel : on s'assure que l'abonnement est toujours actif
      const customerId = obj.customer;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id,subscription,stripe_subscription_id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const profiles = await response.json();
      if (profiles?.[0]?.id) {
        // Récupère le plan depuis l'abonnement Stripe pour être sûr
        const subscriptionId = obj.subscription;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          const planMap = {
            [process.env.STRIPE_PRICE_PRO]: 'pro',
            [process.env.STRIPE_PRICE_ELITE]: 'elite',
          };
          const plan = planMap[priceId];
          if (plan) {
            console.log(`[webhook] Renouvellement ${plan} pour user ${profiles[0].id}`);
            await updateProfile(profiles[0].id, { subscription: plan });
          }
        }
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = obj.customer;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const profiles = await response.json();
      if (profiles?.[0]?.id) {
        console.log(`[webhook] Annulation abonnement pour user ${profiles[0].id}`);
        await updateProfile(profiles[0].id, {
          subscription: 'starter',
          stripe_subscription_id: null,
        });
      }
      break;
    }

    default:
      console.log('[webhook] Event ignoré:', event.type);
  }

  res.json({ received: true });
}
