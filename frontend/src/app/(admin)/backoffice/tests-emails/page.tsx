'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle, XCircle, RefreshCw, TestTube, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

type EmailTestType = 'test' | 'reset' | 'verification'

export default function TestsEmailsPage() {
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState<EmailTestType | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSend = async (type: EmailTestType) => {
    if (!testEmail?.trim()) {
      setResult({ success: false, message: 'Veuillez entrer une adresse email' })
      return
    }
    setSending(type)
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setResult({ success: false, message: 'Authentification requise' })
        return
      }
      const payload: any = { to: testEmail.trim() }
      if (type === 'reset') payload.type = 'reset_password'
      if (type === 'verification') payload.type = 'verification'
      if (type === 'test') {
        payload.subject = '🧪 Test Email - JobbingTrack'
        payload.content = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Test Email - JobbingTrack</h1>
            <p>Si vous recevez cet email, la configuration fonctionne correctement ! ✅</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        `
      }
      const res = await axios.post(`${API_URL}/api/v1/emails/test`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      })
      if (res.data.success) {
        const messages = {
          test: `Email de test envoyé à ${testEmail}. Vérifiez votre boîte mail.`,
          reset: `Email de réinitialisation envoyé à ${testEmail}. Vérifiez votre boîte mail.`,
          verification: `Email de vérification envoyé à ${testEmail}. Vérifiez votre boîte mail.`
        }
        setResult({ success: true, message: messages[type] })
      } else {
        setResult({ success: false, message: res.data.error || 'Erreur lors de l\'envoi' })
      }
    } catch (e: any) {
      setResult({
        success: false,
        message: e.response?.data?.error || e.message || 'Erreur lors de l\'envoi de l\'email'
      })
    } finally {
      setSending(null)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <TestTube className="w-8 h-8 text-blue-600" />
              Tests Emails
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Testez tous les types d&apos;emails : test générique, réinitialisation mot de passe, vérification compte.
            </p>
          </div>
          <Link
            href="/backoffice/emails/deliverability"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Déliverabilité complète <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Adresse de test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="test-email">Email destinataire</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <Button
                  onClick={() => handleSend('test')}
                  disabled={!!sending}
                  variant="outline"
                  className="gap-2"
                >
                  {sending === 'test' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Email Test
                </Button>
                <Button
                  onClick={() => handleSend('reset')}
                  disabled={!!sending}
                  variant="outline"
                  className="gap-2"
                >
                  {sending === 'reset' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Reset Password
                </Button>
                <Button
                  onClick={() => handleSend('verification')}
                  disabled={!!sending}
                  variant="outline"
                  className="gap-2"
                >
                  {sending === 'verification' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Vérification
                </Button>
              </div>
            </div>
            {result && (
              <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
                {result.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/backoffice/email-monitor">
            <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base">Email Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Voir tous les emails envoyés, filtrer par statut et type.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/backoffice/emails/logs">
            <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base">Historique emails</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Logs détaillés des envois d&apos;emails.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/backoffice/emails/templates">
            <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base">Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Modifier les templates (bienvenue, vérification, reset).
                </p>
              </CardContent>
            </Card>
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_MAILHOG_UI_URL || 'http://localhost:8025'}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  MailHog (dev)
                  <span className="text-xs font-normal text-gray-500">nouvel onglet</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ouvrir l&apos;interface MailHog pour voir les emails capturés en local.
                </p>
              </CardContent>
            </Card>
          </a>
        </div>
      </div>
    </AdminLayout>
  )
}
