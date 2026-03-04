'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatLocalDateTime } from '@/lib/utils/date';
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
  userId?: string;
  to: string;
  from: string;
  subject: string;
  type: 'WELCOME' | 'VERIFICATION' | 'RESET_PASSWORD' | 'CONFIRMATION' | 'NOTIFICATION' | 'TEST';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  error?: string;
  emailContent?: string;
  metadata?: any;
  trackingId?: string;
  openCount?: number;
  clickCount?: number;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
};

export default function EmailMonitorPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'PENDING' | 'BOUNCED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'WELCOME' | 'VERIFICATION' | 'RESET_PASSWORD' | 'TEST'>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

  // Charger les emails depuis l'API
  useEffect(() => {
    loadEmails();
  }, [page, filter, typeFilter]);

  // Monitoring temps réel : rafraîchissement automatique tant que la page est visible
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadEmails(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, filter, typeFilter]);

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

  const loadEmails = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadError('Connectez-vous pour voir les logs d\'emails.');
        setEmails([]);
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`${API_URL}/api/v1/emails/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        setLoadError('Session expirée ou non autorisée. Reconnectez-vous.');
        setEmails([]);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        setLoadError(`API ${response.status}: ${response.statusText}. Vérifiez que la gateway (${API_URL}) et auth-service sont démarrés.`);
        setEmails([]);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setEmails(data.data || []);
        setTotal(data.pagination?.total || 0);
        setLastRefreshAt(new Date());
      } else {
        setLoadError(data.error || 'Erreur chargement');
        setEmails([]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setLoadError(`Impossible de joindre l'API (${API_URL}). ${msg}`);
      setEmails([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const refreshEmails = () => {
    loadEmails();
  };

  const clearLogs = async () => {
    if (confirm('Voulez-vous effacer tous les logs d\'emails ? Cette action est irréversible.')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/v1/emails/logs`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          setEmails([]);
          setFilteredEmails([]);
          loadEmails(); // Recharger pour mettre à jour les stats
        } else {
          alert('Erreur lors de la suppression des logs');
        }
      } catch (error) {
        console.error('Erreur suppression logs:', error);
        alert('Erreur lors de la suppression des logs');
      }
    }
  };

  const deleteFailedEmails = async () => {
    if (confirm('Voulez-vous supprimer tous les emails échoués ? Cette action est irréversible.')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/v1/emails/logs/failed`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          loadEmails(); // Recharger pour mettre à jour
          alert('Emails échoués supprimés avec succès');
        } else {
          alert('Erreur lors de la suppression des emails échoués');
        }
      } catch (error) {
        console.error('Erreur suppression emails échoués:', error);
        alert('Erreur lors de la suppression des emails échoués');
      }
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
      case 'WELCOME': return '👋';
      case 'VERIFICATION': return '✅';
      case 'RESET_PASSWORD': return '🔐';
      case 'CONFIRMATION': return '✔️';
      case 'NOTIFICATION': return '🔔';
      case 'TEST': return '🧪';
      default: return '📧';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WELCOME': return 'Bienvenue';
      case 'VERIFICATION': return 'Vérification';
      case 'RESET_PASSWORD': return 'Reset Password';
      case 'CONFIRMATION': return 'Confirmation';
      case 'NOTIFICATION': return 'Notification';
      case 'TEST': return 'Test';
      default: return 'Autre';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'SENT': return 'Envoyé';
      case 'DELIVERED': return 'Livré';
      case 'READ': return 'Lu';
      case 'FAILED': return 'Échoué';
      case 'BOUNCED': return 'Rejeté';
      default: return status;
    }
  };

  const stats = {
    total: total || emails.length,
    sent: emails.filter(e => e.status === 'SENT').length,
    delivered: emails.filter(e => e.status === 'DELIVERED').length,
    read: emails.filter(e => e.status === 'READ' || e.openedAt).length,
    failed: emails.filter(e => e.status === 'FAILED').length,
    pending: emails.filter(e => e.status === 'PENDING').length,
    bounced: emails.filter(e => e.status === 'BOUNCED').length,
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
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Surveillez tous les emails envoyés par JobbingTrack. Pour les parcours « Inscription + vérif. email » (Gmail/Proton/BlueMail), filtrez par type <strong>Vérification</strong> pour vérifier que l&apos;email a bien été envoyé.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {lastRefreshAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Dernière MAJ : {lastRefreshAt.toLocaleTimeString('fr-FR')}
              </span>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Rafraîchissement auto (8 s)
            </label>
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
            <Button onClick={deleteFailedEmails} variant="outline" className="text-orange-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer Échoués
            </Button>
            <Button onClick={clearLogs} variant="outline" className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Effacer Tout
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Envoyés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Échoués
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                En Attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</div>
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
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Statut</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'PENDING', 'BOUNCED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`
                        px-3 py-1 rounded text-sm font-medium transition-colors
                        ${filter === f 
                          ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {f === 'all' ? 'Tous' : getStatusLabel(f)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre Type */}
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Type d'Email</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'WELCOME', 'VERIFICATION', 'RESET_PASSWORD', 'TEST'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t as any)}
                      className={`
                        px-3 py-1 rounded text-sm font-medium transition-colors
                        ${typeFilter === t 
                          ? 'bg-purple-500 text-white dark:bg-purple-600 dark:text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
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
            <CardTitle className="flex items-center justify-between">
              <span>Emails Envoyés ({filteredEmails.length} / {total})</span>
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <RefreshCw className="h-16 w-16 mx-auto mb-4 opacity-50 animate-spin" />
                  <p>Chargement des emails...</p>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Aucun email trouvé</p>
                  {loadError ? (
                    <p className="text-sm mt-2 text-amber-600 dark:text-amber-400">{loadError}</p>
                  ) : (
                    <>
                      <p className="text-sm mt-2">
                        Les emails envoyés (inscription, vérification, reset password) apparaîtront ici.
                      </p>
                      <p className="text-xs mt-2 text-gray-400">
                        Après un parcours « Inscription + vérif. email » réussi, l’email de vérification doit être loggé. Vérifiez que auth-service tourne et que la table EmailLog existe (Prisma).
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icône Statut */}
                      <div className={`
                        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                        ${email.status === 'SENT' ? 'bg-green-100 dark:bg-green-900/30' : ''}
                        ${email.status === 'DELIVERED' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                        ${email.status === 'READ' ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                        ${email.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30' : ''}
                        ${email.status === 'PENDING' ? 'bg-orange-100 dark:bg-orange-900/30' : ''}
                        ${email.status === 'BOUNCED' ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}
                      `}>
                        {email.status === 'SENT' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {email.status === 'DELIVERED' && <CheckCircle className="h-6 w-6 text-blue-500" />}
                        {email.status === 'READ' && <Eye className="h-6 w-6 text-purple-500" />}
                        {email.status === 'FAILED' && <XCircle className="h-6 w-6 text-red-500" />}
                        {email.status === 'PENDING' && <Clock className="h-6 w-6 text-orange-500" />}
                        {email.status === 'BOUNCED' && <XCircle className="h-6 w-6 text-yellow-500" />}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getTypeIcon(email.type)}</span>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{email.subject}</h3>
                          <Badge variant={
                            email.status === 'SENT' ? 'default' :
                            email.status === 'DELIVERED' ? 'default' :
                            email.status === 'READ' ? 'default' :
                            email.status === 'FAILED' ? 'destructive' :
                            email.status === 'BOUNCED' ? 'destructive' :
                            'secondary'
                          }>
                            {getStatusLabel(email.status)}
                          </Badge>
                          <Badge variant="outline">{getTypeLabel(email.type)}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                            {email.status === 'FAILED' ? (
                              <span className="text-red-600 dark:text-red-400">Échoué : {email.error || 'Erreur inconnue'}</span>
                            ) : email.sentAt ? (
                              <span>Envoyé : {formatLocalDateTime(email.sentAt)}</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">En attente...</span>
                            )}
                          </div>
                          {email.openedAt && (
                            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <Eye className="h-4 w-4" />
                              <span>Ouvert : {formatLocalDateTime(email.openedAt)} ({email.openCount || 0}x)</span>
                            </div>
                          )}
                          {email.clickedAt && (
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Send className="h-4 w-4" />
                              <span>Cliqué : {formatLocalDateTime(email.clickedAt)} ({email.clickCount || 0}x)</span>
                            </div>
                          )}
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
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedEmail.subject}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
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

                <div className="border-t dark:border-gray-700 pt-4">
                  {selectedEmail.emailContent ? (
                    <div
                      className="prose max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.emailContent }}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Contenu non disponible</p>
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
                Lorsque « Rafraîchissement auto » est activé, la liste et les statistiques sont mises à jour toutes les 8 secondes (monitoring temps réel).
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
                <li>Avec SMTP OVH : Vérifier la boîte mail du destinataire</li>
                <li>Utiliser la page <strong>Tests → Tests Emails</strong> pour envoyer des emails de test</li>
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

