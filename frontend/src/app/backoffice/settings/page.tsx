'use client';

import { useState } from 'react';
import { Save, RotateCcw, Palette, Layout, Bell, Eye, Globe, Database, Linkedin, Calendar } from 'lucide-react';
import { useCustomization } from '@/hooks/useCustomization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { settings, saveSettings, resetSettings, isLoading } = useCustomization();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Mettre à jour les paramètres locaux
  const updateLocalSettings = (updates: Partial<typeof localSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(settings));
  };

  // Sauvegarder les paramètres
  const handleSave = async () => {
    await saveSettings(localSettings);
    setHasChanges(false);
  };

  // Réinitialiser aux paramètres par défaut
  const handleReset = async () => {
    await resetSettings();
    setLocalSettings(settings);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paramètres de personnalisation</h1>
          <p className="text-gray-600">Personnalisez votre expérience JobbingTrack</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-gray-600"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Onglets de paramètres */}
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Disposition</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Accessibilité</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Données</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Intégrations</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Apparence */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Thème et couleurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sélecteur de thème */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select
                  value={localSettings.theme}
                  onValueChange={(value: 'light' | 'dark' | 'auto') =>
                    updateLocalSettings({ theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="auto">Automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sélecteur de couleur principale */}
              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex gap-2">
                  {[
                    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
                    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => updateLocalSettings({ primaryColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        localSettings.primaryColor === color
                          ? 'border-gray-900 dark:border-gray-100 scale-110'
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={localSettings.primaryColor}
                  onChange={(e) => updateLocalSettings({ primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
              </div>

              {/* Sélecteur de couleur d'accent */}
              <div className="space-y-2">
                <Label>Couleur d'accent</Label>
                <div className="flex gap-2">
                  {[
                    '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#EC4899', '#06B6D4', '#84CC16', '#F97316'
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => updateLocalSettings({ accentColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        localSettings.accentColor === color
                          ? 'border-gray-900 dark:border-gray-100 scale-110'
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={localSettings.accentColor}
                  onChange={(e) => updateLocalSettings({ accentColor: e.target.value })}
                  className="w-20 h-10"
                />
              </div>

              {/* Aperçu des couleurs */}
              <div className="p-4 border rounded-lg">
                <Label className="mb-2 block">Aperçu</Label>
                <div className="flex gap-2">
                  <div
                    className="w-16 h-8 rounded"
                    style={{ backgroundColor: localSettings.primaryColor }}
                  />
                  <div
                    className="w-16 h-8 rounded"
                    style={{ backgroundColor: localSettings.accentColor }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Disposition */}
        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Disposition et affichage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode compact */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Mode compact</Label>
                  <p className="text-sm text-gray-600">Réduit les espacements et la taille du texte</p>
                </div>
                <Switch
                  checked={localSettings.compactMode}
                  onCheckedChange={(checked) => updateLocalSettings({ compactMode: checked })}
                />
              </div>

              <Separator />

              {/* Affichage des animations */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Animations</Label>
                  <p className="text-sm text-gray-600">Active les animations et transitions</p>
                </div>
                <Switch
                  checked={localSettings.showAnimations}
                  onCheckedChange={(checked) => updateLocalSettings({ showAnimations: checked })}
                />
              </div>

              <Separator />

              {/* Disposition du tableau de bord */}
              <div className="space-y-2">
                <Label>Disposition du tableau de bord</Label>
                <Select
                  value={localSettings.dashboardLayout}
                  onValueChange={(value: 'grid' | 'list' | 'kanban') =>
                    updateLocalSettings({ dashboardLayout: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grille</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                    <SelectItem value="kanban">Kanban</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Éléments par page */}
              <div className="space-y-2">
                <Label>Éléments par page</Label>
                <Select
                  value={localSettings.itemsPerPage.toString()}
                  onValueChange={(value) => updateLocalSettings({ itemsPerPage: parseInt(value) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Préférences de notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notifications activées */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Notifications activées</Label>
                  <p className="text-sm text-gray-600">Recevoir les notifications de l'application</p>
                </div>
                <Switch
                  checked={localSettings.notifications.enabled}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      notifications: { ...localSettings.notifications, enabled: checked }
                    })
                  }
                />
              </div>

              <Separator />

              {/* Son des notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Son des notifications</Label>
                  <p className="text-sm text-gray-600">Jouer un son lors des notifications</p>
                </div>
                <Switch
                  checked={localSettings.notifications.sound}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      notifications: { ...localSettings.notifications, sound: checked }
                    })
                  }
                />
              </div>

              <Separator />

              {/* Position des notifications */}
              <div className="space-y-2">
                <Label>Position des notifications</Label>
                <Select
                  value={localSettings.notifications.position}
                  onValueChange={(value: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') =>
                    updateLocalSettings({
                      notifications: { ...localSettings.notifications, position: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-right">Haut droite</SelectItem>
                    <SelectItem value="top-left">Haut gauche</SelectItem>
                    <SelectItem value="bottom-right">Bas droite</SelectItem>
                    <SelectItem value="bottom-left">Bas gauche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Durée d'affichage */}
              <div className="space-y-2">
                <Label>Durée d'affichage (secondes)</Label>
                <Select
                  value={localSettings.notifications.duration.toString()}
                  onValueChange={(value) =>
                    updateLocalSettings({
                      notifications: { ...localSettings.notifications, duration: parseInt(value) }
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3000">3 secondes</SelectItem>
                    <SelectItem value="5000">5 secondes</SelectItem>
                    <SelectItem value="10000">10 secondes</SelectItem>
                    <SelectItem value="0">Jusqu'à fermeture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Accessibilité */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Options d'accessibilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contraste élevé */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Contraste élevé</Label>
                  <p className="text-sm text-gray-600">Améliore la visibilité des éléments</p>
                </div>
                <Switch
                  checked={localSettings.accessibility.highContrast}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      accessibility: { ...localSettings.accessibility, highContrast: checked }
                    })
                  }
                />
              </div>

              <Separator />

              {/* Texte agrandi */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Texte agrandi</Label>
                  <p className="text-sm text-gray-600">Augmente la taille du texte</p>
                </div>
                <Switch
                  checked={localSettings.accessibility.largeText}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      accessibility: { ...localSettings.accessibility, largeText: checked }
                    })
                  }
                />
              </div>

              <Separator />

              {/* Réduire les animations */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Réduire les animations</Label>
                  <p className="text-sm text-gray-600">Désactive les animations pour les utilisateurs sensibles</p>
                </div>
                <Switch
                  checked={localSettings.accessibility.reduceMotion}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      accessibility: { ...localSettings.accessibility, reduceMotion: checked }
                    })
                  }
                />
              </div>

              <Separator />

              {/* Indicateurs de focus */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Indicateurs de focus</Label>
                  <p className="text-sm text-gray-600">Améliore la visibilité du focus clavier</p>
                </div>
                <Switch
                  checked={localSettings.accessibility.focusIndicators}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      accessibility: { ...localSettings.accessibility, focusIndicators: checked }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Données et confidentialité */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Données et confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Langue */}
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select
                  value={localSettings.language}
                  onValueChange={(value) => updateLocalSettings({ language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Format de date */}
              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select
                  value={localSettings.dateFormat}
                  onValueChange={(value) => updateLocalSettings({ dateFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Format d'heure */}
              <div className="space-y-2">
                <Label>Format d'heure</Label>
                <Select
                  value={localSettings.timeFormat}
                  onValueChange={(value: '12h' | '24h') => updateLocalSettings({ timeFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 heures</SelectItem>
                    <SelectItem value="12h">12 heures (AM/PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Durée de rétention du cache */}
              <div className="space-y-2">
                <Label>Durée de rétention du cache (jours)</Label>
                <Select
                  value={localSettings.dataRetention.cacheDuration.toString()}
                  onValueChange={(value) =>
                    updateLocalSettings({
                      dataRetention: { ...localSettings.dataRetention, cacheDuration: parseInt(value) }
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 jour</SelectItem>
                    <SelectItem value="3">3 jours</SelectItem>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Mode hors ligne */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Mode hors ligne activé</Label>
                  <p className="text-sm text-gray-600">Permet de travailler sans connexion internet</p>
                </div>
                <Switch
                  checked={localSettings.dataRetention.offlineMode}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({
                      dataRetention: { ...localSettings.dataRetention, offlineMode: checked }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Intégrations */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-6">
            {/* Intégration LinkedIn */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Linkedin className="h-5 w-5 text-blue-600" />
                  LinkedIn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Connectez votre compte LinkedIn pour importer automatiquement votre profil professionnel,
                    rechercher des entreprises et gérer votre réseau professionnel.
                  </p>
                </div>

                {/* Placeholder pour le composant LinkedInIntegration */}
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Linkedin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">
                    L'intégration LinkedIn sera disponible ici une fois configurée.
                  </p>
                  <Button variant="outline">
                    Configurer LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Intégration Calendrier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Calendrier externe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Synchronisez vos entretiens avec Google Calendar ou Outlook Calendar
                    pour une meilleure gestion de votre emploi du temps.
                  </p>
                </div>

                {/* Placeholder pour le composant CalendarIntegration */}
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">
                    L'intégration calendrier sera disponible ici une fois configurée.
                  </p>
                  <Button variant="outline">
                    Configurer Calendrier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Informations sur les intégrations */}
            <Card>
              <CardHeader>
                <CardTitle>À propos des intégrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">Sécurité et confidentialité</h4>
                    <p className="text-blue-700">
                      Toutes les intégrations respectent les conditions d'utilisation des plateformes tierces.
                      Vos données sont chiffrées et ne sont utilisées que pour améliorer votre expérience.
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-1">Synchronisation automatique</h4>
                    <p className="text-green-700">
                      Les données sont synchronisées en temps réel. Vous pouvez activer ou désactiver
                      chaque intégration selon vos besoins.
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-1">Gestion des permissions</h4>
                    <p className="text-orange-700">
                      Vous contrôlez entièrement les permissions accordées à chaque plateforme.
                      Vous pouvez révoquer l'accès à tout moment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Indicateur de modifications non sauvegardées */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Modifications non sauvegardées
          </div>
        </div>
      )}
    </div>
  );
}