#ifndef PARSER_H
#define PARSER_H

#include "collector.h"

int parse_docker_log_line(const char *line, LogEntry *entry);

#endif // PARSER_H

