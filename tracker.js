// Compte les visites (anonymes) : envoie la page vue à /api/track.
(() => {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (location.protocol === "file:" || local) return;           // pas de comptage en test
  if (navigator.doNotTrack === "1") return;                      // on respecte « Ne pas me suivre »
  try { if (localStorage.getItem("tracker-ignore")) return; } catch (_) {}   // mes propres visites

  const corps = JSON.stringify({ page: location.pathname, referrer: document.referrer });
  try {
    const ok = navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([corps], { type: "application/json" }));
    if (!ok) fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: corps, keepalive: true });
  } catch (_) {}
})();
