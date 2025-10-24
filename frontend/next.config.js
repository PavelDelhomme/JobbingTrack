/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // ✅ Désactiver le mode strict React pour éviter les erreurs d'hydratation avec les extensions navigateur
    reactStrictMode: false,
    experimental: {
        serverComponentsExternalPackages: ['socket.io-client'],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        NEXT_PUBLIC_AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001',
        NEXT_PUBLIC_METRICS_URL: process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:3014',
        NEXT_PUBLIC_DISABLE_METRICS_WEBSOCKET: process.env.NEXT_PUBLIC_DISABLE_METRICS_WEBSOCKET || 'false',
    },
    // ✅ Désactiver les messages de développement React DevTools
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn']
        } : false,
    },
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                // ✅ Utiliser le nom du conteneur Docker exact
                destination: 'http://jobbingtrack-api-gateway:3000/api/v1/:path*',
            },
            {
                source: '/api/health',
                destination: 'http://localhost:3000/health',
            },
        ];
    },
    webpack: (config, { isServer }) => {
        // Désactiver le cache webpack pour éviter les erreurs de cache corrompu
        config.cache = false;

        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300,
        };

        if (isServer) {
            config.externals = config.externals || [];
            // Si config.externals est une fonction
            if (typeof config.externals === 'function') {
                const originalExternals = config.externals;
                config.externals = async (context, request, callback) => {
                    if (request === 'socket.io-client') {
                        return callback(null, 'commonjs ' + request);
                    }
                    return originalExternals(context, request, callback);
                };
            }
            // Si config.externals est un tableau
            else if (Array.isArray(config.externals)) {
                config.externals.push('socket.io-client');
            }
            // Si config.externals est un objet
            else {
                config.externals['socket.io-client'] = 'socket.io-client';
            }
        }
        
        // Configuration fallback existante
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
        };
        
        return config;
    },
    
    // Configuration pour éviter les erreurs de fichiers manquants
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;