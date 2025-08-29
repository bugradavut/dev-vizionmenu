"use client"

import { use, useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { customerChainsService } from '@/services/customer-chains.service'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { useOrderFlow } from './hooks/use-order-flow'
import { useBranchSearch } from './hooks/use-branch-search'
import { OrderTypeModal } from './components/order-type-modal'
import { BranchSelectionModal } from './components/branch-selection-modal'
import { MenuExperience } from './components/menu-experience'
import { Chain, Branch, OrderContext } from './types/order-flow.types'

interface ChainOrderPageProps {
  params: Promise<{ chainSlug: string }>
  searchParams: Promise<{
    branch?: string
    table?: string
    source?: 'qr' | 'web'
  }>
}

export default function ChainOrderPage({ params, searchParams }: ChainOrderPageProps) {
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams)
  
  const [chain, setChain] = useState<Chain | null>(null)
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract URL context
  const orderContext: OrderContext = {
    chainSlug: resolvedParams.chainSlug,
    branchId: resolvedSearchParams.branch,
    tableNumber: resolvedSearchParams.table ? parseInt(resolvedSearchParams.table) : undefined,
    source: (resolvedSearchParams.source as 'qr' | 'web') || 'web',
    isQROrder: resolvedSearchParams.source === 'qr'
  }

  // Initialize hooks
  const { state: flowState, actions: flowActions } = useOrderFlow()
  const { branches, loading: branchesLoading, loadBranches } = useBranchSearch(orderContext.chainSlug)

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
        await loadBranches()

      } catch (err) {
        console.error('Failed to load chain data:', err)
        if (err instanceof Error && err.message.includes('Chain not found')) {
          notFound() // 404 page for invalid chain slug
        }
        setError(err instanceof Error ? err.message : 'Failed to load chain data')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [orderContext.chainSlug, loadBranches])

  // Handle QR order or direct branch access
  useEffect(() => {
    if (orderContext.branchId && branches.length > 0 && !flowState.selectedBranch) {
      const branch = branches.find(b => b.id === orderContext.branchId)
      if (branch) {
        flowActions.setSelectedBranch(branch)
        // Load menu will be handled in the menu loading effect
      } else {
        setError('Branch not found or does not belong to this chain')
      }
    }
  }, [orderContext.branchId, branches, flowState.selectedBranch, flowActions])

  // Auto-show modal for web users (not QR)
  useEffect(() => {
    if (!orderContext.isQROrder && chain && branches.length > 0 && !flowState.isModalOpen && !flowState.selectedBranch) {
      flowActions.openModal()
    }
  }, [orderContext.isQROrder, chain, branches, flowState.isModalOpen, flowState.selectedBranch, flowActions])

  // Load menu when branch is selected
  useEffect(() => {
    const loadMenu = async () => {
      if (flowState.selectedBranch && !customerMenu) {
        try {
          const menu = await customerMenuService.getCustomerMenu(flowState.selectedBranch.id)
          setCustomerMenu(menu)
          
          // Update URL for web users
          if (!orderContext.isQROrder) {
            const newUrl = `/order/${orderContext.chainSlug}?branch=${flowState.selectedBranch.id}`
            window.history.pushState({}, '', newUrl)
          }
        } catch (err) {
          console.error('Failed to load menu:', err)
          setError('Failed to load menu for selected branch')
        }
      }
    }

    loadMenu()
  }, [flowState.selectedBranch, customerMenu, orderContext.chainSlug, orderContext.isQROrder])

  // Modal handlers
  const handleOrderTypeSelect = (orderType: 'takeout' | 'delivery') => {
    // Single branch auto-selection logic
    if (branches.length === 1) {
      flowActions.setSelectedBranch(branches[0])
      flowActions.setOrderType(orderType)
      flowActions.goToMenu()
    } else {
      flowActions.setOrderType(orderType)
      flowActions.setCurrentStep('branch-selection')
    }
  }

  const handleBranchSelect = (branch: Branch) => {
    flowActions.setSelectedBranch(branch)
    flowActions.goToMenu()
  }

  const handleModalClose = () => {
    flowActions.closeModal()
  }

  const handleBackToOrderType = () => {
    flowActions.setCurrentStep('order-type')
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
  if (flowState.selectedBranch && customerMenu && flowState.currentStep === 'menu') {
    return (
      <>
        <MenuExperience 
          chain={chain}
          branch={flowState.selectedBranch}
          customerMenu={customerMenu}
          orderContext={{ ...orderContext, orderType: flowState.orderType }}
        />
      </>
    )
  }

  // Loading placeholder while data loads
  return (
    <div className="min-h-screen bg-background">
      {/* Modals */}
      <OrderTypeModal 
        isOpen={flowState.isModalOpen && flowState.currentStep === 'order-type'}
        onClose={handleModalClose}
        onSelectOrderType={handleOrderTypeSelect}
        chainName={chain.name}
      />

      <BranchSelectionModal 
        isOpen={flowState.isModalOpen && flowState.currentStep === 'branch-selection'}
        onClose={handleModalClose}
        onBack={handleBackToOrderType}
        onBranchSelect={handleBranchSelect}
        branches={branches}
        loading={branchesLoading}
        chainName={chain.name}
        orderType={flowState.orderType!}
        selectedBranch={flowState.selectedBranch}
      />

      {/* Background content - can be a simple loading state or chain info */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          {chain.logo_url && (
            <img 
              src={chain.logo_url} 
              alt={chain.name}
              className="w-24 h-24 mx-auto mb-4 rounded-lg object-cover"
            />
          )}
          <h1 className="text-3xl font-bold mb-2">{chain.name}</h1>
          {chain.description && (
            <p className="text-muted-foreground mb-4">{chain.description}</p>
          )}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    </div>
  )
}