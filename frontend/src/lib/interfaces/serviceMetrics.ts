export interface ServiceMetrics {
  id?: string
  rawName?: string
  displayName?: string
  serviceType?: string
  name: string
  url: string
  port: number
  status: string
  responseTime?: number | string
  responseTimeMs?: number | null
  version?: string
  error?: string
  health?: {
    status: string
    responseTime: number | string
    version?: string
    error?: string
  }
  healthStatus?: string
  healthError?: string
  lastCheck: string
  pids?: number | string | null
  errorRatePerMin?: number
  errorCount5m?: number
  metrics?: {
    memory?: {
      usage: number | string
      limit: number | string
      percentage: number | string
      usageMb?: number | string
      limitMb?: number | string
    }
    cpu?: {
      usage: number | string
      system: number | string
      percentage: number | string
      perCore?: number | string
    }
    network?: {
      rx_bytes: number | string
      tx_bytes: number | string
      rx_mb?: number | string
      tx_mb?: number | string
    }
  }
  networkMb?: {
    rx?: number | null
    tx?: number | null
  }
}
