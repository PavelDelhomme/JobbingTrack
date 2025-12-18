#ifndef PROC_READER_H
#define PROC_READER_H

// Fonctions de lecture depuis /proc (simplifiées)
int read_proc_loadavg(double *load1, double *load5, double *load15);
int read_proc_meminfo(unsigned long *total, unsigned long *free);

#endif // PROC_READER_H

