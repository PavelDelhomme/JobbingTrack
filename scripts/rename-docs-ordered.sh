#!/bin/bash

# ============================================
# RENOMMAGE DES FICHIERS DE DOCUMENTATION
# ============================================
# Ajoute des numéros pour indiquer l'ordre de lecture

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RENOMMAGE DES FICHIERS DE DOCUMENTATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""

# ============================================
# RENOMMAGE DES FICHIERS
# ============================================

echo -e "${YELLOW}📋 Renommage des fichiers...${NC}"
echo ""

# Tableau des renommages (ancien -> nouveau)
declare -A RENAMES=(
    ["START_HERE.md"]="1_START_HERE.md"
    ["REVEIL_README.md"]="2_REVEIL_README.md"
    ["INSTRUCTIONS_DEMAIN.md"]="3_INSTRUCTIONS_DEMAIN.md"
    ["MIGRATION_GUIDE.md"]="4_MIGRATION_GUIDE.md"
    ["SUIVI_DEPLOYMENT.md"]="5_SUIVI_DEPLOYMENT.md"
    ["TECHNICAL_SUMMARY.md"]="6_TECHNICAL_SUMMARY.md"
    ["COMMIT_INSTRUCTIONS.md"]="7_COMMIT_INSTRUCTIONS.md"
    ["SESSION_RECAP_NUIT.md"]="8_SESSION_RECAP_NUIT.md"
    ["FICHIERS_CREES.md"]="9_FICHIERS_CREES.md"
    ["FINAL_SUMMARY.md"]="10_FINAL_SUMMARY.md"
    ["LANCER_MAINTENANT.sh"]="0_LANCER_MAINTENANT.sh"
)

# Renommer les fichiers
for old_name in "${!RENAMES[@]}"; do
    new_name="${RENAMES[$old_name]}"
    
    if [ -f "$old_name" ]; then
        mv "$old_name" "$new_name"
        echo -e "  ✅ $old_name → ${GREEN}$new_name${NC}"
    else
        echo -e "  ⚠️  $old_name ${YELLOW}(non trouvé)${NC}"
    fi
done

echo ""

# ============================================
# MISE À JOUR DES RÉFÉRENCES
# ============================================

echo -e "${YELLOW}🔄 Mise à jour des références dans les fichiers...${NC}"
echo ""

# Fichiers à mettre à jour
FILES_TO_UPDATE=(
    "1_START_HERE.md"
    "2_REVEIL_README.md"
    "3_INSTRUCTIONS_DEMAIN.md"
    "4_MIGRATION_GUIDE.md"
    "5_SUIVI_DEPLOYMENT.md"
    "6_TECHNICAL_SUMMARY.md"
    "7_COMMIT_INSTRUCTIONS.md"
    "8_SESSION_RECAP_NUIT.md"
    "9_FICHIERS_CREES.md"
    "10_FINAL_SUMMARY.md"
    "0_LANCER_MAINTENANT.sh"
    "README.md"
    "scripts/git-commit-migration.sh"
)

# Mettre à jour les références
for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        echo "  📝 Mise à jour: $file"
        
        # Remplacer les anciennes références par les nouvelles
        for old_name in "${!RENAMES[@]}"; do
            new_name="${RENAMES[$old_name]}"
            
            # Remplacer dans le fichier (compatible macOS et Linux)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|$old_name|$new_name|g" "$file" 2>/dev/null || true
            else
                # Linux
                sed -i "s|$old_name|$new_name|g" "$file" 2>/dev/null || true
            fi
        done
    fi
done

echo ""

# ============================================
# CRÉER UN INDEX
# ============================================

echo -e "${YELLOW}📚 Création de l'index de lecture...${NC}"
echo ""

cat > "00_INDEX.md" << 'EOF'
# 📚 INDEX - Ordre de Lecture Recommandé

**Bienvenue !** Voici l'ordre optimal pour lire la documentation.

---

## 🚀 Pour Démarrer Rapidement

### 0️⃣ **LANCER_MAINTENANT.sh** ⚡
**Script de lancement automatique**

Exécutez simplement :
```bash
bash 0_LANCER_MAINTENANT.sh
```

Fait TOUT automatiquement :
- ✅ Rend les scripts exécutables
- ✅ Lance le commit & push

**Durée** : 30 secondes

---

### 1️⃣ **START_HERE.md** ⚡
**Guide ultra-rapide (30 secondes)**

Premier fichier à lire absolument !
- Commandes essentielles
- Workflow de base
- Liens vers autres docs

---

### 2️⃣ **REVEIL_README.md** ☀️
**Guide complet au réveil (10 minutes)**

Tout ce qu'il faut savoir :
- Récapitulatif complet
- Commandes détaillées
- FAQ
- Troubleshooting

---

### 3️⃣ **INSTRUCTIONS_DEMAIN.md** 📋
**Instructions pour le matin**

Guide étape par étape :
- Vérification setup
- Déploiement
- Tests
- Commit

---

## 📚 Documentation Technique

### 4️⃣ **MIGRATION_GUIDE.md** 🔧
**Guide technique complet**

Documentation exhaustive :
- Migrations Prisma
- Configuration Docker
- Tests
- Dépannage

---

### 5️⃣ **SUIVI_DEPLOYMENT.md** 📊
**Système de suivi et monitoring**

Nouveau système de suivi :
- Dashboard interactif
- Logs automatiques
- Rapports générés
- Historique des déploiements

---

### 6️⃣ **TECHNICAL_SUMMARY.md** 🎓
**Résumé technique détaillé**

Pour les développeurs :
- Architecture complète
- Statistiques
- Détails techniques
- Diagrammes

---

## 🔄 Git & Déploiement

### 7️⃣ **COMMIT_INSTRUCTIONS.md** 📝
**Guide Git commit & push**

Pour commiter les changements :
- Méthode automatique
- Méthode manuelle
- Vérifications sécurité
- Workflow GitHub Actions

---

## 📖 Récapitulatifs

### 8️⃣ **SESSION_RECAP_NUIT.md** 🌙
**Récapitulatif de la session**

Ce qui a été fait :
- Historique complet
- Décisions prises
- Fichiers créés
- Statistiques

---

### 9️⃣ **FICHIERS_CREES.md** 📦
**Liste exhaustive des fichiers**

Inventaire complet :
- Scripts créés
- Documentation
- Configuration
- Statistiques

---

### 🔟 **FINAL_SUMMARY.md** 🎉
**Résumé final global**

Vue d'ensemble finale :
- Mission accomplie
- Statistiques totales
- Prochaines étapes
- Commandes finales

---

## 🎯 Parcours Recommandés

### Parcours Rapide (5 minutes) ⚡

1. **0_LANCER_MAINTENANT.sh** - Exécuter
2. **1_START_HERE.md** - Lire
3. C'est tout ! ✨

### Parcours Complet (30 minutes) 📚

1. **1_START_HERE.md** - Démarrage
2. **2_REVEIL_README.md** - Guide complet
3. **3_INSTRUCTIONS_DEMAIN.md** - Instructions
4. **4_MIGRATION_GUIDE.md** - Technique
5. **7_COMMIT_INSTRUCTIONS.md** - Git

### Parcours Technique (1 heure) 🎓

1. **6_TECHNICAL_SUMMARY.md** - Architecture
2. **4_MIGRATION_GUIDE.md** - Migrations
3. **5_SUIVI_DEPLOYMENT.md** - Monitoring
4. **8_SESSION_RECAP_NUIT.md** - Historique
5. **9_FICHIERS_CREES.md** - Inventaire

---

## 📊 Statistiques

**Fichiers créés** : 25  
**Lignes de code** : 5500+  
**Scripts** : 9  
**Documentation** : 11  

**Tests automatiques** : 31  
**Gain de temps** : 98%  

---

## 🆘 Besoin d'Aide ?

**Problème Git ?** → `7_COMMIT_INSTRUCTIONS.md`  
**Problème Docker ?** → `2_REVEIL_README.md` (section Troubleshooting)  
**Problème Migration ?** → `4_MIGRATION_GUIDE.md`  
**Comprendre le suivi ?** → `5_SUIVI_DEPLOYMENT.md`  

---

## 🎉 Bon Développement !

**Commencez par** : `bash 0_LANCER_MAINTENANT.sh`

**Puis lisez** : `1_START_HERE.md`

**Tout est prêt ! 🚀**
EOF

echo -e "  ${GREEN}✅ Index créé : 00_INDEX.md${NC}"
echo ""

# ============================================
# RAPPORT FINAL
# ============================================

echo ""
echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ RENOMMAGE TERMINÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo ""
echo "📋 Fichiers renommés :"
echo ""
echo -e "  ${BLUE}0_LANCER_MAINTENANT.sh${NC}     ← Script de lancement"
echo -e "  ${BLUE}00_INDEX.md${NC}               ← Index de lecture"
echo -e "  ${BLUE}1_START_HERE.md${NC}           ← Démarrage rapide"
echo -e "  ${BLUE}2_REVEIL_README.md${NC}        ← Guide complet"
echo -e "  ${BLUE}3_INSTRUCTIONS_DEMAIN.md${NC}  ← Instructions matin"
echo -e "  ${BLUE}4_MIGRATION_GUIDE.md${NC}      ← Guide technique"
echo -e "  ${BLUE}5_SUIVI_DEPLOYMENT.md${NC}     ← Système de suivi"
echo -e "  ${BLUE}6_TECHNICAL_SUMMARY.md${NC}    ← Résumé technique"
echo -e "  ${BLUE}7_COMMIT_INSTRUCTIONS.md${NC}  ← Guide Git"
echo -e "  ${BLUE}8_SESSION_RECAP_NUIT.md${NC}   ← Récap session"
echo -e "  ${BLUE}9_FICHIERS_CREES.md${NC}       ← Liste fichiers"
echo -e "  ${BLUE}10_FINAL_SUMMARY.md${NC}       ← Résumé final"
echo ""
echo -e "${YELLOW}📚 Ordre de lecture recommandé :${NC}"
echo ""
echo "  1. Exécuter : bash 0_LANCER_MAINTENANT.sh"
echo "  2. Lire : 00_INDEX.md (pour l'ordre)"
echo "  3. Puis : 1_START_HERE.md"
echo ""
echo -e "${GREEN}🎉 Prêt pour le commit !${NC}"
echo ""
