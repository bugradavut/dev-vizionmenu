/**
 * Order Flow Types for Simplified Modal System
 * Based on CUSTOMER_ORDERING_IMPLEMENTATION.md specifications
 */

export type OrderType = 'takeout' | 'delivery';
export type OrderSource = 'qr' | 'web';
export type ModalStep = 'order-type' | 'branch-selection' | 'menu';

export interface OrderContext {
  chainSlug: string;
  branchId?: string;
  tableNumber?: number;
  zone?: string;
  source: OrderSource;
  isQROrder: boolean;
  orderType?: OrderType;
}

export interface Chain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  location?: [number, number]; // [lng, lat]
  phone?: string;
  email?: string;
}

export interface OrderFlowState {
  // Modal State
  currentStep: ModalStep;
  isModalOpen: boolean;
  
  // Data State
  chain: Chain | null;
  branches: Branch[];
  selectedBranch: Branch | null;
  orderType: OrderType | null;
  
  // UI State
  loading: boolean;
  error: string | null;
}

// API Response Types
export interface ChainResponse {
  data: Chain;
}

export interface BranchesResponse {
  data: {
    chain: Chain;
    branches: Branch[];
    total: number;
  };
}

// Hook Return Types
export interface UseOrderFlowReturn {
  state: OrderFlowState;
  actions: {
    setCurrentStep: (step: ModalStep) => void;
    setOrderType: (type: OrderType) => void;
    setSelectedBranch: (branch: Branch) => void;
    openModal: () => void;
    closeModal: () => void;
    resetFlow: () => void;
    goToMenu: () => void;
  };
}

export interface UseBranchSearchReturn {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  loadBranches: () => Promise<Branch[]>;
  clearError: () => void;
}