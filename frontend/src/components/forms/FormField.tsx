'use client'

import { ReactNode } from 'react'
import { Label } from '@/components/ui'
import { Input } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Switch } from '@/components/ui'

interface BaseFieldProps {
  label: string
  name: string
  required?: boolean
  className?: string
  description?: string
}

interface TextFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

interface TextareaFieldProps extends BaseFieldProps {
  type: 'textarea'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select'
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
  disabled?: boolean
}

interface SwitchFieldProps extends BaseFieldProps {
  type: 'switch'
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

type FormFieldProps =
  | TextFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | SwitchFieldProps

export default function FormField(props: FormFieldProps) {
  const { label, name, required, className = '', description } = props

  const renderField = () => {
    switch (props.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'tel':
      case 'url':
        return (
          <Input
            type={props.type}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            disabled={props.disabled}
            className="w-full"
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            rows={props.rows}
            disabled={props.disabled}
            className="w-full"
          />
        )

      case 'select':
        return (
          <Select value={props.value} onChange={(e) => props.onChange?.(e.target.value)} disabled={props.disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={props.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={props.value}
              onChange={(e) => props.onChange?.(e.target.checked)}
              disabled={props.disabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {props.value ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {renderField()}

      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  )
}
