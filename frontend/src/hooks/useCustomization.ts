import { useState, useEffect } from 'react';

export interface CustomizationSettings {
  // Thème général
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;

  // Layout
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showAnimations: boolean;

  // Dashboard
  dashboardLayout: 'grid' | 'list' | 'kanban';
  defaultView: string;
  itemsPerPage: number;

  // Recherche
  searchFilters: {
    defaultModules: string[];
    autoComplete: boolean;
    highlightResults: boolean;
  };

  // Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    duration: number;
  };

  // Accessibilité
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    focusIndicators: boolean;
  };

  // Préférences linguistiques
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';

  // Données et confidentialité
  dataRetention: {
    cacheDuration: number;
    syncFrequency: number;
    offlineMode: boolean;
  };
}

const defaultSettings: CustomizationSettings = {
  theme: 'auto',
  primaryColor: '#3B82F6',
  accentColor: '#10B981',
  sidebarCollapsed: false,
  compactMode: false,
  showAnimations: true,
  dashboardLayout: 'grid',
  defaultView: 'dashboard',
  itemsPerPage: 20,
  searchFilters: {
    defaultModules: ['applications', 'companies', 'contacts'],
    autoComplete: true,
    highlightResults: true,
  },
  notifications: {
    enabled: true,
    sound: true,
    position: 'top-right',
    duration: 5000,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    focusIndicators: true,
  },
  language: 'fr',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  dataRetention: {
    cacheDuration: 7, // jours
    syncFrequency: 5, // minutes
    offlineMode: true,
  },
};

export function useCustomization() {
  const [settings, setSettings] = useState<CustomizationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les paramètres depuis le localStorage ou l'API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Essayer de charger depuis l'API si l'utilisateur est connecté
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await fetch('/api/v1/users/customization', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const userSettings = await response.json();
              setSettings({ ...defaultSettings, ...userSettings });
              return;
            }
          } catch (error) {
            console.error('Erreur lors du chargement des paramètres utilisateur:', error);
          }
        }

        // Fallback vers localStorage
        const storedSettings = localStorage.getItem('customization-settings');
        if (storedSettings) {
          try {
            const parsedSettings = JSON.parse(storedSettings);
            setSettings({ ...defaultSettings, ...parsedSettings });
          } catch (error) {
            console.error('Erreur parsing paramètres localStorage:', error);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Sauvegarder les paramètres
  const saveSettings = async (newSettings: Partial<CustomizationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      // Sauvegarder en local
      localStorage.setItem('customization-settings', JSON.stringify(updatedSettings));

      // Sauvegarder sur le serveur si l'utilisateur est connecté
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/v1/users/customization', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedSettings),
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  // Appliquer les paramètres au DOM
  useEffect(() => {
    if (isLoading) return;

    // Appliquer tous les paramètres
    applyTheme(settings);
    applyCustomColors(settings);
    applyAccessibility(settings);
    applyAnimations(settings);
    applyLayout(settings);
    applyNotifications(settings);
    applyLanguage(settings);

  }, [settings, isLoading]);

  return {
    settings,
    isLoading,
    saveSettings,
    resetSettings: () => saveSettings(defaultSettings),
  };
}

// Fonction pour appliquer le thème
function applyTheme(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.theme === 'dark' ||
      (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Fonction pour appliquer les couleurs personnalisées
function applyCustomColors(settings: CustomizationSettings) {
  const root = document.documentElement;

  // Appliquer les couleurs CSS personnalisées
  root.style.setProperty('--primary-color', settings.primaryColor);
  root.style.setProperty('--accent-color', settings.accentColor);

  // Créer des variantes de couleurs
  const primaryRgb = hexToRgb(settings.primaryColor);
  const accentRgb = hexToRgb(settings.accentColor);

  if (primaryRgb) {
    root.style.setProperty('--primary-50', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.05)`);
    root.style.setProperty('--primary-100', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
    root.style.setProperty('--primary-200', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`);
    root.style.setProperty('--primary-300', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`);
    root.style.setProperty('--primary-400', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`);
    root.style.setProperty('--primary-500', settings.primaryColor);
    root.style.setProperty('--primary-600', adjustColor(settings.primaryColor, -20));
    root.style.setProperty('--primary-700', adjustColor(settings.primaryColor, -40));
    root.style.setProperty('--primary-800', adjustColor(settings.primaryColor, -60));
    root.style.setProperty('--primary-900', adjustColor(settings.primaryColor, -80));
  }
}

// Fonction pour appliquer les préférences d'accessibilité
function applyAccessibility(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.accessibility.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  if (settings.accessibility.largeText) {
    root.classList.add('large-text');
  } else {
    root.classList.remove('large-text');
  }

  if (settings.accessibility.reduceMotion) {
    root.classList.add('reduce-motion');
    root.style.setProperty('--animation-duration', '0.01ms');
  } else {
    root.classList.remove('reduce-motion');
    root.style.setProperty('--animation-duration', '150ms');
  }
}

// Fonction pour appliquer les animations
function applyAnimations(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.showAnimations) {
    root.classList.add('animations-enabled');
  } else {
    root.classList.remove('animations-enabled');
  }
}

// Fonction pour appliquer la disposition
function applyLayout(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.compactMode) {
    root.classList.add('compact-mode');
  } else {
    root.classList.remove('compact-mode');
  }

  if (settings.sidebarCollapsed) {
    root.classList.add('sidebar-collapsed');
  } else {
    root.classList.remove('sidebar-collapsed');
  }

  // Appliquer la disposition du tableau de bord
  root.setAttribute('data-dashboard-layout', settings.dashboardLayout);

  // Appliquer les éléments par page
  root.style.setProperty('--items-per-page', settings.itemsPerPage.toString());
}

// Fonction pour appliquer les notifications
function applyNotifications(settings: CustomizationSettings) {
  const root = document.documentElement;

  if (settings.notifications.enabled) {
    root.classList.add('notifications-enabled');
  } else {
    root.classList.remove('notifications-enabled');
  }

  // Appliquer la position des notifications
  root.setAttribute('data-notification-position', settings.notifications.position);

  // Appliquer la durée des notifications
  root.style.setProperty('--notification-duration', `${settings.notifications.duration}ms`);

  // Appliquer le son des notifications
  if (settings.notifications.sound) {
    root.classList.add('notification-sound-enabled');
  } else {
    root.classList.remove('notification-sound-enabled');
  }
}

// Fonction pour appliquer la langue et les préférences locales
function applyLanguage(settings: CustomizationSettings) {
  const root = document.documentElement;

  // Appliquer la langue
  root.setAttribute('lang', settings.language);

  // Appliquer le format de date
  root.setAttribute('data-date-format', settings.dateFormat);

  // Appliquer le format d'heure
  root.setAttribute('data-time-format', settings.timeFormat);

  // Appliquer les préférences de rétention des données
  root.style.setProperty('--cache-duration', `${settings.dataRetention.cacheDuration}d`);
  root.style.setProperty('--sync-frequency', `${settings.dataRetention.syncFrequency}m`);

  if (settings.dataRetention.offlineMode) {
    root.classList.add('offline-mode');
  } else {
    root.classList.remove('offline-mode');
  }
}

// Utilitaires pour les couleurs
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function adjustColor(color: string, amount: number) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const adjusted = {
    r: Math.max(0, Math.min(255, rgb.r + amount)),
    g: Math.max(0, Math.min(255, rgb.g + amount)),
    b: Math.max(0, Math.min(255, rgb.b + amount))
  };

  return `rgb(${adjusted.r}, ${adjusted.g}, ${adjusted.b})`;
}
