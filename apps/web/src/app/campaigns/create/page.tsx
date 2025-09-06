"use client"

import { useState, useEffect } from 'react'
import { Plus, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

// Components
import { AuthGuard } from '@/components/auth-guard'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb'
import { DashboardLayout } from '@/components/dashboard-layout'
import { CreateCampaignDialog } from '@/components/create-campaign-dialog'
import { EditCampaignDialog } from '@/components/edit-campaign-dialog'
import { DeleteCampaignDialog } from '@/components/delete-campaign-dialog'
import { CampaignCard } from '@/components/campaign-card'
import { CampaignFilterTabs } from '@/components/campaign-filter-tabs'
import { RepeatCampaignDialog } from '@/components/repeat-campaign-dialog'
import { CampaignLoadingSkeleton } from '@/components/campaign-loading-skeleton'

// Contexts & Utils
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

// Services
import { campaignsService } from '@/services/campaigns.service'

// Types
import { Campaign } from '@/types/campaign'
import { getCampaignStatus, CampaignStatus } from '@/types/campaign'

export default function CreateCampaignPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  // 🆕 NEW: Filter state management
  const [activeFilter, setActiveFilter] = useState<CampaignStatus>(CampaignStatus.ALL)

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true)
        const response = await campaignsService.getCampaigns()
        setCampaigns(response.data?.campaigns || [])
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const handleCampaignCreated = async () => {
    // Refresh campaigns list
    try {
      const response = await campaignsService.getCampaigns()
      setCampaigns(response.data?.campaigns || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    }
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setIsEditDialogOpen(true)
  }

  const handleDeleteCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setIsDeleteDialogOpen(true)
  }

  const handleRepeatCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setIsRepeatDialogOpen(true)
  }

  const handleToggleStatus = async (campaignId: string) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId)
      if (!campaign) return
      
      await campaignsService.updateCampaign(campaignId, {
        is_active: !campaign.is_active
      })
      
      // Refresh campaigns list
      handleCampaignCreated()
    } catch (error) {
      console.error('Toggle status error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to toggle status')
    }
  }

  // 🆕 NEW: Filter campaigns based on selected filter
  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeFilter === CampaignStatus.ALL) return true
    return getCampaignStatus(campaign) === activeFilter
  })


  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.campaigns.createPageTitle}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr' 
                      ? 'Gérez et créez vos codes promotionnels et remises pour attirer plus de clients'
                      : 'Manage and create promotional codes and discounts to attract more customers'
                    }
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.campaigns.createCampaign}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-12">
                  {isLoading ? (
                    <CampaignLoadingSkeleton count={6} />
                  ) : campaigns.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          {language === 'fr' ? 'Aucune campagne trouvée' : 'No campaigns found'}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          {language === 'fr' 
                            ? 'Créez votre première campagne promotionnelle pour commencer'
                            : 'Create your first promotional campaign to get started'
                          }
                        </p>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                          <Plus className="h-4 w-4" />
                          {t.campaigns.createCampaign}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">
                          {language === 'fr' ? 'Campagnes existantes' : 'Existing Campaigns'}
                        </h2>
                      </div>

                      {/* 🆕 FILTER TABS */}
                      <CampaignFilterTabs
                        campaigns={campaigns}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                      />
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredCampaigns.map((campaign) => (
                          <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            onEdit={handleEditCampaign}
                            onDelete={handleDeleteCampaign}
                            onToggleStatus={handleToggleStatus}
                            onRepeat={handleRepeatCampaign}
                            isLoading={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>

      <CreateCampaignDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCampaignCreated}
      />

      <EditCampaignDialog 
        campaign={selectedCampaign}
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleCampaignCreated}
      />

      <DeleteCampaignDialog 
        campaign={selectedCampaign}
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleCampaignCreated}
      />

      <RepeatCampaignDialog 
        campaign={selectedCampaign}
        open={isRepeatDialogOpen} 
        onOpenChange={setIsRepeatDialogOpen}
        onSuccess={handleCampaignCreated}
      />
    </AuthGuard>
  )
}