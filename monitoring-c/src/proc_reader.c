/**
 * Lecteur de fichiers /proc (ou /host/proc en Docker)
 * Utiliser PROCFS_PATH=/host/proc pour lire le /proc de l'hôte.
 */

#include "proc_reader.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PROC_PATH_DEFAULT "/proc"
#define PROC_PATH_MAX 32

static char proc_path_buf[PROC_PATH_MAX] = {0};

const char* get_procfs_path(void) {
    if (proc_path_buf[0] != '\0')
        return proc_path_buf;
    const char *env = getenv("PROCFS_PATH");
    if (env && env[0] != '\0') {
        strncpy(proc_path_buf, env, PROC_PATH_MAX - 1);
        proc_path_buf[PROC_PATH_MAX - 1] = '\0';
        return proc_path_buf;
    }
    strcpy(proc_path_buf, PROC_PATH_DEFAULT);
    return proc_path_buf;
}

/**
 * Lit /proc/loadavg (ou PROCFS_PATH/loadavg)
 */
int read_proc_loadavg(double *load1, double *load5, double *load15) {
    char path[64];
    snprintf(path, sizeof(path), "%s/loadavg", get_procfs_path());
    FILE *fp = fopen(path, "r");
    if (!fp) return -1;
    
    if (fscanf(fp, "%lf %lf %lf", load1, load5, load15) != 3) {
        fclose(fp);
        return -1;
    }
    
    fclose(fp);
    return 0;
}

/**
 * Lit /proc/meminfo (ou PROCFS_PATH/meminfo)
 */
int read_proc_meminfo(unsigned long *total, unsigned long *free) {
    char path[64];
    snprintf(path, sizeof(path), "%s/meminfo", get_procfs_path());
    FILE *fp = fopen(path, "r");
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

/**
 * Lit /proc/stat pour calculer le CPU usage réel (ou PROCFS_PATH/stat)
 * Retourne le pourcentage d'utilisation CPU (0-100)
 */
int read_proc_stat_cpu(double *cpu_percent) {
    static unsigned long long last_idle = 0, last_total = 0;
    char path[64];
    snprintf(path, sizeof(path), "%s/stat", get_procfs_path());
    FILE *fp = fopen(path, "r");
    if (!fp) return -1;
    
    char line[256];
    unsigned long long user = 0, nice = 0, system = 0, idle = 0, iowait = 0, irq = 0, softirq = 0, steal = 0;
    
    if (fgets(line, sizeof(line), fp)) {
        if (sscanf(line, "cpu %llu %llu %llu %llu %llu %llu %llu %llu",
                   &user, &nice, &system, &idle, &iowait, &irq, &softirq, &steal) >= 4) {
            unsigned long long total = user + nice + system + idle + iowait + irq + softirq + steal;
            unsigned long long total_idle = idle + iowait;
            
            if (last_total > 0 && last_idle > 0) {
                unsigned long long total_diff = total - last_total;
                unsigned long long idle_diff = total_idle - last_idle;
                
                if (total_diff > 0) {
                    *cpu_percent = 100.0 * (1.0 - ((double)idle_diff / (double)total_diff));
                } else {
                    *cpu_percent = 0.0;
                }
            } else {
                // Première lecture, pas encore de pourcentage
                *cpu_percent = 0.0;
            }
            
            last_idle = total_idle;
            last_total = total;
        }
    }
    
    fclose(fp);
    return 0;
}

