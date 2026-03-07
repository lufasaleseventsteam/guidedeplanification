# Fiches Événements – Lufa Farms

Application web pour créer, gérer et télécharger les fiches de coordination terrain.

---

## 🚀 Mise en ligne sur GitHub Pages (même compte que l'inventaire)

### Étape 1 — Créer le repo sur GitHub

1. Aller sur [github.com](https://github.com) → connectez-vous avec votre compte habituel
2. Cliquer **"New repository"** (bouton vert en haut à droite)
3. Nom du repo : `lufa-events` (ou ce que vous voulez)
4. Laisser en **Public**
5. **Ne pas** cocher "Add a README"
6. Cliquer **"Create repository"**

### Étape 2 — Uploader les fichiers

1. Sur la page du repo, cliquer **"uploading an existing file"**
2. Glisser-déposer **tout le contenu** du dossier `lufa-events` (pas le dossier lui-même, son contenu)
3. Cliquer **"Commit changes"**

### Étape 3 — Installer et déployer (terminal)

Si vous avez Node.js installé :

```bash
cd lufa-events
npm install
npm run build
npm run deploy
```

Sinon, utiliser GitHub Actions (voir ci-dessous).

### Étape 3 (alternative) — GitHub Actions (sans terminal)

1. Dans le repo GitHub, aller dans **Settings → Pages**
2. Source : **GitHub Actions**
3. Créer le fichier `.github/workflows/deploy.yml` avec ce contenu :

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

4. Pousser ce fichier → le déploiement se fait automatiquement à chaque commit.

### Étape 4 — Votre URL

L'app sera disponible à :
```
https://<votre-username>.github.io/lufa-events/
```

Partagez cette URL avec toute l'équipe. Pas de login requis.

---

## 💾 Données

Les données sont sauvegardées dans le **localStorage du navigateur** de chaque utilisateur.

Pour partager des événements entre collègues :
- Utiliser **↓ Exporter** pour télécharger un fichier `.json`
- Envoyer le fichier par Slack/email
- L'autre personne utilise **↑ Importer** pour charger les données

> 💡 Si vous voulez une vraie base de données partagée en temps réel, il faudrait ajouter un backend (Firebase, Supabase — gratuit pour ce volume). On peut faire ça dans une prochaine version si besoin.

---

## 🛠 Développement local

```bash
npm install
npm start
# Ouvre automatiquement http://localhost:3000
```
