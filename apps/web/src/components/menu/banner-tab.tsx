'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { branchesService, type Branch } from '@/services/branches.service'
import { uploadBranchBanner, deleteBranchBanner } from '@/services/supabase-storage.service'
import { optimizePhoto } from '@/lib/photo-optimizer'

export function BannerTab() {
  const { language } = useLanguage()
  const { branchId } = useEnhancedAuth()

  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current branch data
  const fetchBranch = async () => {
    if (!branchId) return
    try {
      const branch = await branchesService.getBranchById(branchId)
      setCurrentBranch(branch)
    } catch (error) {
      console.error('Failed to fetch branch:', error)
    }
  }

  useEffect(() => {
    fetchBranch()
  }, [branchId])

  const currentBanner = currentBranch?.theme_config?.bannerImage

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setIsUploading(true)

      // Optimize banner - larger dimensions for banners
      const optimizedBanner = await optimizePhoto(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'webp'
      })

      // Upload to Supabase Storage
      const uploadResult = await uploadBranchBanner(
        optimizedBanner.file,
        currentBranch!.id
      )

      // Update branch theme_config
      await branchesService.updateBranch(currentBranch!.id, {
        theme_config: {
          ...currentBranch?.theme_config,
          layout: currentBranch?.theme_config?.layout || 'template-1',
          bannerImage: uploadResult.url
        }
      })

      // Refresh branch data
      await fetchBranch()

      alert(language === 'fr'
        ? 'Bannière téléchargée avec succès!'
        : 'Banner uploaded successfully!')

    } catch (error) {
      console.error('Banner upload failed:', error)
      alert(language === 'fr'
        ? 'Erreur lors du téléchargement de la bannière'
        : 'Failed to upload banner')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (!currentBanner) return

    const confirmDelete = confirm(
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir supprimer cette bannière?'
        : 'Are you sure you want to delete this banner?'
    )

    if (!confirmDelete) return

    try {
      setIsDeleting(true)

      // Extract path from URL
      const urlParts = currentBanner.split('/storage/v1/object/public/menu-images/')
      if (urlParts.length === 2) {
        await deleteBranchBanner(urlParts[1])
      }

      // Update branch theme_config - remove bannerImage
      await branchesService.updateBranch(currentBranch!.id, {
        theme_config: {
          ...currentBranch?.theme_config,
          layout: currentBranch?.theme_config?.layout || 'template-1',
          bannerImage: undefined
        }
      })

      // Refresh branch data
      await fetchBranch()

      alert(language === 'fr'
        ? 'Bannière supprimée avec succès!'
        : 'Banner deleted successfully!')

    } catch (error) {
      console.error('Banner deletion failed:', error)
      alert(language === 'fr'
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
              ? 'Téléchargez une image de bannière pour la page de commande (Template 1). Taille recommandée: 1920x1080px'
              : 'Upload a banner image for the order page (Template 1). Recommended size: 1920x1080px'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Banner Preview */}
          {currentBanner && (
            <div className="space-y-4">
              <div className="relative rounded-lg border overflow-hidden bg-gray-50">
                <img
                  src={currentBanner}
                  alt="Current Banner"
                  className="w-full h-auto max-h-[400px] object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || isUploading}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <X className="mr-2 h-4 w-4" />
                  {language === 'fr' ? 'Supprimer la Bannière' : 'Delete Banner'}
                </Button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!currentBanner && (
            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                {language === 'fr' ? 'Cliquez pour télécharger' : 'Click to upload'}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                PNG, JPG, WebP {language === 'fr' ? 'jusqu\'à' : 'up to'} 10MB
              </p>
            </div>
          )}

          {/* Replace Button */}
          {currentBanner && (
            <Button
              onClick={handleUploadClick}
              disabled={isUploading || isDeleting}
              variant="outline"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              {language === 'fr' ? 'Remplacer la Bannière' : 'Replace Banner'}
            </Button>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Info Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>{language === 'fr' ? 'Conseil:' : 'Tip:'}</strong>{' '}
              {language === 'fr'
                ? 'Les images seront automatiquement optimisées en WebP pour de meilleures performances.'
                : 'Images will be automatically optimized to WebP for better performance.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
