/**
 * Enhanced Auth Hook
 * Extends existing auth context with API integration
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { authService } from '@/services';
import type {
  User,
  AuthSession,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SwitchBranchRequest,
  BranchRole,
} from '@repo/types/auth';

interface AuthApiState {
  // API Loading states
  loginLoading: boolean;
  profileLoading: boolean;
  updateLoading: boolean;
  switchLoading: boolean;
  
  // API Error states
  loginError: string | null;
  profileError: string | null;
  updateError: string | null;
  switchError: string | null;

  // User data from API
  apiUser: User | null;
  availableBranches: Array<{
    id: string;
    name: string;
    slug: string;
  }>;

  // Actions
  setLoginLoading: (loading: boolean) => void;
  setProfileLoading: (loading: boolean) => void;
  setUpdateLoading: (loading: boolean) => void;
  setSwitchLoading: (loading: boolean) => void;
  
  setLoginError: (error: string | null) => void;
  setProfileError: (error: string | null) => void;
  setUpdateError: (error: string | null) => void;
  setSwitchError: (error: string | null) => void;
  
  setApiUser: (user: User | null) => void;
  setAvailableBranches: (branches: Array<{ id: string; name: string; slug: string }>) => void;

  // API Actions
  apiLogin: (credentials: LoginRequest) => Promise<User>;
  apiRegister: (userData: RegisterRequest) => Promise<User>;
  refreshProfile: () => Promise<void>;
  updateProfile: (profileData: UpdateProfileRequest) => Promise<User>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  switchBranch: (branchData: SwitchBranchRequest) => Promise<void>;
  apiLogout: () => Promise<void>;
  
  // Utility
  reset: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: BranchRole) => boolean;
  isChainOwner: () => boolean;
}

export const useAuthApiStore = create<AuthApiState>()(
  devtools(
    (set, get) => ({
      // Initial State
      loginLoading: false,
      profileLoading: false,
      updateLoading: false,
      switchLoading: false,
      
      loginError: null,
      profileError: null,
      updateError: null,
      switchError: null,
      
      apiUser: null,
      availableBranches: [],

      // Loading State Actions
      setLoginLoading: (loading) => set({ loginLoading: loading }, false, 'setLoginLoading'),
      setProfileLoading: (loading) => set({ profileLoading: loading }, false, 'setProfileLoading'),
      setUpdateLoading: (loading) => set({ updateLoading: loading }, false, 'setUpdateLoading'),
      setSwitchLoading: (loading) => set({ switchLoading: loading }, false, 'setSwitchLoading'),
      
      // Error State Actions
      setLoginError: (error) => set({ loginError: error }, false, 'setLoginError'),
      setProfileError: (error) => set({ profileError: error }, false, 'setProfileError'),
      setUpdateError: (error) => set({ updateError: error }, false, 'setUpdateError'),
      setSwitchError: (error) => set({ switchError: error }, false, 'setSwitchError'),
      
      // Data State Actions
      setApiUser: (user) => set({ apiUser: user }, false, 'setApiUser'),
      setAvailableBranches: (branches) => set({ availableBranches: branches }, false, 'setAvailableBranches'),

      // API Actions
      apiLogin: async (credentials) => {
        const { setLoginLoading, setLoginError, setApiUser, setAvailableBranches } = get();
        
        try {
          setLoginLoading(true);
          setLoginError(null);
          
          const response = await authService.login(credentials);
          
          setApiUser(response.user);
          if (response.available_branches) {
            setAvailableBranches(response.available_branches);
          }
          
          return response.user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          setLoginError(errorMessage);
          throw error;
        } finally {
          setLoginLoading(false);
        }
      },

      apiRegister: async (userData) => {
        const { setLoginLoading, setLoginError, setApiUser } = get();
        
        try {
          setLoginLoading(true);
          setLoginError(null);
          
          const response = await authService.register(userData);
          setApiUser(response.user);
          
          return response.user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          setLoginError(errorMessage);
          throw error;
        } finally {
          setLoginLoading(false);
        }
      },

      refreshProfile: async () => {
        const { setProfileLoading, setProfileError, setApiUser } = get();
        
        try {
          setProfileLoading(true);
          setProfileError(null);
          
          const user = await authService.getProfile();
          setApiUser(user);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
          setProfileError(errorMessage);
        } finally {
          setProfileLoading(false);
        }
      },

      updateProfile: async (profileData) => {
        const { setUpdateLoading, setUpdateError, setApiUser } = get();
        
        try {
          setUpdateLoading(true);
          setUpdateError(null);
          
          const updatedUser = await authService.updateProfile(profileData);
          setApiUser(updatedUser);
          
          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
          setUpdateError(errorMessage);
          throw error;
        } finally {
          setUpdateLoading(false);
        }
      },

      changePassword: async (passwordData) => {
        const { setUpdateLoading, setUpdateError } = get();
        
        try {
          setUpdateLoading(true);
          setUpdateError(null);
          
          await authService.changePassword(passwordData);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
          setUpdateError(errorMessage);
          throw error;
        } finally {
          setUpdateLoading(false);
        }
      },

      switchBranch: async (branchData) => {
        const { setSwitchLoading, setSwitchError, setApiUser } = get();
        
        try {
          setSwitchLoading(true);
          setSwitchError(null);
          
          const response = await authService.switchBranch(branchData);
          
          // Update user with new branch context
          if (get().apiUser) {
            const updatedUser = {
              ...get().apiUser!,
              branch_id: response.branch.id,
              branch_name: response.branch.name,
              role: response.session.role,
              permissions: response.session.permissions,
            };
            setApiUser(updatedUser);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to switch branch';
          setSwitchError(errorMessage);
          throw error;
        } finally {
          setSwitchLoading(false);
        }
      },

      apiLogout: async () => {
        const { setLoginLoading, setLoginError, reset } = get();
        
        try {
          setLoginLoading(true);
          setLoginError(null);
          
          await authService.logout();
          reset();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          setLoginError(errorMessage);
          throw error;
        } finally {
          setLoginLoading(false);
        }
      },

      // Utility Actions
      reset: () => set({
        loginLoading: false,
        profileLoading: false,
        updateLoading: false,
        switchLoading: false,
        
        loginError: null,
        profileError: null,
        updateError: null,
        switchError: null,
        
        apiUser: null,
        availableBranches: [],
      }, false, 'reset'),

      hasPermission: (permission) => {
        const { apiUser } = get();
        if (!apiUser?.permissions) return false;
        
        // Chain owners have all permissions
        if (apiUser.permissions.includes('*')) return true;
        
        return apiUser.permissions.includes(permission);
      },

      hasRole: (role) => {
        const { apiUser } = get();
        return apiUser?.role === role;
      },

      isChainOwner: () => {
        const { apiUser } = get();
        return apiUser?.role === 'chain_owner';
      },
    }),
    { name: 'auth-api-store' }
  )
);

// Convenience hooks
export const useAuthApi = () => {
  const store = useAuthApiStore();
  
  return {
    // State
    user: store.apiUser,
    availableBranches: store.availableBranches,
    
    // Loading states
    loginLoading: store.loginLoading,
    profileLoading: store.profileLoading,
    updateLoading: store.updateLoading,
    switchLoading: store.switchLoading,
    
    // Error states
    loginError: store.loginError,
    profileError: store.profileError,
    updateError: store.updateError,
    switchError: store.switchError,
    
    // Actions
    login: store.apiLogin,
    register: store.apiRegister,
    refreshProfile: store.refreshProfile,
    updateProfile: store.updateProfile,
    changePassword: store.changePassword,
    switchBranch: store.switchBranch,
    logout: store.apiLogout,
    
    // Utilities
    hasPermission: store.hasPermission,
    hasRole: store.hasRole,
    isChainOwner: store.isChainOwner,
    reset: store.reset,
  };
};

// Hook for permission checking
export const usePermissions = () => {
  const store = useAuthApiStore();
  
  return {
    hasPermission: store.hasPermission,
    hasRole: store.hasRole,
    isChainOwner: store.isChainOwner,
    permissions: store.apiUser?.permissions || [],
    role: store.apiUser?.role,
  };
};