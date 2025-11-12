"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, AlertCircle, Eye, Trash2, Calendar, Fingerprint, FileKey } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CertificateData {
  id: string
  serialNumber: string
  validFrom: string
  validUntil: string
  fingerprint: string
  isActive: boolean
  deviceId: string
  env: string
}

interface WebsrmCertificateCardProps {
  certificate: CertificateData | null
  loading: boolean
  onDelete: () => Promise<void>
  onRequestCertificate: () => void
  language: 'en' | 'fr'
}

export function WebsrmCertificateCard({
  certificate,
  loading,
  onDelete,
  onRequestCertificate,
  language
}: WebsrmCertificateCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
    setDeleteDialogOpen(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!certificate) {
    // No Certificate Card
    return (
      <>
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">
                  {language === 'fr' ? 'Aucun Certificat Actif' : 'No Active Certificate'}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'fr'
                    ? 'Certificat WEB-SRM requis'
                    : 'WEB-SRM certificate required'}
                </p>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {language === 'fr' ? 'Manquant' : 'Missing'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {language === 'fr'
                ? 'Votre succursale nécessite un certificat numérique pour utiliser le système WEB-SRM du Québec.'
                : 'Your branch requires a digital certificate to use the Quebec WEB-SRM system.'}
            </p>
            <Button onClick={onRequestCertificate} className="w-full">
              {language === 'fr' ? 'Demander un Certificat' : 'Request Certificate'}
            </Button>
          </CardContent>
        </Card>
      </>
    )
  }

  // Active Certificate Card
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">
                {language === 'fr' ? 'Certificat Actif' : 'Active Certificate'}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'fr' ? 'Certificat WEB-SRM valide' : 'Valid WEB-SRM certificate'}
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-500">
              {language === 'fr' ? 'Actif' : 'Active'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <FileKey className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {language === 'fr' ? 'Numéro de série' : 'Serial Number'}
                </p>
                <p className="font-mono text-sm mt-0.5 break-all">
                  {certificate.serialNumber}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {language === 'fr' ? 'Validité' : 'Validity'}
                </p>
                <p className="text-sm mt-0.5">
                  {formatDate(certificate.validFrom)} → {formatDate(certificate.validUntil)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Fingerprint className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {language === 'fr' ? 'Empreinte digitale' : 'Fingerprint'}
                </p>
                <p className="font-mono text-sm mt-0.5 break-all">
                  {certificate.fingerprint.length > 20
                    ? `${certificate.fingerprint.substring(0, 20)}...`
                    : certificate.fingerprint}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDetailsOpen(true)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Détails' : 'Details'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="flex-1 text-white hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Supprimer' : 'Delete'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Supprimer le certificat' : 'Delete Certificate'}
            </DialogTitle>
            <DialogDescription>
              {language === 'fr'
                ? 'Êtes-vous sûr? Cette action enverra une demande d\'annulation à WEB-SRM.'
                : 'Are you sure? This will send an annulation request to WEB-SRM.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                <strong>{language === 'fr' ? 'Attention:' : 'Warning:'}</strong>{' '}
                {language === 'fr'
                  ? 'Vous devrez demander un nouveau certificat après.'
                  : 'You will need to request a new certificate afterwards.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="text-white hover:bg-red-700 transition-colors disabled:hover:bg-red-500"
            >
              {language === 'fr' ? 'Confirmer' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Détails du Certificat' : 'Certificate Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">
                  {language === 'fr' ? 'Environnement' : 'Environment'}
                </p>
                <p className="mt-1 font-mono">{certificate.env}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">
                  {language === 'fr' ? 'ID Appareil' : 'Device ID'}
                </p>
                <p className="mt-1 font-mono">{certificate.deviceId}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'fr' ? 'Empreinte complète' : 'Full Fingerprint'}
              </p>
              <code className="text-xs block mt-1 p-2 bg-muted rounded break-all">
                {certificate.fingerprint}
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDetailsOpen(false)}>
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
