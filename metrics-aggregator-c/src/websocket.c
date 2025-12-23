/**
 * Support WebSocket pour diffusion temps réel
 * Version simplifiée (à améliorer progressivement)
 */

#include "websocket.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <pthread.h>

// Pour l'instant, WebSocket est une fonctionnalité à implémenter
// On retourne simplement false pour indiquer que ce n'est pas encore disponible
// Cela peut être amélioré progressivement avec une bibliothèque WebSocket en C

static bool websocket_running = false;
static int websocket_port = 8015;

bool websocket_init(int port) {
    websocket_port = port;
    // TODO: Implémenter le serveur WebSocket
    // Pour l'instant, on retourne false car c'est complexe à implémenter
    // On peut utiliser une bibliothèque comme libwebsockets plus tard
    websocket_running = false;
    return false; // Désactivé pour l'instant
}

bool websocket_broadcast_metrics(const char *json_data) {
    if (!websocket_running || !json_data) {
        return false;
    }
    // TODO: Diffuser aux clients WebSocket
    return false;
}

void websocket_stop(void) {
    websocket_running = false;
}

bool websocket_is_running(void) {
    return websocket_running;
}

