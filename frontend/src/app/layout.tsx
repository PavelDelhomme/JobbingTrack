'use client'

import './globals.css'
import './styles/customization.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/hooks/auth'
import { ThemeProvider } from '@/lib/hooks/theme'
import { OfflineNotification } from '@/components/OfflineNotification'

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
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
              {children}
              {/* OfflineNotification temporairement désactivé pour éviter boucle infinie */}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}