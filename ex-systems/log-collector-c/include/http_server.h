/**
 * Serveur HTTP pour exposer les logs via API
 */

#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

// Démarrer le serveur HTTP
int start_http_server(int port);

// Arrêter le serveur HTTP
void stop_http_server(void);

#endif // HTTP_SERVER_H

