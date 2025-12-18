#ifndef STORAGE_H
#define STORAGE_H

#include "collector.h"

// Version simplifiée (sans PostgreSQL pour l'instant)
int init_storage(void);
int save_log_to_db(const LogEntry *entry);
void cleanup_storage(void);

// Aliases pour compatibilité
#define db_connect(x) init_storage()
#define store_log_entry(x) save_log_to_db(x)
#define db_disconnect() cleanup_storage()

#endif // STORAGE_H

