#!/bin/bash

# ============================================
# Script de Réorganisation du Frontend
# ============================================

set -e

FRONTEND_DIR="/home/pactivisme/Documents/Dev/Perso/JobbingTrack/frontend/src/app"
BACKUP_DIR="/home/pactivisme/Documents/Dev/Perso/JobbingTrack/frontend-backup-$(date +%Y%m%d-%H%M%S)"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Réorganisation du Frontend JobbingTrack            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# ÉTAPE 1 : Backup complet
# ============================================
echo "📦 Création du backup..."
cp -r "$FRONTEND_DIR" "$BACKUP_DIR"
echo "✅ Backup créé : $BACKUP_DIR"
echo ""

# ============================================
# ÉTAPE 2 : Créer la nouvelle structure
# ============================================
echo "📁 Création de la nouvelle structure..."

cd "$FRONTEND_DIR"

# Créer les nouveaux dossiers de groupes
mkdir -p "(public)"
mkdir -p "(dashboard)"
mkdir -p "(admin)"
mkdir -p "(security)"
mkdir -p "(development)"

# Créer les sous-dossiers
mkdir -p "(dashboard)/applications"
mkdir -p "(dashboard)/entities"
mkdir -p "(admin)/backoffice"
mkdir -p "(security)/alerts"
mkdir -p "(security)/analysis"
mkdir -p "(security)/logs"
mkdir -p "(security)/intrusions"
mkdir -p "(security)/vulnerabilities"
mkdir -p "(security)/ddos"
mkdir -p "(security)/data-generator"
mkdir -p "(development)/tests"
mkdir -p "(development)/mobile-emulator"
mkdir -p "(development)/services"

echo "✅ Structure créée"
echo ""

# ============================================
# ÉTAPE 3 : Déplacer les fichiers
# ============================================
echo "🚚 Déplacement des fichiers..."

# --- PUBLIC (Auth) ---
echo "  → (public)/"
mv login "(public)/" 2>/dev/null || true
mv register "(public)/" 2>/dev/null || true
mv "forgot-password" "(public)/" 2>/dev/null || true
mv "reset-password" "(public)/" 2>/dev/null || true
mv "access-denied" "(public)/" 2>/dev/null || true

# --- DASHBOARD ---
echo "  → (dashboard)/"
# Applications et entities restent dans dashboard
mv applications "(dashboard)/" 2>/dev/null || true
mv entities "(dashboard)/" 2>/dev/null || true

# Copier la page d'accueil dans dashboard (on garde aussi une à la racine)
cp page.tsx "(dashboard)/" 2>/dev/null || true

# --- ADMIN ---
echo "  → (admin)/"
mv backoffice "(admin)/" 2>/dev/null || true
mv admin/analytics "(admin)/" 2>/dev/null || true
mv admin/settings "(admin)/" 2>/dev/null || true
mv admin/notifications "(admin)/" 2>/dev/null || true
mv admin/search "(admin)/" 2>/dev/null || true
mv admin/statistics "(admin)/" 2>/dev/null || true
mv admin/"data-management" "(admin)/" 2>/dev/null || true
mv admin/archives "(admin)/" 2>/dev/null || true
mv admin/trash "(admin)/" 2>/dev/null || true
mv admin/maintenance "(admin)/" 2>/dev/null || true
mv admin/deployments "(admin)/" 2>/dev/null || true
mv admin/"test-data" "(admin)/" 2>/dev/null || true

# Supprimer le dossier admin vide
rmdir admin 2>/dev/null || true

# --- SECURITY ---
echo "  → (security)/"
mv security/"security-alerts" "(security)/alerts" 2>/dev/null || true
mv security/"security-analysis" "(security)/analysis" 2>/dev/null || true
mv security/"security-logs" "(security)/logs" 2>/dev/null || true
mv security/"security-intrusions" "(security)/intrusions" 2>/dev/null || true
mv security/"security-vulnerabilities" "(security)/vulnerabilities" 2>/dev/null || true
mv security/"security-ddos" "(security)/ddos" 2>/dev/null || true
mv security/"security-data-generator" "(security)/data-generator" 2>/dev/null || true

# Supprimer le dossier security vide
rmdir security 2>/dev/null || true

# --- DEVELOPMENT ---
echo "  → (development)/"
# Tests
mkdir -p "(development)/tests"
mv tests/"api-tester" "(development)/tests/" 2>/dev/null || true
mv tests/"performance-tests" "(development)/tests/performance" 2>/dev/null || true
mv tests/"playwright-tests" "(development)/tests/playwright" 2>/dev/null || true
rmdir tests 2>/dev/null || true

# Mobile emulator (depuis applications)
mv "(dashboard)/applications/mobile-emulator" "(development)/" 2>/dev/null || true

# Services (depuis applications et backoffice)
mkdir -p "(development)/services"
mv "(dashboard)/applications/services" "(development)/services/applications" 2>/dev/null || true
mv "(admin)/backoffice/services" "(development)/services/backoffice" 2>/dev/null || true

# Performance et playwright tests du backoffice
mv "(admin)/backoffice/performance-tests" "(development)/tests/performance-backoffice" 2>/dev/null || true
mv "(admin)/backoffice/playwright-tests" "(development)/tests/playwright-backoffice" 2>/dev/null || true

# --- CLEANUP ---
echo "  → Nettoyage..."
# Supprimer les anciens fichiers backup dans backoffice
rm -f "(admin)/backoffice/page.good.tsx" 2>/dev/null || true
rm -f "(admin)/backoffice/page.old.tsx" 2>/dev/null || true
rm -f "(admin)/backoffice/page.sans-probleme.tsx" 2>/dev/null || true

# Supprimer les dossiers shared et styles s'ils existent (on les garde à la racine de src/)
# shared et styles ne devraient pas être dans app/
if [ -d "shared" ]; then
  mv shared ../shared-old 2>/dev/null || true
fi
if [ -d "styles" ]; then
  mv styles ../styles-old 2>/dev/null || true
fi

echo "✅ Fichiers déplacés"
echo ""

# ============================================
# ÉTAPE 4 : Créer les layouts de groupe
# ============================================
echo "📝 Création des layouts de groupe..."

# Layout public (pas d'auth requise)
cat > "(public)/layout.tsx" << 'EOF'
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Pages publiques - pas d'authentification requise
  return <>{children}</>
}
EOF

# Layout dashboard (auth requise)
cat > "(dashboard)/layout.tsx" << 'EOF'
'use client'

import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
EOF

# Layout admin (auth + role admin requis)
cat > "(admin)/layout.tsx" << 'EOF'
'use client'

import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/access-denied')
    }
  }, [user, loading, router])

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return <>{children}</>
}
EOF

# Layout security (auth + permissions sécurité)
cat > "(security)/layout.tsx" << 'EOF'
'use client'

import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && !['admin', 'security'].includes(user.role)) {
      router.push('/access-denied')
    }
  }, [user, loading, router])

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user || !['admin', 'security'].includes(user.role)) {
    return null
  }

  return <>{children}</>
}
EOF

# Layout development (mode dev uniquement)
cat > "(development)/layout.tsx" << 'EOF'
'use client'

import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DevelopmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    if (!isDev) {
      router.push('/')
      return
    }
    
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/access-denied')
    }
  }, [user, loading, router, isDev])

  if (!isDev) {
    return <div>Ces outils ne sont disponibles qu'en mode développement</div>
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div>
      <div className="bg-yellow-500 text-black p-2 text-center font-bold">
        ⚠️ MODE DÉVELOPPEMENT
      </div>
      {children}
    </div>
  )
}
EOF

echo "✅ Layouts créés"
echo ""

# ============================================
# ÉTAPE 5 : Créer le README de structure
# ============================================
echo "📖 Création de la documentation..."

cat > "README.md" << 'EOF'
# 📂 Structure du Frontend JobbingTrack

Cette structure utilise les **Route Groups** de Next.js (dossiers entre parenthèses) pour organiser logiquement l'application sans affecter les URLs.

## 🗂️ Organisation

### `(public)/` - Pages Publiques
Pages accessibles sans authentification :
- `/login` - Connexion
- `/register` - Inscription
- `/forgot-password` - Mot de passe oublié
- `/reset-password/[token]` - Réinitialisation mot de passe
- `/access-denied` - Accès refusé

### `(dashboard)/` - Dashboard Utilisateur
Pages principales de l'application (authentification requise) :
- `/` - Page d'accueil dashboard
- `/applications` - Gestion des candidatures
  - `/applications/applications` - Liste des candidatures
  - `/applications/applications/[id]` - Détail candidature
- `/entities` - Entités métier
  - `/entities/calls` - Appels
  - `/entities/companies` - Entreprises
  - `/entities/contacts` - Contacts
  - `/entities/events` - Événements
  - `/entities/followups` - Suivis
  - `/entities/interviews` - Entretiens
  - `/entities/users` - Utilisateurs

### `(admin)/` - Administration
Pages d'administration système (rôle admin requis) :
- `/backoffice` - Vue d'ensemble administration
  - `/backoffice/analytics` - Analyses admin
- `/analytics` - Métriques et analyses système
- `/settings` - Configuration système
- `/notifications` - Gestion des notifications
- `/search` - Recherche avancée
- `/statistics` - Statistiques globales
- `/data-management` - Gestion des données
- `/archives` - Archives
- `/trash` - Corbeille
- `/maintenance` - Maintenance système
- `/deployments` - Déploiements
- `/test-data` - Données de test

### `(security)/` - Sécurité
Pages de sécurité (rôles admin/security requis) :
- `/alerts` - Alertes de sécurité
- `/analysis` - Analyse de sécurité
- `/logs` - Logs de sécurité
- `/intrusions` - Détection d'intrusions
- `/vulnerabilities` - Vulnérabilités
- `/ddos` - Protection DDoS
- `/data-generator` - Générateur de données de test

### `(development)/` - Outils Développement
Outils de développement (mode dev uniquement, rôle admin requis) :
- `/tests/api-tester` - Testeur d'API
- `/tests/performance` - Tests de performance
- `/tests/playwright` - Tests Playwright
- `/mobile-emulator` - Émulateur mobile
- `/services/applications` - Services applicatifs
- `/services/backoffice` - Services backoffice

### `api/` - API Routes
Routes API Next.js :
- `/api/health` - Health check
- `/api/cadvisor` - Proxy cAdvisor
- `/api/middleware-test` - Test middleware
- `/api/v1.3/docker` - API Docker

## 🎯 Avantages de cette Structure

1. **Organisation Claire** : Chaque section a son propre groupe
2. **Sécurité** : Layouts de groupe pour gérer l'authentification
3. **URLs Propres** : Les parenthèses n'affectent pas les URLs
4. **Maintenabilité** : Facile de trouver et maintenir le code
5. **Scalabilité** : Ajout facile de nouvelles sections

## 🔐 Sécurité

Chaque groupe a son propre `layout.tsx` qui gère :
- **(public)** : Aucune auth requise
- **(dashboard)** : Auth requise
- **(admin)** : Auth + rôle admin requis
- **(security)** : Auth + rôle admin/security requis
- **(development)** : Mode dev + rôle admin requis

## 📝 Convention de Nommage

- Groupes de routes : `(nom-groupe)/`
- Pages : `page.tsx`
- Layouts : `layout.tsx`
- Routes dynamiques : `[param]/`
- Routes API : `route.ts`
EOF

echo "✅ Documentation créée"
echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Réorganisation Terminée !                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Backup sauvegardé : $BACKUP_DIR"
echo ""
echo "📁 Nouvelle structure :"
echo "  - (public)/         → Pages publiques (auth)"
echo "  - (dashboard)/      → Dashboard utilisateur"
echo "  - (admin)/          → Administration système"
echo "  - (security)/       → Sécurité"
echo "  - (development)/    → Outils dev"
echo "  - api/              → API Routes"
echo ""
echo "📖 Documentation : $FRONTEND_DIR/README.md"
echo ""
echo "⚠️  IMPORTANT : Vérifiez et testez l'application !"
echo ""
EOF
chmod +x "/home/pactivisme/Documents/Dev/Perso/JobbingTrack/scripts/reorganize-frontend.sh"
