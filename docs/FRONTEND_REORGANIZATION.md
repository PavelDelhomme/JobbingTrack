# 📂 Guide de Réorganisation du Frontend

## 🎯 Objectif

Réorganiser le frontend JobbingTrack pour une structure **claire, intuitive et maintenable** en utilisant les **Route Groups** de Next.js.

## 📊 Ancienne vs Nouvelle Structure

### ❌ Avant (structure plate confuse)
```
app/
├── admin/                    # Mélangé avec d'autres pages
├── backoffice/              # Admin ? Dashboard ? Pas clair
├── applications/            # Ok mais isolé
├── entities/                # Ok mais isolé
├── security/                # Ok mais long nommage
├── tests/                   # Dev tools mélangés
├── login/                   # Auth dispersée
├── page.tsx
└── ...
```

### ✅ Après (structure groupée claire)
```
app/
├── (public)/                # 🌐 Pages publiques (auth)
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── access-denied/
│
├── (dashboard)/             # 📊 Dashboard utilisateur
│   ├── page.tsx            # Page d'accueil
│   ├── applications/       # Candidatures
│   └── entities/           # Entités métier
│
├── (admin)/                 # ⚙️ Administration
│   ├── backoffice/         # Vue d'ensemble
│   ├── analytics/          # Métriques
│   ├── settings/
│   ├── data-management/
│   └── ...
│
├── (security)/              # 🔐 Sécurité
│   ├── alerts/
│   ├── analysis/
│   ├── logs/
│   └── ...
│
├── (development)/           # 🛠️ Outils dev
│   ├── tests/
│   ├── mobile-emulator/
│   └── services/
│
└── api/                     # 🔌 API Routes
    ├── health/
    ├── cadvisor/
    └── v1.3/
```

## 🚀 Comment Réorganiser

### Étape 1 : Vérifier la structure actuelle

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Voir la structure
find frontend/src/app -type d | sort

# Compter les fichiers
find frontend/src/app -type f \( -name "*.tsx" -o -name "*.ts" \) | wc -l
```

### Étape 2 : Lancer le script de réorganisation

```bash
# Rendre le script exécutable
chmod +x scripts/reorganize-frontend.sh

# Lancer la réorganisation
./scripts/reorganize-frontend.sh
```

Le script va :
1. ✅ Créer un **backup complet** avec timestamp
2. ✅ Créer la nouvelle structure de dossiers
3. ✅ Déplacer tous les fichiers au bon endroit
4. ✅ Créer les **layouts de groupe** pour la sécurité
5. ✅ Nettoyer les fichiers obsolètes (page.old.tsx, etc.)
6. ✅ Créer la documentation

### Étape 3 : Vérifier et tester

```bash
# 1. Vérifier la nouvelle structure
find frontend/src/app -type d | sort

# 2. Rebuild le frontend
cd frontend
npm run build

# 3. Démarrer en mode dev
npm run dev

# 4. Tester les pages principales
# - http://localhost:8080/login
# - http://localhost:8080/ (dashboard)
# - http://localhost:8080/backoffice (admin)
# - http://localhost:8080/analytics (admin)
```

### Étape 4 : Rollback si nécessaire

Si quelque chose ne va pas :

```bash
# Le backup est dans frontend-backup-YYYYMMDD-HHMMSS/
# Restaurer :
rm -rf frontend/src/app
cp -r frontend-backup-*/app frontend/src/
```

## 📋 Détails de la Nouvelle Structure

### 1. (public)/ - Pages Publiques 🌐

**Accès :** Aucune authentification requise

| Route | Fichier | Description |
|-------|---------|-------------|
| `/login` | `(public)/login/page.tsx` | Page de connexion |
| `/register` | `(public)/register/page.tsx` | Inscription |
| `/forgot-password` | `(public)/forgot-password/page.tsx` | Mot de passe oublié |
| `/reset-password/[token]` | `(public)/reset-password/[token]/page.tsx` | Reset mot de passe |
| `/access-denied` | `(public)/access-denied/page.tsx` | Accès refusé |

**Layout :** Aucune vérification d'auth

### 2. (dashboard)/ - Dashboard Utilisateur 📊

**Accès :** Authentification requise

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `(dashboard)/page.tsx` | Page d'accueil |
| `/applications` | `(dashboard)/applications/applications/page.tsx` | Liste candidatures |
| `/applications/[id]` | `(dashboard)/applications/applications/[id]/page.tsx` | Détail candidature |
| `/entities/calls` | `(dashboard)/entities/calls/page.tsx` | Gestion appels |
| `/entities/companies` | `(dashboard)/entities/companies/page.tsx` | Gestion entreprises |
| ... | ... | Autres entités |

**Layout :** Vérifie `user` existe, sinon redirect `/login`

### 3. (admin)/ - Administration ⚙️

**Accès :** Authentification + rôle `admin` requis

| Route | Fichier | Description |
|-------|---------|-------------|
| `/backoffice` | `(admin)/backoffice/page.tsx` | Vue d'ensemble admin |
| `/backoffice/analytics` | `(admin)/backoffice/analytics/page.tsx` | Analytics admin |
| `/analytics` | `(admin)/analytics/page.tsx` | Métriques système |
| `/settings` | `(admin)/settings/page.tsx` | Configuration |
| `/notifications` | `(admin)/notifications/page.tsx` | Notifications |
| `/search` | `(admin)/search/page.tsx` | Recherche avancée |
| `/statistics` | `(admin)/statistics/page.tsx` | Statistiques |
| `/data-management` | `(admin)/data-management/page.tsx` | Gestion données |
| `/archives` | `(admin)/archives/page.tsx` | Archives |
| `/trash` | `(admin)/trash/page.tsx` | Corbeille |
| `/maintenance` | `(admin)/maintenance/page.tsx` | Maintenance |
| `/deployments` | `(admin)/deployments/page.tsx` | Déploiements |
| `/test-data` | `(admin)/test-data/page.tsx` | Données test |

**Layout :** Vérifie `user.role === 'admin'`, sinon redirect `/access-denied`

### 4. (security)/ - Sécurité 🔐

**Accès :** Authentification + rôle `admin` ou `security` requis

| Route | Fichier | Description |
|-------|---------|-------------|
| `/alerts` | `(security)/alerts/page.tsx` | Alertes sécurité |
| `/analysis` | `(security)/analysis/page.tsx` | Analyse sécurité |
| `/logs` | `(security)/logs/page.tsx` | Logs sécurité |
| `/intrusions` | `(security)/intrusions/page.tsx` | Détection intrusions |
| `/vulnerabilities` | `(security)/vulnerabilities/page.tsx` | Vulnérabilités |
| `/ddos` | `(security)/ddos/page.tsx` | Protection DDoS |
| `/data-generator` | `(security)/data-generator/page.tsx` | Générateur données |

**Layout :** Vérifie `user.role` in `['admin', 'security']`

### 5. (development)/ - Outils Dev 🛠️

**Accès :** Mode `development` + rôle `admin` requis

| Route | Fichier | Description |
|-------|---------|-------------|
| `/tests/api-tester` | `(development)/tests/api-tester/page.tsx` | Testeur API |
| `/tests/performance` | `(development)/tests/performance/page.tsx` | Tests perf |
| `/tests/playwright` | `(development)/tests/playwright/page.tsx` | Tests Playwright |
| `/mobile-emulator` | `(development)/mobile-emulator/page.tsx` | Émulateur mobile |
| `/services/applications/[serviceName]` | `(development)/services/applications/[serviceName]/page.tsx` | Service app |
| `/services/backoffice/[serviceName]` | `(development)/services/backoffice/[serviceName]/page.tsx` | Service backoffice |

**Layout :** Vérifie `NODE_ENV === 'development'` + `user.role === 'admin'`

### 6. api/ - API Routes 🔌

**Routes API Next.js** (pas de changement)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/api/health` | `api/health/route.ts` | Health check |
| `/api/cadvisor` | `api/cadvisor/route.ts` | Proxy cAdvisor |
| `/api/middleware-test` | `api/middleware-test/route.ts` | Test middleware |
| `/api/v1.3/docker` | `api/v1.3/docker/route.ts` | API Docker |

## 🔐 Sécurité avec Layouts de Groupe

Chaque groupe a son propre `layout.tsx` qui contrôle l'accès :

```typescript
// (public)/layout.tsx
export default function PublicLayout({ children }) {
  return <>{children}</>  // Aucune protection
}

// (dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth()
  
  if (!user) redirect('/login')  // Auth requise
  
  return <>{children}</>
}

// (admin)/layout.tsx
export default function AdminLayout({ children }) {
  const { user } = useAuth()
  
  if (!user || user.role !== 'admin') {
    redirect('/access-denied')  // Admin requis
  }
  
  return <>{children}</>
}
```

## 🎨 Avantages de cette Structure

### 1. **Clarté** ✨
- Chaque section est clairement définie
- Pas de confusion entre admin/backoffice/dashboard
- Facile de trouver où est une page

### 2. **Sécurité** 🔐
- Contrôle d'accès centralisé par groupe
- Layouts de groupe pour vérifier les permissions
- Impossible d'oublier de protéger une page

### 3. **Maintenabilité** 🛠️
- Structure logique et prévisible
- Ajout facile de nouvelles pages
- Tests plus faciles à organiser

### 4. **Performance** ⚡
- Layouts partagés par groupe
- Code splitting automatique
- Chargement optimal

### 5. **URLs Propres** 🌐
- Les parenthèses n'affectent pas les URLs
- `/login` reste `/login` (pas `/(public)/login`)
- URLs lisibles et SEO-friendly

## 📝 Checklist Après Réorganisation

- [ ] Backup créé et vérifié
- [ ] Script de réorganisation exécuté sans erreur
- [ ] Nouvelle structure vérifiée
- [ ] Build réussi (`npm run build`)
- [ ] Pages publiques accessibles (`/login`, `/register`)
- [ ] Dashboard accessible après login (`/`)
- [ ] Pages admin protégées (`/backoffice`, `/analytics`)
- [ ] Pages sécurité protégées (`/alerts`, `/logs`)
- [ ] Outils dev accessibles en mode dev (`/tests/api-tester`)
- [ ] API routes fonctionnent (`/api/health`)
- [ ] Pas de 404 sur les anciennes URLs
- [ ] Navigation fonctionne correctement
- [ ] Authentification et redirections ok

## 🐛 Dépannage

### Problème : 404 sur certaines pages

**Solution :** Vérifier que le fichier `page.tsx` existe bien

```bash
find frontend/src/app -name "page.tsx" | grep <nom-page>
```

### Problème : Redirect infini

**Cause :** Layout qui redirige en boucle

**Solution :** Vérifier les layouts de groupe

```bash
cat frontend/src/app/\(dashboard\)/layout.tsx
```

### Problème : Import paths cassés

**Cause :** Les imports relatifs peuvent avoir changé

**Solution :** Utiliser les imports absolus avec `@/`

```typescript
// ❌ Avant
import { Button } from '../../components/ui/button'

// ✅ Après
import { Button } from '@/components/ui/button'
```

### Problème : Build échoue

**Solution :** Nettoyer et rebuild

```bash
cd frontend
rm -rf .next
npm run build
```

## 📚 Ressources

- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#layouts)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)

## 🎉 Résumé

**Avant :** Structure plate et confuse
**Après :** Structure claire, groupée et sécurisée

**Commande pour réorganiser :**
```bash
./scripts/reorganize-frontend.sh
```

**Vérification :**
```bash
npm run build && npm run dev
```

**En cas de problème :**
```bash
# Restaurer le backup
rm -rf frontend/src/app
cp -r frontend-backup-*/app frontend/src/
```

🚀 **Prêt à réorganiser ? Lance le script !**
