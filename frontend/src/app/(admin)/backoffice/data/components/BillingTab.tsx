'use client'

import { FileBarChart } from '@/lib/icons'
import Link from 'next/link'

export default function BillingTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FileBarChart className="h-8 w-8 text-green-600" />
          Abonnement & facturation
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Comptes, abonnements, paiements et facturation
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Cette section est prévue pour la gestion des abonnements, paiements et facturation (liste abonnements, factures, moyens de paiement).
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          <strong>État :</strong> Non implémenté. Si dans le scope du projet, créer les APIs (abonnements, facturation) et les écrans ici. Sinon documenter « hors scope » (voir <strong>STATUS.md</strong> section 6 – Gestion des services & données).
        </p>
      </div>
    </div>
  )
}
