# 📋 TODO - Corrections et Améliorations

## ✅ Priorité 1 - Corrections Critiques

### 1. Pages Archives et Corbeille
- [x] Pages créées dans `/backoffice/trash` et `/backoffice/archives`
- [ ] Vérifier que les routes API fonctionnent
- [ ] Ajouter filtrage par utilisateur
- [ ] Ajouter système de récupération avec délai

### 2. Page Utilisateurs
- [ ] Vérifier endpoint `/api/v1/auth/users`
- [ ] S'assurer que tous les utilisateurs sont retournés (y compris admin)
- [ ] Corriger filtrage et affichage

### 3. Pages Gestion des Données
- [ ] Intégrer le contenu des pages existantes dans les onglets
- [ ] Candidatures : intégrer `/backoffice/applications`
- [ ] Entreprises : intégrer `/backoffice/companies`
- [ ] Contacts : intégrer `/backoffice/contacts`
- [ ] Entretiens : intégrer `/backoffice/interviews`
- [ ] Appels : intégrer `/backoffice/calls`
- [ ] Relances : intégrer `/backoffice/followups`
- [ ] Événements : intégrer `/backoffice/events`
- [ ] Notifications : intégrer `/backoffice/notifications`

## ✅ Priorité 2 - Améliorations

### 4. Page Gestion des Services
- [ ] Renommer "Services actifs" en "Liste des Services"
- [ ] Ajouter filtres par état (healthy, degraded, offline)
- [ ] Ajouter filtres par CPU et Mémoire
- [ ] Actualisation automatique des données (sans recharger toute la page)

### 5. Section Sécurité
- [ ] Renommer "Sécurité & Logs" en "Sécurité"
- [ ] Améliorer "Logs de sécurité" avec vraies données
- [ ] Ajouter "Politiques de sécurité" configurables
- [ ] Améliorer "Analyse de sécurité" avec :
  - Blocage d'IP
  - Détection tentatives d'injection
  - Alertes en temps réel

### 6. Générateur de Données de Test
- [ ] Ajouter génération de données complètes d'utilisation
- [ ] Ajouter système de tags pour identifier les données de test
- [ ] Permettre nettoyage sélectif des données taguées
- [ ] Génération réaliste avec relations entre entités

### 7. Système Email - Migration vers Resend
- [ ] Installer Resend
- [ ] Créer compte Resend et configurer domaine
- [ ] Migrer emailService vers Resend
- [ ] Tester envoi d'emails
- [ ] Mettre à jour documentation

## ✅ Priorité 3 - Documentation

### 8. Mise à jour Documentation
- [ ] Mettre à jour STATUS.md
- [ ] Mettre à jour HISTORIQUE.md
- [ ] Créer guide Resend dans `docs/emails/`
- [ ] Documenter nouvelles fonctionnalités

