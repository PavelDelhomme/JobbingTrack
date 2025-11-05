'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCw,
  Trash2,
  Eye,
  Filter,
  Download
} from 'lucide-react';

type EmailLog = {
  id: string;
  to: string;
  from: string;
  subject: string;
  type: 'welcome' | 'verification' | 'reset_password' | 'confirmation';
  status: 'sent' | 'failed' | 'pending';
  sentAt: Date;
  error?: string;
  emailContent?: string;
};

export default function EmailMonitorPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'welcome' | 'verification' | 'reset_password'>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  // Charger les emails depuis localStorage (simulation)
  useEffect(() => {
    loadEmails();
  }, []);

  // Filtrer les emails
  useEffect(() => {
    let filtered = emails;

    if (filter !== 'all') {
      filtered = filtered.filter(email => email.status === filter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(email => email.type === typeFilter);
    }

    setFilteredEmails(filtered);
  }, [emails, filter, typeFilter]);

  const loadEmails = () => {
    // Charger depuis localStorage
    const stored = localStorage.getItem('email_logs');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setEmails(parsed.map((e: any) => ({
          ...e,
          sentAt: new Date(e.sentAt)
        })));
      } catch (error) {
        console.error('Erreur parsing emails:', error);
        setEmails([]);
      }
    } else {
      // Données de démonstration
      setEmails(getDemoEmails());
    }
  };

  const getDemoEmails = (): EmailLog[] => {
    return [
      {
        id: '1',
        to: 'paul.delh@gmail.com',
        from: 'noreply@maily.ovh',
        subject: '🎉 Bienvenue sur JobbingTrack !',
        type: 'welcome',
        status: 'sent',
        sentAt: new Date(Date.now() - 3600000),
        emailContent: '<h1>Bienvenue !</h1><p>Merci de vous être inscrit...</p>'
      },
      {
        id: '2',
        to: 'paul.delh@gmail.com',
        from: 'noreply@maily.ovh',
        subject: '✅ Vérifiez votre adresse email',
        type: 'verification',
        status: 'sent',
        sentAt: new Date(Date.now() - 3500000),
        emailContent: '<h1>Vérification</h1><p>Cliquez sur le lien...</p>'
      },
      {
        id: '3',
        to: 'test@example.com',
        from: 'noreply@maily.ovh',
        subject: '🔐 Réinitialisation de votre mot de passe',
        type: 'reset_password',
        status: 'sent',
        sentAt: new Date(Date.now() - 7200000),
        emailContent: '<h1>Reset Password</h1><p>Cliquez pour réinitialiser...</p>'
      },
      {
        id: '4',
        to: 'failed@example.com',
        from: 'noreply@maily.ovh',
        subject: '🎉 Bienvenue sur JobbingTrack !',
        type: 'welcome',
        status: 'failed',
        sentAt: new Date(Date.now() - 1800000),
        error: 'Invalid login: 535 - Mauvais mot de passe SMTP'
      }
    ];
  };

  const refreshEmails = () => {
    setIsLoading(true);
    setTimeout(() => {
      loadEmails();
      setIsLoading(false);
    }, 500);
  };

  const clearLogs = () => {
    if (confirm('Voulez-vous effacer tous les logs d\'emails ?')) {
      localStorage.removeItem('email_logs');
      setEmails([]);
      setFilteredEmails([]);
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(emails, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-logs-${Date.now()}.json`;
    a.click();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return '👋';
      case 'verification': return '✅';
      case 'reset_password': return '🔐';
      case 'confirmation': return '✔️';
      default: return '📧';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'welcome': return 'Bienvenue';
      case 'verification': return 'Vérification';
      case 'reset_password': return 'Reset Password';
      case 'confirmation': return 'Confirmation';
      default: return 'Autre';
    }
  };

  const stats = {
    total: emails.length,
    sent: emails.filter(e => e.status === 'sent').length,
    failed: emails.filter(e => e.status === 'failed').length,
    pending: emails.filter(e => e.status === 'pending').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Email Monitor
            </h1>
            <p className="text-gray-600 mt-1">
              Surveillez tous les emails envoyés par JobbingTrack
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={refreshEmails}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={exportLogs} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={clearLogs} variant="outline" className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Effacer
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Envoyés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Échoués
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En Attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Filtre Statut */}
              <div>
                <label className="text-sm font-medium mb-2 block">Statut</label>
                <div className="flex gap-2">
                  {['all', 'sent', 'failed', 'pending'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`
                        px-3 py-1 rounded text-sm
                        ${filter === f 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                        }
                      `}
                    >
                      {f === 'all' ? 'Tous' : f === 'sent' ? 'Envoyés' : f === 'failed' ? 'Échoués' : 'En attente'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Type d'Email</label>
                <div className="flex gap-2">
                  {['all', 'welcome', 'verification', 'reset_password'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t as any)}
                      className={`
                        px-3 py-1 rounded text-sm
                        ${typeFilter === t 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                        }
                      `}
                    >
                      {t === 'all' ? 'Tous' : getTypeLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des Emails */}
        <Card>
          <CardHeader>
            <CardTitle>
              Emails Envoyés ({filteredEmails.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredEmails.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Aucun email trouvé</p>
                  <p className="text-sm mt-2">
                    Les emails envoyés apparaîtront ici
                  </p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icône Statut */}
                      <div className={`
                        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                        ${email.status === 'sent' ? 'bg-green-100' : ''}
                        ${email.status === 'failed' ? 'bg-red-100' : ''}
                        ${email.status === 'pending' ? 'bg-orange-100' : ''}
                      `}>
                        {email.status === 'sent' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {email.status === 'failed' && <XCircle className="h-6 w-6 text-red-500" />}
                        {email.status === 'pending' && <Clock className="h-6 w-6 text-orange-500" />}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getTypeIcon(email.type)}</span>
                          <h3 className="font-semibold">{email.subject}</h3>
                          <Badge variant={
                            email.status === 'sent' ? 'default' :
                            email.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {email.status === 'sent' ? 'Envoyé' :
                             email.status === 'failed' ? 'Échoué' :
                             'En attente'}
                          </Badge>
                          <Badge variant="outline">{getTypeLabel(email.type)}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>À : {email.to}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Send className="h-4 w-4" />
                            <span>De : {email.from}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{email.sentAt.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>

                        {/* Erreur */}
                        {email.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            ❌ {email.error}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEmail(email)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir le contenu
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal Visualisation Email */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedEmail.subject}</h2>
                    <p className="text-gray-600 mt-1">
                      De : {selectedEmail.from} → À : {selectedEmail.to}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEmail(null)}
                  >
                    Fermer
                  </Button>
                </div>

                <div className="border-t pt-4">
                  {selectedEmail.emailContent ? (
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.emailContent }}
                    />
                  ) : (
                    <p className="text-gray-500">Contenu non disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Comment Utiliser Email Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Voir les emails envoyés</strong> : Cette page affiche tous les emails envoyés par JobbingTrack.
              </p>
              <p>
                <strong>Configuration actuelle</strong> : 
                {' '}
                <code className="bg-gray-200 px-2 py-1 rounded">
                  {process.env.SMTP_HOST || 'Non configuré'}
                </code>
              </p>
              <p>
                <strong>Pour tester</strong> :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Avec MailHog : Voir http://localhost:8025</li>
                <li>Avec OVH : Vérifier la boîte mail du destinataire</li>
                <li>Utiliser le scénario "Vérification Email et Reset Password" dans User Journey</li>
              </ul>
              <p className="mt-4 text-blue-700">
                <strong>📖 Documentation complète</strong> : <code>docs/emails/</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

