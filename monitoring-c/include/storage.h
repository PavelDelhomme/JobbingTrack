#ifndef STORAGE_H
#define STORAGE_H

#include "collector.h"

// Version simplifiée (sans PostgreSQL pour l'instant)
int init_storage(void);
int save_metrics_to_db(const MetricsData *metrics);
void cleanup_storage(void);

// Récupérer l'historique des métriques système
// Retourne un JSON string alloué dynamiquement (à libérer par l'appelant)
char* get_system_metrics_history(int limit, int offset, const char *start_date, const char *end_date);

#endif // STORAGE_H
