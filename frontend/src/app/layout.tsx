'use client'

import './globals.css'
import './styles/customization.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/hooks/auth'
import { ThemeProvider, applyTheme, getSystemTheme } from '@/lib/hooks/theme'
import { OfflineNotification } from '@/components/widgets'
import ErrorBoundary from '@/components/ErrorBoundary'
import { setupBrowserExtensionCleanup } from '@/utils/cleanBrowserExtensions'
import { useEffect } from 'react'

// Composant pour nettoyer les attributs d'extensions de navigateur
function HydrationFix() {
  useEffect(() => {
    return setupBrowserExtensionCleanup()
  }, [])

  return null
}

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="JobbingTrack - Plateforme de gestion des candidatures" />
        <meta name="theme-color" content="#111827" />
      </head>
      <body className={inter.className}>
        <HydrationFix />
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                {children}
                {/* OfflineNotification temporairement désactivé pour éviter boucle infinie */}
              </div>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
        {/* Script pour appliquer le thème avant le rendu React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const storedTheme = localStorage.getItem('theme') || 'system';
                const actualTheme = storedTheme === 'system' ? systemTheme : storedTheme;

                document.documentElement.classList.add(actualTheme);
                document.body.classList.add(actualTheme);

                // Mettre à jour le meta theme-color
                const metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (metaThemeColor) {
                  metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#111827' : '#ffffff');
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}