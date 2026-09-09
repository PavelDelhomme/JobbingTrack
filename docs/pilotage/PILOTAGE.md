# Pilotage JobbingTrack

Dernière mise à jour : **8 septembre 2026**

## ▶ Où on en est

**Focus (1 seule) : MOB-NAV-01** — retours système depuis chaque écran détail  
**Git** : branche `feat/mobile-metier-ops-v1055` (depuis `dev`) · APK **1.0.55**  
**Appareils** : Samsung + Blackview — nested back **OK** ADB (08/09) ; Nothing à rebrancher  

**Clôturé 07/09 (porteur OK)** : **BO-OVERVIEW-KPI-MEM-01** — KPI cliquables + budget **8 Go** prod/préprod/local + `force-refresh-jt-services.sh`.  

**Prod 08/09** : seed `ApplicationStatus` (était vide → create API KO) sur postgres prod + préprod.  

**File porteur** : validation lot mobile 1.0.53→1.0.55 (hubs, filtres, OTA, TTL) — reportée fin de lot.

**Prochaine action** : chaînes contact/relance MOB-NAV ; checklist porteur lot mobile ; optionnel OTA form create (CTA visible).

Guide : **[`DEPLOY.md`](../../DEPLOY.md)** · Checklist : [`TODOS.md`](TODOS.md) ▶ En cours  
