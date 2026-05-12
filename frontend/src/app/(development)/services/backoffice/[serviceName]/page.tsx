'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatLocalDateTime } from '@/lib/utils/date';
import { RefreshCw, Activity, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface ServiceLog {
  timestamp: string;
  level: string;
  message: string;
  service: string;
}

interface ServiceMetrics {
  name: string;
  status: 'running' | 'stopped' | 'error';
  cpu: number;
  memory: {
    usage: number;
    limit: number;
    percent: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceName = params.serviceName as string;
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerFullName = (() => {
    const s = String(serviceName || '').trim();
    if (!s) return '';
    return s.startsWith('jobbingtrack-') ? s : `jobbingtrack-${s}`;
  })();

  const mapDockerLinesToLogs = (lines: string[]): ServiceLog[] => {
    const short = serviceName.replace(/^jobbingtrack-/, '');
    return lines.map((line) => {
      const m = line.match(/^(\d{4}-\d{2}-\d{2}T[\d.:+Z-]+)\s+(.*)$/);
      if (m) {
        const message = m[2];
        let level = 'info';
        if (/error|fatal|exception|econnrefused/i.test(message)) level = 'error';
        else if (/warn/i.test(message)) level = 'warn';
        else if (/debug/i.test(message)) level = 'debug';
        return { timestamp: m[1], level, message, service: short };
      }
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: line,
        service: short,
      };
    });
  };

  const fetchServiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!containerFullName || containerFullName === 'jobbingtrack-') {
        setError('Nom de service invalide.');
        setLogs([]);
        setMetrics(null);
        return;
      }

      const metricsUrl =
        process.env.NEXT_PUBLIC_METRICS_URL ||
        process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL ||
        'http://localhost:5004';

      // Métriques conteneur (nom complet jobbingtrack-…)
      const metricsRes = await fetch(
        `${metricsUrl}/api/v1/container/${encodeURIComponent(containerFullName)}`
      );

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.container);
      }

      // Logs Docker (même source que /b4ck0ff1ce/services/logs — route docker du metrics-aggregator)
      const logsRes = await fetch(
        `${metricsUrl}/api/v1/docker/service/${encodeURIComponent(containerFullName)}/logs?lines=120`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        const raw = Array.isArray(logsData.lines) ? logsData.lines : [];
        setLogs(mapDockerLinesToLogs(raw));
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.error('Error fetching service data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceData();
    const interval = setInterval(fetchServiceData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [serviceName]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading && !metrics) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                onClick={() => router.push('/b4ck0ff1ce')}
                variant="ghost"
                size="sm"
                className="mb-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au Dashboard
              </Button>
              <h1 className="text-3xl font-bold capitalize">{serviceName}</h1>
              <p className="text-gray-500">Service Details & Logs</p>
            </div>
            <Button onClick={fetchServiceData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">Running</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.cpu?.toFixed(2) || 0}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.memory?.percent?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(metrics.memory?.usage || 0)} / {formatBytes(metrics.memory?.limit || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-auto max-h-[600px]">
            {logs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No logs available
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1 flex gap-3 text-xs">
                  <span className="text-gray-500 shrink-0">
                    {formatLocalDateTime(log.timestamp)}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`${getLevelColor(log.level)} shrink-0`}
                  >
                    {log.level}
                  </Badge>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
