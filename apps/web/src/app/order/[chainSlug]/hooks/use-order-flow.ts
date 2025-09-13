"use client"

import { useState, useCallback } from 'react'
import {
  OrderFlowState,
  UseOrderFlowReturn,
  ModalStep,
  OrderType,
  Branch,
  Chain
} from '../types/order-flow.types'

const initialState: OrderFlowState = {
  // Modal State
  currentStep: 'order-type',
  isModalOpen: false,
  
  // Data State
  chain: null,
  branches: [],
  selectedBranch: null,
  orderType: null,
  
  // UI State
  loading: false,
  error: null,
}

/**
 * Custom hook for managing order flow modal state
 * Handles the simplified modal progression and data management
 */
export function useOrderFlow(initialChain?: Chain, initialBranches?: Branch[]): UseOrderFlowReturn {
  const [state, setState] = useState<OrderFlowState>({
    ...initialState,
    chain: initialChain || null,
    branches: initialBranches || [],
  })

  // Modal Navigation
  const setCurrentStep = useCallback((step: ModalStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
      error: null // Clear errors when navigating
    }))
  }, [])

  const openModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: true,
      currentStep: 'order-type',
      error: null
    }))
  }, [])

  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      error: null
    }))
  }, [])

  // Data Management
  const setOrderType = useCallback((type: OrderType) => {
    setState(prev => ({
      ...prev,
      orderType: type,
      currentStep: prev.branches.length === 1 ? 'menu' : 'branch-selection',
      error: null
    }))
  }, [])

  const setSelectedBranch = useCallback((branch: Branch) => {
    setState(prev => ({
      ...prev,
      selectedBranch: branch,
      currentStep: 'menu',
      error: null
    }))
  }, [])

  // Flow Control
  const resetFlow = useCallback(() => {
    setState(prev => ({
      ...initialState,
      chain: prev.chain, // Preserve chain data
      branches: prev.branches, // Preserve branches data
    }))
  }, [])

  const goToMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'menu',
      isModalOpen: false,
      error: null
    }))
  }, [])

  // Internal state setters (for use by other hooks or components)
  const updateState = useCallback((updater: Partial<OrderFlowState> | ((prev: OrderFlowState) => OrderFlowState)) => {
    if (typeof updater === 'function') {
      setState(updater)
    } else {
      setState(prev => ({ ...prev, ...updater }))
    }
  }, [])

  return {
    state,
    actions: {
      setCurrentStep,
      setOrderType,
      setSelectedBranch,
      openModal,
      closeModal,
      resetFlow,
      goToMenu,
    },
    // Internal API for other hooks
    _updateState: updateState,
  } as UseOrderFlowReturn & { _updateState: typeof updateState }
}