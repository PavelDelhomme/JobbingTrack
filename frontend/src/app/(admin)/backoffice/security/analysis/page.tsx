'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Shield, AlertTriangle, Lock, Eye, TrendingUp, Activity } from '@/lib/icons';
import { analyticsService } from '@/lib/api/analytics.service';

export default function SecurityAnalysisPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ OPTIMISATION : useCallback pour éviter les re-créations de fonction
  const loadSecuritySummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getSecuritySummary(24);
      setSummary(data);
    } catch (error) {
      console.error('Erreur chargement analyse:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecuritySummary();
  }, [loadSecuritySummary]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // ✅ OPTIMISATION : useMemo pour calculer le score et la couleur
  const { securityScore, scoreColor } = useMemo(() => {
    const score = summary?.avgSecurityScore || 85;
    const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
    return { securityScore: score, scoreColor: color };
  }, [summary?.avgSecurityScore]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Analyse de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Évaluation complète de la sécurité de votre application
          </p>
        </div>

        {/* Score principal */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg opacity-90">Score de Sécurité Global</p>
              <p className="text-6xl font-bold mt-2">{securityScore}<span className="text-3xl">/100</span></p>
              <p className="mt-2 opacity-90">
                {securityScore >= 80 ? '✓ Excellent niveau de sécurité' :
                 securityScore >= 60 ? '⚠ Niveau de sécurité acceptable' :
                 '✗ Nécessite une attention immédiate'}
              </p>
            </div>
            <Shield className="h-32 w-32 opacity-20" />
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tentatives Échouées</p>
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.totalFailedLogins || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dernières 24h</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Activités Suspectes</p>
              <Eye className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {summary?.totalSuspiciousActivities || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Détectées</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">IPs Bloquées</p>
              <AlertTriangle className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {summary?.uniqueBlockedIPs || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Actives</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tentatives d'Injection</p>
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {(summary?.totalSqlInjections || 0) + (summary?.totalXssAttempts || 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SQL + XSS</p>
          </div>
        </div>

        {/* Détections d'injection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Tentatives d'Injection Détectées
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">SQL Injection</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                {summary?.totalSqlInjections || 0}
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">XSS</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                {summary?.totalXssAttempts || 0}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Autres</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {summary?.totalOtherInjections || 0}
              </p>
            </div>
          </div>
        </div>

        {/* IPs bloquées */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6 text-red-600" />
            IPs Bloquées Actuellement
          </h2>
          <div className="space-y-2">
            {summary?.blockedIPs?.length > 0 ? (
              summary.blockedIPs.map((ip: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-mono text-gray-900 dark:text-gray-100">{ip}</span>
                  <span className="text-xs text-red-600 dark:text-red-400">Bloquée</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune IP bloquée actuellement
              </p>
            )}
          </div>
        </div>

        {/* Recommandations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4">Recommandations de Sécurité</h2>
          <div className="space-y-3">
            {securityScore >= 80 ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Sécurité Robuste</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Votre application maintient un excellent niveau de sécurité</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 text-xl">ℹ</span>
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Surveillance Continue</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Continuez à surveiller régulièrement les logs de sécurité</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-orange-600 dark:text-orange-400 text-xl">⚠</span>
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Augmenter la Surveillance</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Activez l'authentification à deux facteurs pour tous les utilisateurs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-xl">✗</span>
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Action Requise</p>
                    <p className="text-sm text-red-700 dark:text-red-300">Vérifiez et bloquez les IPs suspectes identifiées</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

