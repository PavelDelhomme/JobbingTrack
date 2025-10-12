'use client'

import { ReactNode } from 'react'
import { useTheme } from '@/lib/theme'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Le hook useTheme applique automatiquement le thème au document
  useTheme()

  return <>{children}</>
}
