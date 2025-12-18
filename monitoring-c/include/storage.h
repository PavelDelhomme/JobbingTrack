#ifndef STORAGE_H
#define STORAGE_H

#include "collector.h"

// Version simplifiée (sans PostgreSQL pour l'instant)
int init_storage(void);
int save_metrics_to_db(const MetricsData *metrics);
void cleanup_storage(void);

#endif // STORAGE_H
