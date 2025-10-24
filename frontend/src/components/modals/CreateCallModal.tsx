'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Select, SelectOption } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { applicationService, contactService, callService } from '@/lib/api';

interface Application {
  id: string;
  position: string;
  status: string;
  company: {
    id: string;
    name: string;
  };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  company?: {
    id: string;
    name: string;
  };
}

interface CreateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallCreated: () => void;
}

export default function CreateCallModal({ isOpen, onClose, onCallCreated }: CreateCallModalProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState({
    applicationId: '',
    contactId: '',
    type: 'OUTGOING',
    scheduledDate: '',
    callDate: '',
    duration: '',
    status: 'SCHEDULED',
    notes: '',
    outcome: '',
    followUpNeeded: false,
    phoneNumber: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsResponse, contactsResponse] = await Promise.all([
        applicationService.getAll(),
        contactService.getAll()
      ]);

      setApplications(appsResponse.data.applications || []);
      setContacts(contactsResponse.data.contacts || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.applicationId) {
      alert('Veuillez sélectionner une candidature');
      return;
    }

    setSaving(true);
    try {
      const callData = {
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        followUpNeeded: formData.followUpNeeded
      };

      await callService.create(callData);
      onCallCreated();
      handleClose();
    } catch (error) {
      console.error('Erreur création appel:', error);
      alert('Erreur lors de la création de l\'appel');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      applicationId: '',
      contactId: '',
      type: 'OUTGOING',
      scheduledDate: '',
      callDate: '',
      duration: '',
      status: 'SCHEDULED',
      notes: '',
      outcome: '',
      followUpNeeded: false,
      phoneNumber: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <Card className="modal-container w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="modal-header">
          <CardTitle className="modal-title flex items-center justify-between">
            📞 Créer un nouvel appel
            <Button variant="ghost" size="sm" onClick={handleClose}>
              ✕
            </Button>
          </CardTitle>
          <CardDescription className="modal-body">
            Planifiez ou enregistrez un appel téléphonique professionnel
          </CardDescription>
        </CardHeader>
        <CardContent className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection de candidature */}
            <div className="space-y-2">
              <Label htmlFor="application">Candidature *</Label>
              <Select
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
              >
                <option value="">Sélectionner une candidature</option>
                {applications.map((app) => (
                  <SelectOption key={app.id} value={app.id}>
                    {app.position} - {app.company.name}
                  </SelectOption>
                ))}
              </Select>
            </div>

            {/* Sélection de contact */}
            <div className="space-y-2">
              <Label htmlFor="contact">Contact (optionnel)</Label>
              <Select
                value={formData.contactId}
                onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
              >
                <option value="">Sélectionner un contact</option>
                <option value="">Aucun contact</option>
                {contacts.map((contact) => (
                  <SelectOption key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                    {contact.position && ` - ${contact.position}`}
                    {contact.company && ` (${contact.company.name})`}
                  </SelectOption>
                ))}
              </Select>
            </div>

            {/* Informations de l'appel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type d'appel</Label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="OUTGOING">📞 Appel sortant</option>
                  <option value="INCOMING">📱 Appel entrant</option>
                  <option value="FOLLOWUP">🔄 Relance</option>
                  <option value="INQUIRY">❓ Demande d'information</option>
                  <option value="SCHEDULED">📅 Rendez-vous téléphonique</option>
                  <option value="COLD_CALL">🥶 Appel à froid</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="SCHEDULED">📅 Planifié</option>
                  <option value="COMPLETED">✅ Terminé</option>
                  <option value="CANCELLED">❌ Annulé</option>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date/heure prévue</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="callDate">Date/heure réelle</Label>
                <Input
                  id="callDate"
                  type="datetime-local"
                  value={formData.callDate}
                  onChange={(e) => setFormData({ ...formData, callDate: e.target.value })}
                />
              </div>
            </div>

            {/* Durée et téléphone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Durée (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="30"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+33 1 23 45 67 89"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Notes et résultat */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes de l'appel, points discutés, prochaines étapes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Résultat</Label>
              <Select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              >
                <option value="">Sélectionner le résultat</option>
                <option value="">Non spécifié</option>
                <option value="POSITIVE">✅ Positif</option>
                <option value="NEGATIVE">❌ Négatif</option>
                <option value="NEUTRAL">⚖️ Neutre</option>
                <option value="NO_ANSWER">📞 Pas de réponse</option>
                <option value="VOICEMAIL">📧 Message vocal</option>
                <option value="CALL_BACK">📞 À rappeler</option>
              </Select>
            </div>

            {/* Actions */}
            <div className="modal-footer">
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !formData.applicationId}>
                {saving ? 'Création...' : 'Créer l\'appel'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
