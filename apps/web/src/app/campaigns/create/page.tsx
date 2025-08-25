"use client"

import { useState, useEffect } from 'react'
import { Plus, Tag, Calendar, Percent, DollarSign } from 'lucide-react'

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

// Contexts & Utils
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

// Services
import { campaignsService } from '@/services/campaigns.service'

// Types
import { Campaign } from '@/types/campaign'

export default function CreateCampaignPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
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
    setIsLoading(true)
    try {
      const response = await campaignsService.getCampaigns()
      setCampaigns(response.data?.campaigns || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`
    } else {
      return language === 'fr' ? `${value.toFixed(2)} $` : `$${value.toFixed(2)}`
    }
  }

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
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-6">
                            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                        <p className="text-sm text-muted-foreground">
                          {campaigns.length} {language === 'fr' ? 'campagne(s)' : 'campaign(s)'}
                        </p>
                      </div>
                      
                      {campaigns.map((campaign) => (
                        <Card key={campaign.id} className="group hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className={`p-2 rounded-lg ${
                                    campaign.type === 'percentage' 
                                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                                      : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                  }`}>
                                    {campaign.type === 'percentage' ? (
                                      <Percent className="h-4 w-4" />
                                    ) : (
                                      <DollarSign className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold">{campaign.code}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {campaign.type === 'percentage' ? t.campaigns.percentage : t.campaigns.fixedAmount}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    <span>{formatDiscount(campaign.type, campaign.value)} {language === 'fr' ? 'de remise' : 'discount'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {language === 'fr' ? 'Valide jusqu\'au' : 'Valid until'} {formatDate(campaign.valid_until)}
                                    </span>
                                  </div>
                                </div>

                                {campaign.applicable_categories && (
                                  <div className="mt-3">
                                    <p className="text-xs text-muted-foreground">
                                      {language === 'fr' ? 'Catégories spécifiques seulement' : 'Specific categories only'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  campaign.is_active 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}>
                                  {campaign.is_active 
                                    ? (language === 'fr' ? 'Actif' : 'Active')
                                    : (language === 'fr' ? 'Inactif' : 'Inactive')
                                  }
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
    </AuthGuard>
  )
}