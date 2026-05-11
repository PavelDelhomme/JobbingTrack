/**
 * À charger **avant** Next sur le process Node du build, ex. :
 *   NODE_OPTIONS='--require ./scripts/self-server-polyfill.cjs' npm run build
 * Contourne `ReferenceError: self is not defined` dans certains chunks serveur (vendor OTel / libs navigateur).
 */
'use strict'
try {
  if (typeof globalThis !== 'undefined' && typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis
  }
} catch (_) {}
