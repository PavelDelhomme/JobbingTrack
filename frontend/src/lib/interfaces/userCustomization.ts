export interface UserCustomization {
  theme: string
  language: string
  dashboardLayout: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  features: {
    analytics: boolean
    maintenance: boolean
    security: boolean
  }
  metrics: {
    refreshInterval: number
    defaultView: string
    showContainers: boolean
    showServices: boolean
  }
}
