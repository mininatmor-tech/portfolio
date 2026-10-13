// Enregistre une visite : date, page, localisation approximative (fournie par Netlify).
// L'adresse IP et le user-agent complet ne sont PAS stockés.
import { getStore } from "@netlify/blobs";

const ROBOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|facebookexternalhit|curl|wget|python-requests/i;

export default async (req, context) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });

  const ua = req.headers.get("user-agent") || "";
  if (ROBOTS.test(ua)) return new Response(null, { status: 204 });

  let corps;
  try {
    corps = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const page = typeof corps?.page === "string" && corps.page.startsWith("/") ? corps.page.slice(0, 200) : null;
  if (!page) return new Response(null, { status: 400 });

  // Origine : seulement le nom de domaine, et seulement si ça vient d'un autre site
  let origine = null;
  try {
    const hote = new URL(String(corps.referrer || "")).hostname;
    if (hote && hote !== new URL(req.url).hostname) origine = hote.slice(0, 100);
  } catch { /* pas de referrer */ }

  const geo = context?.geo || {};
  const date = new Date().toISOString();
  const visite = {
    date,
    page,
    pays: geo.country?.name || null,
    codePays: geo.country?.code || null,
    region: geo.subdivision?.name || null,
    ville: geo.city || null,
    fuseau: geo.timezone || null,
    appareil: /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "ordinateur",
    origine,
  };

  const cle = `${date.slice(0, 10)}/${date.replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await getStore("visites").setJSON(cle, visite);
  } catch (e) {
    console.error("track : écriture impossible", e);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/track" };
