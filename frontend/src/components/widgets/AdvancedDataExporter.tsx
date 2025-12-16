'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileText, Database, Settings, Check, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

interface ExportOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

interface ExportData {
  [key: string]: any[];
}

interface AdvancedDataExporterProps {
  data: ExportData;
  onExport?: (format: 'json&apos; | 'csv', tables: string[]) => void;
  className?: string;
}

export function AdvancedDataExporter({ data, onExport, className = '' }: AdvancedDataExporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'json&apos; | 'csv'>(&apos;csv');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  // Générer dynamiquement les options d'export basées sur les données reçues
  const allExportOptions: ExportOption[] = React.useMemo(() => {
    const options: ExportOption[] = [];

    // Mapper les clés de données aux options d'export
    Object.keys(data).forEach(key => {
      const tableData = data[key];
      if (Array.isArray(tableData) && tableData.length > 0) {
        // Déterminer le nom et l'icône selon la clé
        let name = key.charAt(0).toUpperCase() + key.slice(1);
        let icon = '📄';
        let description = `Données de ${name.toLowerCase()}`;

        // Personnaliser selon le type de données
        switch (key.toLowerCase()) {
          case 'user':
          case 'users':
            name = 'Utilisateurs';
            icon = '👤';
            description = 'Informations des utilisateurs';
            break;
          case 'company':
          case 'companies':
            name = 'Entreprises';
            icon = '🏢';
            description = 'Informations sur les entreprises';
            break;
          case 'application':
          case 'applications':
            name = 'Candidatures';
            icon = '📋';
            description = 'Données des candidatures';
            break;
          case 'contact':
          case 'contacts':
            name = 'Contacts';
            icon = '👥';
            description = 'Coordonnées et informations contacts';
            break;
          case 'interview':
          case 'interviews':
            name = 'Entretiens';
            icon = '📅';
            description = 'Entretiens programmés et passés';
            break;
          case 'call':
          case 'calls':
            name = 'Appels';
            icon = '📞';
            description = 'Historique des appels';
            break;
          case 'errorlogs':
          case 'error_logs':
            name = 'Logs d\&apos;erreurs';
            icon = '❌';
            description = 'Journal des erreurs système';
            break;
          case 'timeline':
            name = 'Timeline';
            icon = '📊';
            description = 'Données temporelles et métriques';
            break;
          case 'metrics':
            name = 'Métriques';
            icon = '📈';
            description = 'Métriques de performance';
            break;
          case 'devmetrics':
          case 'dev_metrics':
            name = 'Métriques Dev';
            icon = '🔧';
            description = 'Métriques avancées pour développeurs';
            break;
        }

        options.push({
          id: key,
          name,
          icon,
          description,
          available: true
        });
      }
    });

    return options;
  }, [data]);

  // Recalculer les options disponibles quand les données changent
  const availableOptions = React.useMemo(() =>
    allExportOptions.filter(option => option.available),
    [data]
  );

  // Initialiser les tables sélectionnées avec les options disponibles
  useEffect(() => {
    console.log('🔄 Initialisation des tables sélectionnées:', {
      optionsDisponibles: availableOptions.length,
      tablesActuelles: Array.from(selectedTables)
    });

    if (availableOptions.length > 0) {
      // Sélectionner automatiquement toutes les options disponibles
      const nouvellesSelections = new Set(availableOptions.map(opt => opt.id));
      setSelectedTables(nouvellesSelections);

      console.log('✅ Tables sélectionnées mises à jour:', Array.from(nouvellesSelections));
    } else {
      setSelectedTables(new Set());
      console.log('⚠️ Aucune option disponible, tables sélectionnées vidées');
    }
  }, [availableOptions]);

  // Debug pour vérifier les données et options
  useEffect(() => {
    console.log('🔍 AdvancedDataExporter Debug:');
    console.log('  📊 Données reçues:', data);
    console.log('  📋 Options générées:&apos;, allExportOptions.length, 'options');
    console.log('  ✅ Options disponibles:&apos;, availableOptions.length, 'options');
    console.log('  🎯 Tables sélectionnées:', Array.from(selectedTables));
    console.log('  📈 Sélection automatique activée');
  }, [data, allExportOptions, availableOptions, selectedTables]);

  // Exposer les fonctions pour le debugging dans la console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testExportData = {
        data,
        availableOptions,
        selectedTables: Array.from(selectedTables),
        allOptions: allExportOptions,
        generateCSV: (tableId: string) => {
          const tableData = data[tableId];
          if (!tableData || tableData.length === 0) {
            console.error(`Aucune donnée disponible pour ${tableId}`);
            return '';
          }
          return generateCSV(tableData, tableId);
        },
        generateJSON: (tableId: string) => {
          const tableData = data[tableId];
          if (!tableData || tableData.length === 0) {
            console.error(`Aucune donnée disponible pour ${tableId}`);
            return '';
          }
          return JSON.stringify(tableData, null, 2);
        },
        exportSelected: async (format: 'json&apos; | 'csv') => {
          const selectedIds = Array.from(selectedTables);
          const exportData: { [key: string]: any } = {};

          for (const tableId of selectedIds) {
            const tableData = data[tableId];
            if (tableData) {
              exportData[tableId] = tableData.map(item => {
                const cleaned = { ...item };
                delete cleaned._id;
                delete cleaned.__v;
                return cleaned;
              });
            }
          }

          if (format === 'csv') {
            if (selectedIds.length === 1) {
              const tableId = selectedIds[0];
              const csvContent = generateCSV(exportData[tableId], tableId);
              console.log('CSV généré:', csvContent);
              return csvContent;
            } else {
              console.log('Export CSV multiple - créerait un ZIP');
              return 'ZIP export simulation';
            }
          } else {
            const jsonContent = JSON.stringify(exportData, null, 2);
            console.log('JSON généré:', jsonContent);
            return jsonContent;
          }
        }
      };
    }
  }, [data, selectedTables, allExportOptions, availableOptions]);

  const handleTableToggle = (tableId: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(tableId)) {
      newSelected.delete(tableId);
    } else {
      newSelected.add(tableId);
    }
    setSelectedTables(newSelected);
  };

  const handleSelectAll = () => {
    console.log('🔄 Sélection de TOUTES les tables disponibles');
    // Sélectionner toutes les options disponibles actuellement
    const newSelected = new Set(availableOptions.map(opt => opt.id));
    setSelectedTables(newSelected);
    console.log('✅ Toutes les tables sélectionnées:', Array.from(newSelected));
  };

  const handleDeselectAll = () => {
    console.log('🔄 Désélection de TOUTES les tables');
    setSelectedTables(new Set());
    console.log('✅ Toutes les tables désélectionnées');
  };

  const generateCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Échapper les valeurs qui contiennent des virgules, guillemets ou retours à la ligne
          if (typeof value === 'string&apos; && (value.includes(',') || value.includes('"') || value.includes(&apos;\n'))) {
            return `"${value.replace(/"/g, &apos;""&apos;)}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const generateJSON = (data: any[], filename: string) => {
    return JSON.stringify(data, null, 2);
  };

  const handleExport = async () => {
    if (selectedTables.size === 0) return;

    setIsExporting(true);
    setExportProgress('');

    try {
      const tablesToExport = Array.from(selectedTables);
      const exportData: { [key: string]: any } = {};

      // Préparer les données pour l'export
      for (const tableId of tablesToExport) {
        const tableData = data[tableId];
        if (tableData) {
          // Nettoyer les données pour l'export
          exportData[tableId] = tableData.map(item => {
            const cleaned = { ...item };
            // Supprimer les champs internes ou sensibles
            delete cleaned._id;
            delete cleaned.__v;
            return cleaned;
          });
        }
      }

      if (selectedFormat === 'csv') {
        // Export CSV individuel ou combiné
        if (tablesToExport.length === 1) {
          const tableId = tablesToExport[0];
          const csvContent = generateCSV(exportData[tableId], `${tableId}-${new Date().toISOString().split('T')[0]}`);

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${tableId}-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          // Export ZIP pour plusieurs tables
          setExportProgress('Préparation de l\&apos;archive...');

          // Créer un ZIP avec plusieurs fichiers CSV
          const zip = new JSZip();
          for (const tableId of tablesToExport) {
            const csvContent = generateCSV(exportData[tableId], tableId);
            zip.file(`${tableId}.csv`, csvContent);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = window.URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `export-data-${new Date().toISOString().split('T')[0]}.zip`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } else {
        // Export JSON
        if (tablesToExport.length === 1) {
          const tableId = tablesToExport[0];
          const jsonContent = generateJSON(exportData[tableId], `${tableId}-${new Date().toISOString().split('T')[0]}`);

          const blob = new Blob([jsonContent], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${tableId}-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          // Export JSON combiné
          const combinedData = tablesToExport.reduce((acc, tableId) => {
            acc[tableId] = exportData[tableId];
            return acc;
          }, {} as { [key: string]: any });

          const jsonContent = JSON.stringify(combinedData, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `export-data-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }

      setExportProgress('✅ Export terminé avec succès !');
      setTimeout(() => {
        setIsOpen(false);
        setExportProgress('');
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de l\&apos;export:', error);
      setExportProgress('❌ Erreur lors de l\&apos;export');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = selectedTables.size;
  const availableCount = availableOptions.length;

  // Vérifier si toutes les tables disponibles sont sélectionnées
  const allSelected = availableCount > 0 && selectedCount === availableCount;
  const noneSelected = selectedCount === 0;

  return (
    <div className={`relative ${className}`}>
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-2 flex items-center gap-2 transform hover:scale-105 active:scale-95 ${
          allSelected
            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-500 hover:border-green-600 text-white'
            : noneSelected
            ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 border-gray-500 hover:border-gray-600 text-white'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-blue-500 hover:border-blue-600 text-white'
        }`}
      >
        <Download className="h-4 w-4" />
        <span className="text-sm font-medium">Exporter</span>
        {selectedCount > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full min-w-[20px] ${
            allSelected ? 'bg-green-400&apos; : 'bg-blue-400'
          }`}>
            {selectedCount}/{availableCount}
          </span>
        )}
        {availableCount > 0 && (
          <span className="text-xs opacity-75">
            {allSelected ? '✅ Tout&apos; : noneSelected ? '❌ Aucun' : &apos;⚡ Partiel'}
          </span>
        )}
      </button>

      {/* Panel d'export */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-top-2 duration-200">
          {/* En-tête */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Export de données
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Sélecteur de format */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`flex-1 h-10 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  selectedFormat === 'csv'
                    ? 'bg-blue-500 text-white shadow-md border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">CSV</span>
              </button>
              <button
                onClick={() => setSelectedFormat('json')}
                className={`flex-1 h-10 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  selectedFormat === 'json'
                    ? 'bg-green-500 text-white shadow-md border-2 border-green-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">JSON</span>
              </button>
            </div>

            {/* Sélection des tables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sélectionner les tables
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    allSelected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : noneSelected
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {selectedCount}/{availableCount} sélectionnée{selectedCount > 1 ? 's&apos; : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    disabled={allSelected}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      allSelected
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                    }`}
                  >
                    {allSelected ? '✅ Tout&apos; : 'Tout'}
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    disabled={noneSelected}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      noneSelected
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                    }`}
                  >
                    {noneSelected ? '❌ Aucun&apos; : 'Aucun'}
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {availableOptions.map((option) => {
                  const isSelected = selectedTables.has(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleTableToggle(option.id)}
                      className={`w-full p-3 rounded-lg transition-all duration-200 flex items-center gap-3 group ${
                        isSelected
                          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-full ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-200 dark:bg-gray-600 group-hover:bg-gray-300 dark:group-hover:bg-gray-500'
                      }`}>
                        <span className={`text-lg ${isSelected ? 'opacity-100&apos; : 'opacity-60'}`}>
                          {option.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`text-sm font-medium ${isSelected ? 'text-green-900 dark:text-green-100&apos; : 'text-gray-700 dark:text-gray-300'}`}>
                          {option.name}
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-green-700 dark:text-green-300&apos; : 'text-gray-500 dark:text-gray-400'}`}>
                          {option.description}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full group-hover:border-gray-400 dark:group-hover:border-gray-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barre de progression */}
            {exportProgress && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  {isExporting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-lg">{exportProgress.startsWith('✅&apos;) ? '✅' : &apos;❌&apos;}</span>
                  )}
                  <span className={`text-sm ${exportProgress.startsWith('❌&apos;) ? 'text-red-600 dark:text-red-400' : &apos;text-blue-600 dark:text-blue-400'}`}>
                    {exportProgress}
                  </span>
                </div>
              </div>
            )}

            {/* Bouton d'export */}
            <button
              onClick={handleExport}
              disabled={selectedCount === 0 || isExporting}
              className={`w-full h-12 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mt-4 ${
                selectedCount === 0 || isExporting
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 border-2 border-green-500 hover:border-green-600'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span className="text-sm font-medium">Export en cours...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium">
                      Exporter {selectedCount} table{selectedCount > 1 ? 's&apos; : ''}
                    </span>
                    <span className="text-xs opacity-90">
                      en {selectedFormat.toUpperCase()} • {allSelected ? 'Toutes les données&apos; : 'Données sélectionnées'}
                    </span>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
