/**
 * Système de collecte de métriques en C
 * Collecteur principal ultra-léger pour remplacer Node.js
 *
 * Réduction des logs : [DEBUG] et [CPU] désactivés par défaut (MONITORING_DEBUG=0).
 * Voir monitoring-c/src/http_server.c pour réactiver.
 */
#ifndef MONITORING_DEBUG
#define MONITORING_DEBUG 0
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/statvfs.h>
#include <sys/sysinfo.h>
#include <sys/stat.h>
#include <stdbool.h>
#include <strings.h>
#include <ctype.h>
#include <dirent.h>
#include <curl/curl.h>
#include "collector.h"
#include "docker.h"
#include "proc_reader.h"
#include "storage.h"
#include "http_server.h"

#define COLLECTION_INTERVAL 15  // secondes
#define MAX_CONTAINERS 100

/** Préfixe datetime ISO pour les logs (ex: 2026-02-20T16:30:00Z) */
static const char* log_ts(void) {
    static char buf[32];
    time_t t = time(NULL);
    struct tm *tm = gmtime(&t);
    if (tm)
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", tm);
    else
        snprintf(buf, sizeof(buf), "%ld", (long)t);
    return buf;
}

// Structure globale pour les métriques (exportée pour http_server.c)
MetricsData global_metrics = {0};
// ✅ NOUVEAU : Métriques précédentes pour calculer les variations
static MetricsData previous_metrics = {0};
static bool has_previous_metrics = false;

static size_t discard_curl_body(void *ptr, size_t size, size_t nmemb, void *userdata) {
    (void)ptr;
    (void)userdata;
    return size * nmemb;
}

static int build_known_health_url(const char *container_name, char *url, size_t url_size) {
    struct HealthTarget {
        const char *needle;
        int port;
        const char *path;
    };
    static const struct HealthTarget targets[] = {
        {"api-gateway", 3000, "/api/v1/health"},
        {"auth-service", 3001, "/api/v1/auth/health"},
        {"application-service", 3002, "/api/v1/applications/health"},
        {"company-service", 3003, "/api/v1/companies/health"},
        {"contact-service", 3004, "/api/v1/contacts/health"},
        {"interview-service", 3005, "/api/v1/interviews/health"},
        {"call-service", 3008, "/api/v1/calls/health"},
        {"event-service", 3011, "/api/v1/events/health"},
        {"followup-service", 3012, "/api/v1/followups/health"},
        {"profile-service", 3009, "/health"},
        {"notification-service", 3008, "/health"},
        {"dashboard-service", 3000, "/health"},
        {"workflow-service", 3013, "/health"},
        {"security-service", 3017, "/health"},
        {"deployment-service", 3016, "/health"},
        {"metrics-aggregator", 3014, "/api/v1/health"},
        {"monitoring-c", 8015, "/health"},
        {"log-collector-c", 3019, "/health"},
        {"frontend", 3000, "/health"},
    };

    for (size_t i = 0; i < sizeof(targets) / sizeof(targets[0]); i++) {
        if (strstr(container_name, targets[i].needle) != NULL) {
            snprintf(url, url_size, "http://%s:%d%s", container_name, targets[i].port, targets[i].path);
            return 1;
        }
    }

    snprintf(url, url_size, "http://%s/health", container_name);
    return 1;
}

static bool is_jobbingtrack_container_name(const char *name) {
    return name && strstr(name, "jobbingtrack-") != NULL;
}

typedef struct {
    char id[65];
    unsigned long long usage_usec;
    long long time_ms;
} ContainerCpuSample;

static ContainerCpuSample previous_container_cpu[MAX_CONTAINERS];

static long long monotonic_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ((long long)ts.tv_sec * 1000LL) + (ts.tv_nsec / 1000000LL);
}

static const char *get_sysfs_path(void) {
    const char *env = getenv("SYSFS_PATH");
    if (env && env[0] != '\0') return env;
    if (access("/host/sys/fs/cgroup", R_OK) == 0) return "/host/sys";
    return "/sys";
}

static int read_ull_file(const char *path, unsigned long long *value) {
    FILE *fp = fopen(path, "r");
    if (!fp) return -1;
    int ok = fscanf(fp, "%llu", value) == 1 ? 0 : -1;
    fclose(fp);
    return ok;
}

static int read_cgroup_usage_usec(const char *cgroup_dir, unsigned long long *usage_usec) {
    char path[1024];
    snprintf(path, sizeof(path), "%s/cpu.stat", cgroup_dir);
    FILE *fp = fopen(path, "r");
    if (!fp) return -1;

    char key[64];
    unsigned long long value = 0;
    int found = -1;
    while (fscanf(fp, "%63s %llu", key, &value) == 2) {
        if (strcmp(key, "usage_usec") == 0) {
            *usage_usec = value;
            found = 0;
            break;
        }
    }
    fclose(fp);
    return found;
}

static void copy_container_id(char *dest, size_t dest_size, const char *src) {
    if (dest_size == 0) return;
    size_t i = 0;
    for (; i + 1 < dest_size && src[i] != '\0'; i++) {
        dest[i] = src[i];
    }
    dest[i] = '\0';
}

static int resolve_cgroup_dir(const char *container_id, char *dir, size_t dir_size) {
    const char *sysfs = get_sysfs_path();
    const char *patterns[] = {
        "%s/fs/cgroup/system.slice/docker-%s.scope",
        "%s/fs/cgroup/docker/%s",
        "%s/fs/cgroup/docker-%s.scope",
        "%s/fs/cgroup/system.slice/containerd.service/docker-%s.scope",
    };

    for (size_t i = 0; i < sizeof(patterns) / sizeof(patterns[0]); i++) {
        snprintf(dir, dir_size, patterns[i], sysfs, container_id);
        struct stat st;
        if (stat(dir, &st) == 0 && S_ISDIR(st.st_mode)) return 0;
    }
    return -1;
}

static double compute_container_cpu_percent(const char *container_id, unsigned long long usage_usec) {
    long long now_ms = monotonic_ms();
    int slot = -1;
    for (int i = 0; i < MAX_CONTAINERS; i++) {
        if (previous_container_cpu[i].id[0] == '\0' || strcmp(previous_container_cpu[i].id, container_id) == 0) {
            slot = i;
            break;
        }
    }
    if (slot < 0) return 0.0;

    double percent = 0.0;
    if (previous_container_cpu[slot].id[0] != '\0' && previous_container_cpu[slot].time_ms > 0) {
        unsigned long long usage_delta = usage_usec >= previous_container_cpu[slot].usage_usec
            ? usage_usec - previous_container_cpu[slot].usage_usec
            : 0;
        long long elapsed_ms = now_ms - previous_container_cpu[slot].time_ms;
        if (elapsed_ms > 0) {
            percent = ((double)usage_delta / 1000.0) / (double)elapsed_ms * 100.0;
        }
    }

    copy_container_id(previous_container_cpu[slot].id, sizeof(previous_container_cpu[slot].id), container_id);
    previous_container_cpu[slot].usage_usec = usage_usec;
    previous_container_cpu[slot].time_ms = now_ms;
    return percent;
}

static void build_container_pid_map(const ContainerInfo *containers, int container_count, int *pids) {
    for (int i = 0; i < container_count; i++) {
        pids[i] = -1;
    }

    const char *procfs = get_procfs_path();
    DIR *dir = opendir(procfs);
    if (!dir) return;

    struct dirent *entry;
    while ((entry = readdir(dir)) != NULL) {
        if (!isdigit((unsigned char)entry->d_name[0])) continue;

        char cgroup_path[512];
        snprintf(cgroup_path, sizeof(cgroup_path), "%s/%s/cgroup", procfs, entry->d_name);
        FILE *fp = fopen(cgroup_path, "r");
        if (!fp) continue;

        char line[512];
        while (fgets(line, sizeof(line), fp)) {
            for (int i = 0; i < container_count; i++) {
                if (pids[i] > 0) continue;
                if (strstr(line, containers[i].id) != NULL) {
                    pids[i] = atoi(entry->d_name);
                }
            }

            bool all_found = true;
            for (int i = 0; i < container_count; i++) {
                if (is_jobbingtrack_container_name(containers[i].name) && pids[i] <= 0) {
                    all_found = false;
                    break;
                }
            }
            if (all_found) {
                break;
            }
        }
        fclose(fp);
    }

    closedir(dir);
}

static int read_container_network_bytes(int pid, unsigned long *rx, unsigned long *tx) {
    const char *procfs = get_procfs_path();
    char path[256];
    snprintf(path, sizeof(path), "%s/%d/net/dev", procfs, pid);
    FILE *fp = fopen(path, "r");
    if (!fp) return -1;

    char line[512];
    int line_no = 0;
    *rx = 0;
    *tx = 0;
    while (fgets(line, sizeof(line), fp)) {
        line_no++;
        if (line_no <= 2) continue;

        char iface[64] = {0};
        unsigned long rbytes = 0, tbytes = 0;
        char *colon = strchr(line, ':');
        if (!colon) continue;
        *colon = '\0';
        sscanf(line, " %63s", iface);
        if (strcmp(iface, "lo") == 0) continue;

        if (sscanf(colon + 1, " %lu %*u %*u %*u %*u %*u %*u %*u %lu", &rbytes, &tbytes) == 2) {
            *rx += rbytes;
            *tx += tbytes;
        }
    }
    fclose(fp);
    return 0;
}

static int collect_cgroup_container_metrics(const ContainerInfo *info, int pid, ContainerMetrics *metrics) {
    char cgroup_dir[512];
    if (resolve_cgroup_dir(info->id, cgroup_dir, sizeof(cgroup_dir)) != 0) return -1;

    unsigned long long usage_usec = 0;
    if (read_cgroup_usage_usec(cgroup_dir, &usage_usec) == 0) {
        metrics->cpu_percent = compute_container_cpu_percent(info->id, usage_usec);
    }

    char memory_path[1024];
    unsigned long long memory_current = 0;
    snprintf(memory_path, sizeof(memory_path), "%s/memory.current", cgroup_dir);
    if (read_ull_file(memory_path, &memory_current) == 0) {
        metrics->memory_mb = (unsigned long)((double)memory_current / (1024.0 * 1024.0) + 0.5);
    }

    snprintf(memory_path, sizeof(memory_path), "%s/memory.max", cgroup_dir);
    FILE *max_fp = fopen(memory_path, "r");
    unsigned long long memory_max = 0;
    if (max_fp) {
        char value[64] = {0};
        if (fgets(value, sizeof(value), max_fp) && strncmp(value, "max", 3) != 0) {
            memory_max = strtoull(value, NULL, 10);
        }
        fclose(max_fp);
    }
    if (memory_max == 0 && global_metrics.memory.total_mb > 0) {
        memory_max = (unsigned long long)global_metrics.memory.total_mb * 1024ULL * 1024ULL;
    }
    if (memory_max > 0) {
        metrics->memory_limit_mb = (unsigned long)(memory_max / (1024ULL * 1024ULL));
        metrics->memory_percent = memory_current > 0 ? (double)memory_current * 100.0 / (double)memory_max : 0.0;
    }

    if (pid > 0) {
        read_container_network_bytes(pid, &metrics->network_rx_bytes, &metrics->network_tx_bytes);
    }

    return 0;
}

typedef struct {
    int container_index;
} HealthRequest;

static void run_health_checks_parallel(int container_idx) {
    CURLM *multi = curl_multi_init();
    if (!multi) return;

    HealthRequest requests[MAX_CONTAINERS];
    CURL *handles[MAX_CONTAINERS];
    int request_count = 0;

    for (int i = 0; i < container_idx && i < MAX_CONTAINERS; i++) {
        if (global_metrics.containers[i].name[0] == '\0') continue;

        /* Ne pas faire de health check HTTP sur postgres/redis (protocole non-HTTP). */
        if (strstr(global_metrics.containers[i].name, "postgres") != NULL ||
            strstr(global_metrics.containers[i].name, "redis") != NULL) {
            global_metrics.containers[i].response_time_ms = 0.0;
            global_metrics.containers[i].http_status = 0;
            continue;
        }

        char health_url[512];
        build_known_health_url(global_metrics.containers[i].name, health_url, sizeof(health_url));
        snprintf(global_metrics.containers[i].health_url, sizeof(global_metrics.containers[i].health_url), "%s", health_url);

        CURL *curl = curl_easy_init();
        if (!curl) {
            global_metrics.containers[i].response_time_ms = 0.0;
            global_metrics.containers[i].http_status = 0;
            continue;
        }

        requests[request_count].container_index = i;
        handles[request_count] = curl;
        curl_easy_setopt(curl, CURLOPT_URL, global_metrics.containers[i].health_url);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discard_curl_body);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 3L);
        curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 2L);
        curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
        curl_easy_setopt(curl, CURLOPT_FAILONERROR, 0L);
        curl_easy_setopt(curl, CURLOPT_PRIVATE, &requests[request_count]);
        curl_multi_add_handle(multi, curl);
        request_count++;
    }

    int running = 0;
    curl_multi_perform(multi, &running);
    while (running > 0) {
        int numfds = 0;
        CURLMcode wait_code = curl_multi_wait(multi, NULL, 0, 3000, &numfds);
        if (wait_code != CURLM_OK) break;
        curl_multi_perform(multi, &running);
    }

    int messages_left = 0;
    CURLMsg *msg = NULL;
    while ((msg = curl_multi_info_read(multi, &messages_left)) != NULL) {
        if (msg->msg != CURLMSG_DONE) continue;

        HealthRequest *req = NULL;
        curl_easy_getinfo(msg->easy_handle, CURLINFO_PRIVATE, &req);
        if (!req) continue;

        int idx = req->container_index;
        long code = 0;
        double total_time = 0.0;
        if (msg->data.result == CURLE_OK) {
            curl_easy_getinfo(msg->easy_handle, CURLINFO_RESPONSE_CODE, &code);
            curl_easy_getinfo(msg->easy_handle, CURLINFO_TOTAL_TIME, &total_time);
        }

        if (msg->data.result == CURLE_OK && code > 0) {
            global_metrics.containers[idx].response_time_ms = total_time * 1000.0;
            global_metrics.containers[idx].http_status = (int)code;
        } else {
            global_metrics.containers[idx].response_time_ms = 0.0;
            global_metrics.containers[idx].http_status = 0;
        }
    }

    for (int i = 0; i < request_count; i++) {
        curl_multi_remove_handle(multi, handles[i]);
        curl_easy_cleanup(handles[i]);
    }
    curl_multi_cleanup(multi);
}

/**
 * Collecte des métriques système
 */
int collect_system_metrics(void) {
    struct sysinfo si;
    struct statvfs vfs;
    
    if (sysinfo(&si) != 0) {
        fprintf(stderr, "Erreur sysinfo\n");
        return -1;
    }
    
    if (statvfs("/var/lib/docker", &vfs) != 0) {
        // Fallback sur /
        statvfs("/", &vfs);
    }
    
    // ✅ CORRECTION : Détecter le nombre de cores CPU EN PREMIER (nécessaire pour les calculs)
    long cores = sysconf(_SC_NPROCESSORS_ONLN);
    if (cores > 0) {
        global_metrics.cpu.cores = (int)cores;
    } else {
        // Fallback : lire depuis /proc/cpuinfo (ou PROCFS_PATH/cpuinfo)
        char cpuinfo_path[64];
        snprintf(cpuinfo_path, sizeof(cpuinfo_path), "%s/cpuinfo", get_procfs_path());
        FILE *cpuinfo = fopen(cpuinfo_path, "r");
        if (cpuinfo) {
            int core_count = 0;
            char line[256];
            while (fgets(line, sizeof(line), cpuinfo)) {
                if (strncmp(line, "processor", 9) == 0) {
                    core_count++;
                }
            }
            fclose(cpuinfo);
            if (core_count > 0) {
                global_metrics.cpu.cores = core_count;
            }
        }
        // Si toujours 0, utiliser 1 par défaut
        if (global_metrics.cpu.cores == 0) {
            global_metrics.cpu.cores = 1;
        }
    }
    
    // CPU - lecture depuis /proc/loadavg
    double load1 = 0.0, load5 = 0.0, load15 = 0.0;
    if (read_proc_loadavg(&load1, &load5, &load15) == 0) {
        global_metrics.cpu.load_1 = load1;
        global_metrics.cpu.load_5 = load5;
        global_metrics.cpu.load_15 = load15;
    }
    
    // ✅ CORRECTION : Lire le CPU usage réel depuis /proc/stat
    double system_cpu_percent = 0.0;
    int proc_stat_ok = (read_proc_stat_cpu(&system_cpu_percent) == 0);
    
    // Si read_proc_stat_cpu a réussi ET que la valeur est valide (> 0), l'utiliser
    // Sinon, utiliser le fallback depuis load_1
    if (proc_stat_ok && system_cpu_percent > 0.0 && system_cpu_percent <= 100.0) {
        global_metrics.system_cpu_usage_percent = system_cpu_percent;
#if MONITORING_DEBUG
        printf("[CPU] ✅ CPU système depuis /proc/stat: %.2f%%\n", system_cpu_percent);
#endif
    } else {
        // Fallback : approximation depuis load_1 (MAINTENANT cores est défini)
        // Note: load_1 peut être > cores si le système est surchargé, donc on limite à 100%
        double load_based_cpu = 0.0;
        if (global_metrics.cpu.cores > 0) {
            load_based_cpu = global_metrics.cpu.load_1 * 100.0 / global_metrics.cpu.cores;
        } else {
            // Si cores n'est toujours pas défini (ne devrait pas arriver), utiliser load_1 directement
            load_based_cpu = global_metrics.cpu.load_1 * 100.0;
        }
        if (load_based_cpu > 100.0) load_based_cpu = 100.0;
        global_metrics.system_cpu_usage_percent = load_based_cpu;
        
        // ✅ DEBUG : Logger si on utilise le fallback
        if (!proc_stat_ok) {
#if MONITORING_DEBUG
            printf("[CPU] ⚠️ read_proc_stat_cpu a échoué, utilisation du fallback (load_1=%.2f, cores=%d, cpu=%.2f%%)\n",
                   global_metrics.cpu.load_1, global_metrics.cpu.cores, load_based_cpu);
#endif
        } else if (system_cpu_percent == 0.0) {
#if MONITORING_DEBUG
            printf("[CPU] ⚠️ read_proc_stat_cpu retourne 0.0 (première lecture?), utilisation du fallback (load_1=%.2f, cores=%d, cpu=%.2f%%)\n",
                   global_metrics.cpu.load_1, global_metrics.cpu.cores, load_based_cpu);
#endif
        }
    }
    
    // Mémoire
    global_metrics.memory.total_mb = si.totalram / (1024 * 1024);
    global_metrics.memory.free_mb = si.freeram / (1024 * 1024);
    global_metrics.memory.used_mb = global_metrics.memory.total_mb - global_metrics.memory.free_mb;
    global_metrics.memory.usage_percent = (double)global_metrics.memory.used_mb / global_metrics.memory.total_mb * 100.0;
    
    // Disque Docker uniquement
    unsigned long total_bytes = vfs.f_blocks * vfs.f_frsize;
    unsigned long free_bytes = vfs.f_bavail * vfs.f_frsize;
    unsigned long used_bytes = total_bytes - free_bytes;
    
    global_metrics.disk.total_gb = total_bytes / (1024.0 * 1024.0 * 1024.0);
    global_metrics.disk.used_gb = used_bytes / (1024.0 * 1024.0 * 1024.0);
    global_metrics.disk.free_gb = free_bytes / (1024.0 * 1024.0 * 1024.0);
    global_metrics.disk.usage_percent = (double)used_bytes / total_bytes * 100.0;
    
    global_metrics.timestamp = time(NULL);
    
    return 0;
}

/**
 * Collecte des métriques des conteneurs Docker (amélioré avec réseau)
 */
int collect_container_metrics(void) {
    // Réinitialiser les conteneurs AVANT de commencer la collecte
    memset(global_metrics.containers, 0, sizeof(global_metrics.containers));
    
    // Variables déclarées au début pour être accessibles partout
    int container_idx = 0;
    unsigned long total_rx = 0, total_tx = 0;
    
#if MONITORING_DEBUG
    printf("[DEBUG] Début collecte conteneurs (container_idx=%d)\n", container_idx);
#endif
    ContainerInfo containers[MAX_CONTAINERS];
    int docker_count = docker_list_containers(containers, MAX_CONTAINERS);
    if (docker_count > 0) {
        int container_pids[MAX_CONTAINERS];
        build_container_pid_map(containers, docker_count, container_pids);

        for (int i = 0; i < docker_count && container_idx < MAX_CONTAINERS; i++) {
            if (!is_jobbingtrack_container_name(containers[i].name)) continue;

            ContainerMetrics *metrics = &global_metrics.containers[container_idx];
            snprintf(metrics->name, sizeof(metrics->name), "%s", containers[i].name);

            collect_cgroup_container_metrics(&containers[i], container_pids[i], metrics);
            total_rx += metrics->network_rx_bytes;
            total_tx += metrics->network_tx_bytes;
            container_idx++;
        }
    }
    
    // ✅ CORRECTION : Stocker les totaux réseau dans global_metrics
    global_metrics.total_network_rx_bytes = total_rx;
    global_metrics.total_network_tx_bytes = total_tx;
    
    // Mettre à jour le nombre de conteneurs JobbingTrack trouvés
    if (container_idx > 0) {
        global_metrics.container_count = container_idx;
#if MONITORING_DEBUG
        printf("[CONTAINERS] %d conteneurs JobbingTrack trouvés, réseau: RX=%.2f MB, TX=%.2f MB\n",
               container_idx,
               total_rx / (1024.0 * 1024.0),
               total_tx / (1024.0 * 1024.0));
#endif
    } else {
        global_metrics.container_count = 0;
    }
    
    // Calculer les statistiques globales avant les health checks
    double total_cpu_percent = 0.0;
    double total_memory_percent = 0.0;
    int valid_containers = 0;
    
    // ✅ NOUVEAU : Calculer project_cpu_avg et project_memory_mb pour les conteneurs JobbingTrack uniquement
    double project_cpu_total = 0.0;
    unsigned long project_memory_mb = 0;
    int project_container_count = 0;
    
    for (int i = 0; i < container_idx && i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            total_cpu_percent += global_metrics.containers[i].cpu_percent;
            total_memory_percent += global_metrics.containers[i].memory_percent;
            valid_containers++;
            
            // ✅ NOUVEAU : Calculer les métriques projet (conteneurs JobbingTrack uniquement)
            if (strstr(global_metrics.containers[i].name, "jobbingtrack-") != NULL) {
                project_cpu_total += global_metrics.containers[i].cpu_percent;
                project_memory_mb += global_metrics.containers[i].memory_mb;
                project_container_count++;
            }
        }
    }
    
    // ✅ NOUVEAU : Stocker les métriques projet dans global_metrics
    global_metrics.project_cpu_avg = (project_container_count > 0) ? 
        (project_cpu_total / project_container_count) : 0.0;
    global_metrics.project_memory_mb = project_memory_mb;
    
#if MONITORING_DEBUG
    printf("[PROJECT] CPU Projet: total=%.2f%%, count=%d, avg=%.2f%%, Memory: %lu MB\n",
           project_cpu_total, project_container_count, global_metrics.project_cpu_avg, global_metrics.project_memory_mb);
#endif
    // Mesurer les temps de réponse HTTP en parallèle (libcurl multi, sans forks).
    run_health_checks_parallel(container_idx);
    
    // Calculer le temps de réponse moyen, le score de charge et le taux d'erreur
    double total_response_time = 0.0;
    int valid_response_times = 0;
    int healthy_services = 0;
    int error_services = 0;  // ✅ NOUVEAU : Compter les services en erreur
    int total_services = 0;  // ✅ CORRECTION : Compter uniquement les conteneurs valides
    
    for (int i = 0; i < container_idx && i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            total_services++;  // ✅ CORRECTION : Compter chaque conteneur valide
            
            // ✅ CORRECTION : Considérer response_time_ms > 0 comme valide (même si http_status n'est pas 200)
            // Cela permet de capturer les temps de réponse même pour les services en erreur
            if (global_metrics.containers[i].response_time_ms > 0.0) {
                total_response_time += global_metrics.containers[i].response_time_ms;
                valid_response_times++;
            }
            // ✅ CORRECTION : Considérer comme sain si http_status == 200 OU si response_time_ms > 0 (service répond)
            if (global_metrics.containers[i].http_status == 200 || 
                (global_metrics.containers[i].response_time_ms > 0.0 && global_metrics.containers[i].http_status > 0)) {
                healthy_services++;
            }
            // ✅ NOUVEAU : Compter les erreurs (http_status >= 400 ou http_status == 0 avec response_time_ms == 0)
            if (global_metrics.containers[i].http_status >= 400 || 
                (global_metrics.containers[i].http_status == 0 && global_metrics.containers[i].response_time_ms == 0.0)) {
                error_services++;
            }
        }
    }
    
    // Stocker les statistiques globales dans une structure temporaire
    // (on les ajoutera dans la réponse JSON via http_server.c)
    // Pour l'instant, on les calcule et on les affiche
    double avg_response_time = valid_response_times > 0 ? total_response_time / valid_response_times : 0.0;
    double avg_cpu = valid_containers > 0 ? total_cpu_percent / valid_containers : 0.0;
    double avg_memory = valid_containers > 0 ? total_memory_percent / valid_containers : 0.0;
    // ✅ CORRECTION : Calculer la disponibilité uniquement si total_services > 0, sinon utiliser 100% par défaut
    double availability_percent = total_services > 0 ? (healthy_services * 100.0 / total_services) : 100.0;
    
    // ✅ CORRECTION : Calculer le score de charge en combinant CPU Système, Mémoire Système, Temps Réponse, et Disque
    // Formule: CPU Système * 0.35 + Mémoire Système * 0.30 + Disque * 0.20 + (ResponseTime/10) * 0.15
    // Score normalisé entre 0 et 100, où 0 = excellent et 100 = surchargé
    double system_cpu = global_metrics.system_cpu_usage_percent;
    double system_memory = global_metrics.memory.usage_percent;
    double disk_usage = global_metrics.disk.usage_percent;
    double normalized_response_time = (avg_response_time / 10.0); // Normaliser (diviser par 10 pour avoir une valeur entre 0-10)
    if (normalized_response_time > 10.0) normalized_response_time = 10.0; // Limiter à 10
    
    double load_score = (system_cpu * 0.35) + 
                        (system_memory * 0.30) + 
                        (disk_usage * 0.20) + 
                        (normalized_response_time * 0.15);
    
    if (load_score > 100.0) load_score = 100.0;
    if (load_score < 0.0) load_score = 0.0;
    
    // Stocker dans global_metrics
    global_metrics.avg_response_time_ms = avg_response_time;
    global_metrics.avg_cpu_percent = avg_cpu;
    global_metrics.avg_memory_percent = avg_memory;
    global_metrics.availability_percent = availability_percent;
    global_metrics.load_score = load_score;
    
    // ✅ NOUVEAU : Calculer les statistiques détaillées
    global_metrics.services_healthy = healthy_services;
    global_metrics.services_total = total_services;
    global_metrics.services_degraded = 0; // À calculer si nécessaire
    global_metrics.services_offline = total_services - healthy_services;
    global_metrics.services_errors = error_services;  // ✅ NOUVEAU : Nombre de services en erreur
    // ✅ NOUVEAU : Calculer le taux d'erreur par minute (approximation basée sur le nombre d'erreurs)
    // On suppose qu'une collecte toutes les 15 secondes = 4 collectes/min, donc on multiplie par 4
    global_metrics.error_rate_per_min = error_services * 4.0;  // Approximation
    // ✅ CORRECTION : system_cpu_usage_percent est déjà calculé depuis /proc/stat plus haut
    global_metrics.system_memory_usage_percent = global_metrics.memory.usage_percent;
    
    // ✅ NOUVEAU : Calculer les variations si on a des métriques précédentes
    if (has_previous_metrics) {
        // Variation CPU système
        if (previous_metrics.system_cpu_usage_percent > 0) {
            global_metrics.variations.cpu_change_percent = 
                ((global_metrics.system_cpu_usage_percent - previous_metrics.system_cpu_usage_percent) / 
                 previous_metrics.system_cpu_usage_percent) * 100.0;
        } else {
            global_metrics.variations.cpu_change_percent = 0.0;
        }
        
        // Variation Mémoire système
        if (previous_metrics.system_memory_usage_percent > 0) {
            global_metrics.variations.memory_change_percent = 
                ((global_metrics.system_memory_usage_percent - previous_metrics.system_memory_usage_percent) / 
                 previous_metrics.system_memory_usage_percent) * 100.0;
        } else {
            global_metrics.variations.memory_change_percent = 0.0;
        }
        
        // Variation Temps de réponse
        if (previous_metrics.avg_response_time_ms > 0) {
            global_metrics.variations.response_time_change_percent = 
                ((global_metrics.avg_response_time_ms - previous_metrics.avg_response_time_ms) / 
                 previous_metrics.avg_response_time_ms) * 100.0;
        } else {
            global_metrics.variations.response_time_change_percent = 0.0;
        }
        
        // Variation Disponibilité
        if (previous_metrics.availability_percent > 0) {
            global_metrics.variations.availability_change_percent = 
                global_metrics.availability_percent - previous_metrics.availability_percent;
        } else {
            global_metrics.variations.availability_change_percent = 0.0;
        }
    } else {
        // Première collecte, pas de variation
        global_metrics.variations.cpu_change_percent = 0.0;
        global_metrics.variations.memory_change_percent = 0.0;
        global_metrics.variations.response_time_change_percent = 0.0;
        global_metrics.variations.availability_change_percent = 0.0;
    }
    
    // Sauvegarder les métriques actuelles comme précédentes pour la prochaine fois
    previous_metrics = global_metrics;
    has_previous_metrics = true;
    
#if MONITORING_DEBUG
    printf("[STATS] Temps réponse moyen: %.2f ms, CPU moyen: %.2f%%, Mémoire moyenne: %.2f%%, Disponibilité: %.2f%%, Score charge: %.2f\n",
           avg_response_time, avg_cpu, avg_memory, availability_percent, load_score);
    printf("[STATS] Variations - CPU: %.2f%%, Mémoire: %.2f%%, Temps réponse: %.2f%%, Disponibilité: %.2f%%\n",
           global_metrics.variations.cpu_change_percent,
           global_metrics.variations.memory_change_percent,
           global_metrics.variations.response_time_change_percent,
           global_metrics.variations.availability_change_percent);
#endif
    return 0;
}

/**
 * Boucle principale de collecte
 */
int main(int argc, char *argv[]) {
    int interval = COLLECTION_INTERVAL;
    
    // Parser arguments
    if (argc > 1) {
        interval = atoi(argv[1]);
        if (interval < 5) interval = 5;  // Minimum 5 secondes
    }
    
    printf("[%s] 🚀 Collecteur de métriques démarré (intervalle: %ds)\n", log_ts(), interval);
    if (curl_global_init(CURL_GLOBAL_DEFAULT) != 0) {
        fprintf(stderr, "[%s] ⚠️  Initialisation libcurl échouée (health checks indisponibles)\n", log_ts());
        fflush(stderr);
    }
    
    // ✅ NOUVEAU : Initialiser le stockage PostgreSQL au démarrage
    printf("[%s] 💾 Initialisation du stockage PostgreSQL...\n", log_ts());
    fflush(stdout);
    if (init_storage() != 0) {
        fprintf(stderr, "[%s] ⚠️  Échec initialisation PostgreSQL (les métriques seront toujours disponibles via l'API HTTP)\n", log_ts());
        fflush(stderr);
    } else {
        printf("[%s] ✅ Stockage PostgreSQL initialisé\n", log_ts());
        fflush(stdout);
    }
    
    // Démarrer le serveur HTTP AVANT de commencer la collecte
    printf("[%s] 🌐 Démarrage du serveur HTTP...\n", log_ts());
    fflush(stdout);
    if (start_http_server() != 0) {
        fprintf(stderr, "[%s] ⚠️  Erreur démarrage serveur HTTP (continuons quand même)\n", log_ts());
        fflush(stderr);
    } else {
        // Attendre que le serveur soit prêt (thread démarré)
        sleep(2);  // Augmenté à 2s pour laisser le temps au thread de se lancer
        printf("[%s] ✅ Serveur HTTP initialisé\n", log_ts());
        fflush(stdout);
    }
    
    // Initialiser les métriques à zéro
    memset(&global_metrics, 0, sizeof(MetricsData));
    global_metrics.timestamp = time(NULL);
    
    // Collecter une première fois pour avoir des données
    printf("[%s] 📊 Première collecte des métriques...\n", log_ts());
    fflush(stdout);
    
    // Collecter avec gestion d'erreur robuste
    if (collect_system_metrics() != 0) {
        fprintf(stderr, "[%s] ⚠️  Erreur collecte système (continuons)\n", log_ts());
        fflush(stderr);
    }
    
    if (collect_container_metrics() != 0) {
        fprintf(stderr, "[%s] ⚠️  Erreur collecte conteneurs (continuons)\n", log_ts());
        fflush(stderr);
    }
    
    printf("[%s] ✅ Collecte initiale terminée\n", log_ts());
    fflush(stdout);
    
    // Boucle infinie de collecte avec gestion d'erreur robuste
    while (1) {
#if MONITORING_DEBUG
        time_t current_time = time(NULL);
        printf("[%ld] Collecte des métriques...\n", current_time);
        fflush(stdout);
#endif
        // Collecter métriques système (ne pas crash si erreur)
        if (collect_system_metrics() != 0) {
            fprintf(stderr, "[%s] ⚠️  Erreur collecte système (continuons)\n", log_ts());
            fflush(stderr);
        }
        
        // Collecter métriques conteneurs (ne pas crash si erreur)
        if (collect_container_metrics() != 0) {
            fprintf(stderr, "[%s] ⚠️  Erreur collecte conteneurs (continuons)\n", log_ts());
            fflush(stderr);
        }
        
        // ✅ CORRECTION : Mettre à jour le timestamp juste avant la sauvegarde
        global_metrics.timestamp = time(NULL);
        
        // Sauvegarder en base de données (ne pas crash si erreur)
        if (save_metrics_to_db(&global_metrics) != 0) {
            fprintf(stderr, "[%s] ⚠️  Erreur sauvegarde DB (continuons)\n", log_ts());
            fflush(stderr);
        } else {
#if MONITORING_DEBUG
            struct tm *tm_info = gmtime(&global_metrics.timestamp);
            char time_str[64];
            strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S UTC", tm_info);
            printf("[STORAGE] ✅ Métriques sauvegardées à %s\n", time_str);
            fflush(stdout);
#endif
        }
        // Attendre avant la prochaine collecte
        sleep(interval);
    }
    
    // Ne devrait jamais arriver ici
    return 0;
}

