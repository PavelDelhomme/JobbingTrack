# 📄 Guide Complet - Création de Toutes les Pages Manquantes

## ✅ Page Déjà Créée

- `/backoffice/users` ✅ **TERMINÉ**

## 📋 Pages à Créer (17 restantes)

### Structure des Commandes

```bash
# Aller dans le dossier frontend
cd frontend/src/app/\(admin\)/backoffice

# Créer les dossiers nécessaires
mkdir -p applications companies contacts interviews calls followups events notifications
mkdir -p data-management api-tester test-data mobile-emulator playwright-tests performance-tests
mkdir -p security/logs security/analysis
```

---

## 1. `/backoffice/applications`

**Fichier**: `frontend/src/app/(admin)/backoffice/applications/page.tsx`

**Option Rapide**: Copier une page existante
```bash
cp frontend/src/app/\(development\)/services/applications/page.tsx \
   frontend/src/app/\(admin\)/backoffice/applications/page.tsx
```

Puis modifier les imports si nécessaire.

---

## 2. `/backoffice/companies`

**Fichier**: `frontend/src/app/(admin)/backoffice/companies/page.tsx`

**Option Rapide**: Copier une page existante
```bash
cp frontend/src/app/\(dashboard\)/entities/companies/page.tsx \
   frontend/src/app/\(admin\)/backoffice/companies/page.tsx
```

---

## 3-10. Pages de Données Standards

Pour les pages suivantes, utilisez ce template de base :

### Template Générique

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import { 
  Plus, Search, Edit, Trash2, RefreshCw,
  // Ajoutez les icônes spécifiques ici
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function [NOM]Page() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (token) {
      loadItems();
    }
  }, [token]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/[ENDPOINT]`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setItems(response.data.[ITEMS_KEY] || []);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    // Adapter la logique de filtrage
    true
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              [TITRE]
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              [DESCRIPTION]
            </p>
          </div>
          <button
            onClick={() => router.push('/backoffice/[PAGE]/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nouveau
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {items.length}
            </p>
          </div>
          {/* Ajouter plus de cards selon les besoins */}
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {/* Adapter les colonnes */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Adapter le contenu */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => router.push(`/backoffice/[PAGE]/${item.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                      Aucun élément trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
```

### Adaptation du Template pour Chaque Page

#### 3. Contacts (`contacts/page.tsx`)
- Remplacer `[NOM]` par `Contacts`
- Remplacer `[ENDPOINT]` par `contacts`
- Remplacer `[ITEMS_KEY]` par `contacts`
- Remplacer `[TITRE]` par `Gestion des Contacts`
- Icon principale: `Users`

#### 4. Interviews (`interviews/page.tsx`)
- Endpoint: `interviews`
- Titre: `Gestion des Entretiens`
- Icon: `Calendar`

#### 5. Calls (`calls/page.tsx`)
- Endpoint: `calls`
- Titre: `Gestion des Appels`
- Icon: `Phone`

#### 6. Followups (`followups/page.tsx`)
- Endpoint: `followups`
- Titre: `Gestion des Relances`
- Icon: `Clock`

#### 7. Events (`events/page.tsx`)
- Endpoint: `events`
- Titre: `Gestion des Événements`
- Icon: `Calendar`

#### 8. Notifications (`notifications/page.tsx`)
- Endpoint: `notifications`
- Titre: `Gestion des Notifications`
- Icon: `Bell`

---

## 11. `/backoffice/data-management`

**Fichier**: `frontend/src/app/(admin)/backoffice/data-management/page.tsx`

**Fonctionnalités** :
- Export de données (CSV, JSON)
- Import de données
- Nettoyage de la base
- Sauvegarde et restauration

```typescript
'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { 
  Download, Upload, Database, Trash2, 
  AlertTriangle, CheckCircle, RefreshCw 
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function DataManagementPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async (type: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/v1/admin/export/${type}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export-${type}-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: `Export ${type} réussi !` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'export' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestion des Données</h1>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Download className="h-6 w-6" />
              Exporter les données
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => handleExport('applications')}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Exporter les candidatures
              </button>
              <button
                onClick={() => handleExport('companies')}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Exporter les entreprises
              </button>
              <button
                onClick={() => handleExport('all')}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Exporter tout
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Importer des données
            </h2>
            <div className="space-y-2">
              <input
                type="file"
                accept=".json,.csv"
                className="w-full py-2 px-4 border border-gray-300 rounded"
              />
              <button className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700">
                Importer
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Zone Dangereuse
          </h2>
          <button className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700">
            Nettoyer les anciennes données (> 1 an)
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
```

---

## 12. `/backoffice/api-tester`

**Fichier**: `frontend/src/app/(admin)/backoffice/api-tester/page.tsx`

**Fonctionnalités** : Tester les endpoints de l'API

```typescript
'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { Play, Terminal } from 'lucide-react';
import axios from 'axios';

export default function APITesterPage() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    try {
      setLoading(true);
      const config: any = { method, url: endpoint };
      
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        config.data = JSON.parse(body);
      }
      
      const result = await axios(config);
      setResponse(result);
    } catch (error: any) {
      setResponse({ error: error.message, response: error.response });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Terminal className="h-8 w-8" />
          Testeur d'API
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-4 py-2 border rounded"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
              
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:8080/api/v1/..."
                className="flex-1 px-4 py-2 border rounded"
              />
              
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                Tester
              </button>
            </div>

            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full px-4 py-2 border rounded h-32 font-mono"
              />
            )}
          </div>
        </div>

        {response && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Réponse</h3>
            <pre className="overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
```

---

## 13-18. Pages Restantes - Instructions Rapides

### 13. Test Data Generator
Créer un générateur de données de test avec Faker.js

### 14. Mobile Emulator
Copier depuis `app/(development)/mobile-emulator/page.tsx`

### 15-16. Tests Playwright & Performance
Afficher les résultats des tests avec graphiques

### 17-18. Security Pages
Utiliser `analyticsService.getSecurityMetrics()` et `getSecuritySummary()`

---

## ⚡ Script d'Installation Rapide

Créez ce script pour automatiser la création :

```bash
#!/bin/bash
# create-all-pages.sh

PAGES=(
  "applications"
  "companies"  
  "contacts"
  "interviews"
  "calls"
  "followups"
  "events"
  "notifications"
  "data-management"
  "api-tester"
  "test-data"
  "mobile-emulator"
  "playwright-tests"
  "performance-tests"
)

for page in "${PAGES[@]}"; do
  mkdir -p "frontend/src/app/(admin)/backoffice/$page"
  echo "✅ Dossier $page créé"
done

mkdir -p "frontend/src/app/(admin)/backoffice/security/logs"
mkdir -p "frontend/src/app/(admin)/backoffice/security/analysis"

echo "🎉 Tous les dossiers sont créés !"
echo "Copiez maintenant le code depuis ce guide dans chaque page.tsx"
```

---

## 📝 Prochaines Étapes

1. Exécuter le script de création des dossiers
2. Copier le template générique et l'adapter pour chaque page
3. Tester chaque page une par une
4. Vérifier les routes dans le menu de navigation

**Temps estimé total** : 4-6 heures pour tout créer et tester

Besoin d'aide pour une page spécifique ? Demandez-moi ! 🚀

