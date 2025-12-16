'use client'

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'interview' | 'followup' | 'application' | 'system';
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface MobileNotificationCenterProps {
  className?: string;
}

const MobileNotificationCenter: React.FC<MobileNotificationCenterProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Générer des notifications de démonstration
    generateDemoNotifications();

    // Simuler l'arrivée de nouvelles notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% de chance de nouvelle notification
        addRandomNotification();
      }
    }, 10000); // Toutes les 10 secondes

    return () => clearInterval(interval);
  }, []);

  const generateDemoNotifications = () => {
    const demoNotifications: Notification[] = [
      {
        id: '1',
        title: 'Entretien imminent',
        body: 'Entretien avec Marie Dubois chez TechCorp dans 1 heure',
        type: 'interview',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // Il y a 30 minutes
        read: false,
      },
      {
        id: '2',
        title: 'Relance en attente',
        body: 'N\'oubliez pas de relancer Pierre Martin chez StartupInc',
        type: 'followup',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2 heures
        read: true,
      },
      {
        id: '3',
        title: 'Nouvelle candidature',
        body: 'Votre candidature pour Développeur Full Stack a été envoyée',
        type: 'application',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Il y a 24 heures
        read: true,
      },
    ];

    setNotifications(demoNotifications);
  };

  const addRandomNotification = () => {
    const types: Notification['type'][] = ['interview', 'followup', 'application', 'system'];
    const titles = {
      interview: 'Entretien programmé',
      followup: 'Relance nécessaire',
      application: 'Candidature mise à jour',
      system: 'Rappel système',
    };

    const bodies = {
      interview: 'Nouvel entretien avec un recruteur',
      followup: 'Une relance nécessite votre attention',
      application: 'Le statut de votre candidature a changé',
      system: 'Maintenance système programmée',
    };

    const newNotification: Notification = {
      id: Date.now().toString(),
      title: titles[types[Math.floor(Math.random() * types.length)]],
      body: bodies[types[Math.floor(Math.random() * types.length)]],
      type: types[Math.floor(Math.random() * types.length)],
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Garder seulement les 10 dernières
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'interview': return '🎤';
      case 'followup': return '🔄';
      case 'application': return '📝';
      case 'system': return '⚙️';
      default: return '📱';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'interview': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'followup': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'application': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'system': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`relative ${className}`}>
      {/* Bouton de notifications */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notifications */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* En-tête */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">Notifications</h3>
            <div className="flex items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1"
                >
                  Tout lu
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-4xl mb-2">📭</p>
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(notification.timestamp, 'HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.body}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getNotificationColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pied de page */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNotificationCenter;
