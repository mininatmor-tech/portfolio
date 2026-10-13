# Portfolio

## Tester en local (avec le formulaire)

```
pip install -r requirements.txt
python server.py
```

Puis ouvre http://127.0.0.1:5000. Les messages du formulaire s'affichent dans le terminal
et sont enregistrés dans `messages.jsonl`.

Pour les recevoir aussi par mail, définis `SMTP_USER` (ton Gmail) et `SMTP_PASSWORD`
(mot de passe d'application Gmail) avant de lancer `python server.py`.

En ligne (GitHub Pages, Netlify...), le formulaire passe par FormSubmit : il faut
confirmer le mail d'activation reçu sur payet.mathys.pro@gmail.com.

## Tracker de visites (Netlify)

Chaque visite (date, page, pays/ville approximatifs, mobile ou ordinateur, site d'origine)
est enregistrée par une fonction Netlify. L'adresse IP n'est pas stockée.

1. Déploie le site depuis GitHub (ou avec la CLI Netlify) : le glisser-déposer
   n'installe pas les dépendances des fonctions.
2. Netlify > Site configuration > Environment variables : crée `TRACKER_TOKEN`
   avec un code long de ton choix (c'est ton mot de passe pour voir les stats).
3. Redéploie le site (une variable n'est prise en compte qu'au déploiement suivant).
4. Ouvre `https://ton-site.netlify.app/stats.html` et entre le code.
5. Sur chacun de tes appareils, clique « Ne plus compter mes visites ici ».

Rien n'est compté en local (localhost) ni si le navigateur envoie « Ne pas me suivre ».
