/**
 * Parser pour détecter automatiquement les variables dans les templates HTML
 * Détecte les variables au format {{variableName}}
 */

/**
 * Détecte toutes les variables dans un template HTML/text
 * @param {string} content - Contenu HTML ou texte du template
 * @returns {string[]} - Liste des variables détectées (sans les {{}})
 */
function detectVariables(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // Regex pour détecter {{variableName}} ou {{ variableName }}
  const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const variables = new Set();
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variableName = match[1].trim();
    if (variableName) {
      variables.add(variableName);
    }
  }

  return Array.from(variables).sort();
}

/**
 * Remplace les variables dans un template par leurs valeurs
 * @param {string} template - Template avec variables {{variableName}}
 * @param {object} variables - Objet avec les valeurs des variables {variableName: value}
 * @returns {string} - Template avec variables remplacées
 */
function replaceVariables(template, variables = {}) {
  if (!template || typeof template !== 'string') {
    return template || '';
  }

  let result = template;

  // Remplacer toutes les variables trouvées
  Object.keys(variables).forEach(key => {
    const value = variables[key] || '';
    // Remplacer {{key}} ou {{ key }}
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Valide qu'un template contient toutes les variables requises
 * @param {string} template - Template à valider
 * @param {string[]} requiredVariables - Variables requises
 * @returns {object} - {valid: boolean, missing: string[]}
 */
function validateTemplate(template, requiredVariables = []) {
  const detectedVariables = detectVariables(template);
  const missing = requiredVariables.filter(v => !detectedVariables.includes(v));

  return {
    valid: missing.length === 0,
    missing,
    detected: detectedVariables,
  };
}

module.exports = {
  detectVariables,
  replaceVariables,
  validateTemplate,
};

