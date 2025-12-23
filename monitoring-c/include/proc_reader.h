#ifndef PROC_READER_H
#define PROC_READER_H

// Fonctions de lecture depuis /proc (simplifiées)
int read_proc_loadavg(double *load1, double *load5, double *load15);
int read_proc_meminfo(unsigned long *total, unsigned long *free);
// ✅ NOUVEAU : Lire /proc/stat pour obtenir le CPU usage réel
int read_proc_stat_cpu(double *cpu_percent);

#endif // PROC_READER_H

