#ifndef STORAGE_H
#define STORAGE_H

#include "collector.h"

// Connexion DB
int db_connect(const char *conn_string);
int save_metrics_to_db(const MetricsData *metrics);
void db_disconnect(void);

#endif // STORAGE_H

