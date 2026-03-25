import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { priceId, userId, plan } = req.body;
  
  if (!priceId || !userId) return res.status(400).json({ error: 'Paramètres manquants' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `https://market-ball.com?payment=success&plan=${plan}&userId=${userId}`,
      cancel_url: `https://market-ball.com?payment=cancel`,
      metadata: { userId, plan },
    });
    res.json({ url: session.url });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
