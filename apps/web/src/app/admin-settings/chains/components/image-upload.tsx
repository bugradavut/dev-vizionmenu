'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/language-context'

interface ImageUploadProps {
  value?: string
  onChange: (value: string | undefined) => void
  label: string
  accept?: string
  className?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  label, 
  accept = 'image/*',
  className = ''
}: ImageUploadProps) {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB before optimization)
    if (file.size > 10 * 1024 * 1024) {
      setError(
        language === 'fr' 
          ? 'La taille du fichier ne peut pas dépasser 10 MB'
          : 'File size cannot exceed 10MB'
      )
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(
        language === 'fr' 
          ? 'Veuillez sélectionner un fichier image valide'
          : 'Please select a valid image file'
      )
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Import optimization function dynamically
      const { optimizePhoto } = await import('@/lib/photo-optimizer')
      
      // Optimize photo with chain logo specific settings
      const optimizedPhoto = await optimizePhoto(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        format: 'webp'
      })

      // Create preview from optimized file
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        onChange(dataUrl)
        setLoading(false)
      }
      reader.readAsDataURL(optimizedPhoto.file)

      // TODO: Implement actual file upload to Supabase Storage
      // const formData = new FormData()
      // formData.append('file', optimizedPhoto.file)
      // const response = await fetch('/api/v1/admin/upload', {
      //   method: 'POST',
      //   body: formData
      // })
      // const data = await response.json()
      // onChange(data.url)

    } catch (err) {
      console.error('Photo optimization failed:', err)
      setError(
        language === 'fr' 
          ? 'Erreur lors de l\'optimisation de la photo'
          : 'Photo optimization failed'
      )
      setLoading(false)
    }
  }

  const handleRemove = () => {
    onChange(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">
        {label}
      </label>
      
      {value ? (
        <div className="relative group">
          <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
            <img 
              src={value} 
              alt="Uploaded image" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-32 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <div className="flex flex-col items-center gap-2">
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">
                      {language === 'fr' ? 'Cliquez pour télécharger' : 'Click to upload'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? 'Max 10MB • JPG, PNG, WebP'
                        : 'Max 10MB • JPG, PNG, WebP'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Optimisé automatiquement' : 'Auto-optimized for web'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}