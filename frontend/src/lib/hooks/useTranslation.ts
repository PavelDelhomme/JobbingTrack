import { useState, useEffect, useCallback } from 'react'
import { translations, type Locale, type Translation } from '../i18n'

// Type pour accéder aux clés imbriquées
type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>]
    }[Extract<keyof T, string>]

type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
  ? F
  : T extends [infer F, ...infer R]
  ? F extends string
    ? `${F}${D}${Join<Extract<R, string[]>, D>}`
    : never
  : string

export type TranslationPath = Join<PathsToStringProps<Translation>, '.'>

/**
 * Hook pour gérer les traductions dans l'application
 * @returns Object contenant la langue actuelle, la fonction de traduction et la fonction de changement de langue
 */
export function useTranslation() {
  // Récupérer la langue depuis les paramètres ou le navigateur
  const getInitialLocale = (): Locale => {
    // 1. Vérifier localStorage pour les paramètres sauvegardés
    try {
      const storedSettings = localStorage.getItem('customization-settings')
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings)
        if (parsed.language && translations[parsed.language as Locale]) {
          return parsed.language as Locale
        }
      }
    } catch (error) {
      console.error('Error loading language from settings:', error)
    }

    // 2. Vérifier la langue du navigateur
    if (typeof window !== 'undefined') {
      const browserLang = navigator.language.split('-')[0]
      if (translations[browserLang as Locale]) {
        return browserLang as Locale
      }
    }

    // 3. Retourner la langue par défaut
    return 'fr'
  }

  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  // Fonction pour récupérer une valeur imbriquée dans un objet
  const getNestedValue = (obj: any, path: string): string => {
    const keys = path.split('.')
    let value = obj

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        console.warn(`Translation key not found: ${path}`)
        return path // Retourner la clé si non trouvée
      }
    }

    return typeof value === 'string' ? value : path
  }

  /**
   * Fonction de traduction
   * @param key Chemin vers la clé de traduction (ex: 'common.save', 'settings.title')
   * @param params Paramètres optionnels pour remplacer dans la traduction
   * @returns La chaîne traduite
   */
  const t = useCallback(
    (key: TranslationPath | string, params?: Record<string, string | number>): string => {
      const translation = getNestedValue(translations[locale], key)
      
      // Si des paramètres sont fournis, les remplacer dans la traduction
      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, paramValue]) => 
            str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue)),
          translation
        )
      }

      return translation
    },
    [locale]
  )

  /**
   * Changer la langue de l'application
   * @param newLocale Nouvelle langue à utiliser
   */
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    
    // Sauvegarder dans localStorage
    try {
      const storedSettings = localStorage.getItem('customization-settings')
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings)
        parsed.language = newLocale
        localStorage.setItem('customization-settings', JSON.stringify(parsed))
      } else {
        localStorage.setItem('customization-settings', JSON.stringify({ language: newLocale }))
      }
    } catch (error) {
      console.error('Error saving language preference:', error)
    }

    // Mettre à jour l'attribut lang du document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', newLocale)
    }
  }, [])

  // Appliquer la langue au chargement
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale)
    }
  }, [locale])

  return {
    locale,
    setLocale,
    t,
    translations: translations[locale],
  }
}

// Export type helper pour l'autocomplétion
export type { Locale, Translation, TranslationPath }

