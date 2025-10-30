'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/auth'

export default function AccessDeniedPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto h-24 w-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <span className="text-5xl">🚫</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Accès Refusé
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vous n'avez pas les permissions nécessaires pour accéder au backoffice d'administration.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Votre rôle actuel :</strong> {user?.role || 'USER'}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
            Le backoffice est réservé aux administrateurs. Si vous pensez que c'est une erreur, contactez votre administrateur.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </Link>
          <button
            onClick={logout}
            className="block w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Se déconnecter
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>Rôles autorisés :</p>
          <ul className="mt-2 space-y-1">
            <li>👨‍💼 <strong>ADMIN</strong> - Accès au backoffice</li>
            <li>👑 <strong>SUPER_ADMIN</strong> - Accès complet</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

