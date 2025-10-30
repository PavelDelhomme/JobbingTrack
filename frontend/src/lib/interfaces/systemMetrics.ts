export interface SystemMetrics {
  cpu: {
    usage: number | string
    cores: number | string
    model: string
  }
  memory: {
    total: number | string
    used: number | string
    free: number | string
    usage: number | string
  }
  load: {
    average: number | string
    cores: number[] | string
  }
  disk: Array<{
    mount: string
    total: number | string
    used: number | string
    usage: number | string
  }>
}
