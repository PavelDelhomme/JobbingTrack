#ifndef STORAGE_H
#define STORAGE_H

#include "collector.h"

int db_connect(const char *conn_string);
int store_log_entry(const LogEntry *entry);
void db_disconnect(void);

#endif // STORAGE_H

