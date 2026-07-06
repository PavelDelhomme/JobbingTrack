/**
 * Garde-fous actifs uniquement pendant l'exécution d'un script smoke mobile.
 * Pas de variable .env — détection via chemin du script Node (argv[1]).
 */

function isSmokeScriptProcess() {
  const script = process.argv[1] || '';
  return /scripts[/\\]mobile[/\\]smoke/i.test(script);
}

function activateSmokeRuntimeGuards() {
  if (!isSmokeScriptProcess()) return false;
  process.env.SMOKE_DISMISS_INCOMING_CALLS = '1';
  return true;
}

// Activation à l'import depuis un smoke ou preflight
activateSmokeRuntimeGuards();

module.exports = { isSmokeScriptProcess, activateSmokeRuntimeGuards };
