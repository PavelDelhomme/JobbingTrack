export interface ServiceMetrics {
  name: string
  url: string
  port: number
  status: string
  responseTime?: number | string
  version?: string
  error?: string
  health?: {
    status: string
    responseTime: number | string
    version?: string
    error?: string
  }
  lastCheck: string
  metrics?: {
    memory?: {
      usage: number | string
      limit: number | string
      percentage: number | string
    }
    cpu?: {
      usage: number | string
      system: number | string
      percentage: number | string
    }
    network?: {
      rx_bytes: number | string
      tx_bytes: number | string
    }
  }
}
