const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Contrôleur pour la gestion du mode maintenance des services
 */
class MaintenanceController {

  /**
   * Récupérer l'état de maintenance de tous les services
   */
  static async getAllMaintenanceStatus(req, res) {
    try {
      const maintenances = await prisma.serviceMaintenance.findMany({
        include: {
          activator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      res.json({
        success: true,
        maintenances: maintenances.map(m => ({
          id: m.id,
          serviceName: m.serviceName,
          isActive: m.isActive,
          message: m.message,
          scheduledStart: m.scheduledStart,
          scheduledEnd: m.scheduledEnd,
          activatedBy: m.activatedBy ? {
            id: m.activatedBy,
            name: `${m.activator.firstName} ${m.activator.lastName}`,
            email: m.activator.email
          } : null,
          activatedAt: m.activatedAt,
          deactivatedAt: m.deactivatedAt,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        }))
      })
    } catch (error) {
      console.error('Erreur récupération maintenances:', error)
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des maintenances'
      })
    }
  }

  /**
   * Récupérer l'état de maintenance d'un service spécifique
   */
  static async getMaintenanceStatus(req, res) {
    try {
      const { serviceName } = req.params

      const maintenance = await prisma.serviceMaintenance.findUnique({
        where: { serviceName },
        include: {
          activator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      if (!maintenance) {
        return res.json({
          success: true,
          maintenance: {
            serviceName,
            isActive: false,
            message: null
          }
        })
      }

      res.json({
        success: true,
        maintenance: {
          id: maintenance.id,
          serviceName: maintenance.serviceName,
          isActive: maintenance.isActive,
          message: maintenance.message,
          scheduledStart: maintenance.scheduledStart,
          scheduledEnd: maintenance.scheduledEnd,
          activatedBy: maintenance.activatedBy ? {
            id: maintenance.activatedBy,
            name: `${maintenance.activator.firstName} ${maintenance.activator.lastName}`,
            email: maintenance.activator.email
          } : null,
          activatedAt: maintenance.activatedAt,
          deactivatedAt: maintenance.deactivatedAt,
          createdAt: maintenance.createdAt,
          updatedAt: maintenance.updatedAt
        }
      })
    } catch (error) {
      console.error('Erreur récupération maintenance:', error)
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération de la maintenance'
      })
    }
  }

  /**
   * Activer le mode maintenance pour un service
   */
  static async activateMaintenance(req, res) {
    try {
      const { serviceName } = req.params
      const { message, scheduledStart, scheduledEnd } = req.body

      // Vérifier si une maintenance existe déjà pour ce service
      const existingMaintenance = await prisma.serviceMaintenance.findUnique({
        where: { serviceName }
      })

      let maintenance

      if (existingMaintenance) {
        // Mettre à jour la maintenance existante
        maintenance = await prisma.serviceMaintenance.update({
          where: { serviceName },
          data: {
            isActive: true,
            message: message || null,
            scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
            scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
            activatedBy: req.user?.id || null,
            activatedAt: new Date(),
            deactivatedAt: null
          },
          include: {
            activator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })
      } else {
        // Créer une nouvelle maintenance
        maintenance = await prisma.serviceMaintenance.create({
          data: {
            serviceName,
            isActive: true,
            message: message || null,
            scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
            scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
            activatedBy: req.user?.id || null
          },
          include: {
            activator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })
      }

      res.json({
        success: true,
        message: `Mode maintenance activé pour le service ${serviceName}`,
        maintenance: {
          id: maintenance.id,
          serviceName: maintenance.serviceName,
          isActive: maintenance.isActive,
          message: maintenance.message,
          scheduledStart: maintenance.scheduledStart,
          scheduledEnd: maintenance.scheduledEnd,
          activatedBy: maintenance.activatedBy ? {
            id: maintenance.activatedBy,
            name: `${maintenance.activator.firstName} ${maintenance.activator.lastName}`,
            email: maintenance.activator.email
          } : null,
          activatedAt: maintenance.activatedAt,
          deactivatedAt: maintenance.deactivatedAt,
          createdAt: maintenance.createdAt,
          updatedAt: maintenance.updatedAt
        }
      })
    } catch (error) {
      console.error('Erreur activation maintenance:', error)
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'activation de la maintenance'
      })
    }
  }

  /**
   * Désactiver le mode maintenance pour un service
   */
  static async deactivateMaintenance(req, res) {
    try {
      const { serviceName } = req.params

      const maintenance = await prisma.serviceMaintenance.update({
        where: { serviceName },
        data: {
          isActive: false,
          deactivatedAt: new Date()
        },
        include: {
          activator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      res.json({
        success: true,
        message: `Mode maintenance désactivé pour le service ${serviceName}`,
        maintenance: {
          id: maintenance.id,
          serviceName: maintenance.serviceName,
          isActive: maintenance.isActive,
          message: maintenance.message,
          scheduledStart: maintenance.scheduledStart,
          scheduledEnd: maintenance.scheduledEnd,
          activatedBy: maintenance.activatedBy ? {
            id: maintenance.activatedBy,
            name: `${maintenance.activator.firstName} ${maintenance.activator.lastName}`,
            email: maintenance.activator.email
          } : null,
          activatedAt: maintenance.activatedAt,
          deactivatedAt: maintenance.deactivatedAt,
          createdAt: maintenance.createdAt,
          updatedAt: maintenance.updatedAt
        }
      })
    } catch (error) {
      console.error('Erreur désactivation maintenance:', error)
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la désactivation de la maintenance'
      })
    }
  }

  /**
   * Mettre à jour le message de maintenance pour un service
   */
  static async updateMaintenanceMessage(req, res) {
    try {
      const { serviceName } = req.params
      const { message } = req.body

      const maintenance = await prisma.serviceMaintenance.update({
        where: { serviceName },
        data: {
          message: message || null
        },
        include: {
          activator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      res.json({
        success: true,
        message: `Message de maintenance mis à jour pour le service ${serviceName}`,
        maintenance: {
          id: maintenance.id,
          serviceName: maintenance.serviceName,
          isActive: maintenance.isActive,
          message: maintenance.message,
          scheduledStart: maintenance.scheduledStart,
          scheduledEnd: maintenance.scheduledEnd,
          activatedBy: maintenance.activatedBy ? {
            id: maintenance.activatedBy,
            name: `${maintenance.activator.firstName} ${maintenance.activator.lastName}`,
            email: maintenance.activator.email
          } : null,
          activatedAt: maintenance.activatedAt,
          deactivatedAt: maintenance.deactivatedAt,
          createdAt: maintenance.createdAt,
          updatedAt: maintenance.updatedAt
        }
      })
    } catch (error) {
      console.error('Erreur mise à jour message maintenance:', error)
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du message de maintenance'
      })
    }
  }

  /**
   * Middleware pour vérifier si un service est en maintenance
   */
  static checkMaintenance(serviceName) {
    return async (req, res, next) => {
      try {
        const maintenance = await prisma.serviceMaintenance.findUnique({
          where: { serviceName }
        })

        if (maintenance && maintenance.isActive) {
          // Vérifier si la maintenance est programmée et si elle est dans la période active
          const now = new Date()

          if (maintenance.scheduledStart && maintenance.scheduledStart > now) {
            // Maintenance programmée mais pas encore active
            return next()
          }

          if (maintenance.scheduledEnd && maintenance.scheduledEnd < now) {
            // Maintenance programmée terminée
            await prisma.serviceMaintenance.update({
              where: { serviceName },
              data: {
                isActive: false,
                deactivatedAt: now
              }
            })
            return next()
          }

          // Service en maintenance
          return res.status(503).json({
            success: false,
            error: 'Service temporairement indisponible',
            maintenance: true,
            message: maintenance.message || 'Ce service est actuellement en maintenance. Veuillez réessayer plus tard.',
            scheduledEnd: maintenance.scheduledEnd
          })
        }

        next()
      } catch (error) {
        console.error('Erreur vérification maintenance:', error)
        // En cas d'erreur, laisser passer la requête
        next()
      }
    }
  }

  /**
   * Récupérer la liste des services disponibles pour la maintenance
   */
  static async getAvailableServices(req, res) {
    try {
      const services = [
        'api-gateway',
        'auth-service',
        'application-service',
        'company-service',
        'contact-service',
        'interview-service',
        'notification-service',
        'dashboard-service',
        'call-service',
        'event-service',
        'followup-service',
        'profile-service',
        'workflow-service',
        'deployment-service',
        'system-metrics-service',
        'security-service'
      ]

      res.json({
        success: true,
        services: services.map(serviceName => ({
          name: serviceName,
          displayName: serviceName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Service ${serviceName.replace('-', ' ')}`
        }))
      })
    } catch (error) {
      console.error('Erreur récupération services disponibles:', error)
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des services disponibles'
      })
    }
  }
}

module.exports = MaintenanceController
