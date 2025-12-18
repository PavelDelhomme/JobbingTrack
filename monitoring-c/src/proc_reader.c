/**
 * Lecteur de fichiers /proc
 */

#include "proc_reader.h"
#include <stdio.h>
#include <string.h>

/**
 * Lit /proc/loadavg
 */
int read_proc_loadavg(double *load1, double *load5, double *load15) {
    FILE *fp = fopen("/proc/loadavg", "r");
    if (!fp) return -1;
    
    if (fscanf(fp, "%lf %lf %lf", load1, load5, load15) != 3) {
        fclose(fp);
        return -1;
    }
    
    fclose(fp);
    return 0;
}

/**
 * Lit /proc/meminfo
 */
int read_proc_meminfo(unsigned long *total, unsigned long *free) {
    FILE *fp = fopen("/proc/meminfo", "r");
    if (!fp) return -1;
    
    char line[256];
    *total = 0;
    *free = 0;
    
    while (fgets(line, sizeof(line), fp)) {
        if (strncmp(line, "MemTotal:", 9) == 0) {
            sscanf(line, "MemTotal: %lu", total);
        } else if (strncmp(line, "MemAvailable:", 13) == 0) {
            sscanf(line, "MemAvailable: %lu", free);
            break;
        }
    }
    
    fclose(fp);
    return (*total > 0 && *free > 0) ? 0 : -1;
}

