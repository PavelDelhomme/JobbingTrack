export interface ContainerMetricEntry {
  name?: string
  memory: {
    usage: number | string
    limit: number | string
    percentage: number | string
    usageMb?: number | string
    limitMb?: number | string
  }
  cpu: {
    usage: number | string
    system: number | string
    percentage: number | string
    perCore?: number | string
  }
  network: {
    rx_bytes: number | string
    tx_bytes: number | string
    rx_mb?: number | string
    tx_mb?: number | string
  }
  status: string
  response_time_ms?: number | null
  error_count_5m?: number | string
  error_rate_per_min?: number | string
  pids?: number | string | null
}

export type ContainerMetrics = Record<string, ContainerMetricEntry> | ContainerMetricEntry[]
