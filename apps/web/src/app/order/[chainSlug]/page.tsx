"use client"

import { use, useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { customerChainsService } from '@/services/customer-chains.service'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { SmartBranchSelectionModal } from './components/smart-branch-selection-modal'
import { MenuExperience } from './components/menu-experience'
import { OrderContext } from './types/order-flow.types'
import { Chain, Branch } from '@/services/customer-chains.service'
import { useLanguage } from '@/contexts/language-context'

interface ChainOrderPageProps {
  params: Promise<{ chainSlug: string }>
  searchParams: Promise<{
    branch?: string
    table?: string
    zone?: string
    source?: 'qr' | 'web'
  }>
}

export default function ChainOrderPage({ params, searchParams }: ChainOrderPageProps) {
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams)
  
  const [chain, setChain] = useState<Chain | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu | null>(null)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Language context
  const { language } = useLanguage()

  // Extract URL context
  const orderContext: OrderContext = {
    chainSlug: resolvedParams.chainSlug,
    branchId: resolvedSearchParams.branch,
    tableNumber: resolvedSearchParams.table ? parseInt(resolvedSearchParams.table) : undefined,
    zone: resolvedSearchParams.zone,
    source: (resolvedSearchParams.source as 'qr' | 'web') || 'web',
    isQROrder: resolvedSearchParams.source === 'qr'
  }

  // Branch selection with localStorage persistence
  const saveBranchToLocalStorage = (chainSlug: string, branch: Branch) => {
    try {
      localStorage.setItem(`selected-branch-${chainSlug}`, JSON.stringify({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        savedAt: Date.now()
      }))
    } catch (error) {
      console.error('Failed to save branch to localStorage:', error)
    }
  }

  const getBranchFromLocalStorage = (chainSlug: string): Branch | null => {
    try {
      const stored = localStorage.getItem(`selected-branch-${chainSlug}`)
      if (!stored) return null
      
      const branchData = JSON.parse(stored)
      const daysSinceStored = (Date.now() - branchData.savedAt) / (1000 * 60 * 60 * 24)
      
      // Keep branch selection for 2 days
      if (daysSinceStored > 2) {
        localStorage.removeItem(`selected-branch-${chainSlug}`)
        return null
      }
      
      return branchData
    } catch (error) {
      console.error('Failed to get branch from localStorage:', error)
      return null
    }
  }

  // Load chain and branches on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        setError(null)

        // Get chain data
        const chainData = await customerChainsService.getChainBySlug(orderContext.chainSlug)
        setChain(chainData)

        // Load branches
        const branchesResponse = await customerChainsService.getChainBranches(orderContext.chainSlug)
        setBranches(branchesResponse.branches)

        // Handle branch selection logic
        if (orderContext.branchId) {
          // QR order with specific branch
          const qrBranch = branchesResponse.branches.find(b => b.id === orderContext.branchId)
          if (qrBranch) {
            setSelectedBranch(qrBranch)
          } else {
            setError('Branch not found')
            return
          }
        } else if (branchesResponse.branches.length === 1) {
          // Single branch - auto select
          setSelectedBranch(branchesResponse.branches[0])
          saveBranchToLocalStorage(orderContext.chainSlug, branchesResponse.branches[0])
        } else {
          // Multiple branches - check localStorage or show modal
          const storedBranch = getBranchFromLocalStorage(orderContext.chainSlug)
          if (storedBranch) {
            const matchedBranch = branchesResponse.branches.find(b => b.id === storedBranch.id)
            if (matchedBranch) {
              setSelectedBranch(matchedBranch)
            } else {
              setShowBranchModal(true)
            }
          } else {
            setShowBranchModal(true)
          }
        }

      } catch (err) {
        console.error('Failed to load chain data:', err)
        if (err instanceof Error && err.message.includes('Chain not found')) {
          notFound()
        }
        setError(err instanceof Error ? err.message : 'Failed to load chain data')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [orderContext.chainSlug, orderContext.branchId])


  // Load menu when branch is selected
  useEffect(() => {
    const loadMenu = async () => {
      if (selectedBranch && !customerMenu) {
        try {
          const menu = await customerMenuService.getCustomerMenu(selectedBranch.id)
          setCustomerMenu(menu)
          
          // Update URL for web users
          if (!orderContext.isQROrder) {
            const newUrl = `/order/${orderContext.chainSlug}?branch=${selectedBranch.id}`
            window.history.pushState({}, '', newUrl)
          }
        } catch (err) {
          console.error('Failed to load menu:', err)
          setError('Failed to load menu for selected branch')
        }
      }
    }

    loadMenu()
  }, [selectedBranch, customerMenu, orderContext.chainSlug, orderContext.isQROrder])

  // Branch selection handlers
  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    saveBranchToLocalStorage(orderContext.chainSlug, branch)
    setShowBranchModal(false)
    
    // Clear existing menu to trigger reload
    setCustomerMenu(null)
  }

  const handleBranchChange = (branch: Branch) => {
    setSelectedBranch(branch)
    saveBranchToLocalStorage(orderContext.chainSlug, branch)
    
    // Clear existing menu to trigger reload
    setCustomerMenu(null)
    
    // Update URL
    const newUrl = `/order/${orderContext.chainSlug}?branch=${branch.id}`
    window.history.pushState({}, '', newUrl)
  }

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Error state  
  if (error || !chain) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Restaurant</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Menu Experience: Show when branch and menu are loaded
  if (selectedBranch && customerMenu) {
    return (
      <>
        <MenuExperience 
          chain={chain}
          branch={selectedBranch}
          customerMenu={customerMenu}
          orderContext={orderContext}
          availableBranches={branches}
          onBranchChange={handleBranchChange}
        />
      </>
    )
  }

  // Professional landing page with repeating logo pattern background
  return (
    <div className="min-h-screen relative">
      {/* Enhanced Logo Pattern Background - Full Coverage */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-accent/5">
          {/* Logo Pattern - Extended to cover all areas */}
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: chain.logo_url ? 
                `url(${chain.logo_url})` : 'none',
              backgroundSize: '60px 60px',
              backgroundRepeat: 'repeat',
              opacity: 0.12,
              transform: 'rotate(-15deg) scale(1.5)',
              transformOrigin: 'center',
              // Extend beyond viewport to cover rotated areas
              width: '150vw',
              height: '150vh',
              top: '-25vh',
              left: '-25vw'
            }} 
          />
        </div>
      </div>

      {/* Smart Branch Selection Modal */}
      <SmartBranchSelectionModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        onBranchSelect={handleBranchSelect}
        chainSlug={orderContext.chainSlug}
        chainName={chain.name}
        orderType="delivery"
      />

      {/* Content Layer - Above Pattern Background */}
      <div className="relative z-10 min-h-screen">
        {/* Top Header */}
        <div className="w-full bg-card/70 backdrop-blur-md border-b shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {chain.logo_url && (
                  <img 
                    src={chain.logo_url} 
                    alt={chain.name}
                    className="w-10 h-10 rounded-lg object-cover shadow-sm"
                  />
                )}
                <h1 className="text-xl font-bold">{chain.name}</h1>
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Online Ordering
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Centered Logo */}
        <div className="flex-1 flex items-center justify-center p-6 min-h-[calc(100vh-140px)]">
          <div className="text-center max-w-2xl mx-auto">
            {/* Large Central Logo */}
            {chain.logo_url && (
              <div className="mb-8">
                <img 
                  src={chain.logo_url} 
                  alt={chain.name}
                  className="w-32 h-32 mx-auto rounded-2xl object-cover shadow-2xl ring-4 ring-primary/10 bg-white/90 p-2"
                />
              </div>
            )}

            {/* Show loading when branch selected but menu not loaded */}
            {(selectedBranch && !customerMenu && !showBranchModal) && (
              <div className="bg-card/70 backdrop-blur-sm rounded-lg p-8 border shadow-sm">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <div className="text-center">
                    <div className="font-semibold">
                      {language === 'fr' ? 'Chargement du menu' : 'Loading Menu'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'fr' 
                        ? `Préparation du menu ${selectedBranch.name}...`
                        : `Preparing ${selectedBranch.name} menu...`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="w-full bg-card/60 backdrop-blur-md border-t shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Powered by VizionMenu • Secure Online Ordering</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}