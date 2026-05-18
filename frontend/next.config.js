/** @type {import('next').NextConfig} */
const path = require('path')
const fs = require('fs')

/**
 * Lit la version réelle de `next` dans node_modules (conteneur Docker : volume anonyme
 * peut figer une ancienne release → clés top-level `serverExternalPackages` / `turbopack`
 * « unrecognized » si le binaire est < 15).
 */
function readInstalledNextVersion () {
  try {
    const pkgPath = path.join(__dirname, 'node_modules', 'next', 'package.json')
    const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '0.0.0'
    const [major = 0, minor = 0] = raw.split('.').map((x) => parseInt(String(x).replace(/\D/g, ''), 10) || 0)
    return { major, minor, raw }
  } catch {
    return { major: 16, minor: 2, raw: '16.2.0' }
  }
}

const nv = readInstalledNextVersion()
const useTopLevelServerExternal = nv.major >= 15
const useTopLevelTurbopack = nv.major > 15 || (nv.major === 15 && nv.minor >= 3)

const experimental = {
  // ✅ Compression et optimisation des assets
  optimizePackageImports: ['@radix-ui/react-icons'],
  optimizeCss: true
}

if (!useTopLevelServerExternal && nv.major >= 13) {
  experimental.serverComponentsExternalPackages = ['socket.io-client']
}
if (!useTopLevelTurbopack && nv.major >= 13) {
  experimental.turbo = {
    root: __dirname,
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js'
      }
    }
  }
}

const nextConfig = {
  // Évite les conflits quand `.next` a été créé par root (exécution Docker)
  // et contourne les bundles potentiellement corrompus.
  distDir: process.env.NEXT_DIST_DIR || '.next-local',
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2
  },
  experimental,
  ...(useTopLevelServerExternal ? { serverExternalPackages: ['socket.io-client'] } : {}),
  ...(useTopLevelTurbopack
    ? {
        turbopack: {
          root: __dirname,
          rules: {
            '*.svg': {
              loaders: ['@svgr/webpack'],
              as: '*.js'
            }
          }
        }
      }
    : {}),
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    unoptimized: true
  },
  env: {
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
    NEXT_PUBLIC_API_GATEWAY_URL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || `https://api.jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `https://api.jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
    NEXT_PUBLIC_AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || `https://api.jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
    NEXT_PUBLIC_METRICS_URL: process.env.NEXT_PUBLIC_METRICS_URL || '/api/metrics-aggregator',
    NEXT_PUBLIC_METRICS_AGGREGATOR_URL: process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL || '/api/metrics-aggregator',
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || `https://jobbingtrack.localhost:${process.env.DEV_HTTPS_PORT || '5443'}`,
    NEXT_PUBLIC_DEV_HTTPS_PORT: process.env.DEV_HTTPS_PORT || '5443',
    NEXT_PUBLIC_DISABLE_METRICS_WEBSOCKET: process.env.NEXT_PUBLIC_DISABLE_METRICS_WEBSOCKET || 'false'
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? {
          exclude: ['error', 'warn']
        }
      : false
  },
  async rewrites () {
    return [
      {
        source: '/api/v1/:path*',
        destination: `http://api-gateway:${process.env.API_GATEWAY_INTERNAL_PORT || '3000'}/api/v1/:path*`
      },
      {
        source: '/api/health',
        destination: 'http://api-gateway:3000/health'
      }
    ]
  },
  webpack: (config, { dev, isServer, webpack }) => {
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all'
            },
            default: {
              minChunks: 2,
              chunks: 'all',
              name: 'commons'
            }
          }
        },
        minimize: true,
        minimizer: [
          new webpack.optimize.ModuleConcatenationPlugin(),
          ...(config.optimization.minimizer || [])
        ]
      }

      config.devtool = false

      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }

    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false
        })
      )
    }

    config.cache = false

    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300
    }

    if (isServer) {
      config.externals = config.externals || []
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = async (context, request, callback) => {
          if (request === 'socket.io-client') {
            return callback(null, 'commonjs ' + request)
          }
          return originalExternals(context, request, callback)
        }
      } else if (Array.isArray(config.externals)) {
        config.externals.push('socket.io-client')
      } else {
        config.externals['socket.io-client'] = 'socket.io-client'
      }
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    }

    return config
  }
}

module.exports = nextConfig
