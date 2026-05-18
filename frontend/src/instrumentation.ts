/**
 * Exécuté une fois au démarrage du serveur Node (Next).
 * Évite `ReferenceError: self is not defined` si une dépendance bundle côté serveur
 * attend l’API navigateur (ex. chunk `vendors.js` au `next build`).
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as typeof globalThis & {
    self?: Window & typeof globalThis;
  };
  if (typeof g.self === "undefined") {
    g.self = globalThis as unknown as Window & typeof globalThis;
  }
}
