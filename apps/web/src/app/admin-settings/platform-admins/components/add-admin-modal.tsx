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
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { Loader2, UserPlus, AlertTriangle } from "lucide-react"
import { platformAdminService } from "@/services/platform-admin.service"

const addAdminSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type AddAdminFormData = z.infer<typeof addAdminSchema>

interface AddAdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddAdminModal({ open, onOpenChange, onSuccess }: AddAdminModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { language } = useLanguage()

  const form = useForm<AddAdminFormData>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: AddAdminFormData) => {
    try {
      setLoading(true)
      setError(null)

      await platformAdminService.createNewPlatformAdmin({
        email: data.email,
        full_name: data.full_name,
        password: data.password
      })
      
      // Reset form and close modal
      form.reset()
      setError(null)
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create platform admin'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {language === 'fr' ? 'Créer un Nouveau Administrateur' : 'Create New Administrator'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Nom Complet' : 'Full Name'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={language === 'fr' ? 'Entrer le nom complet' : 'Enter full name'}
                      {...field}
                      disabled={loading}
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
                    {language === 'fr' ? 'Adresse Email' : 'Email Address'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={language === 'fr' ? 'Entrer l\'adresse email' : 'Enter email address'}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === 'fr' ? 'Mot de Passe' : 'Password'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={language === 'fr' ? 'Entrer le mot de passe' : 'Enter password'}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Message */}
            {error && (
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === 'fr' ? 'Création...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {language === 'fr' ? 'Créer Admin' : 'Create Admin'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}