(() => {
  const IMAGES = {
    repos: "kirby/repos.png",
    avale: "kirby/avale.png",
    mache: "kirby/mache.png",
    ecrase: "kirby/ecrase.png",
    facteur: "kirby/facteur.png",
    rejet: "kirby/rejet.png",
  };

  const form = document.getElementById("contact-form");
  if (!form) return;

  const scene = document.getElementById("scene");
  const kirby = document.getElementById("kirby");
  const message = document.getElementById("message");
  const nom = document.getElementById("nom");
  const email = document.getElementById("email");
  const texte = document.getElementById("message-texte");
  const envolables = [...form.querySelectorAll(".groupe, .envoyer")];
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let minuteurs = [];
  let occupe = false;

  // Précharge les poses de Kirby
  Object.values(IMAGES).forEach((src) => { new Image().src = src; });

  const etat = (classe, image) => {
    scene.className = "scene " + classe;
    kirby.src = IMAGES[image];
  };
  const plus_tard = (delai, action) => minuteurs.push(setTimeout(action, delai));
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const tout_annuler = () => { minuteurs.forEach(clearTimeout); minuteurs = []; };

  const dire = (texte_msg, ok = false) => {
    message.textContent = texte_msg;
    message.className = ok ? "ok" : "";
  };
  const marquer = (input) => input.closest(".champ").classList.add("invalide");
  const demarquer = (input) => input.closest(".champ").classList.remove("invalide");

  etat("repos", "repos");

  // Kirby devient attentif quand on écrit
  [nom, email, texte].forEach((input) => {
    input.addEventListener("focus", () => {
      if (occupe) return;
      tout_annuler();
      dire("");
      demarquer(input);
      etat("attentif", "repos");
    });
    input.addEventListener("input", () => demarquer(input));
  });

  // Entrée dans une ligne = on quitte le champ (sauf dans le message)
  [nom, email].forEach((input) =>
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    })
  );

  // Quand on quitte le formulaire sans rien faire, Kirby se rendort
  form.addEventListener("focusout", (e) => {
    if (occupe || e.target === email) return;
    if (!e.relatedTarget || !form.contains(e.relatedTarget)) etat("repos", "repos");
  });

  // Vérification de l'email dès qu'on le quitte, comme dans l'animation d'origine
  email.addEventListener("blur", () => {
    if (occupe) return;
    const v = email.value.trim();
    if (v === "") { etat("repos", "repos"); return; }
    if (regexEmail.test(v)) {
      etat("avale", "avale");
      plus_tard(700, () => etat("repos", "repos"));
    } else {
      marquer(email);
      etat("rejet", "rejet");
      dire("Entre un e-mail valide.");
    }
  });

  function valider() {
    const erreurs = [];
    if (nom.value.trim() === "") erreurs.push([nom, "Dis-moi ton nom !"]);
    if (!regexEmail.test(email.value.trim())) erreurs.push([email, "Entre un e-mail valide."]);
    if (texte.value.trim() === "") erreurs.push([texte, "Écris-moi un petit message."]);
    return erreurs;
  }

  let raison = "";
  async function envoyer(data) {
    raison = "";
    if (location.protocol === "file:") {
      raison = "Ouvre le site via le serveur : lance « python server.py » puis va sur http://127.0.0.1:5000";
      return false;
    }
    try {
      // En local (serveur Flask) on teste sur /contact, en ligne on passe par FormSubmit
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
      const url = local ? "/contact" : form.action.replace("formsubmit.co/", "formsubmit.co/ajax/");
      const rep = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const json = await rep.json().catch(() => ({}));
      if (rep.ok && String(json.success) !== "false") return true;
      raison = json.message || "";
      console.error("FormSubmit :", rep.status, json);
      return false;
    } catch (err) {
      console.error("FormSubmit :", err);
      return false;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (occupe) return;
    tout_annuler();

    // 1) Il manque quelque chose -> Kirby secoue la tête
    const erreurs = valider();
    if (erreurs.length) {
      erreurs.forEach(([input]) => marquer(input));
      erreurs[0][0].focus();            // le focus efface les messages...
      erreurs.forEach(([input]) => marquer(input));
      etat("rejet", "rejet");           // ...donc on affiche l'erreur après
      dire(erreurs[0][1]);
      return;
    }

    // 2) Tout est bon -> Kirby avale le message pendant qu'il part
    occupe = true;
    form.setAttribute("aria-busy", "true");
    dire("");
    const envoi = envoyer(new FormData(form));

    etat("avale", "avale");
    envolables.forEach((el) => el.classList.add("vole"));
    await attendre(650);
    kirby.src = IMAGES.mache;

    const [ok] = await Promise.all([envoi, attendre(450)]);

    if (ok) {
      etat("avale", "ecrase");
      form.reset();
      await attendre(400);
      etat("facteur", "facteur");
      dire("Message envoyé, merci !", true);
      envolables.forEach((el) => el.classList.remove("vole"));
      plus_tard(3000, () => etat("repos", "repos"));
    } else {
      // Échec : Kirby recrache le message (les champs gardent ton texte)
      etat("rejet", "rejet");
      dire(raison ? "Oups : " + raison : "Oups, l'envoi a échoué. Réessaie dans un instant.");
      envolables.forEach((el) => el.classList.remove("vole"));
    }

    occupe = false;
    form.removeAttribute("aria-busy");
  });
})();
