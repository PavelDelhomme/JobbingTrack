#ifndef PROC_READER_H
#define PROC_READER_H

// Chemin vers /proc (env PROCFS_PATH pour Docker: /host/proc)
const char* get_procfs_path(void);

// Fonctions de lecture depuis /proc (ou PROCFS_PATH)
int read_proc_loadavg(double *load1, double *load5, double *load15);
int read_proc_meminfo(unsigned long *total, unsigned long *free);
int read_proc_stat_cpu(double *cpu_percent);

#endif // PROC_READER_H

