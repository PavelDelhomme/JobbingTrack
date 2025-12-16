'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  onSubmit?: () => void
  loading?: boolean
  size?: 'sm&apos; | 'md' | &apos;lg' | 'xl'
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  loading = false,
  size = 'md'
}: FormModalProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm&apos;: return 'max-w-md'
      case 'lg&apos;: return 'max-w-2xl'
      case 'xl&apos;: return 'max-w-4xl'
      default: return 'max-w-lg'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className={`relative ${getSizeClasses()} w-full mx-4 max-h-[90vh] overflow-hidden`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            ✕
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}

          {onSubmit && (
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                onClick={onSubmit}
                disabled={loading}
              >
                {loading ? 'Sauvegarde...&apos; : 'Sauvegarder'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
