"use client"

import React, { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Plus, Minus } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { CategoryIconPicker } from './category-icon-picker'
import { translations } from '@/lib/translations'
import type { MenuCategory, CreateCategoryRequest, UpdateCategoryRequest } from '@/services/menu.service'

interface CategoryCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>
  category?: MenuCategory // For edit mode
  isLoading?: boolean
}

// Form validation schema
const createCategorySchema = (language: string) => z.object({
  name: z.string()
    .min(1, language === 'fr' ? 'Le nom de la catégorie est requis' : 'Category name is required')
    .max(100, language === 'fr' ? 'Le nom doit contenir au maximum 100 caractères' : 'Name must be 100 characters or less'),
  description: z.string()
    .max(500, language === 'fr' ? 'La description doit contenir au maximum 500 caractères' : 'Description must be 500 characters or less')
    .optional(),
  display_order: z.number()
    .min(0, language === 'fr' ? 'L\'ordre d\'affichage doit être un nombre positif' : 'Display order must be a positive number')
    .max(999, language === 'fr' ? 'L\'ordre d\'affichage doit être inférieur à 1000' : 'Display order must be less than 1000')
    .optional(),
  is_active: z.boolean().optional(),
  icon: z.string().optional(),
})

type CategoryFormData = z.infer<ReturnType<typeof createCategorySchema>>

export const CategoryCreateModal: React.FC<CategoryCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  category,
  isLoading = false
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isEditMode = Boolean(category)
  
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(createCategorySchema(language)),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      display_order: category?.display_order ?? 0,
      is_active: category?.is_active ?? true,
      icon: category?.icon || '',
    },
  })

  const handleSubmit = async (data: CategoryFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
      onClose()
    } catch (error) {
      console.error('Failed to save category:', error)
      // Error handling can be improved with toast notifications
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    form.reset()
    onClose()
  }

  // Update form when category changes (for edit mode)
  React.useEffect(() => {
    if (category && isOpen) {
      form.reset({
        name: category.name,
        description: category.description || '',
        display_order: category.display_order,
        is_active: category.is_active,
        icon: category.icon || '',
      })
    } else if (!isOpen) {
      form.reset({
        name: '',
        description: '',
        display_order: 0,
        is_active: true,
        icon: '',
      })
    }
  }, [category, isOpen, form])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t.menuManagement.categoryModal.editTitle : t.menuManagement.categoryModal.createTitle}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Category Name with Icon */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t.menuManagement.categoryModal.categoryName}
                    <span className="text-destructive ml-1">*</span>
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
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={t.menuManagement.categoryModal.categoryNamePlaceholder || "e.g: Appetizers, Main Dishes, Desserts"}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.menuManagement.categoryModal.description}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t.menuManagement.categoryModal.descriptionPlaceholder}
                      className="min-h-[80px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display Order */}
            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.menuManagement.categoryModal.displayOrder}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(Math.max(0, (field.value || 1) - 1))}
                        className="h-10 w-10 p-0"
                        disabled={isSubmitting || (field.value || 1) <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        placeholder="0"
                        {...field}
                        value={field.value === 0 || field.value ? field.value.toString() : ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                        disabled={isSubmitting}
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(Math.min(999, (field.value || 0) + 1))}
                        className="h-10 w-10 p-0"
                        disabled={isSubmitting || (field.value || 0) >= 999}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status (only in edit mode) */}
            {isEditMode && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {language === 'fr' ? 'Catégorie active' : 'Active Category'}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
                disabled={isSubmitting || isLoading}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    {t.common.loading}
                  </>
                ) : isEditMode ? (
                  t.common.update
                ) : (
                  t.common.create
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}