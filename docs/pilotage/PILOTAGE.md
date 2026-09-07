# Pilotage JobbingTrack

Dernière mise à jour : **7 septembre 2026**

## ▶ Où on en est

**Focus (1 seule) : MOB-METIER-OPS-02** — filtres candidatures + quick-create Accueil + polish hubs  
**Git** : branche `feat/mobile-metier-ops-v1055` (depuis `dev`) · APK **1.0.55**  
**Appareils** : Samsung + Nothing + Blackview — installer **1.0.55**  
**OTA** : republier prod / préprod / dev  

**Hors focus (porteur 07/09)** : **BO-OVERVIEW-KPI-MEM-01** — cartes santé cliquables + fix budget mémoire JT.  
**Déploiement auto** : `bash scripts/deploy/force-refresh-jt-services.sh local|preprod|prod` (pull GHCR + recreate) — branché aussi dans `admin-deploy-dev.sh`. **Pas** de recreate manuel Portainer.  
**Prod** : images `:latest` via `gh workflow run build-push-images.yml --ref dev -f channel=prod` (**sans** merge massif `dev`→`main`, écart ~1561 commits).

**Prochaine action** : déployer BO-OVERVIEW-KPI-MEM-01 (préprod + prod images ciblées) ; vérifier budget ≈ 8 Go ; suite mobile 1.0.55.

Guide : **[`DEPLOY.md`](../../DEPLOY.md)** · Checklist : [`TODOS.md`](TODOS.md) ▶ En cours  
