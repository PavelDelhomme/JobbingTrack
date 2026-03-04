export interface SystemMetrics {
  cpu: {
    usage: number | string
    usage_percent?: number | string
    cores: number | string
    model: string
    containers_only?: number | string
    per_core?: number | string
    loadScore?: number | string
  }
  memory: {
    total: number | string
    used: number | string
    free: number | string
    usage: number | string
    usage_percent?: number | string
    usage_mb?: number | string
    limit_mb?: number | string
  }
  load: {
    average: number | string
    cores: number[] | number | string
  }
  disk: Array<{
    mount: string
    total: number | string
    used: number | string
    usage: number | string
  }>
  network?: {
    total_rx_mb?: number | string
    total_tx_mb?: number | string
    per_service?: Array<{ name: string; rx_mb: number | string; tx_mb: number | string }>
  }
  availability?: {
    project?: number | string
    system?: number | string
    healthy?: number
    degraded?: number
    offline?: number
  }
  errors?: {
    total_last_5m?: number | string
    rate_per_min?: number | string
    per_service?: Array<{ name: string; count_last_5m: number | string; rate_per_min: number | string }>
  }
  overallLoadScore?: number | string
  jobbingtrack?: any
  containers?: any
}
