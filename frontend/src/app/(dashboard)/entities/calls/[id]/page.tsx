'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { AdminLayout } from '@/components/features'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Call {
  id: string
  userId: string
  applicationId: string
  contactId?: string
  type: 'OUTGOING' | 'INCOMING' | 'MISSED'
  scheduledDate?: string
  callDate?: string
  duration?: number
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_ANSWER' | 'VOICEMAIL' | 'RESCHEDULED'
  notes?: string
  outcome?: string
  followUpNeeded: boolean
  phoneNumber?: string
  createdAt: string
  updatedAt: string
  application?: {
    id: string
    position: string
    status: string
    company: {
      id: string
      name: string
      website?: string
    }
  }
  contact?: {
    id: string
    firstName: string
    lastName: string
    position?: string
    email?: string
    phone?: string
  }
}

const CALL_TYPES = {
  OUTGOING: { label: 'Sortant', icon: '📞', color: 'blue' },
  INCOMING: { label: 'Entrant', icon: '📱', color: 'green' },
  MISSED: { label: 'Manqué', icon: '❌', color: 'red' },
}

const CALL_STATUS = {
  SCHEDULED: { label: 'Planifié', color: 'yellow' },
  COMPLETED: { label: 'Terminé', color: 'green' },
  CANCELLED: { label: 'Annulé', color: 'gray' },
  NO_ANSWER: { label: 'Pas de réponse', color: 'orange' },
  VOICEMAIL: { label: 'Message vocal', color: 'purple' },
  RESCHEDULED: { label: 'Replanifié', color: 'blue' },
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { token } = useAuth()
  const router = useRouter()
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Call>>({})

  useEffect(() => {
    if (token && resolvedParams.id) {
      fetchCall()
    }
  }, [token, resolvedParams.id])

  const fetchCall = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8080/api/v1/calls/${resolvedParams.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Erreur lors du chargement de l\'appel')

      const data = await response.json()
      setCall(data.call)
      setFormData(data.call)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateCall = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/calls/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')

      await fetchCall()
      setEditing(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const deleteCall = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appel ?')) return

    try {
      const response = await fetch(`http://localhost:8080/api/v1/calls/${resolvedParams.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      router.push('/b4ck0ff1ce/calls')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const completeCall = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/calls/${resolvedParams.id}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration: formData.duration,
          outcome: formData.outcome,
          notes: formData.notes
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la complétion')

      await fetchCall()
      setEditing(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes} min ${secs} sec`
  }

  const formatDate = (date?: string) => {
    if (!date) return 'Non défini'
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !call) {
    return (
      <AdminLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error || 'Appel non trouvé'}</p>
          <Link href="/b4ck0ff1ce/calls" className="text-blue-600 hover:underline mt-2 inline-block">
            Retour à la liste
          </Link>
        </div>
      </AdminLayout>
    )
  }

  const typeInfo = CALL_TYPES[call.type]
  const statusInfo = CALL_STATUS[call.status]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <Link href="/b4ck0ff1ce/calls" className="text-blue-600 hover:underline mb-2 inline-block">
              ← Retour aux appels
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Détails de l'appel
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Appel {typeInfo.label.toLowerCase()} - {statusInfo.label}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing && call.status === 'SCHEDULED' && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✓ Marquer terminé
              </button>
            )}
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={deleteCall}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  🗑️ Supprimer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={call.status === 'SCHEDULED' ? completeCall : updateCall}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  💾 Enregistrer
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setFormData(call)
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  ✕ Annuler
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte principale */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Informations de l'appel
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  {editing ? (
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {Object.entries(CALL_TYPES).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/30 text-${typeInfo.color}-800 dark:text-${typeInfo.color}-300`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Statut
                  </label>
                  {editing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {Object.entries(CALL_STATUS).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 dark:bg-${statusInfo.color}-900/30 text-${statusInfo.color}-800 dark:text-${statusInfo.color}-300`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date planifiée
                  </label>
                  {editing ? (
                    <input
                      type="datetime-local"
                      value={formData.scheduledDate ? new Date(formData.scheduledDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100">{formatDate(call.scheduledDate)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date de l'appel
                  </label>
                  {editing ? (
                    <input
                      type="datetime-local"
                      value={formData.callDate ? new Date(formData.callDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, callDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100">{formatDate(call.callDate)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durée (secondes)
                  </label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.duration || ''}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      placeholder="Ex: 300"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100">{formatDuration(call.duration)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Numéro de téléphone
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100">{call.phoneNumber || '-'}</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Résultat de l'appel
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.outcome || ''}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    placeholder="Ex: Rendez-vous fixé, Pas intéressé..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-gray-100">{call.outcome || '-'}</div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                {editing ? (
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {call.notes || 'Aucune note'}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editing ? formData.followUpNeeded : call.followUpNeeded}
                    onChange={(e) => editing && setFormData({ ...formData, followUpNeeded: e.target.checked })}
                    disabled={!editing}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Relance nécessaire
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Candidature liée */}
            {call.application && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                  📝 Candidature
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Entreprise</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {call.application.company.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Poste</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {call.application.position}
                    </div>
                  </div>
                  <Link
                    href={`/b4ck0ff1ce/applications/${call.applicationId}`}
                    className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                  >
                    Voir la candidature →
                  </Link>
                </div>
              </div>
            )}

            {/* Contact lié */}
            {call.contact && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                  👤 Contact
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Nom</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {call.contact.firstName} {call.contact.lastName}
                    </div>
                  </div>
                  {call.contact.position && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Poste</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {call.contact.position}
                      </div>
                    </div>
                  )}
                  {call.contact.phone && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Téléphone</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {call.contact.phone}
                      </div>
                    </div>
                  )}
                  {call.contact.email && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {call.contact.email}
                      </div>
                    </div>
                  )}
                  <Link
                    href={`/b4ck0ff1ce/contacts/${call.contactId}`}
                    className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                  >
                    Voir le contact →
                  </Link>
                </div>
              </div>
            )}

            {/* Métadonnées */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                ℹ️ Métadonnées
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Créé le:</span>
                  <div className="text-gray-900 dark:text-gray-100">{formatDate(call.createdAt)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Modifié le:</span>
                  <div className="text-gray-900 dark:text-gray-100">{formatDate(call.updatedAt)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">ID:</span>
                  <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">{call.id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

