'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FRONTEND_URLS } from '@/config/ports.config'
import { Settings, CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react'
import axios from 'axios'

const API_URL = FRONTEND_URLS.api

export default function EmailSettingsPage() {
  const [smtpStatus, setSmtpStatus] = useState<{ success: boolean; message: string; data?: any } | null>(null)
  const [checking, setChecking] = useState(false)

  const checkSMTPStatus = async () => {
    setChecking(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/emails/test-smtp`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSmtpStatus(response.data)
    } catch (error: any) {
      const status = error.response?.status
      const msg = error.response?.data?.error || error.response?.data?.message || error.message
      setSmtpStatus({
        success: false,
        message: status === 503
          ? 'Service SMTP indisponible (non configuré ou erreur). Vérifiez la configuration ou réessayez plus tard.'
          : (msg || 'Erreur lors de la vérification SMTP'),
        data: error.response?.data?.details
      })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkSMTPStatus()
  }, [])

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuration SMTP
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configuration actuelle : OVH jobbingtrack.com (noreply@jobbingtrack.test)
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Configuration Actuelle</CardTitle>
            <Button onClick={checkSMTPStatus} disabled={checking} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Vérifier
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {smtpStatus ? (
              <>
                <div className={`flex items-center gap-2 ${smtpStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                  {smtpStatus.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{smtpStatus.message}</span>
                </div>
                {smtpStatus.data && (
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Host</p>
                      <p className="font-medium">{smtpStatus.data.host || 'Non configuré'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Port</p>
                      <p className="font-medium">{smtpStatus.data.port || 'Non configuré'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">From</p>
                      <p className="font-medium">{smtpStatus.data.from || 'Non configuré'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Secure</p>
                      <p className="font-medium">{smtpStatus.data.secure ? 'Oui (SSL/TLS)' : 'Non'}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Statut non vérifié</span>
              </div>
            )}
            {!smtpStatus?.data && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Host</p>
                  <p className="font-medium">ssl0.ovh.net</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Port</p>
                  <p className="font-medium">465</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">From</p>
                  <p className="font-medium">redacted@example.invalid</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Secure</p>
                  <p className="font-medium">Oui (SSL/TLS)</p>
                </div>
              </div>
            )}
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

