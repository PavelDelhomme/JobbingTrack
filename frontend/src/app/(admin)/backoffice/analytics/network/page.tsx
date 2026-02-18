'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService } from '@/lib/api/analytics.service';

export default function NetworkPerformancePage() {
  const [data, setData] = useState<{ time: string; datetime: string; rxMb: number; txMb: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      const raw = await analyticsService.getSystemMetricsHistory({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 200,
        offset: 0,
      });
      const sorted = (raw || [])
        .filter((d: { timestamp?: string }) => d.timestamp)
        .map((d: Record<string, unknown>) => {
          const ts = typeof d.timestamp === 'string' ? d.timestamp : (d.timestamp as Date)?.toISOString?.() ?? '';
          const rx = d.networkRxBytes != null ? Number(d.networkRxBytes) : d.total_network_rx_bytes != null ? Number(d.total_network_rx_bytes) : 0;
          const tx = d.networkTxBytes != null ? Number(d.networkTxBytes) : d.total_network_tx_bytes != null ? Number(d.total_network_tx_bytes) : 0;
          return { timestamp: ts, rxMb: rx / (1024 * 1024), txMb: tx / (1024 * 1024) };
        })
        .sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setData(
        sorted.map((p: { timestamp: string; rxMb: number; txMb: number }) => {
          const date = new Date(p.timestamp);
          return {
            time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }),
            datetime: date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            rxMb: Math.round(p.rxMb * 100) / 100,
            txMb: Math.round(p.txMb * 100) / 100,
          };
        })
      );
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Performances réseau
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Débit et volume réseau système (RX/TX) dans le temps.
          </p>
        </div>
        <Link href="/backoffice/analytics" className="text-primary-600 hover:underline dark:text-primary-400 text-sm">
          ← Retour à la vue d&apos;ensemble Analytics
        </Link>
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">Chargement…</div>
        ) : data.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune donnée réseau disponible. Vérifiez que le metrics-aggregator enregistre les métriques système.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Réception (RX) et émission (TX) — Mo</h2>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v} Mo`} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.datetime ?? ''} formatter={(v: number, name: string) => [`${Number(v).toFixed(2)} Mo`, name === 'rxMb' ? 'RX (Mo)' : 'TX (Mo)']} />
                <Legend />
                <Line type="monotone" dataKey="rxMb" stroke="#8B5CF6" strokeWidth={2} name="RX (Mo)" dot={false} />
                <Line type="monotone" dataKey="txMb" stroke="#F59E0B" strokeWidth={2} name="TX (Mo)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
