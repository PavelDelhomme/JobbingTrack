'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'system' | 'database' | 'services' | 'security'>('system')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ⚙️ Configuration & Administration Système
          </h1>
          <p className="mt-2 text-gray-600">
            Paramètres avancés et outils d'administration
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              active={activeTab === 'system'}
              onClick={() => setActiveTab('system')}
              icon="🖥️"
              label="Système"
            />
            <TabButton
              active={activeTab === 'database'}
              onClick={() => setActiveTab('database')}
              icon="🗄️"
              label="Base de données"
            />
            <TabButton
              active={activeTab === 'services'}
              onClick={() => setActiveTab('services')}
              icon="🔧"
              label="Services"
            />
            <TabButton
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              icon="🔐"
              label="Sécurité"
            />
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'system' && <SystemPanel />}
          {activeTab === 'database' && <DatabasePanel />}
          {activeTab === 'services' && <ServicesPanel />}
          {activeTab === 'security' && <SecurityPanel />}
        </div>
      </div>
    </AdminLayout>
  )
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function SystemPanel() {
  const systemInfo = {
    version: '1.0.0',
    nodeVersion: 'v20.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: '2h 34m',
    memory: '1.2GB / 4GB',
    cpu: '23%'
  }

  return (
    <div className="space-y-6">
      {/* System Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informations système
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Version" value={systemInfo.version} />
          <InfoRow label="Node.js" value={systemInfo.nodeVersion} />
          <InfoRow label="Environnement" value={systemInfo.environment} />
          <InfoRow label="Uptime" value={systemInfo.uptime} />
          <InfoRow label="Mémoire" value={systemInfo.memory} />
          <InfoRow label="CPU" value={systemInfo.cpu} />
        </div>
      </div>

      {/* System Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions système
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <ActionCard
            icon="🔄"
            title="Redémarrer services"
            description="Redémarrer tous les microservices"
            onClick={() => alert('⚠️ Cette action nécessite des privilèges Docker')}
          />
          <ActionCard
            icon="🧹"
            title="Nettoyer cache"
            description="Vider le cache Redis"
            onClick={() => alert('Cache nettoyé (simulation)')}
          />
          <ActionCard
            icon="📊"
            title="Générer rapport"
            description="Rapport d'état système complet"
            onClick={() => alert('Génération du rapport...')}
          />
          <ActionCard
            icon="💾"
            title="Backup système"
            description="Sauvegarder la configuration"
            onClick={() => alert('Backup en cours...')}
          />
        </div>
      </div>
    </div>
  )
}

function DatabasePanel() {
  return (
    <div className="space-y-6">
      {/* Database Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informations base de données
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Type" value="PostgreSQL 15" />
          <InfoRow label="Hôte" value="localhost:5432" />
          <InfoRow label="Database" value="jobbingtrack" />
          <InfoRow label="Connexions actives" value="12" />
          <InfoRow label="Taille DB" value="245 MB" />
          <InfoRow label="Tables" value="18" />
        </div>
      </div>

      {/* Database Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Gestion base de données
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <ActionCard
            icon="💾"
            title="Backup DB"
            description="Sauvegarder la base de données"
            onClick={() => alert('Backup en cours...')}
            color="blue"
          />
          <ActionCard
            icon="⚡"
            title="Migrations"
            description="Exécuter les migrations Prisma"
            onClick={() => alert('Migrations...')}
            color="green"
          />
          <ActionCard
            icon="🌱"
            title="Seed data"
            description="Peupler avec données de test"
            onClick={() => alert('Seeding...')}
            color="yellow"
          />
          <ActionCard
            icon="⚠️"
            title="Reset DB"
            description="⚠️ DANGER: Réinitialiser la DB"
            onClick={() => {
              if (confirm('⚠️ ATTENTION: Voulez-vous vraiment réinitialiser la base de données ? Toutes les données seront perdues !')) {
                alert('Reset DB (simulation - action bloquée pour sécurité)')
              }
            }}
            color="red"
          />
        </div>
      </div>
    </div>
  )
}

function ServicesPanel() {
  return (
    <div className="space-y-6">
      {/* Services Config */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuration des services
        </h3>
        <div className="space-y-4">
          <ServiceConfigRow 
            name="API Gateway" 
            port={3000} 
            status="running" 
            memory="128 MB"
          />
          <ServiceConfigRow 
            name="Auth Service" 
            port={3001} 
            status="running" 
            memory="256 MB"
          />
          <ServiceConfigRow 
            name="Application Service" 
            port={3002} 
            status="running" 
            memory="512 MB"
          />
          <ServiceConfigRow 
            name="Company Service" 
            port={3003} 
            status="running" 
            memory="256 MB"
          />
        </div>
      </div>

      {/* Service Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions services
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <ActionCard
            icon="🔄"
            title="Rebuild services"
            description="Reconstruire tous les services"
            onClick={() => alert('Rebuild en cours...')}
          />
          <ActionCard
            icon="📋"
            title="View logs"
            description="Voir les logs en temps réel"
            onClick={() => window.location.href = '/backoffice/logs'}
          />
        </div>
      </div>
    </div>
  )
}

function SecurityPanel() {
  return (
    <div className="space-y-6">
      {/* Security Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Paramètres de sécurité
        </h3>
        <div className="space-y-4">
          <SecurityOption
            label="JWT Secret"
            value={"*".repeat(32)}
            description="Clé secrète pour les tokens JWT"
          />
          <SecurityOption
            label="Session Timeout"
            value="7 jours"
            description="Durée de validité des sessions"
          />
          <SecurityOption
            label="Rate Limiting"
            value="1000 req/15min"
            description="Limite de requêtes par IP"
          />
          <SecurityOption
            label="CORS Origins"
            value="localhost:5173, localhost:8081"
            description="Origines autorisées"
          />
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions de sécurité
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <ActionCard
            icon="🔑"
            title="Rotate JWT Secret"
            description="Générer nouvelle clé JWT"
            onClick={() => alert('Rotation JWT...')}
            color="yellow"
          />
          <ActionCard
            icon="🚫"
            title="Révoquer tokens"
            description="Révoquer tous les tokens actifs"
            onClick={() => {
              if (confirm('Révoquer tous les tokens ? Tous les utilisateurs devront se reconnecter.')) {
                alert('Révocation des tokens (simulation)')
              }
            }}
            color="red"
          />
          <ActionCard
            icon="📊"
            title="Audit log"
            description="Consulter l'audit de sécurité"
            onClick={() => alert('Audit log...')}
          />
          <ActionCard
            icon="🛡️"
            title="Scan sécurité"
            description="Scanner les vulnérabilités"
            onClick={() => alert('Scan de sécurité...')}
          />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

function ServiceConfigRow({ name, port, status, memory }: {
  name: string
  port: number
  status: string
  memory: string
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{name}</h4>
        <p className="text-xs text-gray-500">Port: {port}</p>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-xs text-gray-600">RAM: {memory}</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      </div>
    </div>
  )
}

function SecurityOption({ label, value, description }: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <button className="text-blue-600 text-xs hover:text-blue-800">
          ✏️ Modifier
        </button>
      </div>
      <p className="text-sm text-gray-900 mb-1 font-mono">{value}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}

function ActionCard({ icon, title, description, onClick, color = 'blue' }: {
  icon: string
  title: string
  description: string
  onClick: () => void
  color?: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
  }

  return (
    <button
      onClick={onClick}
      className={`p-4 border rounded-lg text-left transition-colors ${colors[color]}`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-xs opacity-80">{description}</p>
    </button>
  )
}


