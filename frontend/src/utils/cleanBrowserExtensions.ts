/**
 * Utilitaire pour nettoyer les attributs d'extensions de navigateur
 * qui causent des erreurs d'hydratation React
 */

export function cleanBrowserExtensionAttributes(): void {
  const selectors = [
    '[data-protonpass-form]',
    '[data-lastpass-form]',
    '[data-bitwarden-form]',
    '[data-dashlane-form]',
    '[data-keeper-form]',
    '[data-1password-form]',
    '[data-roboform-form]',
    '[data-enpass-form]',
    '[data-sticky-password-form]',
    '[data-password-boss-form]'
  ]

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector)
    elements.forEach(element => {
      // Supprimer tous les attributs data-* qui peuvent causer des erreurs d'hydratation
      Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .forEach(attr => element.removeAttribute(attr.name))
    })
  })
}

export function setupBrowserExtensionCleanup(): void {
  // Nettoyer immédiatement
  cleanBrowserExtensionAttributes()

  // Nettoyer après le chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanBrowserExtensionAttributes)
  } else {
    // DOM déjà chargé, nettoyer à nouveau après un court délai
    setTimeout(cleanBrowserExtensionAttributes, 10)
    setTimeout(cleanBrowserExtensionAttributes, 100)
  }

  // Nettoyer après chaque interaction utilisateur
  const handleInput = (e: Event) => {
    cleanBrowserExtensionAttributes()
  }

  document.addEventListener('input', handleInput, true)
  document.addEventListener('focus', handleInput, true)
  document.addEventListener('click', handleInput, true)

  // Observer les mutations du DOM pour nettoyer les nouveaux éléments
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        cleanBrowserExtensionAttributes()
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-protonpass-form', 'data-lastpass-form', 'data-bitwarden-form']
  })

  // Cleanup (fonction interne, sans changer le type de retour)
  const cleanup = () => {
    document.removeEventListener('DOMContentLoaded', cleanBrowserExtensionAttributes)
    document.removeEventListener('input', handleInput, true)
    document.removeEventListener('focus', handleInput, true)
    document.removeEventListener('click', handleInput, true)
    observer.disconnect()
  }
  // Optionnel: retourner la fonction de nettoyage pour un usage externe si nécessaire
  // return cleanup
}
