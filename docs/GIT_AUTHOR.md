# Auteur des commits Git

Pour **éviter que les commits soient attribués à "cursoragent"** (ou à un auteur par défaut non souhaité), configure l’identité Git **pour ce dépôt** avant de committer.

## Une seule fois (par machine / par clone)

À la racine du projet :

```bash
git config --local user.name "Ton Nom"
git config --local user.email "ton@email.com"
```

Exemple :

```bash
git config --local user.name "Pavel Delhomme"
git config --local user.email "pavel@example.com"
```

- `--local` = uniquement pour ce repo (pas pour tous les projets de la machine).
- Les prochains `git commit` (y compris depuis Cursor/IDE) utiliseront cette identité.

## Vérifier

```bash
git config --local user.name
git config --local user.email
```

## Note

Les commits déjà poussés avec un autre auteur (ex. cursoragent) restent dans l’historique. Pour les modifier il faudrait réécrire l’historique (`git rebase` / `git filter-branch`), ce qui est déconseillé sur des branches partagées (dev, main) sans accord de l’équipe.
