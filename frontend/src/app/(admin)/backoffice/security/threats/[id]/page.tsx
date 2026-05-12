'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import { formatLocalDateTime } from '@/lib/utils/date';
import { ArrowLeft, AlertTriangle, Shield, Ban, Clock, MapPin, Server, Activity } from 'lucide-react';
import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

function normalizeFirewallListedIp(ip: string) {
  const s = String(ip || '').trim();
  if (s.startsWith('::ffff:')) return s.slice(7);
  return s;
}

interface NetworkThreat {
  id: string;
  threatType: string;
  sourceIp: string;
  destIp?: string;
  destPort?: number;
  severity: string;
  detectedAt: string;
  blocked: boolean;
  status?: string;
  source?: string;
  metadata?: any;
  investigation?: {
    attacker?: Record<string, any>;
    target?: Record<string, any>;
    application?: {
      logs?: {
        total?: number;
        blockedEvents?: number;
        maxRiskScore?: number;
        endpoints?: string[];
        methods?: string[];
        impactedUsers?: string[];
        services?: string[];
      };
      recentEvents?: Array<Record<string, any>>;
    };
    network?: {
      totalConnections?: number;
      states?: string[];
      connectionDetails?: Array<Record<string, any>>;
    };
    related?: {
      intrusionAttempts?: Array<Record<string, any>>;
      ddosAttacks?: Array<Record<string, any>>;
    };
    missingTelemetry?: string[];
  };
}

export default function ThreatDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [threat, setThreat] = useState<NetworkThreat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inConsolidatedBlocklist, setInConsolidatedBlocklist] = useState<boolean | null>(null);

  useEffect(() => {
    const loadThreat = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/threats/${params.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data.success) {
          setThreat(response.data.data);
        } else {
          setError('Menace non trouvée');
        }
      } catch (err: any) {
        console.error('Erreur chargement menace:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement de la menace');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadThreat();
    }
  }, [params.id]);

  useEffect(() => {
    if (!threat?.id) return;
    let cancelled = false;
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    (async () => {
      try {
        const res = await axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/blocked-ips`, { headers, timeout: 6000 });
        if (cancelled) return;
        const list = res.data?.success && Array.isArray(res.data?.data) ? res.data.data : [];
        const normSource = normalizeFirewallListedIp(threat.sourceIp || '');
        const match = list.some((item: string | { ip?: string; threatId?: string }) => {
          const row = typeof item === 'string' ? { ip: item } : item;
          if (row?.threatId && String(row.threatId) === String(threat.id)) return true;
          if (row?.ip && normSource && normalizeFirewallListedIp(row.ip) === normSource) return true;
          return false;
        });
        setInConsolidatedBlocklist(match);
      } catch {
        if (!cancelled) setInConsolidatedBlocklist(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threat?.id, threat?.sourceIp]);

  const handleBlock = async () => {
    if (!confirm('Êtes-vous sûr de vouloir bloquer cette menace ?')) return;
    try {
      await axios.post(`${API_GATEWAY_URL}/api/v1/security/firewall/threats/${params.id}/block`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      router.push('/b4ck0ff1ce/security/threats');
    } catch (err: any) {
      console.error('Erreur blocage menace:', err);
      alert('Erreur lors du blocage de la menace');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getThreatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SYN_FLOOD': 'SYN Flood',
      'PORT_SCAN': 'Port Scanning',
      'BRUTE_FORCE': 'Brute Force',
      'DDoS': 'DDoS Attack'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !threat) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <button
            onClick={() => router.push('/b4ck0ff1ce/security/threats')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour aux menaces
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">{error || 'Menace non trouvée'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const metadata = threat.metadata || {};
  const investigation = threat.investigation || {};
  const attacker = investigation.attacker || {};
  const target = investigation.target || {};
  const appLogs = investigation.application?.logs;
  const recentEvents = investigation.application?.recentEvents || [];
  const missingTelemetry = investigation.missingTelemetry || [];
  const networkConnectionDetails =
    Array.isArray(investigation.network?.connectionDetails) && investigation.network.connectionDetails.length > 0
      ? investigation.network.connectionDetails
      : Array.isArray(metadata.connectionDetails)
        ? metadata.connectionDetails
        : [];
  const destFromConnections =
    networkConnectionDetails[0]?.localIp
      ? String(networkConnectionDetails[0].localIp)
      : null;
  const destDisplay = threat.destIp || destFromConnections;
  const metadataKeys = Object.keys(metadata || {});
  const isMetadataPoor = metadataKeys.length === 0 || (metadataKeys.length === 1 && metadata.test === true);
  const possibleImpacts: Record<string, string[]> = {
    SYN_FLOOD: ['Déni de service partiel', 'Saturation table de connexions', 'Latence accrue'],
    PORT_SCAN: ['Reconnaissance de surface d’attaque', 'Préparation d’intrusion'],
    BRUTE_FORCE: ['Compromission de comptes', 'Escalade privilèges potentielle'],
    SQL_INJECTION: ['Exfiltration données', 'Altération base', 'Bypass authentification'],
    XSS: ['Vol de session', 'Exécution script côté client', 'Défiguration UI'],
    PATH_TRAVERSAL: ['Accès fichiers sensibles', 'Fuite secrets'],
    DDoS: ['Indisponibilité service', 'Dégradation performance'],
  };
  const hasMinimalMetadata = Object.keys(metadata).length <= 1 && metadata?.test === true
  const recommendation = threat.severity === 'CRITICAL'
    ? 'Blocage immédiat + investigation complète (logs, flux réseau, comptes impactés).'
    : threat.severity === 'HIGH'
    ? 'Blocage recommandé + revue des règles WAF/Firewall associées.'
    : threat.severity === 'MEDIUM'
    ? 'Surveillance renforcée et corrélation avec les événements des 24 dernières heures.'
    : 'Monitoring continu, sans action bloquante immédiate.';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/b4ck0ff1ce/security/threats')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                Détails de la Menace
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {getThreatTypeLabel(threat.threatType)}
              </p>
            </div>
          </div>
          {!threat.blocked && (
            <button
              onClick={handleBlock}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Ban className="h-5 w-5" />
              Bloquer cette menace
            </button>
          )}
        </div>

        {threat.blocked && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-900 dark:text-red-100">
            <p className="font-semibold mb-1">Menace marquée comme bloquée</p>
            <p className="mb-2">
              L&apos;IP source peut figurer dans la liste consolidée (règles, iptables, menaces, logs). Vérifie le
              pare-feu pour l&apos;origine exacte du blocage.
            </p>
            <Link
              href="/b4ck0ff1ce/security/firewall#liste-ips-bloquees"
              className="text-blue-700 dark:text-blue-300 font-medium hover:underline"
            >
              Ouvrir la liste des IPs bloquées
            </Link>
            {inConsolidatedBlocklist === false && (
              <p className="mt-2 text-amber-800 dark:text-amber-200 text-xs">
                Cette IP n&apos;apparaît pas dans la vue consolidée actuelle (délai de fusion ou blocage uniquement
                iptables). Rafraîchis la page Firewall.
              </p>
            )}
          </div>
        )}

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Informations Générales
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type de menace</p>
                <p className="font-semibold text-lg">{getThreatTypeLabel(threat.threatType)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sévérité</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getSeverityColor(threat.severity)}`}>
                  {threat.severity}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
                <p className="font-semibold">
                  {threat.blocked ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <Ban className="h-4 w-4" />
                      Bloqué
                    </span>
                  ) : (
                    <span className="text-yellow-600">Non bloqué</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Source d&apos;alerte</p>
                <p className="font-semibold">{threat.source || metadata.source || 'network-monitor'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status technique</p>
                <p className="font-semibold">{threat.status || metadata.status || 'OPEN'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Détecté le</p>
                <p className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatLocalDateTime(threat.detectedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Adresses IP
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">IP Source</p>
                <p className="font-mono text-lg font-semibold">{threat.sourceIp}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">IP Destination</p>
                <p className="font-mono text-lg font-semibold">{destDisplay || '—'}</p>
                {!threat.destIp && destFromConnections && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Non stockée en colonne <span className="font-mono">destIp</span> : valeur dérivée de la première
                    connexion monitorée (<span className="font-mono">localIp</span>).
                  </p>
                )}
              </div>
              {threat.destPort && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Port Destination</p>
                  <p className="font-semibold text-lg">{threat.destPort}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Identifiant menace</p>
                <p className="font-mono text-sm break-all text-gray-800 dark:text-gray-200">{threat.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Détails de la menace */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Détails de l&apos;Attaque
          </h2>
          <div className="space-y-4">
            {isMetadataPoor && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-4 bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-1">Contexte d’attaque insuffisant</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Cette menace contient très peu d’informations techniques. Active les logs détaillés sécurité/réseau pour enrichir: ports, payload, endpoint, corrélation service.
                </p>
              </div>
            )}
            {metadata.message && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Message</p>
                <p className="font-semibold">{metadata.message}</p>
              </div>
            )}
            {metadata.count && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre de tentatives</p>
                <p className="font-semibold text-lg">{metadata.count}</p>
              </div>
            )}
            {metadata.ports && metadata.ports.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ports ciblés</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.ports.map((port: number, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded text-sm font-mono">
                      {port}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {metadata.protocols && metadata.protocols.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Protocoles utilisés</p>
                <div className="flex flex-wrap gap-2">
                  {metadata.protocols.map((proto: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded text-sm">
                      {proto}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {metadata.totalConnections && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Connexions totales</p>
                <p className="font-semibold text-lg">{metadata.totalConnections}</p>
              </div>
            )}
            {metadata.containerInfo && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conteneur affecté</p>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <p className="font-semibold">{metadata.containerInfo.containerName}</p>
                </div>
              </div>
            )}
            {hasMinimalMetadata && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900 p-4 bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-1">Métadonnées insuffisantes</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Cette menace contient très peu d&apos;informations exploitables. Activez des règles réseau plus détaillées
                  (ports, protocole, payload signatures, container source) pour un diagnostic complet.
                </p>
              </div>
            )}
            <div className="rounded-lg border border-blue-200 dark:border-blue-900 p-4 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold mb-1">Recommandation opérationnelle</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{recommendation}</p>
            </div>
            <div className="rounded-lg border border-purple-200 dark:border-purple-900 p-4 bg-purple-50 dark:bg-purple-900/20">
              <p className="text-sm text-purple-800 dark:text-purple-200 font-semibold mb-2">Impacts potentiels de ce type de menace</p>
              <ul className="list-disc list-inside text-sm text-purple-700 dark:text-purple-300 space-y-1">
                {(possibleImpacts[threat.threatType] || ['Impact à évaluer selon contexte applicatif']).map((impact) => (
                  <li key={impact}>{impact}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Investigation enrichie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Attaquant / Réseau</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">IP source</p>
                <p className="font-mono font-semibold">{attacker.ip || threat.sourceIp}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Localisation</p>
                <p className="font-semibold">
                  {[attacker.city, attacker.region, attacker.country].filter(Boolean).join(', ') || 'Non disponible'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Nature IP</p>
                <p className="font-semibold">{attacker.isPrivateIp ? 'Privée / réseau interne' : 'Publique ou inconnue'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">VPN: {attacker.vpn === null ? 'N/A' : attacker.vpn ? 'oui' : 'non'}</span>
                <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">Proxy: {attacker.proxy === null ? 'N/A' : attacker.proxy ? 'oui' : 'non'}</span>
                <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">Tor: {attacker.tor === null ? 'N/A' : attacker.tor ? 'oui' : 'non'}</span>
                <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">ASN: {attacker.asn || 'N/A'}</span>
              </div>
              {attacker.organization && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Organisation réseau</p>
                  <p className="font-semibold">{attacker.organization}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Cible / Flux</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Destination</p>
                <p className="font-mono font-semibold">{target.ip || destDisplay || '—'}:{target.port || threat.destPort || '*'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Services impactés</p>
                <p className="font-semibold">{(target.impactedServices || []).join(', ') || 'Non corrélé'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Ports / protocoles</p>
                <p>{(target.ports || metadata.ports || []).join(', ') || '—'} · {(target.protocols || metadata.protocols || []).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Connexions réseau</p>
                <p className="font-semibold">{investigation.network?.totalConnections ?? metadata.totalConnections ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Contexte applicatif</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Logs corrélés 24h</p>
                <p className="font-semibold">{appLogs?.total ?? 0} logs · {appLogs?.blockedEvents ?? 0} blocage(s)</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Risque max</p>
                <p className="font-semibold">{appLogs?.maxRiskScore ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Endpoints touchés</p>
                <p className="break-words">{(appLogs?.endpoints || []).join(', ') || 'Non corrélé'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Comptes impactés</p>
                <p>{(appLogs?.impactedUsers || []).join(', ') || 'Aucun compte corrélé'}</p>
              </div>
            </div>
          </div>
        </div>

        {missingTelemetry.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900 p-4 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-2">Télémétrie encore manquante</p>
            <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {missingTelemetry.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {recentEvents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Logs applicatifs corrélés</h2>
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div key={event.id} className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{event.eventType}</span>
                    <span className="text-gray-500">{event.level}</span>
                    <span className="text-gray-500">{formatLocalDateTime(event.timestamp)}</span>
                    {event.isBlocked && <span className="text-red-600">bloqué</span>}
                  </div>
                  <p className="mt-1 text-gray-700 dark:text-gray-300">{event.message}</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {event.method || '—'} {event.endpoint || 'endpoint inconnu'} · HTTP {event.statusCode ?? 'N/A'} · {event.responseTime ?? 'N/A'} ms
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connexions détaillées */}
        {networkConnectionDetails.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Connexions Détectées</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">IP Locale</th>
                    <th className="text-left p-3">Port Local</th>
                    <th className="text-left p-3">Port Distant</th>
                    <th className="text-left p-3">Protocole</th>
                    <th className="text-left p-3">État</th>
                    <th className="text-left p-3">Service / conteneur</th>
                  </tr>
                </thead>
                <tbody>
                  {networkConnectionDetails.map((conn: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 font-mono text-sm">{conn.localIp}</td>
                      <td className="p-3">{conn.localPort}</td>
                      <td className="p-3">{conn.remotePort}</td>
                      <td className="p-3">{conn.protocol}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {conn.state}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{conn.containerName || conn.serviceName || 'Non corrélé'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Métadonnées brutes (pour debug) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Métadonnées Complètes</h2>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      </div>
    </AdminLayout>
  );
}

