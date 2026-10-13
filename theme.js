(() => {
  const KEY = "portfolio-mode";
  const root = document.documentElement;
  const cssBase = document.getElementById("css-base");
  const cssKirby = document.getElementById("css-kirby");
  const POSES = { repos: "kirby/repos.png", avale: "kirby/avale.png" };
  const peutCurseur = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  Object.values(POSES).forEach((src) => { new Image().src = src; });

  // --- Bouton ---
  const bouton = document.createElement("button");
  bouton.id = "mode-toggle";
  bouton.type = "button";
  bouton.innerHTML = '<img src="kirby/repos.png" alt=""><span></span>';
  document.body.appendChild(bouton);
  const libelle = bouton.querySelector("span");

  // --- Curseur Kirby ---
  const curseur = document.createElement("div");
  curseur.id = "kirby-curseur";
  curseur.setAttribute("aria-hidden", "true");
  curseur.innerHTML = '<img src="' + POSES.repos + '" alt="">';
  document.body.appendChild(curseur);
  const curseurImg = curseur.querySelector("img");

  let x = -100, y = -100, vu = false, attente = false;
  const CLICABLE = "a, button, summary, label, select, input[type=submit], [role=button]";

  function placer() {
    attente = false;
    // le centre du corps de Kirby (≈ 49 % / 61 % de l'image) sert de pointe
    curseur.style.transform = "translate(" + (x - 23) + "px," + (y - 33) + "px)";
  }
  function bouger(e) {
    x = e.clientX; y = e.clientY;
    if (!vu) { vu = true; curseur.classList.add("visible"); }
    if (!attente) { attente = true; requestAnimationFrame(placer); }
    const clicable = !!(e.target.closest && e.target.closest(CLICABLE));
    curseur.classList.toggle("survol", clicable);
    const pose = clicable ? POSES.avale : POSES.repos;
    if (!curseurImg.src.endsWith(pose)) curseurImg.src = pose;
  }
  const bas = () => curseur.classList.add("clic");
  const haut = () => curseur.classList.remove("clic");
  const sortie = () => { vu = false; curseur.classList.remove("visible"); };

  function curseurActif(on) {
    root.classList.toggle("kirby-curseur", on && peutCurseur);
  }
  if (peutCurseur) {
    document.addEventListener("mousemove", bouger, { passive: true });
    document.addEventListener("mousedown", bas);
    document.addEventListener("mouseup", haut);
    document.documentElement.addEventListener("mouseleave", sortie);
  }

  // --- Bascule ---
  function appliquer(kirby) {
    root.classList.toggle("kirby", kirby);
    cssBase.media = kirby ? "not all" : "all";
    cssKirby.media = kirby ? "all" : "not all";
    libelle.textContent = kirby ? "Retour au mode classique" : "Passer en mode Kirby";
    bouton.setAttribute("aria-pressed", String(kirby));
    curseurActif(kirby);
  }
  function sauver(kirby) {
    try { localStorage.setItem(KEY, kirby ? "kirby" : "classique"); } catch (_) {}
  }

  bouton.addEventListener("click", () => {
    const kirby = !root.classList.contains("kirby");
    appliquer(kirby);
    sauver(kirby);
    // on repart en haut de la page (instantané, malgré le défilement doux du CSS)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });

  // --- Formulaire classique : en local il envoie vers le serveur Flask (/contact) ---
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const params = new URLSearchParams(location.search);
  document.querySelectorAll("form.contact").forEach((f) => {
    if (local) f.action = "/contact";
    if (params.has("envoye") || params.has("erreur")) {
      const p = document.createElement("p");
      p.setAttribute("role", "status");
      p.textContent = params.has("envoye") ? "Message envoyé, merci !" : "Oups : " + params.get("erreur");
      f.after(p);
    }
  });

  appliquer(root.classList.contains("kirby"));
})();
