'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { Play, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function PlaywrightTestsPage() {
  const [tests, setTests] = useState([
    { id: 1, name: 'Test Login', status: 'passed', duration: '2.3s' },
    { id: 2, name: 'Test Navigation', status: 'passed', duration: '1.8s' },
    { id: 3, name: 'Test Forms', status: 'failed', duration: '3.1s' },
  ]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Tests Playwright
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Résultats des tests end-to-end
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Play className="h-5 w-5" />
            Lancer les tests
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{tests.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Réussis</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {tests.filter(t => t.status === 'passed').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Échoués</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {tests.filter(t => t.status === 'failed').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Résultats des Tests</h2>
            <div className="space-y-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {test.status === 'passed' ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    {test.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

