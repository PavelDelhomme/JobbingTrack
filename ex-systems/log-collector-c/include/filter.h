#ifndef FILTER_H
#define FILTER_H

#include "collector.h"

int init_filters(void);
int should_process_log(const LogEntry *entry);
void cleanup_filters(void);

#endif // FILTER_H

