'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Server, ExternalLink, ArrowLeft } from 'lucide-react';

interface ServiceInfo {
  name: string;
  container: string;
  status: 'running' | 'stopped';
  cpu: number;
  memory: {
    usage: number;
    limit: number;
    percent: number;
  };
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    try {
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      const res = await fetch(`${metricsUrl}/api/v1/services`);
      
      if (res.ok) {
        const data = await res.json();
        const servicesData = data.containers?.map((container: any) => ({
          name: container.name.replace('jobbingtrack-', ''),
          container: container.name,
          status: 'running',
          cpu: container.cpu || 0,
          memory: container.memory || { usage: 0, limit: 0, percent: 0 }
        })) || [];
        setServices(servicesData);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Button 
                onClick={() => router.push('/backoffice')} 
                variant="ghost" 
                size="sm"
                className="mb-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au Dashboard
              </Button>
              <h1 className="text-3xl font-bold">Services</h1>
              <p className="text-gray-500">Monitoring de tous les services backend</p>
            </div>
            <Button 
              onClick={fetchServices}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Card 
                key={service.name}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/backoffice/services/${service.name}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {service.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600">
                      <Activity className="h-3 w-3 mr-1" />
                      Running
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">CPU</span>
                      <span className="text-sm font-bold">{service.cpu.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Memory</span>
                      <span className="text-sm font-bold">
                        {service.memory.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatBytes(service.memory.usage)} / {formatBytes(service.memory.limit)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && services.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Server className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Aucun service détecté</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
