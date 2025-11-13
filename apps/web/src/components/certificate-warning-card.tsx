"use client"

import * as React from "react"
import { Shield, AlertCircle, AlertTriangle, AlertOctagon, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language-context"
import type { CertificateExpiryStatus } from "@/types/websrm"

interface CertificateWarningCardProps {
  status: CertificateExpiryStatus
}

/**
 * Certificate warning card component for notifications dialog
 * FO-127: Shows certificate expiry warnings with appropriate styling and messaging
 */
export function CertificateWarningCard({ status }: CertificateWarningCardProps) {
  const router = useRouter()
  const { language } = useLanguage()

  if (!status.shouldShowNotification) {
    return null
  }

  // Determine icon and colors based on warning level
  const getWarningConfig = () => {
    switch (status.warningLevel) {
      case 'expired':
        return {
          icon: XCircle,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          title: language === 'fr' ? 'Certificat Expiré' : 'Certificate Expired',
          description: language === 'fr'
            ? 'Votre certificat WEB-SRM a expiré. Renouvellement requis immédiatement.'
            : 'Your WEB-SRM certificate has expired. Immediate renewal required.',
        }
      case 'critical':
        return {
          icon: AlertOctagon,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          title: language === 'fr' ? 'Action Critique Requise' : 'Critical Action Required',
          description: language === 'fr'
            ? `Votre certificat expire dans ${status.daysUntilExpiry} jour${status.daysUntilExpiry !== 1 ? 's' : ''}. Renouvelez immédiatement.`
            : `Your certificate expires in ${status.daysUntilExpiry} day${status.daysUntilExpiry !== 1 ? 's' : ''}. Renew immediately.`,
        }
      case 'urgent':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600',
          title: language === 'fr' ? 'Action Urgente Requise' : 'Urgent Action Required',
          description: language === 'fr'
            ? `Votre certificat expire dans ${status.daysUntilExpiry} jours. Action requise.`
            : `Your certificate expires in ${status.daysUntilExpiry} days. Action required.`,
        }
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          title: language === 'fr' ? 'Certificat Expire Bientôt' : 'Certificate Expiring Soon',
          description: language === 'fr'
            ? `Votre certificat expire dans ${status.daysUntilExpiry} jours.`
            : `Your certificate expires in ${status.daysUntilExpiry} days.`,
        }
      case 'info':
        return {
          icon: Shield,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          title: language === 'fr' ? 'Renouvellement Recommandé' : 'Renewal Recommended',
          description: language === 'fr'
            ? 'Le Québec recommande de renouveler votre certificat tous les 3 ans.'
            : 'Quebec recommends renewing your certificate every 3 years.',
        }
      default:
        return null
    }
  }

  const config = getWarningConfig()

  if (!config) {
    return null
  }

  const Icon = config.icon

  const handleViewSettings = () => {
    router.push('/settings/branch/websrm-certificate')
  }

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-full ${config.bgColor} p-2`}>
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">
            {config.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {language === 'fr'
              ? 'Consultez vos paramètres de certificat pour plus de détails.'
              : 'Check your certificate settings for more details.'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Button
          onClick={handleViewSettings}
          variant="outline"
          className="w-full"
        >
          {language === 'fr' ? 'Voir les Paramètres du Certificat' : 'View Certificate Settings'}
        </Button>
      </div>
    </div>
  )
}
