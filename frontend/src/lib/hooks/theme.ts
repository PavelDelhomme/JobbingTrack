import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem('theme')
  return (stored as Theme) || 'system'
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  localStorage.setItem('theme', theme)
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  const body = document.body

  // Supprimer les classes existantes
  root.classList.remove('light', 'dark')
  body.classList.remove('light', 'dark')

  let actualTheme: 'light' | 'dark'

  if (theme === 'system') {
    actualTheme = getSystemTheme()
  } else {
    actualTheme = theme
  }

  // Appliquer le thème
  root.classList.add(actualTheme)
  body.classList.add(actualTheme)

  // Mettre à jour le meta tag theme-color pour mobile
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#111827' : '#ffffff')
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Charger le thème sauvegardé
    const storedTheme = getStoredTheme()
    setTheme(storedTheme)

    // Détecter le thème système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateSystemTheme = () => {
      const newSystemTheme = mediaQuery.matches ? 'dark' : 'light'
      setSystemTheme(newSystemTheme)
    }

    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => mediaQuery.removeEventListener('change', updateSystemTheme)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, systemTheme])

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  const actualTheme = theme === 'system' ? systemTheme : theme

  return {
    theme,
    actualTheme,
    systemTheme,
    toggleTheme,
    setThemeMode
  }
}
