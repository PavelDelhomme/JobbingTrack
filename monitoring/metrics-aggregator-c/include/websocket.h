/**
 * Support WebSocket pour diffusion temps réel
 * Version simplifiée pour tester rapidement
 */

#ifndef WEBSOCKET_H
#define WEBSOCKET_H

#include <stdbool.h>

// Initialiser le serveur WebSocket
bool websocket_init(int port);

// Diffuser des métriques à tous les clients connectés
bool websocket_broadcast_metrics(const char *json_data);

// Arrêter le serveur WebSocket
void websocket_stop(void);

// Vérifier si le serveur est en cours d'exécution
bool websocket_is_running(void);

#endif // WEBSOCKET_H

