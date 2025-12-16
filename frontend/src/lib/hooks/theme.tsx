import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react'

export type Theme = 'light&apos; | 'dark' | &apos;system'

export function getSystemTheme(): 'light&apos; | 'dark' {
  if (typeof window === 'undefined&apos;) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)&apos;).matches ? 'dark' : &apos;light'
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined&apos;) return 'system'
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
  root.classList.remove('light&apos;, 'dark')
  body.classList.remove('light&apos;, 'dark')

  let actualTheme: 'light&apos; | 'dark'

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
    metaThemeColor.setAttribute('content&apos;, actualTheme === 'dark' ? &apos;#111827' : '#ffffff')
  }
}

export const ThemeContext = createContext<{
  theme: Theme
  actualTheme: 'light&apos; | 'dark'
  systemTheme: 'light&apos; | 'dark'
  toggleTheme: () => void
  setThemeMode: (theme: Theme) => void
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'light&apos; | 'dark'>(&apos;light')

  // Charger le thème initial
  useEffect(() => {
    const storedTheme = getStoredTheme()
    setTheme(storedTheme)
    setSystemTheme(getSystemTheme())

    // Écouter les changements du système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setSystemTheme(getSystemTheme())
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Appliquer le thème quand il change
  useEffect(() => {
    const actualTheme = theme === 'system' ? systemTheme : theme
    applyTheme(theme)

    // Mettre à jour le meta tag theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content&apos;, actualTheme === 'dark' ? &apos;#111827' : '#ffffff')
    }
  }, [theme, systemTheme])

  // Calculer le thème actuel
  const actualTheme = theme === 'system' ? systemTheme : theme

  const toggleTheme = () => {
    const newTheme = actualTheme === 'light&apos; ? 'dark' : &apos;light'
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  const contextValue = {
    theme,
    actualTheme,
    systemTheme,
    toggleTheme,
    setThemeMode
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
