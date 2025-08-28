'use client'

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"
import { Loader2, MapPin, Building2 } from "lucide-react"
import { branchesService, Branch } from "@/services/branches.service"
import { Chain } from "@/services/chains.service"
import { AddressSearchInput } from "./address-search-input"

const editBranchSchema = z.object({
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
})

type EditBranchFormData = z.infer<typeof editBranchSchema>

interface EditBranchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: Branch | null
  chains: Chain[]
  onSuccess?: () => void
}

export function EditBranchModal({ open, onOpenChange, branch, chains, onSuccess }: EditBranchModalProps) {
  const { language } = useLanguage()
  
  const [loading, setLoading] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{lat: number, lng: number} | null>(null)

  const form = useForm<EditBranchFormData>({
    resolver: zodResolver(editBranchSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      is_active: true,
    },
  })

  // Update form when branch data changes
  useEffect(() => {
    if (branch && open) {
      form.reset({
        name: branch.name,
        slug: branch.slug,
        description: branch.description || "",
        address: typeof branch.address === 'string' ? branch.address : 
                typeof branch.address === 'object' && branch.address ? 
                `${branch.address.street || ''} ${branch.address.city || ''} ${branch.address.province || ''}`.trim() : 
                '',
        phone: branch.phone || "",
        email: branch.email || "",
        is_active: branch.is_active,
      })
      setSelectedCoordinates(null)
    }
  }, [branch, open, form])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = branchesService.generateSlug(name)
    form.setValue('slug', slug)
  }

  const onSubmit = async (data: EditBranchFormData) => {
    if (!branch) return

    try {
      setLoading(true)
      
      const updateData = {
        ...data,
        coordinates: selectedCoordinates || undefined
      }
      
      await branchesService.updateBranch(branch.id, updateData)

      // Close modal and refresh
      onOpenChange(false)
      onSuccess?.()
      
    } catch (error) {
      console.error('Error updating branch:', error)
      alert(language === 'fr' ? 'Erreur lors de la mise à jour de la succursale' : 'Error updating branch')
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSelect = (address: string, coordinates?: {lat: number, lng: number}) => {
    form.setValue('address', address)
    setSelectedCoordinates(coordinates || null)
  }

  if (!branch) return null

  // Find the chain for this branch
  const branchChain = chains.find(chain => chain.id === branch.chain_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {language === 'fr' ? 'Modifier la Succursale' : 'Edit Branch'}
          </DialogTitle>
        </DialogHeader>

        {/* Chain Information (Read-only) */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            {language === 'fr' ? 'Chaîne de Restaurants' : 'Restaurant Chain'}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{branchChain?.name || 'Unknown Chain'}</span>
            <Badge variant="outline" className="text-xs">
              {language === 'fr' ? 'Non modifiable' : 'Read-only'}
            </Badge>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        ? 'Utilisé dans les URLs. Doit être unique dans cette chaîne.'
                        : 'Used in URLs. Must be unique within this chain.'
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
                {language === 'fr' ? 'Mettre à Jour' : 'Update Branch'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}