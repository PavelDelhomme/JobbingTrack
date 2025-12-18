'use client';

import { useState, useEffect } from 'react';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Edit, Save, X, CheckCircle, XCircle, Archive, ArchiveRestore, AlertTriangle, Shield } from '@/lib/icons';

interface AdvancedEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: any;
  tableName: string;
  onSave: (updatedData: any) => Promise<void>;
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'boolean' | 'textarea' | 'select' | 'switch';
  options?: string[];
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

export function AdvancedEditModal({ isOpen, onClose, rowData, tableName, onSave }: AdvancedEditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'status' | 'advanced'>('basic');

  useEffect(() => {
    if (rowData && isOpen) {
      setFormData({ ...rowData });
    }
  }, [rowData, isOpen]);

  const getFieldConfig = (tableName: string, key: string): FieldConfig => {
    const commonFields: Record<string, FieldConfig> = {
      id: { key, label: 'ID', type: 'text', readOnly: true },
      createdAt: { key, label: 'Créé le', type: 'date', readOnly: true },
      updatedAt: { key, label: 'Modifié le', type: 'date', readOnly: true },
      is_active: { key, label: 'Actif', type: 'switch' },
      is_deleted: { key, label: 'Supprimé', type: 'switch' },
      is_archived: { key, label: 'Archivé', type: 'switch' },
      is_verified: { key, label: 'Vérifié', type: 'switch' },
      is_public: { key, label: 'Public', type: 'switch' },
      status: {
        key,
        label: 'Statut',
        type: 'select',
        options: ['active', 'inactive', 'pending', 'suspended', 'archived', 'deleted']
      },
      priority: {
        key,
        label: 'Priorité',
        type: 'select',
        options: ['low', 'medium', 'high', 'urgent']
      }
    };

    // Configuration spécifique par table
    const tableSpecificFields: Record<string, Record<string, FieldConfig>> = {
      User: {
        email: { key, label: 'Email', type: 'email', required: true },
        firstName: { key, label: 'Prénom', type: 'text' },
        lastName: { key, label: 'Nom', type: 'text' },
        role: {
          key,
          label: 'Rôle',
          type: 'select',
          options: ['USER', 'ADMIN', 'SUPER_ADMIN']
        },
        is_verified: { key, label: 'Vérifié', type: 'switch' },
        is_active: { key, label: 'Actif', type: 'switch' },
        lastLoginAt: { key, label: 'Dernière connexion', type: 'date', readOnly: true }
      },
      Company: {
        name: { key, label: 'Nom', type: 'text', required: true },
        sector: { key, label: 'Secteur', type: 'text' },
        size: {
          key,
          label: 'Taille',
          type: 'select',
          options: ['startup', 'pme', 'entreprise', 'grand_compte']
        },
        website: { key, label: 'Site web', type: 'text' },
        is_active: { key, label: 'Actif', type: 'switch' }
      },
      Application: {
        title: { key, label: 'Titre', type: 'text', required: true },
        status: {
          key,
          label: 'Statut',
          type: 'select',
          options: ['draft', 'submitted', 'in_review', 'accepted', 'rejected', 'archived']
        },
        priority: {
          key,
          label: 'Priorité',
          type: 'select',
          options: ['low', 'medium', 'high']
        },
        is_active: { key, label: 'Actif', type: 'switch' }
      }
    };

    // Chercher d'abord dans les champs spécifiques à la table
    const tableFields = tableSpecificFields[tableName] || {};
    if (tableFields[key]) {
      return tableFields[key];
    }

    // Sinon chercher dans les champs communs
    return commonFields[key] || {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      type: typeof rowData?.[key] === 'boolean' ? 'switch' :
            typeof rowData?.[key] === 'number' ? 'number' :
            key.includes('email') ? 'email' :
            key.includes('date') || key.includes('At') ? 'date' :
            key.includes('description') || key.includes('notes') ? 'textarea' :
            'text'
    };
  };

  const getFieldValue = (key: string, value: any): string | number | readonly string[] | undefined => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (key: string, value: any) => {
    const config = getFieldConfig(tableName, key);

    if (config.readOnly) {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {config.label}
          </label>
          <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400">
            {getFieldValue(key, value)}
          </div>
        </div>
      );
    }

    switch (config.type) {
      case 'switch':
        return (
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                value ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                {value ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {config.label}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {value ? 'Activé' : 'Désactivé'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleInputChange(key, !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label} {config.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={getFieldValue(key, value)}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner...</option>
              {config.options?.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label} {config.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={getFieldValue(key, value)}
              onChange={(e) => handleInputChange(key, e.target.value)}
              rows={3}
              placeholder={config.placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label}
            </label>
            <input
              type="datetime-local"
              value={value ? new Date(value).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label} {config.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={getFieldValue(key, value)}
              onChange={(e) => handleInputChange(key, parseInt(e.target.value) || 0)}
              placeholder={config.placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label} {config.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={getFieldValue(key, value)}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={config.placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label} {config.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={getFieldValue(key, value)}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={config.placeholder}
              disabled={config.readOnly}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                config.readOnly
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>
        );
    }
  };

  const getStatusFields = () => {
    return Object.keys(formData).filter(key =>
      key.includes('is_') ||
      key === 'status' ||
      key === 'priority' ||
      key.includes('active') ||
      key.includes('deleted') ||
      key.includes('archived')
    );
  };

  const getBasicFields = () => {
    return Object.keys(formData).filter(key =>
      !key.includes('is_') &&
      key !== 'status' &&
      key !== 'priority' &&
      !key.includes('active') &&
      !key.includes('deleted') &&
      !key.includes('archived') &&
      key !== 'id' &&
      key !== 'createdAt' &&
      key !== 'updatedAt'
    );
  };

  const getAdvancedFields = () => {
    return ['id', 'createdAt', 'updatedAt'];
  };

  if (!isOpen || !rowData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Edit className="h-5 w-5 text-white" />
              </div>
              Modifier l'enregistrement
            </h2>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { id: 'basic', label: 'Informations', icon: '📝' },
              { id: 'status', label: 'Statut', icon: '⚙️' },
              { id: 'advanced', label: 'Avancé', icon: '🔧' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  Informations principales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getBasicFields().map(key => (
                    <div key={key}>
                      {renderField(key, formData[key])}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  Gestion du statut
                </h3>
                <div className="space-y-4">
                  {getStatusFields().map(key => (
                    <div key={key}>
                      {renderField(key, formData[key])}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions rapides */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  Actions rapides
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => {
                      setFormData((prev: any) => ({ ...prev, is_active: true, is_deleted: false, is_archived: false }));
                    }}
                    className="h-12 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Activer</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormData((prev: any) => ({ ...prev, is_active: false }));
                    }}
                    className="h-12 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Désactiver</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormData((prev: any) => ({ ...prev, is_archived: true }));
                    }}
                    className="h-12 px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    <Archive className="h-4 w-4" />
                    <span className="text-xs font-medium">Archiver</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormData((prev: any) => ({ ...prev, is_archived: false }));
                    }}
                    className="h-12 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    <span className="text-xs font-medium">Désarchiver</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-xl">🔧</span>
                  Informations système
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getAdvancedFields().map(key => (
                    <div key={key}>
                      {renderField(key, formData[key])}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4" />
                <span>Modifications en cours</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Object.keys(formData).length} champs • {tableName}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="h-10 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`h-10 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  isSaving
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
