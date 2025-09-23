"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/language-context'
import { CategoryIconPicker } from '@/components/menu/category-icon-picker'
import { translations } from '@/lib/translations'

interface ChainTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  template_type: 'category' | 'item'
  items_count: number
  created_at: string
  updated_at: string
  version: number
}

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (templateData: { name: string; description?: string; icon?: string }) => Promise<void>
  template?: ChainTemplate | null
}

// Form validation schema - exactly like category modal
const createTemplateSchema = (language: string) => z.object({
  name: z.string()
    .min(1, language === 'fr' ? 'Le nom du modèle est requis' : 'Template name is required')
    .max(100, language === 'fr' ? 'Le nom doit contenir au maximum 100 caractères' : 'Name must be 100 characters or less'),
  description: z.string()
    .max(500, language === 'fr' ? 'La description doit contenir au maximum 500 caractères' : 'Description must be 500 characters or less')
    .optional(),
  icon: z.string().optional(),
})

type TemplateFormData = z.infer<ReturnType<typeof createTemplateSchema>>

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  template,
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(createTemplateSchema(language)),
    defaultValues: {
      name: '',
      description: '',
      icon: '',
    }
  })

  // Pre-populate form for edit mode
  useEffect(() => {
    if (template && isOpen) {
      form.reset({
        name: template.name,
        description: template.description || '',
        icon: template.icon || '',
      })
    } else if (isOpen) {
      form.reset({
        name: '',
        description: '',
        icon: '',
      })
    }
  }, [template, isOpen, form])

  const handleSubmit = async (data: TemplateFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {template
              ? (language === 'fr' ? 'Modifier le Modèle' : 'Edit Template')
              : (language === 'fr' ? 'Nouveau Modèle' : 'New Template')
            }
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Template Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Nom du Modèle' : 'Template Name'}
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-3 items-center">
                      <FormField
                        control={form.control}
                        name="icon"
                        render={({ field: iconField }) => (
                          <CategoryIconPicker
                            value={iconField.value}
                            onValueChange={iconField.onChange}
                            disabled={isSubmitting}
                            compact={true}
                          />
                        )}
                      />
                      <Input
                        placeholder={
                          language === 'fr'
                            ? 'ex: Entrées, Plats Principaux'
                            : 'e.g., Appetizers, Main Courses'
                        }
                        className="flex-1"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Description' : 'Description'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        language === 'fr'
                          ? 'Description optionnelle de ce modèle...'
                          : 'Optional description for this template...'
                      }
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {template
                  ? (language === 'fr' ? 'Mettre à jour' : 'Update')
                  : (language === 'fr' ? 'Créer' : 'Create')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}