# 🖥️ Guide Frontend - JobbingTrack

Guide de développement frontend pour JobbingTrack v4.1.

[← Retour à la documentation](../README.md) | [← README principal](../../README.md) | [🧭 Navigation](../navigation.md)

## 🎯 Vue d'ensemble

Développement de l'interface Next.js avec TypeScript, Tailwind CSS et Radix UI.

## 📚 Guides Disponibles

### 🔄 Fonctionnalités Utilisateur
- **[Guide - Enregistrement Automatique](GUIDE_ENREGISTREMENT_AUTOMATIQUE.md)** - Système d'enregistrement automatique des paramètres avec debounce intelligent
- **[Guide - Préférences Utilisateur](GUIDE_PREFERENCES_UTILISATEUR.md)** - Gestion complète des préférences utilisateur (thème, langue, notifications)

### ⚡ Performance
- **[Guide - Optimisation Performance](PERFORMANCE_OPTIMIZATION.md)** - Mémoire, bundles, lazy loading, Lucide/Recharts, commandes Makefile. Rapports générés : `frontend/performance-reports/`.

### 📊 Pages Administrateur
- **[Guide - Page de Détail des Services](GUIDE_PAGE_DETAIL_SERVICE.md)** - Page de détail d'un service Docker avec métriques en temps réel

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
cd frontend
npm install

# Démarrage en mode développement
npm run dev

# Build pour la production
npm run build

# Démarrage de la production
npm start
```

## 📖 Technologies Utilisées

- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling utility-first
- **Radix UI** - Composants accessibles
- **Recharts** - Graphiques et visualisations
- **Lucide React** - Icônes

## 🔗 Liens Utiles

- **[API Configuration](../../frontend/src/config/api.config.ts)** - Configuration des endpoints API
- **[Services](../../frontend/src/lib/services/)** - Services frontend (auth, metrics, preferences)
- **[Monitoring](../monitoring/README.md)** - Système de monitoring complet

---

**Version**: 4.1 - Guide frontend
**Dernière mise à jour**: Novembre 2025
