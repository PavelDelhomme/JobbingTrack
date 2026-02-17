/**
 * Serveur HTTP simple pour exposer l'API
 * Version simplifiée pour tester rapidement
 */

#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include <stdbool.h>

// Démarrer le serveur HTTP
bool http_server_start(int port);

// Arrêter le serveur HTTP
void http_server_stop(void);

// Vérifier si le serveur est en cours d'exécution
bool http_server_is_running(void);

#endif // HTTP_SERVER_H

