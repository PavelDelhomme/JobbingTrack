/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        serverComponentsExternalPackages: [],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        NEXT_PUBLIC_AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001',
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
        ];
    },
    webpack: (config) => {
        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300,
        };
        // ✅ Ignorer les erreurs de fichiers manquants pour éviter les erreurs 404
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };
        return config;
    },
    // ✅ Configuration pour éviter les erreurs de fichiers manquants
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;