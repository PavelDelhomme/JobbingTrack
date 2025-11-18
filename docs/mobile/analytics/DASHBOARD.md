# 📊 Dashboard Analytics Mobile - Frontend

[← Retour Analytics](README.md) | [📋 STATUS](../../../STATUS.md)

---

## 📑 Table des Matières

- [Vue d'Ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Composants](#-composants)
- [Implémentation](#-implémentation)
- [Visualisations](#-visualisations)

---

## 🎯 Vue d'Ensemble

Le dashboard analytics permet de visualiser et analyser les données d'utilisation de l'application mobile Flutter.

**URL** : `/backoffice/mobile-analytics`

### Fonctionnalités

- 📊 Vue d'ensemble avec métriques clés
- 🐛 Monitoring des crashes
- ⚡ Analyse des performances
- 📱 Événements utilisateurs
- 📈 Graphiques de tendances
- 💾 Export des données

---

## 🏗️ Architecture

```
frontend/src/app/(admin)/backoffice/mobile-analytics/
├── page.tsx                          # Page principale
├── components/
│   ├── OverviewSection.tsx           # Vue d'ensemble
│   ├── CrashMonitoring.tsx           # Monitoring crashes
│   ├── PerformanceAnalytics.tsx      # Analytics performance
│   ├── EventsAnalytics.tsx           # Analytics événements
│   ├── SessionsAnalytics.tsx         # Analytics sessions
│   └── ExportData.tsx                # Export données
└── hooks/
    └── useMobileAnalytics.ts         # Hook API
```

---

## 🎨 Composants

### 1. Page Principale

**Fichier** : `frontend/src/app/(admin)/backoffice/mobile-analytics/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import OverviewSection from './components/OverviewSection';
import CrashMonitoring from './components/CrashMonitoring';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import EventsAnalytics from './components/EventsAnalytics';
import SessionsAnalytics from './components/SessionsAnalytics';
import ExportData from './components/ExportData';

export default function MobileAnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
    end: new Date(),
  });

  const [platform, setPlatform] = useState<'all' | 'ios' | 'android'>('all');

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">📊 Analytics Mobile</h1>
          <p className="text-gray-600">
            Analyse des données d&apos;utilisation de l&apos;application mobile
          </p>
        </div>
        
        {/* Filtres */}
        <div className="flex gap-4">
          {/* Sélecteur de plateforme */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as any)}
            className="px-4 py-2 border rounded"
          >
            <option value="all">Toutes les plateformes</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </select>
          
          {/* Sélecteur de période */}
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="crashes">Crashes</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewSection dateRange={dateRange} platform={platform} />
        </TabsContent>

        <TabsContent value="crashes">
          <CrashMonitoring dateRange={dateRange} platform={platform} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceAnalytics dateRange={dateRange} platform={platform} />
        </TabsContent>

        <TabsContent value="events">
          <EventsAnalytics dateRange={dateRange} platform={platform} />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsAnalytics dateRange={dateRange} platform={platform} />
        </TabsContent>

        <TabsContent value="export">
          <ExportData dateRange={dateRange} platform={platform} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 2. Vue d'Ensemble

**Fichier** : `frontend/src/app/(admin)/backoffice/mobile-analytics/components/OverviewSection.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMobileAnalytics } from '../hooks/useMobileAnalytics';
import { TrendingUp, TrendingDown, Users, Activity, AlertTriangle, Zap } from 'lucide-react';

interface OverviewSectionProps {
  dateRange: { start: Date; end: Date };
  platform: 'all' | 'ios' | 'android';
}

export default function OverviewSection({ dateRange, platform }: OverviewSectionProps) {
  const { summary, loading, fetchSummary } = useMobileAnalytics();

  useEffect(() => {
    fetchSummary(dateRange, platform);
  }, [dateRange, platform]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  const metrics = [
    {
      title: 'Utilisateurs Actifs',
      value: summary.totalUsers,
      change: summary.usersTrend,
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Sessions',
      value: summary.totalSessions,
      change: summary.sessionsTrend,
      icon: Activity,
      color: 'green',
    },
    {
      title: 'Taux de Crashes',
      value: `${(summary.crashRate * 100).toFixed(2)}%`,
      change: summary.crashRateTrend,
      icon: AlertTriangle,
      color: summary.crashRate > 0.05 ? 'red' : 'orange',
      inverse: true, // Baisse = bon
    },
    {
      title: 'Temps de Chargement Moy.',
      value: `${summary.avgLoadTime}ms`,
      change: summary.loadTimeTrend,
      icon: Zap,
      color: 'purple',
      inverse: true, // Baisse = bon
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 text-${metric.color}-500`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change !== undefined && (
                <div className="flex items-center mt-1 text-sm">
                  {(metric.inverse ? metric.change < 0 : metric.change > 0) ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={
                      (metric.inverse ? metric.change < 0 : metric.change > 0)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1">vs période précédente</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions Quotidiennes</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionsChart data={summary.sessionsTimeline} />
          </CardContent>
        </Card>

        {/* Graphique Crashes */}
        <Card>
          <CardHeader>
            <CardTitle>Crashes par Jour</CardTitle>
          </CardHeader>
          <CardContent>
            <CrashesChart data={summary.crashesTimeline} />
          </CardContent>
        </Card>
      </div>

      {/* Top Écrans */}
      <Card>
        <CardHeader>
          <CardTitle>Écrans les Plus Visités</CardTitle>
        </CardHeader>
        <CardContent>
          <TopScreensTable screens={summary.topScreens} />
        </CardContent>
      </Card>

      {/* Répartition Plateformes */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Plateforme</CardTitle>
        </CardHeader>
        <CardContent>
          <PlatformDistributionChart
            ios={summary.platformDistribution.ios}
            android={summary.platformDistribution.android}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Monitoring Crashes

**Fichier** : `frontend/src/app/(admin)/backoffice/mobile-analytics/components/CrashMonitoring.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMobileAnalytics } from '../hooks/useMobileAnalytics';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CrashMonitoringProps {
  dateRange: { start: Date; end: Date };
  platform: 'all' | 'ios' | 'android';
}

export default function CrashMonitoring({ dateRange, platform }: CrashMonitoringProps) {
  const { crashes, loading, fetchCrashes, resolveCrash } = useMobileAnalytics();
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('unresolved');

  useEffect(() => {
    fetchCrashes(dateRange, platform, filter);
  }, [dateRange, platform, filter]);

  const handleResolve = async (crashId: string, notes: string) => {
    await resolveCrash(crashId, notes);
    fetchCrashes(dateRange, platform, filter);
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Tous
        </Button>
        <Button
          variant={filter === 'unresolved' ? 'default' : 'outline'}
          onClick={() => setFilter('unresolved')}
        >
          Non résolus
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
        >
          Résolus
        </Button>
      </div>

      {/* Liste des crashes */}
      <div className="space-y-4">
        {crashes.map((crash) => (
          <Card key={crash.id} className="border-l-4 border-l-red-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg">{crash.message}</CardTitle>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={crash.resolved ? 'success' : 'destructive'}>
                      {crash.resolved ? 'Résolu' : 'Non résolu'}
                    </Badge>
                    <Badge variant="outline">{crash.platform}</Badge>
                    <Badge variant="outline">v{crash.appVersion}</Badge>
                    <Badge variant="secondary">
                      {crash.occurrences} occurrence{crash.occurrences > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                
                {!crash.resolved && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const notes = prompt('Notes de résolution :');
                      if (notes !== null) {
                        handleResolve(crash.id, notes);
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Marquer résolu
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Type :</strong> {crash.crashType}
                </div>
                <div>
                  <strong>Première occurrence :</strong>{' '}
                  {new Date(crash.timestamp).toLocaleString('fr-FR')}
                </div>
                <div>
                  <strong>Dernière occurrence :</strong>{' '}
                  {new Date(crash.lastSeen).toLocaleString('fr-FR')}
                </div>
                <div>
                  <strong>Appareil :</strong> {crash.deviceModel} - {crash.osVersion}
                </div>
                
                {/* Stack trace */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold">
                    Voir Stack Trace
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded overflow-x-auto text-xs">
                    {crash.stackTrace}
                  </pre>
                </details>
                
                {/* Notes de résolution */}
                {crash.resolved && crash.notes && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                    <strong className="text-green-700">Notes de résolution :</strong>
                    <p className="mt-1 text-green-600">{crash.notes}</p>
                    <p className="mt-2 text-xs text-green-500">
                      Résolu le {new Date(crash.resolvedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {crashes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-xl font-semibold">Aucun crash trouvé</p>
            <p className="text-gray-500 mt-2">
              {filter === 'unresolved'
                ? 'Tous les crashes ont été résolus !'
                : 'Aucun crash enregistré pour cette période.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 4. Hook API

**Fichier** : `frontend/src/app/(admin)/backoffice/mobile-analytics/hooks/useMobileAnalytics.ts`

```typescript
import { useState } from 'react';

interface DateRange {
  start: Date;
  end: Date;
}

export function useMobileAnalytics() {
  const [summary, setSummary] = useState<any>(null);
  const [crashes, setCrashes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (
    dateRange: DateRange,
    platform: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        platform,
      });

      const response = await fetch(
        `/api/v1/mobile/analytics/summary?${params}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrashes = async (
    dateRange: DateRange,
    platform: string,
    resolved?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        platform,
        ...(resolved && resolved !== 'all' && { 
          resolved: resolved === 'resolved' ? 'true' : 'false' 
        }),
      });

      const response = await fetch(
        `/api/v1/mobile/crashes?${params}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch crashes');
      
      const data = await response.json();
      setCrashes(data.crashes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const resolveCrash = async (crashId: string, notes: string) => {
    try {
      const response = await fetch(`/api/v1/mobile/crashes/${crashId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) throw new Error('Failed to resolve crash');
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const exportData = async (
    dateRange: DateRange,
    platform: string,
    format: 'json' | 'csv'
  ) => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        platform,
        format,
      });

      const response = await fetch(
        `/api/v1/mobile/analytics/export?${params}`
      );
      
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mobile-analytics-${Date.now()}.${format}`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return {
    summary,
    crashes,
    loading,
    error,
    fetchSummary,
    fetchCrashes,
    resolveCrash,
    exportData,
  };
}
```

---

## 📊 Visualisations

### Bibliothèques Recommandées

```bash
npm install recharts date-fns
```

### Exemple de Graphique

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function SessionsChart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="sessions" stroke="#8884d8" />
    </LineChart>
  );
}
```

---

[← Retour Analytics](README.md) | [📋 STATUS](../../../STATUS.md)

