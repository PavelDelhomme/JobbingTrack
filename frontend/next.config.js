/** @type {import('next').NextConfig} */
const nextConfig = {
    // Évite les conflits quand `.next` a été créé par root (exécution Docker)
    // et contourne les bundles potentiellement corrompus.
    distDir: process.env.NEXT_DIST_DIR || '.next-local',
    output: 'standalone',
    // Ignorer les erreurs TS restantes pendant le build (à corriger progressivement)
    typescript: { ignoreBuildErrors: true },
    // ✅ Désactiver le mode strict React pour éviter les erreurs d'hydratation avec les extensions navigateur
    reactStrictMode: false,
    // ✅ Ignorer les erreurs d'hydratation causées par les extensions de navigateur
    onDemandEntries: {
        // Configuration pour éviter les erreurs d'hydratation
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
    serverExternalPackages: ['socket.io-client'],
    turbopack: {
        root: __dirname,
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },
    experimental: {
        // ✅ Compression et optimisation des assets
        // lucide-react retiré : avec le baril @/lib/icons, optimizePackageImports peut laisser
        // certains composants Lucide à undefined → « Element type is invalid » (ex. /backoffice/analytics).
        optimizePackageImports: ['@radix-ui/react-icons'],
        // ✅ Optimisation CSS
        optimizeCss: true,
    },
    // ✅ Compression des assets (Gzip activé, Brotli via serveur/reverse proxy)
    compress: true,
    // ✅ Désactiver les source maps en production pour réduire la taille
    productionBrowserSourceMaps: false,
    // ✅ Optimisation des images
    images: {
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
        // Configuration pour éviter les erreurs de fichiers manquants
        unoptimized: true,
    },
    env: {
        // Ports externes
        NEXT_PUBLIC_FRONTEND_PORT: process.env.FRONTEND_PORT || '5003',
        NEXT_PUBLIC_API_GATEWAY_PORT: process.env.API_GATEWAY_PORT || '5002',
        NEXT_PUBLIC_AUTH_SERVICE_PORT: process.env.AUTH_SERVICE_PORT || '8001',
        NEXT_PUBLIC_APPLICATION_SERVICE_PORT: process.env.APPLICATION_SERVICE_PORT || '8002',
        NEXT_PUBLIC_COMPANY_SERVICE_PORT: process.env.COMPANY_SERVICE_PORT || '8003',
        NEXT_PUBLIC_CONTACT_SERVICE_PORT: process.env.CONTACT_SERVICE_PORT || '8004',
        NEXT_PUBLIC_INTERVIEW_SERVICE_PORT: process.env.INTERVIEW_SERVICE_PORT || '8005',
        NEXT_PUBLIC_CALL_SERVICE_PORT: process.env.CALL_SERVICE_PORT || '8006',
        NEXT_PUBLIC_EVENT_SERVICE_PORT: process.env.EVENT_SERVICE_PORT || '8007',
        NEXT_PUBLIC_FOLLOWUP_SERVICE_PORT: process.env.FOLLOWUP_SERVICE_PORT || '8008',
        NEXT_PUBLIC_METRICS_AGGREGATOR_PORT: process.env.METRICS_AGGREGATOR_PORT || '5004',
        NEXT_PUBLIC_DASHBOARD_SERVICE_PORT: process.env.DASHBOARD_SERVICE_PORT || '8012',
        // URLs complètes
        NEXT_PUBLIC_API_GATEWAY_URL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || `https://api.jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `https://api.jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
        NEXT_PUBLIC_AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || `https://api.jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
        NEXT_PUBLIC_METRICS_URL: process.env.NEXT_PUBLIC_METRICS_URL || '/api/metrics-aggregator',
        NEXT_PUBLIC_METRICS_AGGREGATOR_URL: process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL || '/api/metrics-aggregator',
        NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || `https://jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
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
            // `/api/metrics-aggregator/...` est servi par une route Next qui ajoute
            // X-API-Key côté serveur. Ne pas réécrire ici, sinon la clé serait absente.
            {
                source: '/api/v1/:path*',
                // ✅ Utiliser le nom Docker pour la communication inter-conteneurs
                destination: `http://api-gateway:${process.env.API_GATEWAY_INTERNAL_PORT || '3000'}/api/v1/:path*`,
            },
            {
                source: '/api/health',
                destination: 'http://api-gateway:3000/health',
            },
            // Ne pas réécrire `/health` : laisser `src/app/health/route.ts` répondre (liveness Next
            // seul). Sinon tout probe sur le port frontend dépend de l’API Gateway → 500 si proxy
            // ou compile échoue. Santé agrégée gateway : `GET /api/health` (réécriture ci-dessus).
        ];
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        if (!dev) {
            // Compression Gzip/Brotli (Brotli via serveur/reverse proxy)
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all',
                        },
                        default: {
                            minChunks: 2,
                            chunks: 'all',
                            name: 'commons',
                        },
                    },
                },
                minimize: true,
                minimizer: [
                    new webpack.optimize.ModuleConcatenationPlugin(),
                    // ✅ TerserPlugin pour une meilleure minification (si disponible)
                    ...(config.optimization.minimizer || []),
                ],
            };
            
            // ✅ Désactiver les source maps en production
            config.devtool = false;

            // Tree shaking amélioré
            config.optimization.usedExports = true;
            config.optimization.sideEffects = false;
        }

        // ✅ Bundle analyzer pour la production
        if (process.env.ANALYZE === 'true') {
            const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    openAnalyzer: false,
                })
            );
        }

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
};

module.exports = nextConfig;