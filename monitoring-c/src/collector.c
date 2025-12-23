/**
 * Système de collecte de métriques en C
 * Collecteur principal ultra-léger pour remplacer Node.js
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/statvfs.h>
#include <sys/sysinfo.h>
#include <unistd.h>
#include <strings.h>
#include <string.h>
#include "collector.h"
#include "proc_reader.h"
#include "storage.h"
#include "http_server.h"

#define COLLECTION_INTERVAL 15  // secondes
#define MAX_CONTAINERS 100

// Structure globale pour les métriques (exportée pour http_server.c)
MetricsData global_metrics = {0};
// ✅ NOUVEAU : Métriques précédentes pour calculer les variations
static MetricsData previous_metrics = {0};
static bool has_previous_metrics = false;

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
    
    // CPU - lecture depuis /proc/loadavg
    double load1 = 0.0, load5 = 0.0, load15 = 0.0;
    if (read_proc_loadavg(&load1, &load5, &load15) == 0) {
        global_metrics.cpu.load_1 = load1;
        global_metrics.cpu.load_5 = load5;
        global_metrics.cpu.load_15 = load15;
    }
    
    // ✅ CORRECTION : Détecter le nombre de cores CPU
    long cores = sysconf(_SC_NPROCESSORS_ONLN);
    if (cores > 0) {
        global_metrics.cpu.cores = (int)cores;
    } else {
        // Fallback : lire depuis /proc/cpuinfo
        FILE *cpuinfo = fopen("/proc/cpuinfo", "r");
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
        // Si toujours 0, utiliser 1 par défaut // TODO: Ajotuer qu'il le fasse par défaut oup passe en exit error
        if (global_metrics.cpu.cores == 0) {
            global_metrics.cpu.cores = 1;
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
    int name_count = 0;
    unsigned long total_rx = 0, total_tx = 0;
    
    printf("[DEBUG] Début collecte conteneurs (container_idx=%d)\n", container_idx);
    
    // Compter les conteneurs Docker actifs (pour info)
    FILE *fp = popen("docker ps -q 2>/dev/null | wc -l", "r");
    if (fp) {
        int count = 0;
        if (fscanf(fp, "%d", &count) == 1) {
            // Ne pas écraser si on trouve des conteneurs JobbingTrack
            if (container_idx == 0) {
                global_metrics.container_count = count;
            }
        }
        pclose(fp);
    }
    
    // Collecter les stats détaillées des conteneurs JobbingTrack
    FILE *stats_fp = popen("docker stats --no-stream --format '{{json .}}' $(docker ps --filter 'name=jobbingtrack-' --format '{{.Names}}' 2>/dev/null | tr '\\n' ' ') 2>/dev/null", "r");
    if (stats_fp) {
        char line[4096];
        int line_count = 0;
        
        while (fgets(line, sizeof(line), stats_fp) && container_idx < 100) {
            line_count++;
            // Nettoyer la ligne (enlever \n en fin)
            size_t line_len = strlen(line);
            if (line_len > 0 && line[line_len - 1] == '\n') {
                line[line_len - 1] = '\0';
            }
            
            // Ignorer les lignes vides
            if (line_len <= 1) continue;
            // ✅ DEBUG : Afficher la ligne brute pour debug
            // printf("[DEBUG] Ligne reçue: %.200s\n", line);
            
            // Extraire le nom du conteneur d'abord
            char *name_start = strstr(line, "\"Name\":\"");
            if (!name_start) {
                // Essayer avec "Container" si "Name" n'est pas trouvé
                name_start = strstr(line, "\"Container\":\"");
                if (name_start) {
                    name_start += 12; // Skip "Container":"
                } else {
                    continue; // Pas de nom trouvé, passer à la ligne suivante
                }
            } else {
                name_start += 8; // Skip "Name":"
            }
            
            char *name_end = strstr(name_start, "\"");
            if (!name_end || container_idx >= 100) continue;
            
            size_t name_len = name_end - name_start;
            if (name_len >= sizeof(global_metrics.containers[container_idx].name)) continue;
            
            strncpy(global_metrics.containers[container_idx].name, name_start, name_len);
            global_metrics.containers[container_idx].name[name_len] = '\0';
            
            // ✅ CORRECTION : Parser CPU (format: "0.00%" ou "40.24%")
            // Ne pas modifier la ligne originale, utiliser une copie temporaire
            char *cpu_start = strstr(line, "\"CPUPerc\":\"");
            if (cpu_start) {
                cpu_start += 10; // Skip "CPUPerc":"
                // ✅ CORRECTION : Sauter le " qui ouvre la valeur si présent
                if (*cpu_start == '"') {
                    cpu_start++;
                }
                // Chercher le " qui ferme la valeur
                char *cpu_end = strstr(cpu_start, "\"");
                if (cpu_end && cpu_end > cpu_start) {
                    size_t cpu_len = cpu_end - cpu_start;
                    if (cpu_len > 0 && cpu_len < 64) {
                        char cpu_str[64] = {0};
                        strncpy(cpu_str, cpu_start, cpu_len);
                        cpu_str[cpu_len] = '\0'; // Assurer null termination
                        double cpu_val = 0.0;
                        // Parser "40.24%" ou "0.01%" - essayer avec et sans %
                        int parsed = sscanf(cpu_str, "%lf%%", &cpu_val);
                        if (parsed == 1) {
                            global_metrics.containers[container_idx].cpu_percent = cpu_val;
                        } else {
                            // Réessayer sans le %
                            parsed = sscanf(cpu_str, "%lf", &cpu_val);
                            if (parsed == 1) {
                                global_metrics.containers[container_idx].cpu_percent = cpu_val;
                            }
                        }
                    }
                }
            }
            
            // ✅ CORRECTION : Utiliser MemPerc directement (plus fiable)
            char *memperc_start = strstr(line, "\"MemPerc\":\"");
            if (memperc_start) {
                memperc_start += 10; // Skip "MemPerc":"
                // ✅ CORRECTION : Sauter le " qui ouvre la valeur si présent
                if (*memperc_start == '"') {
                    memperc_start++;
                }
                // Chercher le " qui ferme la valeur
                char *memperc_end = strstr(memperc_start, "\"");
                if (memperc_end && memperc_end > memperc_start) {
                    size_t memperc_len = memperc_end - memperc_start;
                    if (memperc_len > 0 && memperc_len < 64) {
                        char memperc_str[64] = {0};
                        strncpy(memperc_str, memperc_start, memperc_len);
                        memperc_str[memperc_len] = '\0'; // Assurer null termination
                        double mem_perc_val = 0.0;
                        int parsed = sscanf(memperc_str, "%lf%%", &mem_perc_val);
                        if (parsed == 1) {
                            global_metrics.containers[container_idx].memory_percent = mem_perc_val;
                        } else {
                            parsed = sscanf(memperc_str, "%lf", &mem_perc_val);
                            if (parsed == 1) {
                                global_metrics.containers[container_idx].memory_percent = mem_perc_val;
                            }
                        }
                    }
                }
            }
            
            // ✅ CORRECTION : Parser MemUsage (format: "1.04GiB / 46.93GiB" ou "1001MiB / 46.93GiB")
            char *mem_start = strstr(line, "\"MemUsage\":\"");
            if (mem_start) {
                mem_start += 11; // Skip "MemUsage":"
                // ✅ CORRECTION : Sauter le " qui ouvre la valeur si présent
                if (*mem_start == '"') {
                    mem_start++;
                }
                // Chercher le " qui ferme la valeur
                char *mem_end = strstr(mem_start, "\"");
                if (mem_end && mem_end > mem_start) {
                    size_t mem_len = mem_end - mem_start;
                    if (mem_len > 0 && mem_len < 128) {
                        char mem_str[128] = {0};
                        strncpy(mem_str, mem_start, mem_len);
                        mem_str[mem_len] = '\0'; // Assurer null termination
                        
                        char *mem_slash = strstr(mem_str, " / ");
                        if (mem_slash) {
                            *mem_slash = '\0';
                            
                            // Parser mémoire utilisée
                            double mem_used_val = 0.0;
                            char mem_used_unit[8] = {0};
                            if (sscanf(mem_str, "%lf%s", &mem_used_val, mem_used_unit) == 2) {
                                unsigned long mem_used_bytes = 0;
                                // Gérer toutes les unités possibles
                                if (strcmp(mem_used_unit, "GiB") == 0 || strcmp(mem_used_unit, "GB") == 0) {
                                    mem_used_bytes = (unsigned long)(mem_used_val * 1024 * 1024 * 1024);
                                } else if (strcmp(mem_used_unit, "MiB") == 0 || strcmp(mem_used_unit, "MB") == 0) {
                                    mem_used_bytes = (unsigned long)(mem_used_val * 1024 * 1024);
                                } else if (strcmp(mem_used_unit, "KiB") == 0 || strcmp(mem_used_unit, "KB") == 0) {
                                    mem_used_bytes = (unsigned long)(mem_used_val * 1024);
                                } else if (strcmp(mem_used_unit, "B") == 0) {
                                    mem_used_bytes = (unsigned long)mem_used_val;
                                }
                                // ✅ CORRECTION : Utiliser division flottante pour éviter perte de précision (ex: 532KiB = 0.507 MB)
                                global_metrics.containers[container_idx].memory_mb = (unsigned long)((double)mem_used_bytes / (1024.0 * 1024.0) + 0.5); // Arrondir
                                
                                // Parser limite mémoire
                                double mem_limit_val = 0.0;
                                char mem_limit_unit[8] = {0};
                                if (sscanf(mem_slash + 3, "%lf%s", &mem_limit_val, mem_limit_unit) == 2) {
                                    unsigned long mem_limit_bytes = 0;
                                    if (strcmp(mem_limit_unit, "GiB") == 0 || strcmp(mem_limit_unit, "GB") == 0) {
                                        mem_limit_bytes = (unsigned long)(mem_limit_val * 1024 * 1024 * 1024);
                                    } else if (strcmp(mem_limit_unit, "MiB") == 0 || strcmp(mem_limit_unit, "MB") == 0) {
                                        mem_limit_bytes = (unsigned long)(mem_limit_val * 1024 * 1024);
                                    } else if (strcmp(mem_limit_unit, "KiB") == 0 || strcmp(mem_limit_unit, "KB") == 0) {
                                        mem_limit_bytes = (unsigned long)(mem_limit_val * 1024);
                                    } else if (strcmp(mem_limit_unit, "B") == 0) {
                                        mem_limit_bytes = (unsigned long)mem_limit_val;
                                    }
                                    global_metrics.containers[container_idx].memory_limit_mb = mem_limit_bytes / (1024 * 1024);
                                    
                                    // Si MemPerc n'a pas été trouvé, le calculer
                                    if (global_metrics.containers[container_idx].memory_percent == 0.0 && mem_limit_bytes > 0) {
                                        global_metrics.containers[container_idx].memory_percent = 
                                            (double)mem_used_bytes * 100.0 / (double)mem_limit_bytes;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Parser NetIO (format: "1.2MB / 3.4MB")
            char *netio_start = strstr(line, "\"NetIO\":\"");
            if (netio_start) {
                netio_start += 9;
                char *netio_end = strstr(netio_start, "\"");
                if (netio_end) {
                    *netio_end = '\0';
                    char *slash = strstr(netio_start, " / ");
                    if (slash) {
                        *slash = '\0';
                        double rx_val = 0.0;
                        char rx_unit[4] = {0};
                        if (sscanf(netio_start, "%lf%s", &rx_val, rx_unit) == 2) {
                            unsigned long rx_bytes = (unsigned long)(rx_val * 1024 * 1024);
                            if (strcmp(rx_unit, "GB") == 0) rx_bytes *= 1024;
                            else if (strcmp(rx_unit, "KB") == 0) rx_bytes /= 1024;
                            
                            double tx_val = 0.0;
                            char tx_unit[4] = {0};
                            if (sscanf(slash + 3, "%lf%s", &tx_val, tx_unit) == 2) {
                                unsigned long tx_bytes = (unsigned long)(tx_val * 1024 * 1024);
                                if (strcmp(tx_unit, "GB") == 0) tx_bytes *= 1024;
                                else if (strcmp(tx_unit, "KB") == 0) tx_bytes /= 1024;
                                
                                global_metrics.containers[container_idx].network_rx_bytes = rx_bytes;
                                global_metrics.containers[container_idx].network_tx_bytes = tx_bytes;
                                total_rx += rx_bytes;
                                total_tx += tx_bytes;
                            }
                        }
                    }
                }
            }
            
            container_idx++;
            name_count++;
        }
        pclose(stats_fp);
    }
    
    // ✅ CORRECTION : Stocker les totaux réseau dans global_metrics
    global_metrics.total_network_rx_bytes = total_rx;
    global_metrics.total_network_tx_bytes = total_tx;
    
    // Mettre à jour le nombre de conteneurs JobbingTrack trouvés
    if (container_idx > 0) {
        global_metrics.container_count = container_idx;
        printf("[CONTAINERS] %d conteneurs JobbingTrack trouvés, réseau: RX=%.2f MB, TX=%.2f MB\n", 
               container_idx, 
               total_rx / (1024.0 * 1024.0), 
               total_tx / (1024.0 * 1024.0));
    } else {
        // Si aucun conteneur JobbingTrack trouvé, utiliser le compte total
        // (déjà fait plus haut si container_idx == 0)
    }
    
    // Calculer les statistiques globales avant les health checks
    double total_cpu_percent = 0.0;
    double total_memory_percent = 0.0;
    int valid_containers = 0;
    
    for (int i = 0; i < container_idx && i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            total_cpu_percent += global_metrics.containers[i].cpu_percent;
            total_memory_percent += global_metrics.containers[i].memory_percent;
            valid_containers++;
        }
    }
    
    // Mesurer les temps de réponse HTTP pour les services JobbingTrack
    for (int i = 0; i < container_idx && i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            // Obtenir l'IP du conteneur via docker inspect
            char inspect_cmd[512];
            snprintf(inspect_cmd, sizeof(inspect_cmd),
                "docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' %s 2>/dev/null",
                global_metrics.containers[i].name);
            
            FILE *inspect_fp = popen(inspect_cmd, "r");
            char container_ip[64] = {0};
            if (inspect_fp) {
                if (fgets(container_ip, sizeof(container_ip), inspect_fp)) {
                    container_ip[strcspn(container_ip, "\n")] = '\0';
                }
                pclose(inspect_fp);
            }
            
            // Obtenir le port exposé (chercher le port principal)
            char port_cmd[512];
            snprintf(port_cmd, sizeof(port_cmd),
                "docker port %s 2>/dev/null | head -1 | cut -d: -f2",
                global_metrics.containers[i].name);
            
            FILE *port_fp = popen(port_cmd, "r");
            char container_port[16] = {0};
            if (port_fp) {
                if (fgets(container_port, sizeof(container_port), port_fp)) {
                    container_port[strcspn(container_port, "\n")] = '\0';
                }
                pclose(port_fp);
            }
            
            // Construire l'URL de health check
            char health_url[512];
            if (strlen(container_ip) > 0 && strlen(container_port) > 0) {
                snprintf(health_url, sizeof(health_url), "http://%s:%s/health", container_ip, container_port);
            } else {
                // Fallback: utiliser localhost avec le port ou le nom du service
                if (strlen(container_port) > 0) {
                    snprintf(health_url, sizeof(health_url), "http://localhost:%s/health", container_port);
                } else {
                    // Dernier fallback: utiliser le nom du conteneur (fonctionne dans Docker network)
                    snprintf(health_url, sizeof(health_url), "http://%s/health", global_metrics.containers[i].name);
                }
            }
            
            // ✅ CORRECTION : Mesurer le temps de réponse avec curl (amélioré)
            char curl_cmd[1024];
            snprintf(curl_cmd, sizeof(curl_cmd),
                "curl -s -o /dev/null -w '%%{time_total},%%{http_code}' --max-time 3 --connect-timeout 2 %s 2>&1",
                health_url);
            
            FILE *curl_fp = popen(curl_cmd, "r");
            if (curl_fp) {
                char response[128];
                if (fgets(response, sizeof(response), curl_fp)) {
                    // ✅ CORRECTION : Nettoyer la réponse (supprimer les retours à la ligne)
                    char *newline = strchr(response, '\n');
                    if (newline) *newline = '\0';
                    
                    double time_total = 0.0;
                    int http_code = 0;
                    // ✅ CORRECTION : Parser la réponse (format: "time_total,http_code" ou erreur)
                    if (sscanf(response, "%lf,%d", &time_total, &http_code) == 2 && http_code > 0) {
                        global_metrics.containers[i].response_time_ms = time_total * 1000.0;
                        global_metrics.containers[i].http_status = http_code;
                        printf("[DEBUG] Health check %s: %.2f ms (HTTP %d)\n", 
                               global_metrics.containers[i].name, 
                               global_metrics.containers[i].response_time_ms, 
                               http_code);
                    } else {
                        // ✅ CORRECTION : Si curl a échoué, essayer avec le nom du service directement
                        // (dans Docker network, le nom du service fonctionne)
                        char fallback_url[512];
                        snprintf(fallback_url, sizeof(fallback_url), "http://%s/health", global_metrics.containers[i].name);
                        char fallback_cmd[1024];
                        snprintf(fallback_cmd, sizeof(fallback_cmd),
                            "curl -s -o /dev/null -w '%%{time_total},%%{http_code}' --max-time 3 --connect-timeout 2 %s 2>&1",
                            fallback_url);
                        
                        FILE *fallback_fp = popen(fallback_cmd, "r");
                        if (fallback_fp) {
                            char fallback_response[128];
                            if (fgets(fallback_response, sizeof(fallback_response), fallback_fp)) {
                                char *newline2 = strchr(fallback_response, '\n');
                                if (newline2) *newline2 = '\0';
                                
                                if (sscanf(fallback_response, "%lf,%d", &time_total, &http_code) == 2 && http_code > 0) {
                                    global_metrics.containers[i].response_time_ms = time_total * 1000.0;
                                    global_metrics.containers[i].http_status = http_code;
                                    printf("[DEBUG] Health check fallback %s: %.2f ms (HTTP %d)\n", 
                                           global_metrics.containers[i].name, 
                                           global_metrics.containers[i].response_time_ms, 
                                           http_code);
                                } else {
                                    global_metrics.containers[i].response_time_ms = 0.0;
                                    global_metrics.containers[i].http_status = 0;
                                }
                            } else {
                                global_metrics.containers[i].response_time_ms = 0.0;
                                global_metrics.containers[i].http_status = 0;
                            }
                            pclose(fallback_fp);
                        } else {
                            global_metrics.containers[i].response_time_ms = 0.0;
                            global_metrics.containers[i].http_status = 0;
                        }
                    }
                } else {
                    global_metrics.containers[i].response_time_ms = 0.0;
                    global_metrics.containers[i].http_status = 0;
                }
                pclose(curl_fp);
            } else {
                global_metrics.containers[i].response_time_ms = 0.0;
                global_metrics.containers[i].http_status = 0;
            }
        }
    }
    
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
    
    // Calculer le score de charge (formule: CPU * 0.4 + Memory * 0.3 + (100 - Availability) * 0.2 + (ResponseTime/100) * 0.1)
    // Score normalisé entre 0 et 100, où 0 = excellent et 100 = surchargé
    double load_score = (avg_cpu * 0.4) + 
                        (avg_memory * 0.3) + 
                        ((100.0 - availability_percent) * 0.2) + 
                        ((avg_response_time / 10.0) * 0.1); // Normaliser response_time (diviser par 10 pour avoir une valeur entre 0-10)
    
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
    global_metrics.system_cpu_usage_percent = global_metrics.cpu.load_1 * 100.0 / global_metrics.cpu.cores; // Approximation
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
    
    printf("[STATS] Temps réponse moyen: %.2f ms, CPU moyen: %.2f%%, Mémoire moyenne: %.2f%%, Disponibilité: %.2f%%, Score charge: %.2f\n",
           avg_response_time, avg_cpu, avg_memory, availability_percent, load_score);
    printf("[STATS] Variations - CPU: %.2f%%, Mémoire: %.2f%%, Temps réponse: %.2f%%, Disponibilité: %.2f%%\n",
           global_metrics.variations.cpu_change_percent,
           global_metrics.variations.memory_change_percent,
           global_metrics.variations.response_time_change_percent,
           global_metrics.variations.availability_change_percent);
    
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
    
    printf("🚀 Collecteur de métriques démarré (intervalle: %ds)\n", interval);
    
    // ✅ NOUVEAU : Initialiser le stockage PostgreSQL au démarrage
    printf("💾 Initialisation du stockage PostgreSQL...\n");
    fflush(stdout);
    if (init_storage() != 0) {
        fprintf(stderr, "⚠️  Échec initialisation PostgreSQL (les métriques seront toujours disponibles via l'API HTTP)\n");
        fflush(stderr);
    } else {
        printf("✅ Stockage PostgreSQL initialisé\n");
        fflush(stdout);
    }
    
    // Démarrer le serveur HTTP AVANT de commencer la collecte
    printf("🌐 Démarrage du serveur HTTP...\n");
    fflush(stdout);
    if (start_http_server() != 0) {
        fprintf(stderr, "⚠️  Erreur démarrage serveur HTTP (continuons quand même)\n");
        fflush(stderr);
    } else {
        // Attendre que le serveur soit prêt (thread démarré)
        sleep(2);  // Augmenté à 2s pour laisser le temps au thread de se lancer
        printf("✅ Serveur HTTP initialisé\n");
        fflush(stdout);
    }
    
    // Initialiser les métriques à zéro
    memset(&global_metrics, 0, sizeof(MetricsData));
    global_metrics.timestamp = time(NULL);
    
    // Collecter une première fois pour avoir des données
    printf("📊 Première collecte des métriques...\n");
    fflush(stdout);
    
    // Collecter avec gestion d'erreur robuste
    if (collect_system_metrics() != 0) {
        fprintf(stderr, "⚠️  Erreur collecte système (continuons)\n");
        fflush(stderr);
    }
    
    if (collect_container_metrics() != 0) {
        fprintf(stderr, "⚠️  Erreur collecte conteneurs (continuons)\n");
        fflush(stderr);
    }
    
    printf("✅ Collecte initiale terminée\n");
    fflush(stdout);
    
    // Boucle infinie de collecte avec gestion d'erreur robuste
    while (1) {
        time_t current_time = time(NULL);
        printf("[%ld] Collecte des métriques...\n", current_time);
        fflush(stdout);
        
        // Collecter métriques système (ne pas crash si erreur)
        if (collect_system_metrics() != 0) {
            fprintf(stderr, "⚠️  Erreur collecte système (continuons)\n");
            fflush(stderr);
        }
        
        // Collecter métriques conteneurs (ne pas crash si erreur)
        if (collect_container_metrics() != 0) {
            fprintf(stderr, "⚠️  Erreur collecte conteneurs (continuons)\n");
            fflush(stderr);
        }
        
        // Sauvegarder en base de données (ne pas crash si erreur)
        if (save_metrics_to_db(&global_metrics) != 0) {
            fprintf(stderr, "⚠️  Erreur sauvegarde DB (continuons)\n");
            fflush(stderr);
        }
        
        // Attendre avant la prochaine collecte
        sleep(interval);
    }
    
    // Ne devrait jamais arriver ici
    return 0;
}

