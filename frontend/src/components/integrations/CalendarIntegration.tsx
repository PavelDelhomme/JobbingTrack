'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, ExternalLink, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { calendarIntegration, CalendarEvent, CalendarProvider } from '@/lib/calendar-integration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CalendarIntegrationProps {
  className?: string;
  onEventCreate?: (event: CalendarEvent) => void;
  onEventSync?: (event: CalendarEvent, provider: string) => void;
}

export function CalendarIntegration({ className = '', onEventCreate, onEventSync }: CalendarIntegrationProps) {
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);

  // Formulaire de création d'événement
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    location: ''
  });

  useEffect(() => {
    loadProviders();
    loadLocalEvents();
  }, []);

  const loadProviders = () => {
    const availableProviders = calendarIntegration.getAvailableProviders();
    setProviders(availableProviders);

    // Sélectionner le premier provider par défaut s'il y en a un connecté
    const connectedProvider = availableProviders.find(p => p.isConnected);
    if (connectedProvider) {
      setSelectedProvider(connectedProvider.id);
    }
  };

  const loadLocalEvents = async () => {
    try {
      const localEvents = await calendarIntegration.getLocalEvents();
      setLocalEvents(localEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements locaux:', error);
    }
  };

  // Connexion à un provider externe
  const connectProvider = (providerType: 'google' | 'outlook') => {
    if (providerType === 'google') {
      window.location.href = calendarIntegration.getGoogleAuthUrl();
    } else {
      window.location.href = calendarIntegration.getMicrosoftAuthUrl();
    }
  };

  // Gérer le callback d'authentification
  const handleAuthCallback = async (provider: 'google' | 'outlook', code: string) => {
    setIsLoading(true);
    try {
      if (provider === 'google') {
        await calendarIntegration.exchangeGoogleCode(code);
      } else {
        await calendarIntegration.exchangeMicrosoftCode(code);
      }
      loadProviders();
      loadExternalEvents();
    } catch (error) {
      console.error('Erreur lors de l\'authentification calendrier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les événements externes
  const loadExternalEvents = async () => {
    if (!selectedProvider || selectedProvider === 'local') return;

    setIsLoading(true);
    try {
      let externalEvents: CalendarEvent[] = [];

      if (selectedProvider === 'google') {
        // Récupérer les calendriers Google
        const calendars = await calendarIntegration.getGoogleCalendars();
        if (calendars.length > 0) {
          const eventsPromises = calendars.map(cal =>
            calendarIntegration.getGoogleEvents(cal.id)
          );
          const eventsArrays = await Promise.all(eventsPromises);
          externalEvents = eventsArrays.flat();
        }
      } else if (selectedProvider === 'outlook') {
        // Récupérer les calendriers Outlook
        const calendars = await calendarIntegration.getMicrosoftCalendars();
        if (calendars.length > 0) {
          const eventsPromises = calendars.map(cal =>
            calendarIntegration.getMicrosoftEvents(cal.id)
          );
          const eventsArrays = await Promise.all(eventsPromises);
          externalEvents = eventsArrays.flat();
        }
      }

      setEvents(externalEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Créer un événement local
  const createLocalEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.time) return;

    try {
      const startDateTime = new Date(`${eventForm.date}T${eventForm.time}`);
      const endDateTime = new Date(startDateTime.getTime() + eventForm.duration * 60000);

      const event = await calendarIntegration.createLocalEvent({
        title: eventForm.title,
        description: eventForm.description,
        start: startDateTime,
        end: endDateTime,
        location: eventForm.location
      });

      setLocalEvents(prev => [...prev, event]);
      setEventForm({
        title: '',
        description: '',
        date: '',
        time: '',
        duration: 60,
        location: ''
      });
      setShowEventForm(false);

      if (onEventCreate) {
        onEventCreate(event);
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
    }
  };

  // Synchroniser un événement avec un calendrier externe
  const syncEvent = async (event: CalendarEvent) => {
    if (!selectedProvider || selectedProvider === 'local') return;

    try {
      const syncedEventId = await calendarIntegration.syncInterviewToCalendar(
        event.id,
        {
          title: event.title,
          companyName: 'JobbingTrack',
          date: event.start,
          duration: Math.round((event.end.getTime() - event.start.getTime()) / 60000),
          location: event.location,
          description: event.description
        },
        {
          provider: selectedProvider as 'google' | 'outlook',
          calendarId: 'primary'
        }
      );

      // Mettre à jour l'événement local avec l'ID externe
      setLocalEvents(prev => prev.map(e =>
        e.id === event.id
          ? { ...e, externalId: syncedEventId }
          : e
      ));

      if (onEventSync) {
        onEventSync(event, selectedProvider);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  };

  // Supprimer un événement
  const deleteEvent = async (event: CalendarEvent) => {
    try {
      if (event.source === 'local') {
        await calendarIntegration.deleteLocalEvent(event.id);
        setLocalEvents(prev => prev.filter(e => e.id !== event.id));
      } else if (event.externalId) {
        await calendarIntegration.deleteSyncedEvent(
          event.externalId,
          event.source,
          'primary'
        );
        // Supprimer de la liste locale aussi si c'était un événement synchronisé
        setEvents(prev => prev.filter(e => e.id !== event.id));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  // Formater la date pour l'affichage
  const formatEventDate = (start: Date, end: Date) => {
    const startDate = start.toLocaleDateString('fr-FR');
    const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (start.toDateString() === end.toDateString()) {
      return `${startDate} • ${startTime} - ${endTime}`;
    } else {
      return `${startDate} ${startTime} - ${end.toDateString()} ${endTime}`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Intégration Calendrier
          <Badge variant="outline">
            {providers.filter(p => p.isConnected).length} connecté{providers.filter(p => p.isConnected).length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Providers disponibles */}
        <div className="space-y-3">
          <Label>Fournisseurs de calendrier</Label>
          <div className="grid gap-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`p-3 border rounded-lg flex items-center justify-between ${
                  provider.isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: provider.color }}
                  />
                  <div>
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-gray-600">
                      {provider.isConnected ? 'Connecté' : 'Non connecté'}
                      {provider.isDefault && ' (par défaut)'}
                    </p>
                  </div>
                </div>
                {!provider.isConnected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => connectProvider(provider.type)}
                    disabled={provider.type === 'local'}
                  >
                    Connecter
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sélection du provider actif */}
        {providers.filter(p => p.isConnected).length > 0 && (
          <div className="space-y-2">
            <Label>Calendrier actif</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Calendrier local</SelectItem>
                {providers.filter(p => p.isConnected && p.id !== 'local').map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEventForm(!showEventForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel événement
          </Button>
          {selectedProvider && selectedProvider !== 'local' && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadExternalEvents}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          )}
        </div>

        {/* Formulaire de création d'événement */}
        {showEventForm && (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-medium">Créer un événement</h3>

              <div className="grid gap-4">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre de l'événement"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Heure</Label>
                    <Input
                      type="time"
                      value={eventForm.time}
                      onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Durée (minutes)</Label>
                  <Select
                    value={eventForm.duration.toString()}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, duration: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Lieu (optionnel)</Label>
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Lieu de l'événement"
                  />
                </div>

                <div>
                  <Label>Description (optionnel)</Label>
                  <Input
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description de l'événement"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createLocalEvent} disabled={!eventForm.title || !eventForm.date || !eventForm.time}>
                  Créer l'événement
                </Button>
                <Button variant="outline" onClick={() => setShowEventForm(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des événements */}
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">
              Événements locaux ({localEvents.length})
            </TabsTrigger>
            <TabsTrigger value="external" disabled={selectedProvider === 'local'}>
              Événements externes ({events.length})
            </TabsTrigger>
          </TabsList>

          {/* Événements locaux */}
          <TabsContent value="local" className="space-y-3">
            {localEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun événement local créé</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {localEvents.map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-gray-600">
                          {formatEventDate(event.start, event.end)}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-500">📍 {event.location}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedProvider && selectedProvider !== 'local' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncEvent(event)}
                            title="Synchroniser avec le calendrier externe"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteEvent(event)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Événements externes */}
          <TabsContent value="external" className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Chargement des événements...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun événement trouvé</p>
                <Button variant="outline" size="sm" onClick={loadExternalEvents} className="mt-2">
                  Actualiser
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {event.source}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatEventDate(event.start, event.end)}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-500">📍 {event.location}</p>
                        )}
                        {event.externalUrl && (
                          <a
                            href={event.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Voir dans {event.source === 'google' ? 'Google Calendar' : 'Outlook'}
                          </a>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteEvent(event)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Informations d'aide */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Synchronisation :</strong> Les événements créés localement peuvent être synchronisés
            avec vos calendriers externes (Google Calendar ou Outlook) pour une meilleure gestion de votre emploi du temps.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
