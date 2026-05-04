// Rate limiter en mémoire — protège les routes API contre les abus
// Note : se reset à chaque redéploiement (suffisant pour bloquer les abus simples)

const store = new Map(); // ip → { count, resetAt }

/**
 * @param {Request} req
 * @param {Response} res
 * @param {number} max   — nombre max de requêtes
 * @param {number} windowMs — fenêtre en ms (ex: 60_000 = 1 minute)
 * @returns {boolean} true si bloqué (la réponse 429 est déjà envoyée)
 */
export function rateLimit(req, res, max = 20, windowMs = 60_000) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  const key = `${req.url}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({ error: "Trop de requêtes. Réessaie dans " + retryAfter + "s." });
    return true;
  }

  return false;
}
