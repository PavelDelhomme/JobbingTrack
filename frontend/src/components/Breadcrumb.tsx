'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items = [], className = '' }: BreadcrumbProps) {
  const pathname = usePathname();

  // Générer automatiquement les éléments du fil d'Ariane basé sur l'URL
  const generateBreadcrumbItems = (): BreadcrumbItem[] => {
    if (items.length > 0) return items;

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Accueil', href: '/', icon: '🏠' }
    ];

    // Construire le chemin progressif
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      if (segment === 'backoffice') {
        breadcrumbItems.push({
          label: 'Backoffice',
          href: '/backoffice',
          icon: '⚙️'
        });
      } else if (index === pathSegments.length - 1) {
        // Dernier segment = page actuelle
        const labels: Record<string, string> = {
          'applications': 'Candidatures',
          'companies': 'Entreprises',
          'contacts': 'Contacts',
          'interviews': 'Entretiens',
          'calls': 'Appels',
          'followups': 'Relances',
          'events': 'Événements',
          'notifications': 'Notifications',
          'archives': 'Archives',
          'trash': 'Corbeille',
          'users': 'Utilisateurs',
          'services': 'Services',
          'data-management': 'Gestion Données',
          'settings': 'Paramètres',
          'api-tester': 'Testeur API',
          'test-data': 'Données de Test',
          'mobile-emulator': 'Émulateur Mobile',
          'statistics': 'Statistiques',
        };

        const icons: Record<string, string> = {
          'applications': '📝',
          'companies': '🏢',
          'contacts': '👤',
          'interviews': '📅',
          'calls': '📞',
          'followups': '📧',
          'events': '🗓️',
          'notifications': '🔔',
          'archives': '📦',
          'trash': '🗑️',
          'users': '👥',
          'services': '🔧',
          'data-management': '💾',
          'settings': '⚙️',
          'api-tester': '🧪',
          'test-data': '🎲',
          'mobile-emulator': '📱',
          'statistics': '📈',
        };

        breadcrumbItems.push({
          label: labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
          icon: icons[segment] || '📄'
        });
      }
    });

    return breadcrumbItems;
  };

  const breadcrumbItems = generateBreadcrumbItems();

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 dark:text-gray-600">/</span>
          )}

          {item.href && index < breadcrumbItems.length - 1 ? (
            <Link
              href={item.href}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {item.icon && <span className="text-xs">{item.icon}</span>}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30">
              {item.icon && <span className="text-xs">{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
