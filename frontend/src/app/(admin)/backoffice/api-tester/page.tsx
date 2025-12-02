'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Play, Terminal, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/lib/hooks/auth';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:5002';

export default function APITesterPage() {
  const { token } = useAuth();
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState(`${API_GATEWAY_URL}/api/v1/`);
  const [headers, setHeaders] = useState('{\n  "Authorization": "Bearer YOUR_TOKEN",\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('{\n  \n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ✅ Remplir automatiquement le token dans les headers au chargement
  useEffect(() => {
    if (token) {
      try {
        const parsedHeaders = JSON.parse(headers);
        // Remplacer seulement si c'est le token par défaut ou s'il n'y a pas de token
        if (parsedHeaders['Authorization'] === 'Bearer YOUR_TOKEN' || 
            !parsedHeaders['Authorization'] || 
            parsedHeaders['Authorization'].includes('YOUR_TOKEN')) {
          parsedHeaders['Authorization'] = `Bearer ${token}`;
          setHeaders(JSON.stringify(parsedHeaders, null, 2));
        }
      } catch (e) {
        // Si les headers ne sont pas un JSON valide, les remplacer
        setHeaders(JSON.stringify({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }, null, 2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Seulement quand le token change (pas headers pour éviter la boucle)

  const handleTest = async () => {
    try {
      setLoading(true);
      setResponse(null);
      
      const parsedHeaders = headers ? JSON.parse(headers) : {};
      
      const config: any = {
        method,
        url: endpoint,
        headers: parsedHeaders,
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        config.data = JSON.parse(body);
      }
      
      const result = await axios(config);
      setResponse({
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data,
      });
    } catch (error: any) {
      setResponse({
        error: true,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickEndpoints = [
    { label: 'Utilisateurs', value: `${API_GATEWAY_URL}/api/v1/users` },
    { label: 'Applications', value: `${API_GATEWAY_URL}/api/v1/applications` },
    { label: 'Entreprises', value: `${API_GATEWAY_URL}/api/v1/companies` },
    { label: 'Entretiens', value: `${API_GATEWAY_URL}/api/v1/interviews` },
    { label: 'Appels', value: `${API_GATEWAY_URL}/api/v1/calls` },
    { label: 'Relances', value: `${API_GATEWAY_URL}/api/v1/followups` },
    { label: 'Statistiques', value: `${API_GATEWAY_URL}/api/v1/statistics` },
    { label: 'Métriques', value: `${API_GATEWAY_URL}/api/v1/metrics` },
    { label: 'Services', value: `${API_GATEWAY_URL}/api/v1/services` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Terminal className="h-8 w-8" />
            Testeur d'API
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Testez vos endpoints API directement depuis le backoffice
          </p>
        </div>

        {/* Quick Endpoints */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endpoints rapides :</p>
          <div className="flex flex-wrap gap-2">
            {quickEndpoints.map((ep) => (
              <button
                key={ep.value}
                onClick={() => setEndpoint(ep.value)}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                {ep.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            {/* Method + Endpoint */}
            <div className="flex gap-4">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
              
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={`${API_GATEWAY_URL}/api/v1/...`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                {loading ? 'Test...' : 'Tester'}
              </button>
            </div>

            {/* Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Headers (JSON)
              </label>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-24 font-mono text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* Body */}
            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Body (JSON)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-32 font-mono text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}
          </div>
        </div>

        {response && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold">Réponse</h3>
                {response.status && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    response.status >= 200 && response.status < 300 
                      ? 'bg-green-600 text-white'
                      : response.status >= 400 && response.status < 500
                      ? 'bg-orange-600 text-white'
                      : response.status >= 500
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {response.status} {response.statusText}
                  </span>
                )}
              </div>
              <button
                onClick={copyResponse}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-auto text-sm">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

