# Outils documentation (méta)

Scripts et assets internes — **pas** de contenu produit à lire en priorité.

| Fichier | Rôle |
|---------|------|
| [generate-pdfs.js](generate-pdfs.js) | Génération PDF depuis les `.md` de `docs/` |
| [pdf-style.css](pdf-style.css) | Feuille de style pour les exports PDF |

**Commande** (depuis la racine du dépôt, sans `make`) :

```bash
node docs/_meta/generate-pdfs.js
```

PDFs générés : `docs/pdfs/`. Voir aussi [`../getting-started/REDEMARRAGE.md`](../getting-started/REDEMARRAGE.md) et la cible `docs-pdf-all` dans `makefiles/documentation/Makefile`.
