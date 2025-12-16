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
  TestTube,
  KeyRound,
  CheckCircle2
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
  const [domain, setDomain] = useState('jobbingtrack.com')
  const [testingDNS, setTestingDNS] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [dnsResults, setDnsResults] = useState<DNSTestResult | null>(null)
  const [smtpResult, setSmtpResult] = useState<SMTPTestResult | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestDNS = async () => {
    if (!domain || !domain.trim()) {
      setDnsResults({
        domain: '',
        mx: { status: 'error&apos;, records: [], error: 'Veuillez entrer un domaine à tester' },
        spf: { status: 'error&apos;, record: null, error: 'Veuillez entrer un domaine à tester' },
        dkim: { status: 'warning&apos;, record: null, error: 'Veuillez entrer un domaine à tester' }
      })
      return
    }

    setTestingDNS(true)
    setDnsResults(null)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/v1/emails/test-dns?domain=${encodeURIComponent(domain.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      
      if (response.data.success) {
        if (response.data.data) {
          setDnsResults(response.data.data)
        } else {
          // Si pas de data mais success, créer un résultat vide
          setDnsResults({
            domain: domain.trim(),
            mx: { status: 'pending', records: [], error: null },
            spf: { status: 'pending', record: null, error: null },
            dkim: { status: 'pending', record: null, error: null }
          })
        }
      } else {
        throw new Error(response.data.error || 'Erreur lors du test DNS')
      }
    } catch (error: any) {
      console.error('Erreur test DNS:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Erreur lors du test DNS'
      setDnsResults({
        domain: domain.trim(),
        mx: { status: 'error', records: [], error: errorMessage },
        spf: { status: 'error', record: null, error: errorMessage },
        dkim: { status: 'warning', record: null, error: errorMessage }
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
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      })
      
      if (response.data.success) {
        setSmtpResult(response.data)
      } else {
        setSmtpResult({
          success: false,
          message: response.data.error || response.data.message || 'Erreur lors du test SMTP',
          data: response.data.details
        })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Erreur lors du test SMTP'
      setSmtpResult({
        success: false,
        message: errorMessage,
        data: error.response?.data?.details
      })
    } finally {
      setTestingSMTP(false)
    }
  }

  const handleSendTestEmail = async (emailType: 'test&apos; | 'reset' | &apos;verification' = 'test') => {
    if (!testEmail) {
      setSendResult({ success: false, message: 'Veuillez entrer une adresse email' })
      return
    }

    // Définir l'état de chargement approprié
    if (emailType === 'reset') {
      setSendingReset(true)
    } else if (emailType === 'verification') {
      setSendingVerification(true)
    } else {
      setSendingTest(true)
    }
    setSendResult(null)

    try {
      const token = localStorage.getItem('token')
      const payload: any = {
        to: testEmail
      }

      if (emailType === 'reset') {
        payload.type = 'reset_password'
      } else if (emailType === 'verification') {
        payload.type = 'verification'
      } else {
        payload.subject = '🧪 Test Déliverabilité - JobbingTrack'
        payload.content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Test de Déliverabilité</h1>
            <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement ! ✅</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR&apos;)}</p>
            <p><strong>Domaine:</strong> ${domain}</p>
            <p>Vérifiez votre boîte de réception (et les spams) pour confirmer la réception.</p>
          </div>
        `
      }

      const response = await axios.post(
        `${API_URL}/api/v1/emails/test`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      )

      if (response.data.success) {
        const messages = {
          test: `Email de test envoyé à l'adresse ${testEmail} ! Vérifiez votre boîte mail (et les spams).`,
          reset: `Email de réinitialisation de mot de passe envoyé à ${testEmail} ! Vérifiez votre boîte mail.`,
          verification: `Email de vérification envoyé à ${testEmail} ! Vérifiez votre boîte mail.`
        }
        setSendResult({ 
          success: true, 
          message: messages[emailType]
        })
        if (emailType === 'test') {
          setTestEmail('')
        }
      } else {
        setSendResult({ success: false, message: response.data.error || 'Erreur lors de l\&apos;envoi' })
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.response?.data?.error || error.response?.data?.details || error.message || 'Erreur lors de l\&apos;envoi de l\'email'
      })
    } finally {
      setSendingTest(false)
      setSendingReset(false)
      setSendingVerification(false)
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
            <div className="space-y-2">
              <Label htmlFor="domain">Domaine à tester</Label>
              <div className="flex gap-2">
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="maily.ovh"
                  className="flex-1"
                />
                <Button 
                  onClick={handleTestDNS} 
                  disabled={testingDNS || !domain.trim()}
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
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <Info className="w-4 h-4 inline mr-2" />
                    <strong>Domaine testé :</strong> {dnsResults.domain || domain}
                  </p>
                </div>
                
                {/* Test MX */}
                {dnsResults.mx && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(dnsResults.mx.status || 'error')}
                        <h3 className="font-semibold">Enregistrements MX</h3>
                      </div>
                      {getStatusBadge(dnsResults.mx.status || 'error')}
                    </div>
                    {dnsResults.mx.status === 'success' ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Serveurs mail configurés :</p>
                        <ul className="list-disc list-inside space-y-1">
                          {(dnsResults.mx.records || []).map((record, idx) => (
                            <li key={idx} className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">{record}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {dnsResults.mx.error || 'Erreur lors de la vérification MX'}
                        </p>
                        {dnsResults.mx.error && dnsResults.mx.error.includes('timeout') && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Le test a pris trop de temps. Vérifiez votre connexion internet ou réessayez plus tard.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Test SPF */}
                {dnsResults.spf !== undefined && dnsResults.spf !== null && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(dnsResults.spf.status || 'error')}
                        <h3 className="font-semibold">Enregistrement SPF</h3>
                      </div>
                      {getStatusBadge(dnsResults.spf.status || 'error')}
                    </div>
                    {dnsResults.spf.status === 'success' ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Enregistrement SPF trouvé :</p>
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded block">
                          {dnsResults.spf.record}
                        </code>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {dnsResults.spf.error || 'Erreur lors de la vérification SPF'}
                        </p>
                        {dnsResults.spf.error && dnsResults.spf.error.includes('timeout') && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Le test a pris trop de temps. Vérifiez votre connexion internet ou réessayez plus tard.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Test DKIM */}
                {dnsResults.dkim !== undefined && dnsResults.dkim !== null && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(dnsResults.dkim.status || 'error')}
                        <h3 className="font-semibold">Enregistrement DKIM</h3>
                      </div>
                      {getStatusBadge(dnsResults.dkim.status || 'error')}
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
                )}
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
                  <p className={smtpResult.success ? 'text-green-800 dark:text-green-200 font-semibold&apos; : 'text-red-800 dark:text-red-200 font-semibold'}>
                    {smtpResult.message}
                  </p>
                </div>
                {smtpResult.data && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Host:</span> 
                        <span className="ml-2 font-mono">{smtpResult.data.host || 'Non configuré&apos;}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Port:</span> 
                        <span className="ml-2 font-mono">{smtpResult.data.port || 'Non configuré&apos;}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Secure:</span> 
                        <span className="ml-2">{smtpResult.data.secure ? '✅ Oui&apos; : '❌ Non&apos;}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">User:</span> 
                        <span className="ml-2 font-mono">{smtpResult.data.user || 'Non configuré&apos;}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">From:</span> 
                        <span className="ml-2 font-mono">{smtpResult.data.from || 'Non configuré&apos;}</span>
                      </div>
                    </div>
                    {smtpResult.data.suggestion && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <Info className="w-4 h-4 inline mr-2" />
                          {smtpResult.data.suggestion}
                        </p>
                      </div>
                    )}
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
                  placeholder="votre@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={() => handleSendTestEmail('test')} 
                  disabled={sendingTest || sendingReset || sendingVerification || !testEmail}
                  variant="outline"
                  className="flex-1"
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Email Test
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handleSendTestEmail('reset')} 
                  disabled={sendingTest || sendingReset || sendingVerification || !testEmail}
                  variant="outline"
                  className="flex-1"
                >
                  {sendingReset ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handleSendTestEmail('verification')} 
                  disabled={sendingTest || sendingReset || sendingVerification || !testEmail}
                  variant="outline"
                  className="flex-1"
                >
                  {sendingVerification ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Vérification
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
                  <p className={sendResult.success ? 'text-green-800 dark:text-green-200&apos; : 'text-red-800 dark:text-red-200'}>
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
