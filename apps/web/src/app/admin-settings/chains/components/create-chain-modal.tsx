'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/contexts/language-context"
import { Loader2 } from "lucide-react"
import { ImageUpload } from "./image-upload"
import { chainsService } from "@/services/chains.service"

const createChainSchema = z.object({
  name: z.string().min(1, "Chain name is required").max(100, "Chain name too long"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  is_active: z.boolean(),
  logo_url: z.string().optional(),
  // Chain Owner fields
  owner_email: z.string().email("Valid email required"),
  owner_full_name: z.string().min(1, "Owner name is required"),
  owner_password: z.string().min(8, "Password must be at least 8 characters"),
})

type CreateChainFormData = z.infer<typeof createChainSchema>

interface CreateChainModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateChainModal({ open, onOpenChange, onSuccess }: CreateChainModalProps) {
  const { language } = useLanguage()
  
  const [loading, setLoading] = useState(false)

  const form = useForm<CreateChainFormData>({
    resolver: zodResolver(createChainSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
      logo_url: "",
      owner_email: "",
      owner_full_name: "",
      owner_password: "",
    },
  })

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    
    form.setValue('slug', slug)
  }

  const onSubmit = async (data: CreateChainFormData) => {
    try {
      setLoading(true)
      
      await chainsService.createChain(data)

      // Reset form and close modal
      form.reset()
      onOpenChange(false)
      onSuccess?.()
      
    } catch (error) {
      console.error('Error creating chain:', error)
      alert(language === 'fr' ? 'Erreur lors de la création de la chaîne' : 'Error creating chain')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Créer une Nouvelle Chaîne' : 'Create New Chain'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Nom de la Chaîne' : 'Chain Name'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder={language === 'fr' ? 'ex: Resto Délice' : 'e.g. Delicious Eats'}
                      onChange={(e) => {
                        field.onChange(e.target.value)
                        handleNameChange(e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Identifiant URL' : 'URL Slug'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder={language === 'fr' ? 'ex: resto-delice' : 'e.g. delicious-eats'}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' 
                      ? 'Utilisé dans les URLs. Lettres minuscules, chiffres et tirets seulement.'
                      : 'Used in URLs. Lowercase letters, numbers and hyphens only.'
                    }
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Description (Optionnel)' : 'Description (Optional)'}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      placeholder={language === 'fr' 
                        ? 'Décrivez cette chaîne de restaurants...'
                        : 'Describe this restaurant chain...'
                      }
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Logo de la Chaîne' : 'Chain Logo'}
                  </FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      label=""
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {language === 'fr' ? 'Chaîne Active' : 'Active Chain'}
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' 
                        ? 'Permet aux succursales de cette chaîne de fonctionner'
                        : 'Allow branches of this chain to operate'
                      }
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Chain Owner Section */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-lg font-semibold">
                  {language === 'fr' ? 'Propriétaire de la Chaîne' : 'Chain Owner'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Créer un compte propriétaire pour cette chaîne'
                    : 'Create an owner account for this chain'
                  }
                </p>
              </div>

              <FormField
                control={form.control}
                name="owner_full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Nom Complet' : 'Full Name'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder={language === 'fr' ? 'ex: Jean Dupont' : 'e.g. John Smith'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="owner_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {language === 'fr' ? 'Courriel' : 'Email'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="email"
                          placeholder={language === 'fr' ? 'ex: jean@restaurant.com' : 'e.g. owner@restaurant.com'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="owner_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {language === 'fr' ? 'Mot de Passe' : 'Password'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="password"
                          placeholder={language === 'fr' ? 'Minimum 8 caractères' : 'Minimum 8 characters'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'fr' 
                  ? 'Le propriétaire pourra changer ce mot de passe après sa première connexion'
                  : 'Owner can change this password after first login'
                }
              </p>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {language === 'fr' ? 'Créer Chaîne & Propriétaire' : 'Create Chain & Owner'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}