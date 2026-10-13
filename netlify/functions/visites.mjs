// Renvoie les visites enregistrées. Protégé par la variable d'environnement TRACKER_TOKEN.
import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

function memeToken(recu, attendu) {
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

const json = (donnees, status = 200) =>
  new Response(JSON.stringify(donnees), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export default async (req) => {
  const attendu = "TRAKER";
  if (!attendu) return json({ erreur: "TRACKER_TOKEN n'est pas défini sur Netlify." }, 503);

  const recu = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!recu || !memeToken(recu, attendu)) return json({ erreur: "Code incorrect." }, 401);

  const jours = Math.min(90, Math.max(1, parseInt(new URL(req.url).searchParams.get("jours") || "7", 10) || 7));
  const store = getStore("visites");

  const cles = [];
  for (let i = 0; i < jours; i++) {
    const jour = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const { blobs } = await store.list({ prefix: jour + "/" });
    cles.push(...blobs.map((b) => b.key));
  }

  const visites = [];
  const aLire = cles.slice(0, 1000);
  for (let i = 0; i < aLire.length; i += 40) {
    const lot = await Promise.all(aLire.slice(i, i + 40).map((k) => store.get(k, { type: "json" }).catch(() => null)));
    visites.push(...lot.filter(Boolean));
  }
  visites.sort((a, b) => (a.date < b.date ? 1 : -1));
  return json({ visites, tronque: cles.length > aLire.length });
};

export const config = { path: "/api/visites" };
