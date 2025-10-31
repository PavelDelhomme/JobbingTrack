import { ServiceMetrics } from './serviceMetrics'
import { SystemMetrics } from './systemMetrics'
import { ContainerMetrics } from './containerMetrics'

export interface NetworkMetricsOverview {
  total_rx_mb?: number | string
  total_tx_mb?: number | string
  per_service?: Array<{
    name: string
    rx_mb: number | string
    tx_mb: number | string
  }>
}

export interface ResponseTimeOverview {
  average_ms?: number | string | null
  fastest_ms?: number | string | null
  slowest_ms?: number | string | null
  per_service?: Array<{
    name: string
    status?: string
    response_time_ms?: number | string | null
  }>
}

export interface ErrorMetricsOverview {
  total_last_5m?: number | string
  rate_per_min?: number | string
  per_service?: Array<{
    name: string
    count_last_5m: number | string
    rate_per_min: number | string
  }>
}

export interface HealthOverview {
  availability_percent?: number | string
  system_availability_percent?: number | string
  healthy?: number
  degraded?: number
  offline?: number
  containers_running?: number
  containers_total?: number
}

export interface MetricsData {
  services: { [key: string]: ServiceMetrics }
  servicesList?: ServiceMetrics[]
  system: SystemMetrics
  containers: ContainerMetrics
  timestamp: string
  network?: NetworkMetricsOverview
  responseTime?: ResponseTimeOverview
  errors?: ErrorMetricsOverview
  health?: HealthOverview
  overallLoadScore?: number
  history?: Array<Record<string, any>>
}
