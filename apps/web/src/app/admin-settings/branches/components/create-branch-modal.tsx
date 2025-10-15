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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/contexts/language-context"
import { Loader2, MapPin } from "lucide-react"
import { branchesService } from "@/services/branches.service"
import { Chain } from "@/services/chains.service"
import { AddressSearchInput } from "./address-search-input"

const createBranchSchema = z.object({
  chain_id: z.string().min(1, "Chain selection is required"),
  name: z.string().min(1, "Branch name is required").max(100, "Branch name too long"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  is_active: z.boolean(),
  theme_layout: z.enum(['default', 'template-1']),
  primary_color: z.string().optional(),
})

type CreateBranchFormData = z.infer<typeof createBranchSchema>

interface CreateBranchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chains: Chain[]
  onSuccess?: () => void
}

export function CreateBranchModal({ open, onOpenChange, chains, onSuccess }: CreateBranchModalProps) {
  const { language } = useLanguage()
  
  const [loading, setLoading] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{lat: number, lng: number} | null>(null)

  const form = useForm<CreateBranchFormData>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      chain_id: "",
      name: "",
      slug: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      is_active: true,
      theme_layout: "default",
      primary_color: "",
    },
  })

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = branchesService.generateSlug(name)
    form.setValue('slug', slug)
  }

  const onSubmit = async (data: CreateBranchFormData) => {
    try {
      setLoading(true)

      const { theme_layout, primary_color, ...restData } = data

      const branchData = {
        ...restData,
        coordinates: selectedCoordinates || undefined,
        theme_config: {
          layout: theme_layout,
          colors: primary_color ? { primary: primary_color } : undefined
        }
      }

      await branchesService.createBranch(branchData)

      // Close modal and refresh
      onOpenChange(false)
      onSuccess?.()
      form.reset()
      setSelectedCoordinates(null)

    } catch (error) {
      console.error('Error creating branch:', error)
      alert(language === 'fr' ? 'Erreur lors de la création de la succursale' : 'Error creating branch')
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSelect = (address: string, coordinates?: {lat: number, lng: number}) => {
    form.setValue('address', address)
    setSelectedCoordinates(coordinates || null)
  }

  const activeChains = chains.filter(chain => chain.is_active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {language === 'fr' ? 'Nouvelle Succursale' : 'New Branch'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Chain Selection */}
            <FormField
              control={form.control}
              name="chain_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Chaîne de Restaurants' : 'Restaurant Chain'} *
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner une chaîne' : 'Select a chain'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeChains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Branch Name & Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Nom de la Succursale' : 'Branch Name'} *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          handleNameChange(e.target.value)
                        }}
                        placeholder={language === 'fr' ? 'ex: Centre-ville Montreal' : 'e.g. Downtown Montreal'}
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
                      {language === 'fr' ? 'Identifiant URL' : 'URL Slug'} *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder={language === 'fr' ? 'ex: centre-ville-montreal' : 'e.g. downtown-montreal'}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? 'Généré automatiquement à partir du nom'
                        : 'Auto-generated from branch name'
                      }
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
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
                        ? 'Décrivez cette succursale...'
                        : 'Describe this branch...'
                      }
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address with Canadian Search */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Adresse' : 'Address'} *
                  </FormLabel>
                  <FormControl>
                    <AddressSearchInput
                      value={field.value}
                      onSelect={handleAddressSelect}
                      placeholder={language === 'fr' 
                        ? 'Rechercher une adresse au Canada...'
                        : 'Search for a Canadian address...'
                      }
                    />
                  </FormControl>
                  {selectedCoordinates && (
                    <p className="text-xs text-muted-foreground">
                      📍 Coordinates: {selectedCoordinates.lat.toFixed(4)}, {selectedCoordinates.lng.toFixed(4)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Téléphone' : 'Phone'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="+1 (514) 555-0123"
                        type="tel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Courriel' : 'Email'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="branch@example.com"
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Theme Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="theme_layout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Thème Visuel' : 'Visual Theme'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'fr' ? 'Sélectionner un thème' : 'Select a theme'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span>{language === 'fr' ? 'Défaut' : 'Default'}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="template-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span>{language === 'fr' ? 'Modèle 1' : 'Template 1'}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Couleur Principale' : 'Primary Color'}
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          type="color"
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...field}
                          type="text"
                          placeholder={language === 'fr' ? 'ex: #FF6B35' : 'e.g. #FF6B35'}
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {language === 'fr' ? 'Succursale Active' : 'Active Branch'}
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' 
                        ? 'Permet à cette succursale de recevoir des commandes'
                        : 'Allow this branch to receive orders'
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
                {language === 'fr' ? 'Créer la Succursale' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}