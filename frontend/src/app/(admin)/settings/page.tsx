"use client";

import { useState } from "react";
import {
  Save,
  RotateCcw,
  Palette,
  Layout,
  Bell,
  Eye,
  Globe,
  Database,
  Linkedin,
  Calendar,
  Wifi,
} from "lucide-react";
import { SecurityAlertEmailSettings } from "@/components/security/SecurityAlertEmailSettings";
import { AdminLayout } from "@/components/features";
import { useCustomization } from "@/hooks/useCustomization";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { OfflineStatus } from "@/components/widgets";
import { LinkedInIntegration } from "@/components/integrations";
import { CalendarIntegration } from "@/components/integrations";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Switch } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Separator } from "@/components/ui";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

const settingsSelectClass = cn(
  "flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
);

export default function SettingsPage() {
  const { settings, saveSettings, resetSettings, isLoading } =
    useCustomization();
  const { t, setLocale } = useTranslation();
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

  // Gérer le changement de langue
  const handleLanguageChange = (newLanguage: string) => {
    updateLocalSettings({ language: newLanguage });
    setLocale(newLanguage as any); // Mettre à jour immédiatement pour voir les changements
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t("settings.loading")}</span>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
            <p className="text-gray-600">{t("settings.customization")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-gray-600"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("settings.reset")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {t("settings.save")}
            </Button>
          </div>
        </div>

        {/* Onglets de paramètres */}
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("settings.appearance")}
              </span>
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.layout")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("settings.notifications")}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="accessibility"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("settings.accessibility")}
              </span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.data")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("settings.integrations")}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Apparence */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t("settings.appearance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sélecteur de thème */}
                <div className="space-y-2">
                  <Label>{t("settings.theme")}</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.theme}
                    onChange={(e) =>
                      updateLocalSettings({
                        theme: e.target.value as "light" | "dark" | "auto",
                      })
                    }
                  >
                    <option value="light">{t("settings.themeLight")}</option>
                    <option value="dark">{t("settings.themeDark")}</option>
                    <option value="auto">{t("settings.themeAuto")}</option>
                  </select>
                </div>

                {/* Sélecteur de couleur principale */}
                <div className="space-y-2">
                  <Label>{t("settings.primaryColor")}</Label>
                  <div className="flex gap-2">
                    {[
                      "#3B82F6",
                      "#EF4444",
                      "#10B981",
                      "#F59E0B",
                      "#8B5CF6",
                      "#EC4899",
                      "#06B6D4",
                      "#84CC16",
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          updateLocalSettings({ primaryColor: color })
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          localSettings.primaryColor === color
                            ? "border-gray-900 dark:border-gray-100 scale-110"
                            : "border-gray-300 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={localSettings.primaryColor}
                    onChange={(e) =>
                      updateLocalSettings({ primaryColor: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                </div>

                {/* Sélecteur de couleur d'accent */}
                <div className="space-y-2">
                  <Label>Couleur d'accent</Label>
                  <div className="flex gap-2">
                    {[
                      "#10B981",
                      "#F59E0B",
                      "#EF4444",
                      "#8B5CF6",
                      "#EC4899",
                      "#06B6D4",
                      "#84CC16",
                      "#F97316",
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          updateLocalSettings({ accentColor: color })
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          localSettings.accentColor === color
                            ? "border-gray-900 dark:border-gray-100 scale-110"
                            : "border-gray-300 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={localSettings.accentColor}
                    onChange={(e) =>
                      updateLocalSettings({ accentColor: e.target.value })
                    }
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
                    <p className="text-sm text-gray-600">
                      Réduit les espacements et la taille du texte
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.compactMode}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({ compactMode: checked })
                    }
                  />
                </div>

                <Separator />

                {/* Affichage des animations */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Animations</Label>
                    <p className="text-sm text-gray-600">
                      Active les animations et transitions
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.showAnimations}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({ showAnimations: checked })
                    }
                  />
                </div>

                <Separator />

                {/* Disposition du tableau de bord */}
                <div className="space-y-2">
                  <Label>Disposition du tableau de bord</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.dashboardLayout}
                    onChange={(e) =>
                      updateLocalSettings({
                        dashboardLayout: e.target.value as
                          | "grid"
                          | "list"
                          | "kanban",
                      })
                    }
                  >
                    <option value="grid">Grille</option>
                    <option value="list">Liste</option>
                    <option value="kanban">Kanban</option>
                  </select>
                </div>

                <Separator />

                {/* Éléments par page */}
                <div className="space-y-2">
                  <Label>Éléments par page</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.itemsPerPage.toString()}
                    onChange={(e) =>
                      updateLocalSettings({
                        itemsPerPage: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
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
                    <p className="text-sm text-gray-600">
                      Recevoir les notifications de l'application
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.enabled}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        notifications: {
                          ...localSettings.notifications,
                          enabled: checked,
                        },
                      })
                    }
                  />
                </div>

                <Separator />

                {/* Son des notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Son des notifications</Label>
                    <p className="text-sm text-gray-600">
                      Jouer un son lors des notifications
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.sound}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        notifications: {
                          ...localSettings.notifications,
                          sound: checked,
                        },
                      })
                    }
                  />
                </div>

                <Separator />

                {/* Position des notifications */}
                <div className="space-y-2">
                  <Label>Position des notifications</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.notifications.position}
                    onChange={(e) =>
                      updateLocalSettings({
                        notifications: {
                          ...localSettings.notifications,
                          position: e.target.value as
                            | "top-right"
                            | "top-left"
                            | "bottom-right"
                            | "bottom-left",
                        },
                      })
                    }
                  >
                    <option value="top-right">Haut droite</option>
                    <option value="top-left">Haut gauche</option>
                    <option value="bottom-right">Bas droite</option>
                    <option value="bottom-left">Bas gauche</option>
                  </select>
                </div>

                <Separator />

                {/* Durée d'affichage */}
                <div className="space-y-2">
                  <Label>Durée d'affichage (secondes)</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.notifications.duration.toString()}
                    onChange={(e) =>
                      updateLocalSettings({
                        notifications: {
                          ...localSettings.notifications,
                          duration: parseInt(e.target.value, 10),
                        },
                      })
                    }
                  >
                    <option value="3000">3 secondes</option>
                    <option value="5000">5 secondes</option>
                    <option value="10000">10 secondes</option>
                    <option value="0">Jusqu'à fermeture</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <SecurityAlertEmailSettings />
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
                    <p className="text-sm text-gray-600">
                      Améliore la visibilité des éléments
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.accessibility.highContrast}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        accessibility: {
                          ...localSettings.accessibility,
                          highContrast: checked,
                        },
                      })
                    }
                  />
                </div>

                <Separator />

                {/* Texte agrandi */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Texte agrandi</Label>
                    <p className="text-sm text-gray-600">
                      Augmente la taille du texte
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.accessibility.largeText}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        accessibility: {
                          ...localSettings.accessibility,
                          largeText: checked,
                        },
                      })
                    }
                  />
                </div>

                <Separator />

                {/* Réduire les animations */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Réduire les animations</Label>
                    <p className="text-sm text-gray-600">
                      Désactive les animations pour les utilisateurs sensibles
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.accessibility.reduceMotion}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        accessibility: {
                          ...localSettings.accessibility,
                          reduceMotion: checked,
                        },
                      })
                    }
                  />
                </div>

                <Separator />

                {/* Indicateurs de focus */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Indicateurs de focus</Label>
                    <p className="text-sm text-gray-600">
                      Améliore la visibilité du focus clavier
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.accessibility.focusIndicators}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        accessibility: {
                          ...localSettings.accessibility,
                          focusIndicators: checked,
                        },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Données et confidentialité */}
          <TabsContent value="data" className="space-y-6">
            {/* Support Offline */}
            <OfflineStatus showDetails={true} />

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
                  <Label>{t("settings.language")}</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    <option value="fr">{t("settings.languageFr")}</option>
                    <option value="en">{t("settings.languageEn")}</option>
                    <option value="es">{t("settings.languageEs")}</option>
                    <option value="de">{t("settings.languageDe")}</option>
                  </select>
                </div>

                <Separator />

                {/* Format de date */}
                <div className="space-y-2">
                  <Label>Format de date</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.dateFormat}
                    onChange={(e) =>
                      updateLocalSettings({ dateFormat: e.target.value })
                    }
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <Separator />

                {/* Format d'heure */}
                <div className="space-y-2">
                  <Label>Format d'heure</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.timeFormat}
                    onChange={(e) =>
                      updateLocalSettings({
                        timeFormat: e.target.value as "12h" | "24h",
                      })
                    }
                  >
                    <option value="24h">24 heures</option>
                    <option value="12h">12 heures (AM/PM)</option>
                  </select>
                </div>

                <Separator />

                {/* Durée de rétention du cache */}
                <div className="space-y-2">
                  <Label>Durée de rétention du cache (jours)</Label>
                  <select
                    className={settingsSelectClass}
                    value={localSettings.dataRetention.cacheDuration.toString()}
                    onChange={(e) =>
                      updateLocalSettings({
                        dataRetention: {
                          ...localSettings.dataRetention,
                          cacheDuration: parseInt(e.target.value, 10),
                        },
                      })
                    }
                  >
                    <option value="1">1 jour</option>
                    <option value="3">3 jours</option>
                    <option value="7">7 jours</option>
                    <option value="30">30 jours</option>
                  </select>
                </div>

                <Separator />

                {/* Mode hors ligne */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Mode hors ligne activé</Label>
                    <p className="text-sm text-gray-600">
                      Permet de travailler sans connexion internet
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.dataRetention.offlineMode}
                    onCheckedChange={(checked: boolean) =>
                      updateLocalSettings({
                        dataRetention: {
                          ...localSettings.dataRetention,
                          offlineMode: checked,
                        },
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
                      Connectez votre compte LinkedIn pour importer
                      automatiquement votre profil professionnel, rechercher des
                      entreprises et gérer votre réseau professionnel.
                    </p>
                  </div>

                  {/* Placeholder pour le composant LinkedInIntegration */}
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Linkedin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">
                      L'intégration LinkedIn sera disponible ici une fois
                      configurée.
                    </p>
                    <Button variant="outline">Configurer LinkedIn</Button>
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
                      Synchronisez vos entretiens avec Google Calendar ou
                      Outlook Calendar pour une meilleure gestion de votre
                      emploi du temps.
                    </p>
                  </div>

                  {/* Placeholder pour le composant CalendarIntegration */}
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">
                      L'intégration calendrier sera disponible ici une fois
                      configurée.
                    </p>
                    <Button variant="outline">Configurer Calendrier</Button>
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
                      <h4 className="font-medium text-blue-900 mb-1">
                        Sécurité et confidentialité
                      </h4>
                      <p className="text-blue-700">
                        Toutes les intégrations respectent les conditions
                        d'utilisation des plateformes tierces. Vos données sont
                        chiffrées et ne sont utilisées que pour améliorer votre
                        expérience.
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">
                        Synchronisation automatique
                      </h4>
                      <p className="text-green-700">
                        Les données sont synchronisées en temps réel. Vous
                        pouvez activer ou désactiver chaque intégration selon
                        vos besoins.
                      </p>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-1">
                        Gestion des permissions
                      </h4>
                      <p className="text-orange-700">
                        Vous contrôlez entièrement les permissions accordées à
                        chaque plateforme. Vous pouvez révoquer l'accès à tout
                        moment.
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
              {t("settings.unsavedChanges")}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
