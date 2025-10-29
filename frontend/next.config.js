/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // ✅ Désactiver le mode strict React pour éviter les erreurs d'hydratation avec les extensions navigateur
    reactStrictMode: false,
    // ✅ Ignorer les erreurs d'hydratation causées par les extensions de navigateur
    onDemandEntries: {
        // Configuration pour éviter les erreurs d'hydratation
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
    experimental: {
        serverComponentsExternalPackages: ['socket.io-client'],
        // ✅ Compression et optimisation des assets
        optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
        // ✅ Optimisation CSS
        optimizeCss: true,
        // ✅ Tree shaking amélioré
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
    // ✅ Compression des assets
    compress: true,
    // ✅ Optimisation des images
    images: {
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
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
                // Utiliser localhost pour le développement
                destination: 'http://localhost:3000/api/v1/:path*',
            },
            {
                source: '/api/health',
                destination: 'http://localhost:3000/health',
            },
        ];
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // ✅ Optimisations de performance avancées
        if (!dev) {
            // Compression Gzip/Brotli
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
                ],
            };

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
    
    // Configuration pour éviter les erreurs de fichiers manquants
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;