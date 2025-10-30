export interface ContainerMetrics {
  [containerName: string]: {
    memory: {
      usage: number | string
      limit: number | string
      percentage: number | string
    }
    cpu: {
      usage: number | string
      system: number | string
      percentage: number | string
    }
    network: {
      rx_bytes: number | string
      tx_bytes: number | string
    }
    status: string
  }
}
