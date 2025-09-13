"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Copy
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useToast } from "@/hooks/use-toast"
import React, { useState, useEffect, useCallback } from "react"
import { stripeAccountsService } from "@/services/stripe-accounts.service"

// Types for Stripe Account Status
interface StripeAccountStatus {
  hasAccount: boolean
  accountId?: string
  onboardingStatus?: 'pending' | 'verified' | 'rejected' | 'incomplete'
  verificationStatus?: 'unverified' | 'pending' | 'verified'
  payoutsEnabled?: boolean
  chargesEnabled?: boolean
  requirements?: string[]
  nextAction?: string
  capabilities?: {
    card_payments?: 'active' | 'inactive' | 'pending'
    transfers?: 'active' | 'inactive' | 'pending'
  }
}

// Helper functions for account state detection
const getAccountState = (status: StripeAccountStatus) => {
  if (!status.hasAccount) return 'no_account'
  if (status.onboardingStatus === 'verified' && status.chargesEnabled && status.payoutsEnabled) {
    return 'fully_verified'
  }
  if (status.onboardingStatus === 'incomplete') return 'incomplete'
  if (status.onboardingStatus === 'pending') return 'pending_verification'
  if (status.onboardingStatus === 'rejected') return 'rejected'
  return 'unknown'
}

export default function PaymentSettingsPage() {
  const { language } = useLanguage()
  const { chainId, loading: authLoading } = useEnhancedAuth()
  const { toast } = useToast()
  const t = translations[language] || translations.en
  
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus>({ hasAccount: false })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAccountId, setShowAccountId] = useState(false)

  // Load real account status (Stripe Connect)
  const loadAccountStatus = useCallback(async () => {
    if (!chainId || authLoading) return
    try {
      setLoading(true)
      setError(null)
      const { data } = await stripeAccountsService.getStatusByChain(chainId)
      setAccountStatus({
        hasAccount: !!data?.hasAccount,
        accountId: data?.accountId,
        onboardingStatus: data?.onboardingStatus,
        verificationStatus: data?.verificationStatus,
        payoutsEnabled: data?.payoutsEnabled,
        chargesEnabled: data?.chargesEnabled,
        requirements: data?.requirements,
        capabilities: data?.capabilities
      })
    } catch (err) {
      console.error('Failed to load payment settings:', err)
      setError(t.paymentSettings.failedToLoadSettings)
      setAccountStatus({ hasAccount: false })
    } finally {
      setLoading(false)
    }
  }, [chainId, authLoading])

  useEffect(() => {
    void loadAccountStatus()
  }, [loadAccountStatus])


  // Smart Stripe Connect handler with duplicate prevention
  const realHandleConnectStripe = async () => {
    if (!chainId) return
    try {
      setConnecting(true)
      setError(null) // Clear any previous errors
      
      // First, refresh account status to check for existing accounts
      await loadAccountStatus()
      const currentState = getAccountState(accountStatus)
      
      // If we have an incomplete account, continue with existing one
      if (currentState === 'incomplete' && accountStatus.accountId) {
        console.log('Found existing incomplete account, continuing onboarding...')
        const { data: link } = await stripeAccountsService.createOnboardingLink(accountStatus.accountId)
        if (link?.onboarding_url) {
          window.location.href = link.onboarding_url
          return
        }
      }
      
      // Only create new account if we don't have any existing account
      if (currentState === 'no_account') {
        console.log('No existing account found, creating new Express account...')
        const { data: created } = await stripeAccountsService.createExpressAccount({
          restaurant_chain_id: chainId,
          business_type: 'company'
        })
        const createdData = created as { stripe_account_id?: string; account?: { stripe_account_id?: string } }
        const newAccountId = createdData?.stripe_account_id || createdData?.account?.stripe_account_id
        if (!newAccountId) throw new Error('Stripe account creation failed: missing accountId')
        
        const { data: link } = await stripeAccountsService.createOnboardingLink(newAccountId)
        if (link?.onboarding_url) {
          window.location.href = link.onboarding_url
          return
        }
      }
      
      // If we reach here, something unexpected happened
      await loadAccountStatus()
      setConnecting(false)
    } catch (err) {
      console.error('Failed to connect Stripe account:', err)
      setError(t.paymentSettings.failedToConnectAccount)
      setConnecting(false)
    }
  }

  const handleContinueOnboarding = async () => {
    try {
      if (!accountStatus.accountId) return
      setConnecting(true)
      const { data: link } = await stripeAccountsService.createOnboardingLink(accountStatus.accountId)
      if (link?.onboarding_url) {
        // Keep connecting state active during redirect
        window.location.href = link.onboarding_url
        return
      }
      setConnecting(false)
    } catch (err) {
      console.error('Failed to create onboarding link:', err)
      setError(t.paymentSettings.failedToConnectAccount)
      setConnecting(false)
    }
  }

  // Render account status badge
  const renderStatusBadge = () => {
    if (!accountStatus.hasAccount) return null

    const status = accountStatus.onboardingStatus
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800 border border-green-400 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />{t.paymentSettings.active}</Badge>
      case 'pending':
        return <Badge variant="secondary" className="border border-gray-400"><AlertCircle className="w-3 h-3 mr-1" />{t.paymentSettings.pendingVerification}</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="border border-red-400"><XCircle className="w-3 h-3 mr-1" />{t.paymentSettings.rejected}</Badge>
      case 'incomplete':
        return <Badge variant="outline" className="border border-gray-400"><AlertCircle className="w-3 h-3 mr-1" />{t.paymentSettings.incompleteSetup}</Badge>
      default:
        return <Badge variant="outline" className="border border-gray-400">Unknown Status</Badge>
    }
  }

  // Copy account ID to clipboard
  const copyAccountId = async () => {
    console.log('Copy clicked', accountStatus.accountId)
    if (accountStatus.accountId) {
      try {
        await navigator.clipboard.writeText(accountStatus.accountId)
        console.log('Copy successful')
        toast({
          title: t.paymentSettings.accountIdCopied,
          description: t.paymentSettings.accountIdCopiedDescription,
          duration: 3000,
        })
      } catch (error) {
        console.log('Copy failed', error)
        toast({
          title: t.paymentSettings.copyFailed,
          description: t.paymentSettings.copyFailedDescription,
          variant: "destructive",
          duration: 3000,
        })
      }
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
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{t.paymentSettings.pageTitle}</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  {t.paymentSettings.pageSubtitle}
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                  
                  {/* Error Alert */}
                  {error && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        {error}
                      </span>
                    </div>
                  )}

                  {loading ? (
                    /* Loading State */
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground">{t.paymentSettings.loading}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : getAccountState(accountStatus) === 'no_account' ? (
                    /* No Account - Exact Screenshot Match */
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-16 text-center">
                      <div className="space-y-6 max-w-lg mx-auto">
                        {/* Stripe Logo */}
                        <img 
                          src="/stripeLogo.png" 
                          alt="Stripe" 
                          className="h-8 mx-auto"
                        />
                        
                        {/* Title and Description */}
                        <div className="space-y-4">
                          <h3 className="text-2xl font-semibold text-foreground">{t.paymentSettings.connectStripeAccount}</h3>
                          <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                            {t.paymentSettings.connectDescription}
                          </p>
                        </div>
                        
                        {/* Connect Button */}
                        <Button 
                          onClick={realHandleConnectStripe} 
                          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5"
                          disabled={connecting}
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t.paymentSettings.redirectingToStripe}
                            </>
                          ) : (
                            <>
                              {t.paymentSettings.connectStripeAccount}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                        
                        {/* Footer Text */}
                        <p className="text-sm text-muted-foreground">
                          {t.paymentSettings.secureSetup} <span className="font-bold text-foreground">Stripe</span> • {t.paymentSettings.setupTime}
                        </p>
                      </div>
                    </div>
                  ) : getAccountState(accountStatus) === 'incomplete' ? (
                    /* Incomplete Account - Continue Setup */
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-16 text-center">
                      <div className="space-y-6 max-w-lg mx-auto">
                        {/* Stripe Logo */}
                        <img 
                          src="/stripeLogo.png" 
                          alt="Stripe" 
                          className="h-8 mx-auto"
                        />
                        
                        {/* Title and Description */}
                        <div className="space-y-4">
                          <h3 className="text-2xl font-semibold text-foreground">{t.paymentSettings.continueSetup}</h3>
                          <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                            {t.paymentSettings.continueDescription}
                          </p>
                        </div>
                        
                        {/* Continue Button */}
                        <Button 
                          onClick={realHandleConnectStripe} 
                          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5"
                          disabled={connecting}
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t.paymentSettings.redirectingToStripe}
                            </>
                          ) : (
                            <>
                              {t.paymentSettings.continueSetup}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                        
                        {/* Footer Text */}
                        <p className="text-sm text-muted-foreground">
                          {t.paymentSettings.secureSetup} <span className="font-bold text-foreground">Stripe</span> • {t.paymentSettings.setupTime}
                        </p>
                      </div>
                    </div>
                  ) : getAccountState(accountStatus) === 'pending_verification' ? (
                    /* Pending Verification - Complete Verification */
                    <div className="border-2 border-dashed border-yellow-300 rounded-lg p-16 text-center">
                      <div className="space-y-6 max-w-lg mx-auto">
                        {/* Stripe Logo */}
                        <img 
                          src="/stripeLogo.png" 
                          alt="Stripe" 
                          className="h-8 mx-auto"
                        />
                        
                        {/* Title and Description */}
                        <div className="space-y-4">
                          <h3 className="text-2xl font-semibold text-foreground">{t.paymentSettings.completeVerification}</h3>
                          <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                            {t.paymentSettings.verificationDescription}
                          </p>
                        </div>
                        
                        {/* Complete Verification Button */}
                        <Button 
                          onClick={realHandleConnectStripe} 
                          className="bg-[#ffb300] hover:bg-[#ff8f00] text-white px-6 py-2.5"
                          disabled={connecting}
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t.paymentSettings.redirectingToStripe}
                            </>
                          ) : (
                            <>
                              {t.paymentSettings.completeVerification}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                        
                        {/* Footer Text */}
                        <p className="text-sm text-muted-foreground">
                          {t.paymentSettings.secureSetup} <span className="font-bold text-foreground">Stripe</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <React.Fragment>
                      {/* Account Details Cards - Clean Design */}
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{t.paymentSettings.accountStatus}</CardTitle>
                              {renderStatusBadge()}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">{t.paymentSettings.accountId}</h4>
                                <div className="relative">
                                  <div className="p-3 bg-muted/50 rounded-lg border pr-20">
                                    <code className="text-xs font-mono text-foreground break-all font-medium">
                                      {showAccountId ? accountStatus.accountId : '••••••••••••••••••••'}
                                    </code>
                                  </div>
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowAccountId(!showAccountId)}
                                      className="h-6 w-6 p-0 hover:bg-muted"
                                    >
                                      {showAccountId ? (
                                        <EyeOff className="h-3 w-3" />
                                      ) : (
                                        <Eye className="h-3 w-3" />
                                      )}
                                    </Button>
                                    {showAccountId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyAccountId}
                                        className="h-6 w-6 p-0 hover:bg-muted"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right side - empty for future data */}
                              <div className="space-y-3">
                                {/* Reserved for future content */}
                              </div>
                            </div>

                          {accountStatus.onboardingStatus === 'incomplete' && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {t.paymentSettings.setupIncomplete}
                                {accountStatus.requirements && accountStatus.requirements.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium">{t.paymentSettings.requiredInformation}</div>
                                    <ul className="text-xs mt-1 list-disc list-inside">
                                      {accountStatus.requirements.map((req, index) => (
                                        <li key={index}>{req}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}

                          {accountStatus.nextAction && (
                            <div className="pt-4 border-t">
                              <Button 
                                onClick={handleContinueOnboarding} 
                                variant="outline" 
                                className="w-full sm:w-auto"
                                disabled={connecting}
                              >
                                {connecting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t.paymentSettings.redirectingToStripe}
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    {t.paymentSettings.completeSetup}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    </React.Fragment>
                  )}
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4">
                  <div className="space-y-6">
                    {/* Support Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{t.paymentSettings.needHelp}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="space-y-2">
                          <div className="text-muted-foreground">
                            {t.paymentSettings.supportDescription}
                          </div>
                          <Button variant="outline" size="sm" className="w-full">
                            {t.paymentSettings.contactSupport}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
