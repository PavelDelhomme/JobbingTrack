/**
 * Stockage des logs en base de données PostgreSQL
 * Version simplifiée sans dépendance PostgreSQL (pour compilation)
 */

#include "storage.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

// TODO: Implémenter la connexion PostgreSQL quand nécessaire
// Pour l'instant, stockage simplifié (fichier ou stdout)

/**
 * Initialise le stockage
 */
int init_storage(void) {
    // Pour l'instant, juste retourner 0 (succès)
    // TODO: Connexion PostgreSQL
    return 0;
}

/**
 * Sauvegarde un log en base
 */
int save_log_to_db(const LogEntry *entry) {
    // Pour l'instant, juste afficher (ou écrire dans un fichier)
    // TODO: Insérer dans PostgreSQL
    printf("[LOG] %s: %s\n", entry->level, entry->message);
    return 0;
}

/**
 * Nettoie les ressources
 */
void cleanup_storage(void) {
    // TODO: Fermer connexion PostgreSQL
}
