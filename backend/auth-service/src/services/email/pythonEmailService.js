/**
 * Wrapper Node.js pour appeler le service Python d'envoi d'emails
 * Utilise le service Python email_service.py pour l'envoi d'emails
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Chemin vers le script Python
const PYTHON_SCRIPT = path.join(__dirname, 'email_service.py');

// Système de verrouillage pour éviter les envois simultanés
let isSendingEmail = false;
let lastAuthErrorTime = 0;
const AUTH_ERROR_COOLDOWN = 60000; // 60 secondes après une erreur d'authentification

class PythonEmailService {
  /**
   * Exécuter une commande Python et retourner le résultat JSON
   */
  async executePythonCommand(action, ...args) {
    try {
      // Vérifier si on a eu une erreur d'authentification récente
      const timeSinceLastAuthError = Date.now() - lastAuthErrorTime;
      if (timeSinceLastAuthError < AUTH_ERROR_COOLDOWN && action !== 'test_connection') {
        const waitTime = AUTH_ERROR_COOLDOWN - timeSinceLastAuthError;
        logger.warn(`[PythonEmailService] Attente ${Math.ceil(waitTime / 1000)}s après erreur d'authentification récente`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Attendre si un email est en cours d'envoi (verrouillage)
      if (action !== 'test_connection') {
        let waitCount = 0;
        while (isSendingEmail && waitCount < 30) { // Attendre max 30 secondes
          await new Promise(resolve => setTimeout(resolve, 1000));
          waitCount++;
        }
        if (isSendingEmail) {
          return {
            success: false,
            error: 'Un email est déjà en cours d\'envoi. Veuillez réessayer dans quelques instants.',
            message: 'Trop de tentatives simultanées. Attendez quelques secondes avant de réessayer.'
          };
        }
        isSendingEmail = true;
      }
      
      // Délai supplémentaire avant l'exécution pour éviter le rate limiting OVH
      // Sauf pour test_connection qui n'envoie pas d'email
      if (action !== 'test_connection') {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 secondes supplémentaires (augmenté)
      }
      
      const command = `python3 "${PYTHON_SCRIPT}" ${action} ${args.map(arg => `"${String(arg).replace(/"/g, '\\"')}"`).join(' ')}`;
      
      logger.debug(`[PythonEmailService] Exécution: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        env: process.env,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: parseInt(process.env.SMTP_TIMEOUT || '45000'), // 45 secondes timeout par défaut (augmenté pour OVH)
      });
      
      // Afficher stderr pour le debug (contient les messages Python)
      if (stderr) {
        // Filtrer les messages d'info/warning normaux
        const stderrLines = stderr.split('\n').filter(line => 
          line.trim() && 
          !line.includes('INFO') && 
          !line.includes('WARNING') &&
          !line.includes('🔍') &&
          !line.includes('📧') &&
          !line.includes('✅')
        );
        if (stderrLines.length > 0) {
          logger.warn(`[PythonEmailService] stderr: ${stderrLines.join('\n')}`);
        }
      }
      
      // Parser le JSON retourné
      const result = JSON.parse(stdout.trim());
      
      // Vérifier si c'est une erreur d'authentification
      if (!result.success && (
        result.error?.includes('Authentication failed') ||
        result.error?.includes('535') ||
        result.error?.includes('5.7.1')
      )) {
        lastAuthErrorTime = Date.now();
        logger.error(`[PythonEmailService] Erreur d'authentification détectée. Cooldown de ${AUTH_ERROR_COOLDOWN / 1000}s activé.`);
      }
      
      return result;
    } catch (error) {
      logger.error(`[PythonEmailService] Erreur exécution Python: ${error.message}`);
      
      // Afficher stderr si disponible pour debug
      if (error.stderr) {
        logger.error(`[PythonEmailService] stderr: ${error.stderr}`);
        
        // Vérifier si c'est une erreur d'authentification dans stderr
        if (error.stderr.includes('Authentication failed') || 
            error.stderr.includes('535') || 
            error.stderr.includes('5.7.1')) {
          lastAuthErrorTime = Date.now();
          logger.error(`[PythonEmailService] Erreur d'authentification détectée dans stderr. Cooldown de ${AUTH_ERROR_COOLDOWN / 1000}s activé.`);
        }
      }
      
      if (error.stdout) {
        try {
          const result = JSON.parse(error.stdout.trim());
          
          // Vérifier si c'est une erreur d'authentification
          if (!result.success && (
            result.error?.includes('Authentication failed') ||
            result.error?.includes('535') ||
            result.error?.includes('5.7.1')
          )) {
            lastAuthErrorTime = Date.now();
            logger.error(`[PythonEmailService] Erreur d'authentification détectée. Cooldown de ${AUTH_ERROR_COOLDOWN / 1000}s activé.`);
          }
          
          return result;
        } catch (parseError) {
          logger.error(`[PythonEmailService] Erreur parsing JSON: ${parseError.message}`);
          logger.error(`[PythonEmailService] stdout: ${error.stdout}`);
        }
      }
      
      // Si c'est un timeout, message plus clair
      if (error.message && error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Timeout lors de la connexion SMTP',
          message: 'Le serveur SMTP n\'a pas répondu dans les temps. Vérifiez que le serveur SMTP est accessible et que les paramètres (host, port) sont corrects.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de l\'exécution du service Python'
      };
    } finally {
      // Libérer le verrou après un délai supplémentaire
      if (action !== 'test_connection') {
        setTimeout(() => {
          isSendingEmail = false;
        }, 2000); // Libérer après 2 secondes supplémentaires
      }
    }
  }

  /**
   * Tester la connexion SMTP
   */
  async testConnection() {
    logger.info('[PythonEmailService] Test de connexion SMTP...');
    return await this.executePythonCommand('test_connection');
  }

  /**
   * Logger un email en base de données
   */
  async logEmail(emailData) {
    try {
      const { userId, to, from, subject, type, emailContent, metadata } = emailData;
      
      let emailLog = null;
      try {
        // Vérifier si l'utilisateur existe si userId est fourni
        let validUserId = null;
        if (userId && !userId.toString().startsWith('test-') && !userId.toString().startsWith('temp-')) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { id: true }
            });
            if (user) {
              validUserId = userId;
            }
          } catch (userError) {
            logger.debug(`[PythonEmailService] Utilisateur ${userId} non trouvé, userId sera null`);
          }
        }
        
        // Générer un trackingId unique pour le pixel de tracking
        const crypto = require('crypto');
        const trackingId = crypto.randomBytes(16).toString('hex');
        
        const createData = {
          to,
          from: from || process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
          subject,
          type,
          status: 'PENDING',
          emailContent,
          metadata: metadata || {},
          trackingId,
        };
        
        // Ajouter userId seulement si valide
        if (validUserId) {
          createData.user = {
            connect: { id: validUserId }
          };
        }
        
        emailLog = await prisma.emailLog.create({
          data: createData,
        });
        logger.debug(`[PythonEmailService] Email loggé en base: ${emailLog.id}`);
      } catch (dbError) {
        if (dbError.code === 'P2021') {
          logger.warn('Table EmailLog non trouvée, email sera envoyé sans log. Exécutez: make db-push-all');
          emailLog = { id: 'temp-' + Date.now() };
        } else if (dbError.code === 'P2003') {
          // Erreur de clé étrangère - userId invalide
          logger.warn(`[PythonEmailService] userId invalide (${userId}), création sans userId`);
          try {
            emailLog = await prisma.emailLog.create({
              data: {
                userId: null,
                to,
                from: from || process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
                subject,
                type,
                status: 'PENDING',
                emailContent,
                metadata: metadata || {},
              },
            });
            logger.debug(`[PythonEmailService] Email loggé en base (sans userId): ${emailLog.id}`);
          } catch (retryError) {
            logger.error(`[PythonEmailService] Erreur log email (retry): ${retryError.message}`);
            emailLog = { id: 'temp-' + Date.now() };
          }
        } else {
          logger.error(`[PythonEmailService] Erreur log email: ${dbError.message}`);
          emailLog = { id: 'temp-' + Date.now() };
        }
      }
      
      return emailLog;
    } catch (error) {
      logger.error('[PythonEmailService] Erreur lors du log email:', error);
      return { id: 'temp-' + Date.now() };
    }
  }

  /**
   * Mettre à jour le statut d'un email loggé
   */
  async updateEmailLogStatus(emailLogId, status, error = null, sentAt = null) {
    try {
      if (!emailLogId || emailLogId.toString().startsWith('temp-')) {
        return;
      }

      const updateData = {
        status,
        ...(sentAt && { sentAt: new Date(sentAt) }),
        ...(error && { error }),
      };

      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: updateData,
      });
      
      logger.debug(`[PythonEmailService] Statut email mis à jour: ${emailLogId} -> ${status}`);
    } catch (dbError) {
      if (dbError.code !== 'P2021') {
        logger.error(`[PythonEmailService] Erreur mise à jour statut email: ${dbError.message}`);
      }
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(user, resetToken) {
    let emailLog = null;
    try {
      // Délai pour éviter le rate limiting OVH (5 secondes entre les envois pour OVH)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const userEmail = user.email;
      const userName = user.firstName || 'Utilisateur';
      const userId = user.id;
      
      logger.info(`[PythonEmailService] Envoi email reset password à ${userEmail}`);
      
      // Logger l'email avant l'envoi
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
      
      emailLog = await this.logEmail({
        userId,
        to: userEmail,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
        subject: 'Réinitialisation de votre mot de passe - JobbingTrack',
        type: 'RESET_PASSWORD',
        emailContent: `Lien de réinitialisation: ${resetUrl}`,
        metadata: { resetToken, resetUrl, userName }
      });
      
      // Passer le trackingId au service Python
      const trackingId = emailLog.trackingId || '';
      const result = await this.executePythonCommand(
        'send_password_reset',
        userEmail,
        userName,
        resetToken,
        userId,
        trackingId
      );
      
      // Mettre à jour le statut
      if (result.success) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT', null, new Date());
        logger.info(`[PythonEmailService] ✅ Email reset password envoyé à ${userEmail}`);
      } else {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', result.error);
        logger.error(`[PythonEmailService] ❌ Erreur envoi email reset password: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      if (emailLog && emailLog.id) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error.message);
      }
      logger.error(`[PythonEmailService] Erreur sendPasswordResetEmail: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envoyer un email de vérification
   */
  async sendVerificationEmail(user, verificationToken) {
    let emailLog = null;
    try {
      // Délai pour éviter le rate limiting OVH (5 secondes entre les envois pour OVH)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const userEmail = user.email;
      const userName = user.firstName || 'Utilisateur';
      const userId = user.id;
      
      logger.info(`[PythonEmailService] Envoi email vérification à ${userEmail}`);
      
      // Logger l'email avant l'envoi
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
      
      emailLog = await this.logEmail({
        userId,
        to: userEmail,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
        subject: 'Vérifiez votre adresse email - JobbingTrack',
        type: 'VERIFICATION',
        emailContent: `Lien de vérification: ${verificationUrl}`,
        metadata: { verificationToken, verificationUrl, userName }
      });
      
      const result = await this.executePythonCommand(
        'send_verification',
        userEmail,
        userName,
        verificationToken,
        userId
      );
      
      // Mettre à jour le statut
      if (result.success) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT', null, new Date());
        logger.info(`[PythonEmailService] ✅ Email vérification envoyé à ${userEmail}`);
      } else {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', result.error);
        logger.error(`[PythonEmailService] ❌ Erreur envoi email vérification: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      if (emailLog && emailLog.id) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error.message);
      }
      logger.error(`[PythonEmailService] Erreur sendVerificationEmail: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envoyer un email générique
   */
  async sendGenericEmail({ to, subject, htmlContent, textContent, from, replyTo }) {
    try {
      logger.info(`[PythonEmailService] Envoi email générique à ${to}`);
      
      const result = await this.executePythonCommand(
        'send_generic',
        to,
        subject,
        textContent || htmlContent?.replace(/<[^>]*>/g, '') || '',
        htmlContent || ''
      );
      
      if (result.success) {
        logger.info(`[PythonEmailService] ✅ Email générique envoyé à ${to}`);
      } else {
        logger.error(`[PythonEmailService] ❌ Erreur envoi email générique: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`[PythonEmailService] Erreur sendGenericEmail: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Vérifier la connexion (pour compatibilité avec l'ancien service)
   */
  async verifyConnection() {
    const result = await this.testConnection();
    return result.success;
  }
}

module.exports = new PythonEmailService();


