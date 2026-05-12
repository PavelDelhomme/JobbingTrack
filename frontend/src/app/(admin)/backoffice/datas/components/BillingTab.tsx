'use client'

import Link from 'next/link'
import { FileBarChart, FileText, Key } from '@/lib/icons'

interface BillingTabProps {
  userId?: string | null
}

export default function BillingTab({ userId }: BillingTabProps) {
  return (
    <div>
      {userId && (
        <div className="mb-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Vous consultez l&apos;abonnement pour l&apos;utilisateur <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">{userId}</code>.
            <Link href={`/b4ck0ff1ce/users/${userId}`} className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
              Voir la fiche utilisateur
            </Link>
          </p>
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FileBarChart className="h-8 w-8 text-green-600" />
          Abonnement & facturation
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Gestion des abonnements, factures et moyens de paiement
        </p>
      </div>

      {/* Abonnements */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          Abonnements
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Début</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Renouvellement</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Aucun abonnement enregistré. Les APIs abonnements seront branchées ici (voir <strong>STATUS.md</strong>).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Factures */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-blue-600" />
          Factures
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">N° Facture</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Télécharger</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Aucune facture. Génération et liste des factures à brancher sur l&apos;API facturation.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Moyens de paiement */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600" />
          Moyens de paiement
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Cartes et moyens de paiement enregistrés pour les renouvellements et paiements.
          </p>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <Key className="h-10 w-10 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Aucun moyen de paiement enregistré</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ajoutez une carte ou un moyen de paiement lorsque l&apos;API sera disponible.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Documentation :</strong> état et périmètre de la gestion abonnement & facturation dans <strong>STATUS.md</strong> (section Gestion des services & données). Backend : créer les modèles et endpoints (abonnements, factures, paiements) puis brancher les appels ici.
        </p>
      </div>
    </div>
  )
}
