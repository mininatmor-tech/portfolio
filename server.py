"""
Serveur Flask pour tester le portfolio en local, formulaire de contact compris.

    pip install -r requirements.txt
    python server.py
    -> ouvre http://127.0.0.1:5000

Chaque message reçu est affiché dans le terminal et ajouté à messages.jsonl.
Pour le recevoir aussi par e-mail (payet.mathys.pro@gmail.com), définis ces
variables avant de lancer le serveur (mot de passe d'application Gmail, pas
ton vrai mot de passe) :

    SMTP_USER=payet.mathys.pro@gmail.com
    SMTP_PASSWORD=xxxx xxxx xxxx xxxx
"""
import json
import os
import re
import smtplib
import time
from collections import defaultdict, deque
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import quote

from flask import Flask, abort, jsonify, redirect, request, send_from_directory

ROOT = Path(__file__).resolve().parent
FICHIER_MESSAGES = ROOT / "messages.jsonl"

DESTINATAIRE = os.environ.get("DESTINATAIRE", "payet.mathys.pro@gmail.com")
SMTP_HOTE = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

# Seuls ces types de fichiers sont servis (pas server.py, pas messages.jsonl...)
EXTENSIONS = {".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".pdf"}

REGEX_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
LIMITE_NOM, LIMITE_EMAIL, LIMITE_MESSAGE = 100, 200, 5000
MAX_PAR_MINUTE = 5

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0           # pas de cache pendant les tests
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024          # un message n'a pas besoin de plus

_envois = defaultdict(deque)


# ---------------------------------------------------------------- pages du site
@app.get("/")
def accueil():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:chemin>")
def fichier(chemin):
    if Path(chemin).suffix.lower() not in EXTENSIONS:
        abort(404)
    return send_from_directory(ROOT, chemin)   # send_from_directory bloque les ../


# ------------------------------------------------------------------- formulaire
def trop_de_messages(ip):
    maintenant = time.time()
    file = _envois[ip]
    while file and maintenant - file[0] > 60:
        file.popleft()
    if len(file) >= MAX_PAR_MINUTE:
        return True
    file.append(maintenant)
    return False


def valider(nom, email, message):
    if not nom:
        return "Dis-moi ton nom !"
    if not REGEX_EMAIL.match(email):
        return "Entre un e-mail valide."
    if not message:
        return "Écris-moi un petit message."
    if len(nom) > LIMITE_NOM or len(email) > LIMITE_EMAIL or len(message) > LIMITE_MESSAGE:
        return "Message trop long."
    return None


def envoyer_mail(nom, email, message):
    """True = envoyé, None = SMTP non configuré. Lève une exception si ça échoue."""
    if not (SMTP_USER and SMTP_PASSWORD):
        return None
    mail = EmailMessage()
    mail["Subject"] = "Nouveau message depuis le portfolio"
    mail["From"] = SMTP_USER
    mail["To"] = DESTINATAIRE
    mail["Reply-To"] = email
    mail.set_content(f"Nom : {nom}\nE-mail : {email}\n\n{message}\n")
    with smtplib.SMTP_SSL(SMTP_HOTE, SMTP_PORT, timeout=15) as smtp:
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(mail)
    return True


def reponse(succes, texte, code=200):
    """JSON pour le formulaire Kirby (fetch), redirection pour le formulaire classique."""
    if "application/json" in request.headers.get("Accept", ""):
        return jsonify(success=succes, message=texte), code
    if succes:
        return redirect("/?envoye=1#contact")
    return redirect("/?erreur=" + quote(texte) + "#contact")


@app.post("/contact")
def contact():
    donnees = request.get_json(silent=True) or request.form
    nom = str(donnees.get("nom", "")).strip()
    email = str(donnees.get("email", "")).strip()
    message = str(donnees.get("message", "")).strip()

    # Piège à robots : champ caché rempli -> on fait semblant que tout va bien
    if str(donnees.get("_honey", "")).strip():
        return reponse(True, "ok")

    if trop_de_messages(request.remote_addr or "?"):
        return reponse(False, "Trop de messages, réessaie dans une minute.", 429)

    erreur = valider(nom, email, message)
    if erreur:
        return reponse(False, erreur, 400)

    ligne = {"date": datetime.now().isoformat(timespec="seconds"),
             "nom": nom, "email": email, "message": message}
    try:
        with FICHIER_MESSAGES.open("a", encoding="utf-8") as f:
            f.write(json.dumps(ligne, ensure_ascii=False) + "\n")
    except OSError as e:
        print(f"[contact] impossible d'écrire messages.jsonl : {e}")

    print(f"\n[contact] {ligne['date']}\n  de      : {nom} <{email}>\n  message : {message}\n")

    try:
        envoye = envoyer_mail(nom, email, message)
    except Exception as e:  # SMTP : mauvais mot de passe, pas de réseau...
        print(f"[contact] e-mail NON envoyé : {e}")
        return reponse(False, "Message enregistré, mais l'e-mail n'est pas parti (voir le terminal).", 502)

    print("[contact] e-mail envoyé à " + DESTINATAIRE if envoye
          else "[contact] SMTP non configuré : message seulement enregistré dans messages.jsonl")
    return reponse(True, "Message envoyé, merci !")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    print(f"Portfolio sur http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port)
