'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Mail, Eye, Edit, Save, X, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Template {
  type: string
  name: string
  description: string
  subject: string
  html: string
  variables: string[]
}

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [newVariable, setNewVariable] = useState('')

  // Templates par défaut (fallback)
  const defaultTemplates: Template[] = [
    {
      type: 'WELCOME',
      name: 'Email de Bienvenue',
      description: 'Envoyé lors de l\&apos;inscription d\'un nouvel utilisateur',
      subject: '🎉 Bienvenue sur JobbingTrack !',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
            <p style="color: #6b7280; margin: 5px 0;">Votre assistant personnel pour la recherche d&apos;emploi</p>
          </div>
          <h2 style="color: #1f2937;">Bienvenue {{firstName}} ! 🎉</h2>
          <p>Félicitations ! Votre compte JobbingTrack a été créé avec succès.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">🚀 Vous pouvez maintenant :</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              <li>📝 <strong>Suivre vos candidatures</strong> - Gardez trace de toutes vos applications</li>
              <li>📅 <strong>Gérer vos entretiens</strong> - Planifiez et préparez vos rendez-vous</li>
              <li>🔔 <strong>Recevoir des rappels</strong> - Ne manquez plus jamais une relance</li>
              <li>👥 <strong>Organiser vos contacts</strong> - Votre carnet d&apos;adresses professionnel</li>
              <li>📊 <strong>Analyser vos performances</strong> - Statistiques de vos candidatures</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{frontendUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Commencer maintenant
            </a>
          </div>
        </div>
      `,
      variables: ['firstName&apos;, 'lastName', &apos;frontendUrl']
    },
    {
      type: 'VERIFICATION',
      name: 'Email de Vérification',
      description: 'Pour vérifier l\&apos;adresse email lors de l\'inscription',
      subject: '✅ Vérifiez votre adresse email - JobbingTrack',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
            <p style="color: #6b7280; margin: 5px 0;">Vérification de votre adresse email</p>
          </div>
          <h2 style="color: #1f2937;">Bonjour {{firstName}} ! 👋</h2>
          <p>Bienvenue sur JobbingTrack ! Pour activer votre compte, veuillez vérifier votre adresse email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              ✓ Vérifier mon adresse email
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 24 heures.</p>
        </div>
      `,
      variables: ['firstName&apos;, 'verificationUrl']
    },
    {
      type: 'RESET_PASSWORD',
      name: 'Réinitialisation de Mot de Passe',
      description: 'Lien de réinitialisation de mot de passe',
      subject: '🔐 Réinitialisation de votre mot de passe JobbingTrack',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
            <p style="color: #6b7280; margin: 5px 0;">Réinitialisation de mot de passe</p>
          </div>
          <h2 style="color: #1f2937;">Bonjour {{firstName}},</h2>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte JobbingTrack.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce lien est valide pendant 1 heure.</p>
        </div>
      `,
      variables: ['firstName&apos;, 'resetUrl']
    }
  ]

  // Charger les templates depuis l'API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`${API_URL}/api/v1/emails/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.data.success && response.data.data.length > 0) {
          // Convertir les templates de la DB au format attendu
          const dbTemplates = response.data.data.map((t: any) => ({
            type: t.type,
            name: t.name,
            description: `Template ${t.name}`,
            subject: t.subject,
            html: t.htmlContent,
            variables: t.variables || [],
          }))
          setTemplates(dbTemplates)
        } else {
          // Utiliser les templates par défaut
          setTemplates(defaultTemplates)
        }
      } catch (error: any) {
        console.error('Erreur chargement templates:', error)
        // Utiliser les templates par défaut en cas d'erreur
        setTemplates(defaultTemplates)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template)
    setEditedContent(template.html)
    setEditing(false)
  }

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setEditedContent(template.html)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selectedTemplate) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(
        `${API_URL}/api/v1/emails/templates/${selectedTemplate.type}`,
        {
          type: selectedTemplate.type,
          name: selectedTemplate.name,
          subject: selectedTemplate.subject,
          htmlContent: editedContent,
          textContent: null,
          isActive: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        // Mettre à jour le template local avec les variables détectées
        const updatedTemplate = {
          ...selectedTemplate,
          html: editedContent,
          variables: response.data.data.variables || [],
        }
        setSelectedTemplate(updatedTemplate)
        setEditing(false)
        alert('Template sauvegardé avec succès !')
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde template:', error)
      alert(`Erreur lors de la sauvegarde: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleCancel = () => {
    if (selectedTemplate) {
      setEditedContent(selectedTemplate.html)
    }
    setEditing(false)
  }

  const handleAddVariable = () => {
    if (!selectedTemplate || !newVariable.trim()) return

    const variableName = newVariable.trim().replace(/[{}]/g, '')
    if (selectedTemplate.variables.includes(variableName)) {
      alert('Cette variable existe déjà')
      return
    }

    const updatedTemplate = {
      ...selectedTemplate,
      variables: [...selectedTemplate.variables, variableName],
    }
    setSelectedTemplate(updatedTemplate)
    setNewVariable('')
  }

  const handleRemoveVariable = (variable: string) => {
    if (!selectedTemplate) return

    const updatedTemplate = {
      ...selectedTemplate,
      variables: selectedTemplate.variables.filter(v => v !== variable),
    }
    setSelectedTemplate(updatedTemplate)
  }

  const handleSaveVariables = async () => {
    if (!selectedTemplate) return

    try {
      const token = localStorage.getItem('token')
      // Sauvegarder le template avec les variables mises à jour
      // Le backend détectera automatiquement les variables dans le HTML, mais on peut aussi les envoyer explicitement
      const response = await axios.put(
        `${API_URL}/api/v1/emails/templates/${selectedTemplate.type}`,
        {
          type: selectedTemplate.type,
          name: selectedTemplate.name,
          subject: selectedTemplate.subject,
          htmlContent: selectedTemplate.html,
          textContent: null,
          isActive: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        // Mettre à jour avec les variables détectées par le backend (qui fusionnera avec celles du HTML)
        const updatedTemplate = {
          ...selectedTemplate,
          variables: response.data.data.variables || selectedTemplate.variables,
        }
        setSelectedTemplate(updatedTemplate)
        alert('Variables sauvegardées avec succès !')
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde variables:', error)
      alert(`Erreur lors de la sauvegarde: ${error.response?.data?.error || error.message}`)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Templates d'Emails
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualiser et éditer les templates d'emails envoyés
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des templates */}
          <div className="lg:col-span-1 space-y-4">
            {templates.map((template) => (
              <Card 
                key={template.type} 
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  selectedTemplate?.type === template.type ? 'ring-2 ring-blue-500&apos; : ''
                }`}
                onClick={() => handlePreview(template)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      {template.name}
                    </div>
                    <Badge variant="outline">{template.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(template)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(template)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Éditer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Prévisualisation/Édition */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {selectedTemplate.name}
                    </CardTitle>
                    {editing && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Sauvegarder
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList>
                      <TabsTrigger value="preview">Prévisualisation</TabsTrigger>
                      <TabsTrigger value="html">Code HTML</TabsTrigger>
                      <TabsTrigger value="variables">Variables</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sujet :</p>
                        <p className="font-semibold">{selectedTemplate.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Aperçu :</p>
                        <div className="border rounded-lg p-4 bg-white">
                          <div dangerouslySetInnerHTML={{ 
                            __html: editedContent
                              .replace(/{{firstName}}/g, 'Jean')
                              .replace(/{{lastName}}/g, 'Dupont')
                              .replace(/{{frontendUrl}}/g, 'http://localhost:8080')
                              .replace(/{{verificationUrl}}/g, 'http://localhost:8080/verify-email?token=example')
                              .replace(/{{resetUrl}}/g, 'http://localhost:8080/reset-password?token=example')
                          }} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="html" className="space-y-4">
                      {editing ? (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Éditer le HTML :</p>
                          <textarea
                            className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Code HTML :</p>
                          <pre className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 overflow-auto text-xs text-gray-900 dark:text-gray-100">
                            <code className="text-gray-900 dark:text-gray-100">{selectedTemplate.html}</code>
                          </pre>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="variables" className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Variables disponibles :</p>
                        
                        {/* Liste des variables */}
                        <div className="space-y-2 mb-4">
                          {selectedTemplate.variables.length > 0 ? (
                            selectedTemplate.variables.map((variable) => (
                              <div key={variable} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 flex-1">
                                  <code className="text-sm font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">{`{{${variable}}}`}</code>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {variable === 'firstName&apos; && 'Prénom de l\'utilisateur'}
                                    {variable === 'lastName&apos; && 'Nom de l\'utilisateur'}
                                    {variable === 'frontendUrl&apos; && 'URL du frontend'}
                                    {variable === 'verificationUrl&apos; && 'URL de vérification email'}
                                    {variable === 'resetUrl&apos; && 'URL de réinitialisation mot de passe'}
                                    {variable === 'resetLink&apos; && 'URL de réinitialisation mot de passe'}
                                    {variable === 'userName&apos; && 'Nom d\'utilisateur'}
                                    {variable === 'appName&apos; && 'Nom de l\'application'}
                                    {variable === 'expiryMinutes&apos; && 'Minutes avant expiration'}
                                    {!['firstName&apos;, 'lastName', &apos;frontendUrl', 'verificationUrl&apos;, 'resetUrl', &apos;resetLink', 'userName&apos;, 'appName', &apos;expiryMinutes'].includes(variable) && 'Variable personnalisée'}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveVariable(variable)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune variable définie</p>
                          )}
                        </div>

                        {/* Ajouter une variable */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <Label htmlFor="new-variable" className="text-sm font-medium mb-2 block">
                            Ajouter une variable
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="new-variable"
                              type="text"
                              placeholder="nomVariable (sans {{ }})"
                              value={newVariable}
                              onChange={(e) => setNewVariable(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddVariable()
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleAddVariable}
                              size="sm"
                              variant="outline"
                              disabled={!newVariable.trim()}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Ajouter
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 Les variables sont automatiquement détectées dans le HTML. Vous pouvez aussi les ajouter manuellement ici.
                          </p>
                        </div>

                        {/* Bouton de sauvegarde */}
                        <div className="mt-4">
                          <Button
                            onClick={handleSaveVariables}
                            className="w-full"
                            variant="default"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder les variables
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Sélectionnez un template pour le visualiser</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
