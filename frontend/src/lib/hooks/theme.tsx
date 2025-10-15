import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react'

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

export const ThemeContext = createContext<{
  theme: Theme
  actualTheme: 'light' | 'dark'
  systemTheme: 'light' | 'dark'
  toggleTheme: () => void
  setThemeMode: (theme: Theme) => void
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const contextValue = {
    theme: 'system' as Theme,
    actualTheme: 'light' as 'light' | 'dark',
    systemTheme: 'light' as 'light' | 'dark',
    toggleTheme: () => {},
    setThemeMode: () => {}
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
