import { ServiceMetrics } from './serviceMetrics'
import { SystemMetrics } from './systemMetrics'
import { ContainerMetrics } from './containerMetrics'

export interface MetricsData {
  services: { [key: string]: ServiceMetrics }
  system: SystemMetrics
  containers: ContainerMetrics
  timestamp: string
}
