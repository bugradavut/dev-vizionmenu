"use client"

import { use, useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { customerChainsService, type Chain, type Branch } from '@/services/customer-chains.service'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { BranchSelectionFlow } from './components/branch-selection-flow'
import { MenuExperience } from './components/menu-experience'

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
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract URL context
  const orderContext = {
    chainSlug: resolvedParams.chainSlug,
    branchId: resolvedSearchParams.branch,
    tableNumber: resolvedSearchParams.table ? parseInt(resolvedSearchParams.table) : undefined,
    source: (resolvedSearchParams.source as 'qr' | 'web') || 'web',
    isQROrder: resolvedSearchParams.source === 'qr'
  }

  // Load chain and branches
  useEffect(() => {
    const loadChainData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get chain with branches
        const chainData = await customerChainsService.getChainWithBranches(orderContext.chainSlug)
        setChain(chainData.chain)
        setBranches(chainData.branches)

        // If specific branch requested, validate and load menu
        if (orderContext.branchId) {
          const branch = chainData.branches.find(b => b.id === orderContext.branchId)
          if (!branch) {
            throw new Error('Branch not found or does not belong to this chain')
          }
          setSelectedBranch(branch)
          
          // Load menu for selected branch
          const menu = await customerMenuService.getCustomerMenu(orderContext.branchId)
          setCustomerMenu(menu)
        }
      } catch (err) {
        console.error('Failed to load chain data:', err)
        if (err instanceof Error && err.message.includes('Chain not found')) {
          notFound() // 404 page for invalid chain slug
        }
        setError(err instanceof Error ? err.message : 'Failed to load chain data')
      } finally {
        setLoading(false)
      }
    }

    loadChainData()
  }, [orderContext.chainSlug, orderContext.branchId])

  // Handle branch selection
  const handleBranchSelect = async (branch: Branch) => {
    try {
      setSelectedBranch(branch)
      
      // Update URL without page reload
      const newUrl = `/order/${orderContext.chainSlug}?branch=${branch.id}`
      window.history.pushState({}, '', newUrl)
      
      // Load menu for selected branch
      const menu = await customerMenuService.getCustomerMenu(branch.id)
      setCustomerMenu(menu)
    } catch (err) {
      console.error('Failed to load menu:', err)
      setError('Failed to load menu for selected branch')
    }
  }

  // Loading state
  if (loading) {
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

  // QR Flow: Direct to menu if branch specified
  if (orderContext.isQROrder && selectedBranch && customerMenu) {
    return (
      <MenuExperience 
        chain={chain}
        branch={selectedBranch}
        customerMenu={customerMenu}
        orderContext={orderContext}
      />
    )
  }

  // Web Flow: Menu if branch selected
  if (selectedBranch && customerMenu) {
    return (
      <MenuExperience 
        chain={chain}
        branch={selectedBranch}
        customerMenu={customerMenu}
        orderContext={orderContext}
        showBranchSwitcher={true} // Allow branch switching for web users
      />
    )
  }

  // Web Flow: Branch selection
  return (
    <BranchSelectionFlow 
      chain={chain}
      branches={branches}
      onBranchSelect={handleBranchSelect}
    />
  )
}