'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/features'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'

type SecurityOverview = {
  logsCount: number
  threatsCount: number
  blockedIpsCount: number
  wafEnabled: boolean | null
  firewallRulesCount: number
  systemCpuPercent: number | null
  projectCpuPercent: number | null
  projectMemoryPercent: number | null
  systemLoadPerCore: number | null
  diskUsagePercent: number | null
  responseTimeMs: number | null
  healthyServices: number
  totalServices: number
  activeContainers: number
}

const defaultOverview: SecurityOverview = {
  logsCount: 0,
  threatsCount: 0,
  blockedIpsCount: 0,
  wafEnabled: null,
  firewallRulesCount: 0,
  systemCpuPercent: null,
  projectCpuPercent: null,
  projectMemoryPercent: null,
  systemLoadPerCore: null,
  diskUsagePercent: null,
  responseTimeMs: null,
  healthyServices: 0,
  totalServices: 0,
  activeContainers: 0,
}

export default function SecurityOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<SecurityOverview>(defaultOverview)

  useEffect(() => {
    let mounted = true
    const token = localStorage.getItem('token')
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    const fetchJson = async (endpoint: string) => {
      const res = await fetch(`${API_URL}${endpoint}`, { headers })
      if (!res.ok) return null
      return res.json().catch(() => null)
    }

    const load = async () => {
      try {
        const [logs, threats, blockedIps, wafConfig, firewallRules, metrics] = await Promise.all([
          fetchJson('/api/v1/security/logs?limit=200'),
          fetchJson('/api/v1/security/firewall/threats?limit=200'),
          fetchJson('/api/v1/security/firewall/blocked-ips'),
          fetchJson('/api/v1/security/waf/config'),
          fetchJson('/api/v1/security/firewall/rules'),
          fetchJson('/api/v1/metrics'),
        ])

        if (!mounted) return

        const logsArray = logs?.data || logs?.logs || []
        const threatsArray = threats?.data || threats?.threats || []
        const ipsArray = blockedIps?.data || blockedIps?.ips || blockedIps?.blockedIps || []
        const rulesArray = firewallRules?.data || firewallRules?.rules || []
        const servicesObj = metrics?.services || {}
        const servicesEntries = typeof servicesObj === 'object' && servicesObj !== null ? Object.values(servicesObj) : []
        const healthyServices = servicesEntries.filter((s: any) => s?.status === 'healthy' || s?.health?.status === 'healthy' || s?.status === 'running').length
        const totalServices = servicesEntries.length
        const cpuUsage = typeof metrics?.system?.cpu?.usage_percent === 'number'
          ? metrics.system.cpu.usage_percent
          : typeof metrics?.system?.cpu_percent === 'number'
          ? metrics.system.cpu_percent
          : null
        const cpuProject = typeof metrics?.system?.jobbingtrack?.containers?.cpu?.averagePercent === 'number'
          ? metrics.system.jobbingtrack.containers.cpu.averagePercent
          : typeof metrics?.system?.containersAggregate?.cpu_percent === 'number'
          ? metrics.system.containersAggregate.cpu_percent
          : null
        const memProject = typeof metrics?.system?.jobbingtrack?.containers?.memory?.percent_of_system === 'number'
          ? metrics.system.jobbingtrack.containers.memory.percent_of_system
          : typeof metrics?.system?.containersAggregate?.memory_percent === 'number'
          ? metrics.system.containersAggregate.memory_percent
          : null
        const load1 = typeof metrics?.system?.cpu?.load_1 === 'number' ? metrics.system.cpu.load_1 : null
        const cores = typeof metrics?.system?.cpu?.cores === 'number' && metrics.system.cpu.cores > 0 ? metrics.system.cpu.cores : null
        const loadPerCore = load1 !== null && cores ? (load1 / cores) : null
        const diskPct = typeof metrics?.system?.disk?.[0]?.usage_percent === 'number'
          ? metrics.system.disk[0].usage_percent
          : typeof metrics?.system?.disk?.[0]?.usage === 'number'
          ? metrics.system.disk[0].usage
          : null
        const responseTime = typeof metrics?.system?.responseTime?.average_ms === 'number'
          ? metrics.system.responseTime.average_ms
          : null
        const activeContainers = typeof metrics?.system?.jobbingtrack?.containers?.count === 'number'
          ? metrics.system.jobbingtrack.containers.count
          : 0

        setOverview({
          logsCount: Array.isArray(logsArray) ? logsArray.length : 0,
          threatsCount: Array.isArray(threatsArray) ? threatsArray.length : 0,
          blockedIpsCount: Array.isArray(ipsArray) ? ipsArray.length : 0,
          wafEnabled: typeof wafConfig?.enabled === 'boolean' ? wafConfig.enabled : (typeof wafConfig?.data?.enabled === 'boolean' ? wafConfig.data.enabled : null),
          firewallRulesCount: Array.isArray(rulesArray) ? rulesArray.length : 0,
          systemCpuPercent: cpuUsage,
          projectCpuPercent: cpuProject,
          projectMemoryPercent: memProject,
          systemLoadPerCore: loadPerCore,
          diskUsagePercent: diskPct,
          responseTimeMs: responseTime,
          healthyServices,
          totalServices,
          activeContainers,
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const securityScore = useMemo(() => {
    const score = 100
      - Math.min(40, overview.threatsCount * 2)
      - Math.min(30, Math.max(0, overview.logsCount - 20))
      - Math.min(20, overview.blockedIpsCount > 0 ? 10 : 0)
      - (overview.wafEnabled === false ? 15 : 0)
      - (overview.systemCpuPercent !== null && overview.systemCpuPercent > 85 ? 8 : 0)
      - (overview.projectCpuPercent !== null && overview.projectCpuPercent > 85 ? 8 : 0)
      - (overview.projectMemoryPercent !== null && overview.projectMemoryPercent > 25 ? 8 : 0)
      - (overview.systemLoadPerCore !== null && overview.systemLoadPerCore > 1.5 ? 6 : 0)
      - (overview.diskUsagePercent !== null && overview.diskUsagePercent > 90 ? 6 : 0)
      - (overview.responseTimeMs !== null && overview.responseTimeMs > 1200 ? 6 : 0)
      - (overview.totalServices > 0 && overview.healthyServices < overview.totalServices ? 8 : 0)
    return Math.max(0, Math.min(100, score))
  }, [overview])

  const scoreColor = securityScore > 80 ? 'text-green-600 dark:text-green-400' : securityScore > 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'

  const cards = [
    { title: 'Logs sécurité', value: overview.logsCount, subtitle: 'Entrées récentes', href: '/backoffice/security/logs' },
    { title: 'Menaces', value: overview.threatsCount, subtitle: 'Détections réseau', href: '/backoffice/security/threats' },
    { title: 'IPs bloquées', value: overview.blockedIpsCount, subtitle: 'Firewall', href: '/backoffice/security/firewall' },
    { title: 'Règles firewall', value: overview.firewallRulesCount, subtitle: 'Configuration active', href: '/backoffice/security/firewall' },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">🛡️ Vue d’ensemble sécurité</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Pilotage centralisé: logs, menaces, firewall, WAF, analyse et politiques.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Score de sécurité global</div>
              <div className={`text-4xl font-bold ${scoreColor}`}>{loading ? '...' : `${securityScore}%`}</div>
            </div>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              <div>WAF: {overview.wafEnabled === null ? 'N/A' : overview.wafEnabled ? '✅ Activé' : '❌ Désactivé'}</div>
              <div>Mise à jour auto: 15s</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-400">
            <div>CPU système: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.systemCpuPercent === null ? 'N/A' : `${overview.systemCpuPercent.toFixed(1)}%`}</span></div>
            <div>CPU projet: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.projectCpuPercent === null ? 'N/A' : `${overview.projectCpuPercent.toFixed(1)}%`}</span></div>
            <div>Mémoire projet: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.projectMemoryPercent === null ? 'N/A' : `${overview.projectMemoryPercent.toFixed(1)}%`}</span></div>
            <div>Services: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.totalServices > 0 ? `${overview.healthyServices}/${overview.totalServices}` : 'N/A'}</span></div>
            <div>Conteneurs actifs: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.activeContainers}</span></div>
            <div>Disque: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.diskUsagePercent === null ? 'N/A' : `${overview.diskUsagePercent.toFixed(1)}%`}</span></div>
            <div>Charge/core: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.systemLoadPerCore === null ? 'N/A' : overview.systemLoadPerCore.toFixed(2)}</span></div>
            <div>Temps réponse: <span className="font-semibold text-gray-900 dark:text-gray-100">{overview.responseTimeMs === null ? 'N/A' : `${overview.responseTimeMs.toFixed(0)} ms`}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400">{card.title}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{loading ? '...' : card.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.subtitle}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/backoffice/security/analysis" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Analyse sécurité</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Vérifier la posture globale, tendances et recommandations.</p>
          </Link>
          <Link href="/backoffice/security/policies" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Politiques</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Gérer les règles et exigences de conformité.</p>
          </Link>
          <Link href="/backoffice/security/network" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Réseau</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Suivre le trafic, les anomalies et les alertes réseau.</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

