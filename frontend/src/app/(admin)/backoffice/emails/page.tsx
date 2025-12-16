'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mail, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertCircle,
  TestTube
} from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface EmailStats {
  global: {
    total: number
    sent: number
    failed: number
    pending: number
    bounced?: number
    successRate: number
  }
  recent: {
    days: number
    total: number
    sent: number
    failed: number
    pending?: number
    bounced?: number
    successRate: number
    deliveryRate?: number
    evolution?: number
  }
  byType: Array<{ type: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
  dailyStats?: Array<{
    date: string
    total: number
    sent: number
    failed: number
    pending: number
  }>
  topRecipients?: Array<{
    email: string
    count: number
  }>
}

export default function EmailsPage() {
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [testEmail, setTestEmail] = useState({ to: '&apos;, subject: 'Test Email - JobbingTrack', content: &apos;' })
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('⚠️ Aucun token trouvé, impossible de récupérer les statistiques')
        setLoading(false)
        return
      }

      const response = await axios.get(`${API_URL}/api/v1/emails/stats?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setStats(response.data.data)
      } else {
        console.error('Erreur récupération stats:', response.data.error)
      }
    } catch (error: any) {
      console.error('Erreur récupération stats:', error)
      // Si erreur 401/403, le token est invalide ou expiré
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('Token invalide ou expiré, redirection vers la page de connexion...')
        // Optionnel: rediriger vers la page de connexion
        // window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSendTestEmail = async () => {
    if (!testEmail.to) {
      setSendResult({ success: false, message: 'Veuillez entrer une adresse email' })
      return
    }

    setSending(true)
    setSendResult(null)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/v1/emails/test`,
        {
          to: testEmail.to,
          subject: testEmail.subject,
          content: testEmail.content
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        setSendResult({ success: true, message: `Email de test envoyé à l'adresse ${testEmail.to} ! Vérifiez votre boîte mail (et les spams).` })
        setTestEmail({ to: '&apos;, subject: 'Test Email - JobbingTrack', content: &apos;' })
        // Rafraîchir les stats
        setTimeout(fetchStats, 1000)
      } else {
        setSendResult({ success: false, message: response.data.error || 'Erreur lors de l\&apos;envoi' })
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.response?.data?.error || 'Erreur lors de l\&apos;envoi de l\'email de test'
      })
    } finally {
      setSending(false)
    }
  }

  const handleTestPasswordReset = async () => {
    if (!testEmail.to) {
      setSendResult({ success: false, message: 'Veuillez entrer une adresse email' })
      return
    }

    setSending(true)
    setSendResult(null)

    try {
      const token = localStorage.getItem('token')
      // Utiliser l'endpoint forgot-password
      const response = await axios.post(
        `${API_URL}/api/v1/auth/forgot-password`,
        { email: testEmail.to },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        setSendResult({ success: true, message: `Email de réinitialisation de mot de passe envoyé à l'adresse ${testEmail.to} ! Vérifiez votre boîte mail (et les spams).` })
        setTimeout(fetchStats, 1000)
      } else {
        setSendResult({ success: false, message: response.data.error || 'Erreur lors de l\&apos;envoi' })
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.response?.data?.error || 'Erreur lors de l\&apos;envoi de l\'email de réinitialisation'
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Chargement des statistiques...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              Gestion des Emails
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Dashboard de gestion et monitoring des emails envoyés. 
              <span className="ml-2 text-sm">
                <a href="/backoffice/email-monitor" className="text-blue-600 dark:text-blue-400 hover:underline">
                  📈 Voir Email Monitor pour le suivi détaillé
                </a>
              </span>
            </p>
          </div>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Statistiques Globales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.global.total}</div>
                <p className="text-xs text-muted-foreground">
                  Tous les emails enregistrés
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Envoyés</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.global.sent}</div>
                <p className="text-xs text-muted-foreground">
                  Taux de succès: {stats.global.successRate}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Échoués</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.global.failed}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.global.total > 0 ? ((stats.global.failed / stats.global.total) * 100).toFixed(1) : 0}% d'échecs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Attente</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.global.pending}</div>
                <p className="text-xs text-muted-foreground">
                  Emails en cours d'envoi
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Statistiques Récentes (30 jours) */}
        {stats && stats.recent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistiques des {stats.recent.days} derniers jours
                {stats.recent.evolution !== undefined && (
                  <Badge variant={stats.recent.evolution >= 0 ? "default" : "destructive"} className="ml-2">
                    {stats.recent.evolution >= 0 ? '+&apos; : ''}{stats.recent.evolution}%
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.recent.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Envoyés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.recent.sent}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Échoués</p>
                  <p className="text-2xl font-bold text-red-600">{stats.recent.failed}</p>
                </div>
                {stats.recent.bounced !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rejetés</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.recent.bounced}</p>
                  </div>
                )}
                {stats.recent.pending !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.recent.pending}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Taux de succès</p>
                  <p className="text-2xl font-bold">{stats.recent.successRate}%</p>
                </div>
                {stats.recent.deliveryRate !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Taux de livraison</p>
                    <p className="text-2xl font-bold">{stats.recent.deliveryRate}%</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Destinataires */}
        {stats && stats.topRecipients && stats.topRecipients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top 10 Destinataires ({stats.recent.days} derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topRecipients.map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm">{recipient.email}</span>
                    </div>
                    <Badge variant="outline">{recipient.count} email{recipient.count > 1 ? 's&apos; : '&apos;}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test d'envoi d'email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Tester l'envoi d'emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="test" className="w-full">
              <TabsList>
                <TabsTrigger value="test">Email de Test</TabsTrigger>
                <TabsTrigger value="reset">Reset Password</TabsTrigger>
              </TabsList>
              
              <TabsContent value="test" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-email">Adresse Email</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="redacted@example.invalid"
                      value={testEmail.to}
                      onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-subject">Sujet</Label>
                    <Input
                      id="test-subject"
                      value={testEmail.subject}
                      onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-content">Contenu (optionnel)</Label>
                    <textarea
                      id="test-content"
                      className="w-full min-h-[100px] p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contenu HTML de l&apos;email (optionnel)"
                      value={testEmail.content}
                      onChange={(e) => setTestEmail({ ...testEmail, content: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={handleSendTestEmail} 
                    disabled={sending || !testEmail.to}
                    className="w-full"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer l'email de test
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="reset" className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Cette fonctionnalité envoie un email de réinitialisation de mot de passe à l'adresse spécifiée.
                      L'email contiendra un lien de réinitialisation valide pendant 1 heure.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="reset-email">Adresse Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="redacted@example.invalid"
                      value={testEmail.to}
                      onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={handleTestPasswordReset} 
                    disabled={sending || !testEmail.to}
                    className="w-full"
                    variant="outline"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer email de réinitialisation
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {sendResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                sendResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={sendResult.success ? 'text-green-800 dark:text-green-200&apos; : 'text-red-800 dark:text-red-200'}>
                    {sendResult.message}
                  </p>
                </div>
                {sendResult.success && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2 ml-7">
                    💡 Vérifiez votre boîte mail (et les spams) pour confirmer la réception de l'email.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Répartition par type */}
        {stats && stats.byType && stats.byType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Répartition par type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.byType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}

