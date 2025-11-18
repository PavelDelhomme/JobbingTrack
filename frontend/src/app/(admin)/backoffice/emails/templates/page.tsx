'use client'

import AdminLayout from '@/components/features/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Mail, Eye } from 'lucide-react'

export default function EmailTemplatesPage() {
  const templates = [
    { type: 'WELCOME', name: 'Email de Bienvenue', description: 'Envoyé lors de l\'inscription' },
    { type: 'VERIFICATION', name: 'Email de Vérification', description: 'Pour vérifier l\'adresse email' },
    { type: 'RESET_PASSWORD', name: 'Réinitialisation de Mot de Passe', description: 'Lien de réinitialisation' },
  ]

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Templates d'Emails
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérer les templates d'emails (à venir)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.type} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                <Button className="mt-4 w-full" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Prévisualiser
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

