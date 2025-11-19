'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useLanguage } from '@/contexts/language-context'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { useAuthApi } from '@/hooks/use-auth'
import { branchesService } from '@/services/branches.service'
import { uploadBranchBanner, deleteBranchBanner } from '@/services/supabase-storage.service'
import { optimizePhoto } from '@/lib/photo-optimizer'
import toast from 'react-hot-toast'

export function BannerTab() {
  const { language } = useLanguage()
  const { branchId, user } = useEnhancedAuth()
  const { refreshProfile } = useAuthApi()

  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentBanner = user?.branch_theme_config?.bannerImage
  const currentLayout = user?.branch_theme_config?.layout || 'template-1'

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !branchId) return

    // Validate file size (max 10MB before optimization)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'fr'
        ? 'La taille du fichier ne peut pas dépasser 10 MB'
        : 'File size cannot exceed 10MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'fr'
        ? 'Veuillez sélectionner un fichier image valide'
        : 'Please select a valid image file')
      return
    }

    // Create preview URL
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setSelectedFile(file)
    setShowUploadDialog(true)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadConfirm = async () => {
    if (!selectedFile || !branchId) return

    try {
      setIsUploading(true)
      setShowUploadDialog(false)

      // Optimize banner - convert to WebP only, preserve original dimensions
      const optimizedBanner = await optimizePhoto(selectedFile, {
        maxWidth: 3840, // Very high limit, won't resize unless extremely large
        maxHeight: 2160,
        quality: 0.85,
        format: 'webp'
      })

      // Upload to Supabase Storage
      const uploadResult = await uploadBranchBanner(
        optimizedBanner.file,
        branchId
      )

      // Update branch theme_config
      await branchesService.updateBranchThemeConfig(branchId, {
        ...user?.branch_theme_config,
        layout: currentLayout,
        bannerImage: uploadResult.url
      })

      // Refresh user profile to get updated branch_theme_config
      await refreshProfile()

      toast.success(language === 'fr'
        ? 'Bannière téléchargée avec succès!'
        : 'Banner uploaded successfully!')

    } catch (error) {
      console.error('Banner upload failed:', error)
      toast.error(language === 'fr'
        ? 'Erreur lors du téléchargement de la bannière'
        : 'Failed to upload banner')
    } finally {
      setIsUploading(false)
      // Clean up preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setSelectedFile(null)
    }
  }

  const handleUploadCancel = () => {
    setShowUploadDialog(false)
    // Clean up preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!currentBanner || !branchId) return

    try {
      setIsDeleting(true)
      setShowDeleteDialog(false)

      // Extract path from URL
      const urlParts = currentBanner.split('/storage/v1/object/public/menu-images/')
      if (urlParts.length === 2) {
        await deleteBranchBanner(urlParts[1])
      }

      // Update branch theme_config - remove bannerImage
      await branchesService.updateBranchThemeConfig(branchId, {
        ...user?.branch_theme_config,
        layout: currentLayout,
        bannerImage: undefined
      })

      // Refresh user profile to get updated branch_theme_config
      await refreshProfile()

      toast.success(language === 'fr'
        ? 'Bannière supprimée avec succès!'
        : 'Banner deleted successfully!')

    } catch (error) {
      console.error('Banner deletion failed:', error)
      toast.error(language === 'fr'
        ? 'Erreur lors de la suppression de la bannière'
        : 'Failed to delete banner')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {language === 'fr' ? 'Bannière du Menu' : 'Menu Banner'}
          </CardTitle>
          <CardDescription>
            {language === 'fr'
              ? 'Bannière d\'en-tête pour votre page de commande. Taille recommandée: 1920x500px ou similaire.'
              : 'Header banner for your order page. Recommended size: 1920x500px or similar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading Overlay */}
          {isUploading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {language === 'fr' ? 'Téléchargement en cours...' : 'Uploading...'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {language === 'fr'
                      ? 'Optimisation et sauvegarde de votre bannière'
                      : 'Optimizing and saving your banner'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Banner Preview */}
          {currentBanner && !isUploading && (
            <div className="space-y-4">
              <div className="relative rounded-lg border overflow-hidden bg-gray-50">
                <img
                  src={currentBanner}
                  alt="Current Banner"
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '300px' }}
                />
                {/* Action Buttons Overlay */}
                <div className="absolute top-3 left-3 right-3 flex justify-between">
                  <Button
                    onClick={handleUploadClick}
                    disabled={isDeleting}
                    variant="outline"
                    size="sm"
                    className="bg-white/95 hover:bg-white shadow-md"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {language === 'fr' ? 'Remplacer' : 'Replace'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-md"
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {language === 'fr' ? 'Supprimer' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!currentBanner && !isUploading && (
            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-16 text-center hover:border-primary transition-all cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {language === 'fr' ? 'Cliquez pour télécharger une bannière' : 'Click to upload a banner'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {language === 'fr' ? 'Recommandé: 1920x500px' : 'Recommended: 1920x500px'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, WebP {language === 'fr' ? '· Maximum 10MB' : '· Max 10MB'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading || isDeleting}
          />

          {/* Info Text */}
          {!isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>{language === 'fr' ? 'Note:' : 'Note:'}</strong>{' '}
                {language === 'fr'
                  ? 'L\'image sera automatiquement optimisée au format WebP.'
                  : 'Image will be automatically optimized to WebP format.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {language === 'fr' ? 'Supprimer la bannière' : 'Delete Banner'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? 'Êtes-vous sûr de vouloir supprimer cette bannière? Cette action est irréversible.'
                : 'Are you sure you want to delete this banner? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === 'fr' ? 'Supprimer' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Confirmation Dialog */}
      <AlertDialog open={showUploadDialog} onOpenChange={handleUploadCancel}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {language === 'fr' ? 'Confirmer le téléchargement' : 'Confirm Upload'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? 'Prévisualisation de votre nouvelle bannière. Cliquez sur "Appliquer les modifications" pour confirmer.'
                : 'Preview of your new banner. Click "Apply Changes" to confirm.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Preview */}
          {previewUrl && (
            <div className="rounded-lg border overflow-hidden bg-gray-50">
              <img
                src={previewUrl}
                alt="Banner Preview"
                className="w-full h-auto object-contain"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleUploadCancel}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUploadConfirm}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {language === 'fr' ? 'Appliquer les modifications' : 'Apply Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
