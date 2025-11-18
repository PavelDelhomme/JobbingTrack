'use client'

import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, CheckCircle, AlertCircle } from 'lucide-react'

export default function EmailSettingsPage() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuration SMTP
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configuration actuelle : OVH maily.ovh
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Actuelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">SMTP configuré et opérationnel</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Host</p>
                <p className="font-medium">{process.env.NEXT_PUBLIC_SMTP_HOST || 'ssl0.ovh.net'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Port</p>
                <p className="font-medium">{process.env.NEXT_PUBLIC_SMTP_PORT || '465'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">From</p>
                <p className="font-medium">noreply@maily.ovh</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Secure</p>
                <p className="font-medium">Oui (SSL/TLS)</p>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                La configuration SMTP est gérée via les variables d'environnement. 
                Modifiez les fichiers .env pour changer la configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

