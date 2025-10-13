'use client';

import { useState, useEffect } from 'react';
import { Linkedin, User, Building, Search, MessageCircle, Plus, Check, X } from 'lucide-react';
import { linkedinService, LinkedInProfile, LinkedInCompany } from '@/lib/linkedin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface LinkedInIntegrationProps {
  className?: string;
  onProfileImport?: (profile: LinkedInProfile) => void;
  onCompanyImport?: (company: LinkedInCompany) => void;
}

export function LinkedInIntegration({ className = '', onProfileImport, onCompanyImport }: LinkedInIntegrationProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Recherche d'entreprises
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<LinkedInCompany[]>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);

  // Recherche de personnes
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);

  // Invitations
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  // Vérifier l'état d'authentification au montage
  useEffect(() => {
    linkedinService.initialize();
    setIsAuthenticated(linkedinService.isAuthenticated());

    if (linkedinService.isAuthenticated()) {
      loadProfile();
      loadReceivedInvites();
    }
  }, []);

  // Charger le profil utilisateur
  const loadProfile = async () => {
    try {
      const userProfile = await linkedinService.getProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Erreur lors du chargement du profil LinkedIn:', error);
    }
  };

  // Charger les invitations reçues
  const loadReceivedInvites = async () => {
    setIsLoadingInvites(true);
    try {
      const invites = await linkedinService.getReceivedInvites();
      setReceivedInvites(invites);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  // Connexion à LinkedIn
  const handleConnect = () => {
    const authUrl = linkedinService.getAuthorizationUrl();
    window.location.href = authUrl;
  };

  // Déconnexion de LinkedIn
  const handleDisconnect = () => {
    linkedinService.logout();
    setIsAuthenticated(false);
    setProfile(null);
    setCompanyResults([]);
    setPeopleResults([]);
    setReceivedInvites([]);
  };

  // Gérer le callback d'authentification
  const handleAuthCallback = async (code: string) => {
    setIsLoading(true);
    try {
      await linkedinService.exchangeCodeForTokens(code);
      setIsAuthenticated(true);
      await loadProfile();
      await loadReceivedInvites();
    } catch (error) {
      console.error('Erreur lors de l\'authentification LinkedIn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Rechercher des entreprises
  const searchCompanies = async () => {
    if (!companySearch.trim()) return;

    setIsSearchingCompanies(true);
    try {
      const companies = await linkedinService.searchCompanies(companySearch);
      setCompanyResults(companies);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'entreprises:', error);
    } finally {
      setIsSearchingCompanies(false);
    }
  };

  // Rechercher des personnes
  const searchPeople = async () => {
    if (!peopleSearch.trim()) return;

    setIsSearchingPeople(true);
    try {
      const people = await linkedinService.searchPeople(peopleSearch);
      setPeopleResults(people);
    } catch (error) {
      console.error('Erreur lors de la recherche de personnes:', error);
    } finally {
      setIsSearchingPeople(false);
    }
  };

  // Importer une entreprise
  const importCompany = (company: LinkedInCompany) => {
    if (onCompanyImport) {
      onCompanyImport(company);
    }
  };

  // Importer un profil
  const importProfile = () => {
    if (profile && onProfileImport) {
      onProfileImport(profile);
    }
  };

  // Accepter une invitation
  const acceptInvite = async (inviteId: string) => {
    try {
      await linkedinService.acceptInvite(inviteId);
      setReceivedInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'invitation:', error);
    }
  };

  // Refuser une invitation
  const declineInvite = async (inviteId: string) => {
    try {
      await linkedinService.declineInvite(inviteId);
      setReceivedInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Erreur lors du refus de l\'invitation:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          Intégration LinkedIn
          <Badge variant={isAuthenticated ? "default" : "secondary"}>
            {isAuthenticated ? 'Connecté' : 'Déconnecté'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* État d'authentification */}
        {!isAuthenticated ? (
          <div className="text-center space-y-4">
            <div className="text-gray-600">
              <Linkedin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="mb-2">Connectez votre compte LinkedIn pour :</p>
              <ul className="text-sm text-left space-y-1 mb-4">
                <li>• Importer votre profil professionnel</li>
                <li>• Rechercher des entreprises</li>
                <li>• Gérer vos invitations réseau</li>
                <li>• Partager vos candidatures</li>
              </ul>
            </div>
            <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700">
              <Linkedin className="h-4 w-4 mr-2" />
              Se connecter avec LinkedIn
            </Button>
          </div>
        ) : (
          <>
            {/* Profil utilisateur */}
            {profile && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  {profile.profilePicture && (
                    <img
                      src={profile.profilePicture}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    {profile.headline && (
                      <p className="text-sm text-gray-600">{profile.headline}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={importProfile}>
                    <Plus className="h-3 w-3 mr-1" />
                    Importer
                  </Button>
                </div>
                {profile.location && (
                  <p className="text-xs text-gray-500">
                    📍 {profile.location.name}
                  </p>
                )}
              </div>
            )}

            {/* Actions principales */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Déconnexion
              </Button>
              <Button variant="outline" size="sm" onClick={loadReceivedInvites}>
                Actualiser
              </Button>
            </div>

            {/* Onglets de fonctionnalités */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">
                  <User className="h-4 w-4 mr-2" />
                  Profil
                </TabsTrigger>
                <TabsTrigger value="companies">
                  <Building className="h-4 w-4 mr-2" />
                  Entreprises
                </TabsTrigger>
                <TabsTrigger value="network">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Réseau
                </TabsTrigger>
              </TabsList>

              {/* Onglet Profil */}
              <TabsContent value="profile" className="space-y-4">
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Votre profil LinkedIn est synchronisé</p>
                  <Button className="mt-4" onClick={importProfile}>
                    Importer vers JobbingTrack
                  </Button>
                </div>
              </TabsContent>

              {/* Onglet Entreprises */}
              <TabsContent value="companies" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rechercher une entreprise..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchCompanies()}
                    />
                    <Button onClick={searchCompanies} disabled={isSearchingCompanies}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Résultats de recherche d'entreprises */}
                  {companyResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {companyResults.map((company) => (
                        <div key={company.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{company.name}</h4>
                            {company.industry && (
                              <p className="text-sm text-gray-600">{company.industry}</p>
                            )}
                            {company.description && (
                              <p className="text-xs text-gray-500 truncate">{company.description}</p>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => importCompany(company)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Importer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSearchingCompanies && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Recherche en cours...</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Onglet Réseau */}
              <TabsContent value="network" className="space-y-4">
                {/* Recherche de personnes */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rechercher des personnes..."
                      value={peopleSearch}
                      onChange={(e) => setPeopleSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchPeople()}
                    />
                    <Button onClick={searchPeople} disabled={isSearchingPeople}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Résultats de recherche de personnes */}
                  {peopleResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {peopleResults.map((person) => (
                        <div key={person.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {person.profilePicture && (
                              <img
                                src={person.profilePicture}
                                alt={`${person.firstName} ${person.lastName}`}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <h4 className="font-medium text-sm">
                                {person.firstName} {person.lastName}
                              </h4>
                              {person.headline && (
                                <p className="text-xs text-gray-600">{person.headline}</p>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Contacter
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Invitations reçues */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Invitations reçues ({receivedInvites.length})
                  </h3>

                  {isLoadingInvites ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : receivedInvites.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {receivedInvites.map((invite) => (
                        <div key={invite.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">
                                {invite.from.firstName} {invite.from.lastName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {new Date(invite.sentAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => acceptInvite(invite.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineInvite(invite.id)}
                                className="border-red-300 text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {invite.message && (
                            <p className="text-sm text-gray-600 italic">"{invite.message}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Aucune invitation en attente</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Informations d'aide */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Note :</strong> L'intégration LinkedIn respecte les conditions d'utilisation de LinkedIn.
            Vos données sont utilisées uniquement pour améliorer votre expérience de recherche d'emploi.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
