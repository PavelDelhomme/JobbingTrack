'use client'

import { useState } from 'react'
import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  RefreshCw,
  Server,
  Shield,
  Mail,
  TestTube
} from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface DNSTestResult {
  domain: string
  mx: { status: string; records: string[]; error: string | null }
  spf: { status: string; record: string | null; error: string | null }
  dkim: { status: string; record: string | null; error: string | null }
}

interface SMTPTestResult {
  success: boolean
  message: string
  data?: {
    host: string
    port: string
    secure: boolean
    from: string
  }
}

export default function EmailDeliverabilityPage() {
  const [domain, setDomain] = useState('maily.ovh')
  const [testingDNS, setTestingDNS] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [dnsResults, setDnsResults] = useState<DNSTestResult | null>(null)
  const [smtpResult, setSmtpResult] = useState<SMTPTestResult | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestDNS = async () => {
    setTestingDNS(true)
    setDnsResults(null)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/emails/test-dns?domain=${domain}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setDnsResults(response.data.data)
      }
    } catch (error: any) {
      console.error('Erreur test DNS:', error)
      setDnsResults({
        domain,
        mx: { status: 'error', records: [], error: error.message },
        spf: { status: 'error', record: null, error: error.message },
        dkim: { status: 'error', record: null, error: error.message }
      })
    } finally {
      setTestingDNS(false)
    }
  }

  const handleTestSMTP = async () => {
    setTestingSMTP(true)
    setSmtpResult(null)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/emails/test-smtp`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSmtpResult(response.data)
    } catch (error: any) {
      setSmtpResult({
        success: false,
        message: error.response?.data?.error || 'Erreur lors du test SMTP'
      })
    } finally {
      setTestingSMTP(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setSendResult({ success: false, message: 'Veuillez entrer une adresse email' })
      return
    }

    setSendingTest(true)
    setSendResult(null)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/v1/emails/test`,
        {
          to: testEmail,
          subject: '🧪 Test Déliverabilité - JobbingTrack',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #3b82f6;">Test de Déliverabilité</h1>
              <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement ! ✅</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p><strong>Domaine:</strong> ${domain}</p>
              <p>Vérifiez votre boîte de réception (et les spams) pour confirmer la réception.</p>
            </div>
          `
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        setSendResult({ 
          success: true, 
          message: 'Email de test envoyé ! Vérifiez votre boîte mail (et les spams).' 
        })
        setTestEmail('')
      } else {
        setSendResult({ success: false, message: response.data.error || 'Erreur lors de l\'envoi' })
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.response?.data?.error || 'Erreur lors de l\'envoi de l\'email de test'
      })
    } finally {
      setSendingTest(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <Info className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">✅ OK</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">❌ Erreur</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">⚠️ Avertissement</Badge>
      default:
        return <Badge variant="outline">En attente</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            Tests de Déliverabilité
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Vérifier la configuration DNS et tester l'envoi d'emails
          </p>
        </div>

        {/* Test DNS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Tests DNS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="domain">Domaine à tester</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="maily.ovh"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleTestDNS} 
                  disabled={testingDNS || !domain}
                >
                  {testingDNS ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4 mr-2" />
                      Tester DNS
                    </>
                  )}
                </Button>
              </div>
            </div>

            {dnsResults && (
              <div className="space-y-4 mt-4">
                {/* Test MX */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(dnsResults.mx.status)}
                      <h3 className="font-semibold">Enregistrements MX</h3>
                    </div>
                    {getStatusBadge(dnsResults.mx.status)}
                  </div>
                  {dnsResults.mx.status === 'success' ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Serveurs mail configurés :</p>
                      <ul className="list-disc list-inside space-y-1">
                        {dnsResults.mx.records.map((record, idx) => (
                          <li key={idx} className="text-sm font-mono">{record}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      {dnsResults.mx.error}
                    </p>
                  )}
                </div>

                {/* Test SPF */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(dnsResults.spf.status)}
                      <h3 className="font-semibold">Enregistrement SPF</h3>
                    </div>
                    {getStatusBadge(dnsResults.spf.status)}
                  </div>
                  {dnsResults.spf.status === 'success' ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Enregistrement SPF trouvé :</p>
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded block">
                        {dnsResults.spf.record}
                      </code>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      {dnsResults.spf.error}
                    </p>
                  )}
                </div>

                {/* Test DKIM */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(dnsResults.dkim.status)}
                      <h3 className="font-semibold">Enregistrement DKIM</h3>
                    </div>
                    {getStatusBadge(dnsResults.dkim.status)}
                  </div>
                  {dnsResults.dkim.status === 'success' ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">DKIM configuré :</p>
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded block break-all">
                        {dnsResults.dkim.record}
                      </code>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {dnsResults.dkim.error || 'DKIM non configuré (optionnel mais recommandé)'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test SMTP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Test Connexion SMTP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTestSMTP} 
              disabled={testingSMTP}
            >
              {testingSMTP ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Tester la connexion SMTP
                </>
              )}
            </Button>

            {smtpResult && (
              <div className={`p-4 rounded-lg ${
                smtpResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {smtpResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={smtpResult.success ? 'text-green-800 dark:text-green-200 font-semibold' : 'text-red-800 dark:text-red-200 font-semibold'}>
                    {smtpResult.message}
                  </p>
                </div>
                {smtpResult.data && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Host:</span> {smtpResult.data.host}
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Port:</span> {smtpResult.data.port}
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Secure:</span> {smtpResult.data.secure ? 'Oui' : 'Non'}
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">From:</span> {smtpResult.data.from}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test d'envoi d'email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test d'Envoi d'Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Info className="w-4 h-4 inline mr-2" />
                Envoyez un email de test à votre adresse pour vérifier que les emails arrivent bien dans votre boîte mail.
                Vérifiez aussi les spams au cas où.
              </p>
            </div>
            <div>
              <Label htmlFor="test-email-deliverability">Votre adresse email</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="test-email-deliverability"
                  type="email"
                  placeholder="redacted@example.invalid"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendTestEmail} 
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </div>

            {sendResult && (
              <div className={`p-4 rounded-lg ${
                sendResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={sendResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                    {sendResult.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommandations */}
        <Card>
          <CardHeader>
            <CardTitle>Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p><strong>MX :</strong> Doit pointer vers les serveurs mail OVH (mx1.mail.ovh.net, etc.)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p><strong>SPF :</strong> Doit contenir "v=spf1 include:mx.ovh.com ~all" pour éviter les spams</p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <p><strong>DKIM :</strong> Optionnel mais recommandé pour améliorer la délivrabilité</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
