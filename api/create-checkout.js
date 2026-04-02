import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { pack, userId } = req.body;
  
  const PACKS = {
    sc10:  { price: 1000,  name: '10 StoreCoins',  sc: 10 },
    sc50:  { price: 5000,  name: '50 StoreCoins',  sc: 50 },
    sc100: { price: 10000, name: '100 StoreCoins', sc: 100 },
  };

  const selected = PACKS[pack];
  if (!selected) return res.status(400).json({ error: 'Pack invalide' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ 
        price_data: { 
          currency: 'eur', 
          product_data: { name: selected.name, description: 'MarketBall StoreCoins' }, 
          unit_amount: selected.price 
        }, 
        quantity: 1 
      }],
      mode: 'payment',
      success_url: `https://market-ball.com?payment=success`,
      cancel_url: `https://market-ball.com?payment=cancel`,
      metadata: { userId, sc: String(selected.sc) },
    });
    res.json({ url: session.url });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
