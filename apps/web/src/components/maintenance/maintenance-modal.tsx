"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Phone, Wrench } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface MaintenanceModalProps {
  branchPhone?: string | null
}

export function MaintenanceModal({ branchPhone }: MaintenanceModalProps) {
  const { language } = useLanguage()

  // Static bilingual messages
  const messages = {
    en: {
      title: "Site Under Maintenance",
      message: "The site is under maintenance. Please call to place your order.",
      callButton: "Call to Order"
    },
    fr: {
      title: "Site en Maintenance",
      message: "Le site est en maintenance. Veuillez appeler pour passer votre commande.",
      callButton: "Appeler pour Commander"
    }
  }

  const content = messages[language]

  // Format phone number for tel: link
  const phoneLink = branchPhone
    ? `tel:${branchPhone.replace(/\D/g, '')}`
    : undefined

  return (
    <Dialog open={true} modal>
      <DialogContent
        className="sm:max-w-md mx-auto"
        hideCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center border border-orange-200 dark:border-orange-800 flex-shrink-0">
              <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>

            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-foreground mb-1">
                {content.title}
              </DialogTitle>
              <p className="text-muted-foreground text-sm">
                {content.message}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Number Display */}
          {branchPhone && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                  {branchPhone}
                </p>
              </div>
            </div>
          )}

          {/* Call Button */}
          <div className="space-y-3">
            {branchPhone ? (
              <Button
                className="w-full h-11"
                size="lg"
                asChild
              >
                <a href={phoneLink}>
                  <Phone className="h-5 w-5 mr-2" />
                  {content.callButton}
                </a>
              </Button>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">
                  {language === 'fr'
                    ? 'Numéro de téléphone non disponible'
                    : 'Phone number not available'}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
