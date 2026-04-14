# Kreads Edit Battle

Concours mensuel de montage vidéo gamifié pour la team Kreads.

## Stack
- **Next.js 14** (App Router) — Vercel
- **Supabase** — PostgreSQL + RLS
- **Barlow Condensed** — police display Kreads

---

## Setup en 4 étapes

### 1. Supabase
1. Crée un projet sur [supabase.com](https://supabase.com)
2. **SQL Editor → New Query** → colle + exécute `supabase-schema.sql`
3. Copie tes clés dans **Settings → API**

### 2. Variables d'environnement
Renomme `.env.example` en `.env.local` et remplis :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_ADMIN_PASSWORD=ton_mot_de_passe
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Local
```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. Déploiement GitHub → Vercel
```bash
git init
git add .
git commit -m "init kreads edit battle"
git remote add origin https://github.com/TON_USER/kreads-edit-battle.git
git push -u origin main
```
Sur Vercel : importer le repo → ajouter les 5 variables d'env → Deploy.

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Page d'entrée — saisie prénom + initiale |
| `/vote?s=SESSION_ID` | Interface de vote |
| `/ceremony` | Cérémonie de révélation |
| `/admin` | Dashboard admin (mot de passe) |

## API Routes (server-side sécurisées)

| Route | Auth | Description |
|-------|------|-------------|
| `POST /api/vote` | Public | Soumettre un vote |
| `GET/POST/PATCH /api/admin/session` | Admin token | Gérer les sessions |
| `POST/DELETE /api/admin/entry` | Admin token | Gérer les soumissions |
| `POST /api/admin/reveal` | Admin token | Révéler + calculer scores |

---

## Charte graphique Kreads

| Token | Valeur |
|-------|--------|
| Fond | `#f5f3ee` (cream) |
| Texte | `#0d0d0d` (ink) |
| Accent | `#00d4c8` (turq) |
| Police display | Barlow Condensed 900 |
| Police body | Barlow 400/500/700 |
