# Procédure d’investigation sécurité (B8)

## Objectif

Croiser menaces, audit append-only (B7), logs sécurité et logs agrégés pour une enquête post-incident reproductible.

## Qui peut consulter

- Rôle **ADMIN** ou **SUPER_ADMIN** pour `/b4ck0ff1ce/security/investigation` et `GET /api/v1/security/audit`.
- Les exports JSON incluent une empreinte **SHA-256** calculée côté navigateur au moment de l’export.

## Parcours recommandé

1. **Fiche menace** (`/b4ck0ff1ce/security/threats/:id`) — timeline 24 h, forensics IP, logs corrélés, `aggregated_logs` gateway si présents.
2. **Investigation** (`/b4ck0ff1ce/security/investigation`) — onglets **Audit B7**, **Menaces & logs**, **Comptes impactés** ; filtres IP / requestId / service / type menace ; exports CSV menaces et bundle JSON complet avec audit `security_export`.
3. **Corrélation technique** (`/b4ck0ff1ce/performances/correlation`) — `requestId`, méthode, endpoint, HTTP, proto, port.
4. **Logs sécurité** (`/b4ck0ff1ce/security/logs`) — filtre `requestId` / type d’événement.

## API investigation (B8/B7)

- `GET /api/v1/security/investigation/search` — agrège menaces, `security_logs`, `aggregated_logs`, audit et comptes impactés (auth via audit + userId logs).
- `POST /api/v1/security/investigation/export` — bundle JSON ou CSV menaces ; enregistre `security_export` dans `audit_logs`.

## Limites connues

- Signaux **mobile** (B9) = indicateurs, pas preuve seule ; croiser avec auth/gateway.
- IP privées / lab RFC5737 : géolocalisation et réputation ASN non applicables.
- Table `audit_logs` : migration Prisma requise avant première lecture (`npx prisma db push` dans `backend/security-service`).

## Conservation export

Conserver le fichier JSON exporté + noter le hash SHA-256 affiché dans l’UI pour chaîne interne de preuve.
