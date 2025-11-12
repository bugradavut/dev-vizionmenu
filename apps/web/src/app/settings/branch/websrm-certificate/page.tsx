"use client"

import React, { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft } from "lucide-react"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useLanguage } from "@/contexts/language-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { WebsrmCertificateCard } from "@/components/branch-settings/websrm-certificate-card"

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

export default function WebsrmCertificatePage() {
  const { branchId } = useEnhancedAuth()
  const { language } = useLanguage()
  const { toast } = useToast()

  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch certificate on mount
  useEffect(() => {
    console.log('🔍 [FO-109] useEffect - branchId:', branchId)
    if (branchId) {
      console.log('✅ [FO-109] Calling fetchCertificate...')
      fetchCertificate()
    } else {
      console.warn('⚠️ [FO-109] Missing branchId')
    }
  }, [branchId])

  const fetchCertificate = async () => {
    try {
      setLoading(true)

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/websrm/certificate/${branchId}`
      console.log('📡 [FO-109] Fetching certificate from:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      })

      console.log('📥 [FO-109] Response status:', response.status)
      const data = await response.json()
      console.log('📦 [FO-109] Response data:', data)

      if (data.success && data.certificate) {
        console.log('✅ [FO-109] Setting certificate:', data.certificate)
        setCertificate(data.certificate)
      } else {
        console.warn('⚠️ [FO-109] No certificate in response')
        setCertificate(null)
      }
    } catch (err) {
      console.error('❌ [FO-109] Failed to fetch certificate:', err)
      setCertificate(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCertificate = async () => {
    if (!certificate) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/websrm/certificate/annul`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            tenantId: branchId,
            serialNumber: certificate.serialNumber,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        toast({
          title: language === 'fr' ? 'Certificat supprimé' : 'Certificate Deleted',
          description: language === 'fr'
            ? 'Le certificat a été annulé avec succès'
            : 'Certificate has been successfully annulled',
          duration: 5000,
        })
        // Refresh certificate data
        fetchCertificate()
      } else {
        throw new Error(data.message || 'Failed to delete certificate')
      }
    } catch (err: any) {
      console.error('Failed to delete certificate:', err)
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: err.message || (language === 'fr'
          ? 'Échec de la suppression du certificat'
          : 'Failed to delete certificate'),
        variant: 'destructive',
        duration: 5000,
      })
    }
  }

  const handleRequestCertificate = async () => {
    if (!branchId) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'ID de branche manquant' : 'Branch ID missing',
        variant: 'destructive',
        duration: 5000,
      })
      return
    }

    try {
      setLoading(true)

      // Show loading toast
      toast({
        title: language === 'fr' ? 'Enrôlement en cours...' : 'Enrolling...',
        description: language === 'fr'
          ? 'Demande de certificat en cours (peut prendre 30 secondes)'
          : 'Requesting certificate (may take up to 30 seconds)',
        duration: 5000,
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/websrm/certificate/enrol`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            tenantId: branchId,
            env: 'ESSAI', // Using ESSAI credentials for demo
            config: {},
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        toast({
          title: language === 'fr' ? 'Certificat obtenu' : 'Certificate Enrolled',
          description: language === 'fr'
            ? 'Le certificat a été créé avec succès'
            : 'Certificate has been successfully created',
          duration: 5000,
        })
        // Refresh certificate data
        fetchCertificate()
      } else {
        throw new Error(data.message || 'Failed to enroll certificate')
      }
    } catch (err: any) {
      console.error('Failed to enroll certificate:', err)
      toast({
        title: language === 'fr' ? 'Erreur d\'enrôlement' : 'Enrolment Error',
        description: err.message || (language === 'fr'
          ? 'Échec de l\'enrôlement du certificat'
          : 'Failed to enroll certificate'),
        variant: 'destructive',
        duration: 7000,
      })
    } finally {
      setLoading(false)
    }
  }

  const getAuthToken = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || ''
    const authKey = `sb-${projectId}-auth-token`
    return JSON.parse(localStorage.getItem(authKey) || '{}').access_token
  }

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collibible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              {/* Back Button */}
              <div className="mb-6">
                <Link href="/settings/branch">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Retour aux Paramètres' : 'Back to Branch Settings'}
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {language === 'fr' ? 'Certificat WEB-SRM du Québec' : 'Quebec WEB-SRM Certificate'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr'
                      ? 'Gérez votre certificat numérique pour la conformité SRS du Québec'
                      : 'Manage your digital certificate for Quebec SRS compliance'}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  <Button onClick={fetchCertificate} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {language === 'fr' ? 'Actualiser' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Certificate Card */}
                <WebsrmCertificateCard
                  certificate={certificate}
                  loading={loading}
                  onDelete={handleDeleteCertificate}
                  onRequestCertificate={handleRequestCertificate}
                  language={language}
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
