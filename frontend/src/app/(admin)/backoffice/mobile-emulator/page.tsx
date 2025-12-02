'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { Smartphone, RefreshCw } from 'lucide-react';

export default function MobileEmulatorPage() {
  // Utiliser l'application mobile Flutter au lieu du frontend web
  const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL || 'http://localhost:5019';
  const [url, setUrl] = useState(MOBILE_APP_URL);
  const [deviceType, setDeviceType] = useState('iphone');

  const devices = {
    iphone: { width: 375, height: 812, name: 'iPhone 13 Pro' },
    android: { width: 360, height: 800, name: 'Pixel 5' },
    tablet: { width: 768, height: 1024, name: 'iPad' },
  };

  const currentDevice = devices[deviceType as keyof typeof devices];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Émulateur Mobile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Testez votre application sur différents appareils
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 items-center">
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="iphone">iPhone 13 Pro</option>
              <option value="android">Pixel 5</option>
              <option value="tablet">iPad</option>
            </select>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL à tester"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />

            <button
              onClick={() => {
                const iframe = document.getElementById('mobile-frame') as HTMLIFrameElement;
                if (iframe) iframe.src = url;
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Recharger
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <div
            className="border-8 border-gray-800 rounded-3xl shadow-2xl bg-white overflow-hidden"
            style={{
              width: `${currentDevice.width + 16}px`,
              height: `${currentDevice.height + 16}px`,
            }}
          >
            <iframe
              id="mobile-frame"
              src={url}
              className="w-full h-full"
              title={`Émulateur ${currentDevice.name}`}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

