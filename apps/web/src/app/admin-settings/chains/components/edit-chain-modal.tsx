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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/contexts/language-context"
import { Loader2, Crown, Mail, User } from "lucide-react"
import { ImageUpload } from "./image-upload"
import { chainsService, Chain, ChainWithBranches } from "@/services/chains.service"

const editChainSchema = z.object({
  name: z.string().min(1, "Chain name is required").max(100, "Chain name too long"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  is_active: z.boolean(),
  logo_url: z.string().optional(),
})

type EditChainFormData = z.infer<typeof editChainSchema>


interface EditChainModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chain: Chain | null
  onSuccess?: () => void
}

export function EditChainModal({ open, onOpenChange, chain, onSuccess }: EditChainModalProps) {
  const { language } = useLanguage()
  
  const [loading, setLoading] = useState(false)
  const [chainDetails, setChainDetails] = useState<ChainWithBranches | null>(null)
  const [fetchingDetails, setFetchingDetails] = useState(false)

  const form = useForm<EditChainFormData>({
    resolver: zodResolver(editChainSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
      logo_url: "",
    },
  })

  // Update form and fetch details when chain data changes
  useEffect(() => {
    if (chain && open) {
      form.reset({
        name: chain.name,
        slug: chain.slug,
        description: chain.description || "",
        is_active: chain.is_active,
        logo_url: chain.logo_url || "",
      })
      
      // Fetch detailed chain info including owner
      fetchChainDetails(chain.id)
    }
  }, [chain, open, form])

  const fetchChainDetails = async (chainId: string) => {
    try {
      setFetchingDetails(true)
      const details = await chainsService.getChainById(chainId)
      setChainDetails(details)
    } catch (error) {
      console.error('Error fetching chain details:', error)
    } finally {
      setFetchingDetails(false)
    }
  }

  const onSubmit = async (data: EditChainFormData) => {
    if (!chain) return

    try {
      setLoading(true)
      
      await chainsService.updateChain(chain.id, data)

      // Close modal and refresh
      onOpenChange(false)
      onSuccess?.()
      
    } catch (error) {
      console.error('Error updating chain:', error)
      alert(language === 'fr' ? 'Erreur lors de la mise à jour de la chaîne' : 'Error updating chain')
    } finally {
      setLoading(false)
    }
  }

  if (!chain) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Modifier la Chaîne' : 'Edit Chain'}
          </DialogTitle>
        </DialogHeader>

        {/* Chain Owner Information */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              {language === 'fr' ? 'Propriétaire Actuel' : 'Current Owner'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetchingDetails ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : chainDetails?.owner ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs">
                    {chainDetails.owner.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'O'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{chainDetails.owner.full_name}</p>
                    <Badge variant={chainDetails.owner.status === 'active' ? "default" : "secondary"} className="text-xs">
                      {chainDetails.owner.status === 'active' 
                        ? (language === 'fr' ? 'Actif' : 'Active')
                        : (language === 'fr' ? 'Inactif' : 'Inactive')
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{chainDetails.owner.email}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {language === 'fr' ? 'Aucun propriétaire assigné' : 'No owner assigned'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-4" />

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
                {language === 'fr' ? 'Mettre à Jour' : 'Update Chain'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}