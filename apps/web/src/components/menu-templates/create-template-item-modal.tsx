"use client"

import React, { useState, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Upload,
  X,
  GripVertical
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

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
  category_id?: string
  category_name?: string
  price?: number
  image_url?: string
  variants?: Array<{
    name: string
    price_modifier: number
    is_default: boolean
    display_order: number
  }>
}

interface CreateTemplateItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TemplateItemFormData) => Promise<void>
  categories: ChainTemplate[]
  item?: ChainTemplate
  isLoading?: boolean
}

// Form validation schema
const createTemplateItemSchema = (language: string) => z.object({
  name: z.string()
    .min(1, language === 'fr' ? 'Le nom de l\'article est requis' : 'Item name is required')
    .max(150, language === 'fr' ? 'Le nom doit contenir au maximum 150 caractères' : 'Name must be 150 characters or less'),
  description: z.string()
    .max(1000, language === 'fr' ? 'La description doit contenir au maximum 1000 caractères' : 'Description must be 1000 characters or less')
    .optional(),
  price: z.number()
    .min(0.01, language === 'fr' ? 'Le prix doit être supérieur à 0' : 'Price must be greater than 0')
    .max(999.99, language === 'fr' ? 'Le prix doit être inférieur à 1000' : 'Price must be less than 1000'),
  category_id: z.string().optional(),
  display_order: z.number()
    .min(0, language === 'fr' ? 'L\'ordre d\'affichage doit être un nombre positif' : 'Display order must be a positive number')
    .max(999, language === 'fr' ? 'L\'ordre d\'affichage doit être inférieur à 1000' : 'Display order must be less than 1000')
    .optional(),
  variants: z.array(z.object({
    name: z.string().min(1, language === 'fr' ? 'Le nom de la variante est requis' : 'Variant name is required'),
    price_modifier: z.number(),
    is_default: z.boolean(),
    display_order: z.number().min(0),
  })).optional(),
})

type TemplateItemFormData = z.infer<ReturnType<typeof createTemplateItemSchema>>

export const CreateTemplateItemModal: React.FC<CreateTemplateItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  item,
  isLoading = false
}) => {
  const { language } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditMode = Boolean(item)

  const form = useForm<TemplateItemFormData>({
    resolver: zodResolver(createTemplateItemSchema(language)),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || 0,
      category_id: item?.category_id || '',
      display_order: 0,
      variants: item?.variants || [],
    },
  })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants"
  })

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB before optimization)
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'fr'
        ? 'La taille du fichier ne peut pas dépasser 10 MB'
        : 'File size cannot exceed 10MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(language === 'fr'
        ? 'Veuillez sélectionner un fichier image valide'
        : 'Please select a valid image file')
      return
    }

    try {
      setIsOptimizing(true)

      // Import optimization function dynamically
      const { optimizePhoto } = await import('@/lib/photo-optimizer')

      // Optimize photo
      const optimizedPhoto = await optimizePhoto(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp'
      })

      // Set optimized photo
      setSelectedPhoto(optimizedPhoto.file)

      // Create preview from optimized file
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(optimizedPhoto.file)

    } catch (error) {
      console.error('Photo optimization failed:', error)
      alert(language === 'fr'
        ? 'Erreur lors de l\'optimisation de la photo'
        : 'Photo optimization failed')
    } finally {
      setIsOptimizing(false)
    }
  }

  const removePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const addVariant = () => {
    appendVariant({
      name: '',
      price_modifier: 0,
      is_default: variantFields.length === 0, // First variant is default
      display_order: variantFields.length,
    })
  }

  const handleSubmit = async (data: TemplateItemFormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      // Handle "none" category selection
      const submitData = {
        ...data,
        category_id: data.category_id === "none" ? undefined : data.category_id
      }

      await onSubmit(submitData)
      form.reset()
      setSelectedPhoto(null)
      setPhotoPreview(null)
      onClose()
    } catch (error) {
      console.error('Failed to save template item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    form.reset()
    setSelectedPhoto(null)
    setPhotoPreview(null)
    onClose()
  }

  // Update form when item changes (for edit mode)
  React.useEffect(() => {
    if (item && isOpen) {
      form.reset({
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        category_id: item.category_id || '',
        display_order: 0,
        variants: item.variants || [],
      })

      // Set photo preview if item has image
      if (item.image_url) {
        setPhotoPreview(item.image_url)
      }
    } else if (!isOpen) {
      form.reset()
      setSelectedPhoto(null)
      setPhotoPreview(null)
    }
  }, [item, isOpen, form])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? (language === 'fr' ? 'Modifier le Modèle d\'Article' : 'Edit Item Template')
              : (language === 'fr' ? 'Nouveau Modèle d\'Article' : 'New Item Template')
            }
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? (language === 'fr'
                  ? 'Modifiez les détails de ce modèle d\'article.'
                  : 'Edit the details of this item template.')
              : (language === 'fr'
                  ? 'Ajoutez un nouveau modèle d\'article avec photo, prix et variantes.'
                  : 'Add a new item template with photo, pricing, and variants.')
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Photo Upload Section */}
            <div className="space-y-4">
              <label className="text-sm font-medium">
                {language === 'fr' ? 'Photo de l\'article' : 'Item Photo'}
              </label>

              <div className="flex flex-col gap-4">
                {photoPreview ? (
                  <div className="relative group">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                      <Image
                        src={photoPreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />

                      {/* Remove photo button */}
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
                        disabled={isSubmitting || isOptimizing}
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Change photo overlay on hover */}
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center text-white">
                          <Upload className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">
                            {language === 'fr' ? 'Cliquer pour changer la photo' : 'Click to change photo'}
                          </p>
                          <p className="text-xs opacity-80">
                            {language === 'fr' ? 'Max 10MB - JPG, PNG, WebP' : 'Max 10MB - JPG, PNG, WebP'}
                          </p>
                        </div>
                      </div>

                      {/* Optimization overlay */}
                      {isOptimizing && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="animate-spin h-8 w-8 border-3 border-white border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-sm font-medium">
                              {language === 'fr' ? 'Optimisation en cours...' : 'Optimizing photo...'}
                            </p>
                            <p className="text-xs opacity-80">
                              {language === 'fr' ? 'Veuillez patienter' : 'Please wait'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div
                    className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-400 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 transition-all duration-200 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 group-hover:border-orange-300 group-hover:bg-orange-50 transition-all duration-200">
                      <Upload className="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors duration-200" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-orange-700 transition-colors">
                        {language === 'fr' ? 'Ajouter une photo' : 'Add Photo'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'fr' ? 'Cliquez ici pour télécharger' : 'Click here to upload'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">
                        {language === 'fr' ? 'Max 10MB • JPG, PNG, WebP' : 'Max 10MB • JPG, PNG, WebP'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {language === 'fr' ? 'Optimisé automatiquement' : 'Auto-optimized for web'}
                      </p>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Nom de l\'article' : 'Item Name'}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          language === 'fr'
                            ? 'ex: Pizza Margherita'
                            : 'e.g: Margherita Pizza'
                        }
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Prix' : 'Price'}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          disabled={isSubmitting}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Catégorie' : 'Category'}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isSubmitting}>
                        <SelectValue placeholder={
                          language === 'fr' ? 'Choisir une catégorie' : 'Select category'
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <FormLabel>
                    {language === 'fr' ? 'Description' : 'Description'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        language === 'fr'
                          ? 'Description détaillée de l\'article...'
                          : 'Detailed item description...'
                      }
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Variants - Restaurant POS Style */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base font-medium">
                    {language === 'fr' ? 'Variantes de produit' : 'Product Variants'}
                  </FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'fr' ? 'Ajoutez des tailles ou options différentes' : 'Add different sizes or options'}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addVariant} className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Ajouter' : 'Add Variant'}
                </Button>
              </div>

              {variantFields.length > 0 && (
                <div className="space-y-3">
                  {variantFields.map((field, index) => (
                    <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:border-gray-300 transition-colors">
                      {/* Header with drag handle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                          <span className="text-sm font-medium text-gray-700">
                            {language === 'fr' ? 'Variante' : 'Variant'} {index + 1}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          disabled={isSubmitting}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Compact form - Single row */}
                      <div className="grid grid-cols-[1fr_120px_100px] gap-3 items-end">
                        {/* Variant Name */}
                        <FormField
                          control={form.control}
                          name={`variants.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-gray-600 font-medium">
                                {language === 'fr' ? 'Nom' : 'Name'}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={language === 'fr' ? 'Grande, Moyenne...' : 'Large, Medium...'}
                                  {...field}
                                  disabled={isSubmitting}
                                  className="h-9 bg-gray-50 border-gray-200 focus:bg-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Price Modifier */}
                        <FormField
                          control={form.control}
                          name={`variants.${index}.price_modifier`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-gray-600 font-medium">
                                {language === 'fr' ? 'Prix +/-' : 'Price +/-'}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                    disabled={isSubmitting}
                                    className="h-9 pr-6 bg-gray-50 border-gray-200 focus:bg-white"
                                  />
                                  <span className="absolute right-2 top-2 text-xs text-gray-500">$</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Default Toggle */}
                        <FormField
                          control={form.control}
                          name={`variants.${index}.is_default`}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2 h-9">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                    className="data-[state=checked]:bg-orange-500"
                                  />
                                </FormControl>
                                <FormLabel className="text-xs text-gray-600 font-medium cursor-pointer" onClick={() => field.onChange(!field.value)}>
                                  {language === 'fr' ? 'Défaut' : 'Default'}
                                </FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {variantFields.length === 0 && (
                <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                      <Plus className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-sm font-medium">
                      {language === 'fr' ? 'Aucune variante ajoutée' : 'No variants added'}
                    </p>
                    <p className="text-gray-500 text-xs max-w-sm">
                      {language === 'fr'
                        ? 'Cliquez sur "Ajouter" pour créer des options de taille ou de prix.'
                        : 'Click "Add Variant" to create size or price options.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    {language === 'fr' ? 'Enregistrement...' : 'Saving...'}
                  </>
                ) : isEditMode ? (
                  language === 'fr' ? 'Mettre à jour' : 'Update Template'
                ) : (
                  language === 'fr' ? 'Créer le Modèle' : 'Create Template'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}