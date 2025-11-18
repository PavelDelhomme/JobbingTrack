'use client'

import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function EmailDeliverabilityPage() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            Déliverabilité
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Tests de qualité et déliverabilité des emails (à venir)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tests de Déliverabilité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <Info className="w-4 h-4 inline mr-2" />
                Les tests de déliverabilité seront disponibles prochainement.
                Vous pourrez tester DNS, SPF, DKIM et obtenir un score mail-tester.com.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

