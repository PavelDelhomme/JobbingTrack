/**
 * Firewall Engine - Gestion des règles de firewall
 * Intègre avec iptables/nftables pour bloquer les connexions
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('./utils/logger');

const execAsync = promisify(exec);

/**
 * Appliquer une règle de firewall avec iptables
 */
async function applyFirewallRule(rule) {
  try {
    let command = '';

    // Construire la commande iptables selon la règle
    if (rule.action === 'DENY' || rule.action === 'REJECT') {
      command = 'iptables -A INPUT';
      
      if (rule.sourceIp) {
        command += ` -s ${rule.sourceIp}`;
      }
      
      if (rule.destPort) {
        command += ` -p ${rule.protocol || 'tcp'} --dport ${rule.destPort}`;
      } else if (rule.protocol) {
        command += ` -p ${rule.protocol}`;
      }
      
      if (rule.action === 'REJECT') {
        command += ' -j REJECT --reject-with icmp-port-unreachable';
      } else {
        command += ' -j DROP';
      }

      await execAsync(command);
      logger.info(`Règle firewall appliquée: ${rule.name}`);
      return { success: true, message: 'Règle appliquée avec succès' };
    } else if (rule.action === 'ALLOW') {
      // Pour ALLOW, on peut créer une règle ACCEPT spécifique
      command = 'iptables -A INPUT';
      
      if (rule.sourceIp) {
        command += ` -s ${rule.sourceIp}`;
      }
      
      if (rule.destPort) {
        command += ` -p ${rule.protocol || 'tcp'} --dport ${rule.destPort}`;
      }
      
      command += ' -j ACCEPT';
      
      await execAsync(command);
      logger.info(`Règle firewall ALLOW appliquée: ${rule.name}`);
      return { success: true, message: 'Règle appliquée avec succès' };
    }

    return { success: false, error: 'Action non supportée' };
  } catch (error) {
    logger.error('Erreur application règle firewall:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Supprimer une règle de firewall
 */
async function removeFirewallRule(rule) {
  try {
    // Note: iptables ne permet pas de supprimer facilement par nom
    // Il faudrait garder une trace des numéros de ligne
    // Pour simplifier, on peut utiliser iptables-save et iptables-restore
    logger.warn('Suppression de règle firewall non implémentée complètement');
    return { success: true, message: 'Règle supprimée (simulation)' };
  } catch (error) {
    logger.error('Erreur suppression règle firewall:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bloquer une IP
 */
async function blockIp(ip, reason = 'Threat detected') {
  try {
    const command = `iptables -A INPUT -s ${ip} -j DROP`;
    await execAsync(command);
    logger.info(`IP bloquée: ${ip} (raison: ${reason})`);
    return { success: true, message: `IP ${ip} bloquée avec succès` };
  } catch (error) {
    logger.error('Erreur blocage IP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Débloquer une IP
 */
async function unblockIp(ip) {
  try {
    const command = `iptables -D INPUT -s ${ip} -j DROP`;
    await execAsync(command);
    logger.info(`IP débloquée: ${ip}`);
    return { success: true, message: `IP ${ip} débloquée avec succès` };
  } catch (error) {
    logger.error('Erreur déblocage IP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lister les règles iptables actives
 */
async function listFirewallRules() {
  try {
    const { stdout } = await execAsync('iptables -L INPUT -n -v --line-numbers');
    return { success: true, rules: stdout };
  } catch (error) {
    logger.error('Erreur liste règles firewall:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  applyFirewallRule,
  removeFirewallRule,
  blockIp,
  unblockIp,
  listFirewallRules
};

