/**
 * Point d'entrée principal du metrics-aggregator-c
 * Version simplifiée pour tester rapidement
 */

#include "http_server.h"
#include "persistence.h"
#include "docker.h"
#include "websocket.h"
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>

static bool running = true;

void signal_handler(int sig) {
    if (sig == SIGINT || sig == SIGTERM) {
        printf("\n[MAIN] Arrêt du serveur...\n");
        running = false;
    }
}

int main(int argc, char *argv[]) {
    int port = 8014;
    
    if (argc > 1) {
        port = atoi(argv[1]);
    }
    
    printf("╔════════════════════════════════════════════════════════╗\n");
    printf("║   Metrics Aggregator Service (C) - Version Simplifiée ║\n");
    printf("╚════════════════════════════════════════════════════════╝\n\n");
    
    // Gérer les signaux
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // Initialiser la persistance
    if (!persistence_init()) {
        fprintf(stderr, "[MAIN] ⚠️  Persistance non disponible, continuons quand même\n");
    }
    
    // ✅ NOUVEAU : Initialiser Docker
    if (docker_init()) {
        printf("[MAIN] ✅ Docker initialisé\n");
    } else {
        printf("[MAIN] ⚠️  Docker non disponible\n");
    }
    
    // ✅ NOUVEAU : Initialiser WebSocket (port + 1)
    if (websocket_init(port + 1)) {
        printf("[MAIN] ✅ WebSocket démarré sur le port %d\n", port + 1);
    } else {
        printf("[MAIN] ⚠️  WebSocket non disponible\n");
    }
    
    // Démarrer le serveur HTTP
    if (!http_server_start(port)) {
        fprintf(stderr, "[MAIN] ❌ Échec démarrage serveur HTTP\n");
        persistence_close();
        docker_cleanup();
        websocket_stop();
        return 1;
    }
    
    printf("[MAIN] ✅ Service démarré sur le port %d\n", port);
    printf("[MAIN] 📊 API disponible sur http://localhost:%d/api/v1/persistence/system/metrics\n", port);
    printf("[MAIN] 🏥 Health check: http://localhost:%d/api/v1/health\n", port);
    printf("[MAIN] 🔌 WebSocket: ws://localhost:%d\n", port + 1);
    printf("[MAIN] Appuyez sur Ctrl+C pour arrêter\n\n");
    
    // Boucle principale
    while (running) {
        sleep(1);
    }
    
    // Nettoyage
    printf("[MAIN] Nettoyage...\n");
    http_server_stop();
    websocket_stop();
    docker_cleanup();
    persistence_close();
    
    printf("[MAIN] ✅ Service arrêté\n");
    return 0;
}

