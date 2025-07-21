/**
 * User Management Hooks
 * Zustand-based state management for users
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { usersService } from '@/services';
import type {
  BranchUser,
  GetUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  BranchRole,
} from '@repo/types/auth';

interface UsersState {
  // State
  users: BranchUser[];
  currentUser: BranchUser | null;
  loading: boolean;
  error: string | null;
  totalUsers: number;
  currentPage: number;
  pageLimit: number;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUsers: (users: BranchUser[], total: number, page: number, limit: number) => void;
  setCurrentUser: (user: BranchUser | null) => void;
  
  // API Actions
  fetchUsers: (params: GetUsersParams) => Promise<void>;
  fetchUserById: (userId: string, branchId: string) => Promise<void>;
  createUser: (userData: CreateUserRequest) => Promise<boolean>;
  updateUser: (userId: string, branchId: string, userData: UpdateUserRequest) => Promise<BranchUser>;
  assignRole: (userId: string, branchId: string, roleData: AssignRoleRequest) => Promise<BranchUser>;
  toggleUserStatus: (userId: string, branchId: string, isActive: boolean) => Promise<boolean>;
  removeUser: (userId: string, branchId: string) => Promise<void>;
  
  // Utility Actions
  reset: () => void;
  updateUserInList: (updatedUser: BranchUser) => void;
  removeUserFromList: (userId: string, branchId: string) => void;
}

export const useUsersStore = create<UsersState>()(
  devtools(
    (set, get) => ({
      // Initial State
      users: [],
      currentUser: null,
      loading: false,
      error: null,
      totalUsers: 0,
      currentPage: 1,
      pageLimit: 10,

      // Basic State Actions
      setLoading: (loading) => set({ loading }, false, 'setLoading'),
      
      setError: (error) => set({ error }, false, 'setError'),
      
      setUsers: (users, total, page, limit) => 
        set({ 
          users, 
          totalUsers: total, 
          currentPage: page, 
          pageLimit: limit,
          error: null 
        }, false, 'setUsers'),
      
      setCurrentUser: (currentUser) => set({ currentUser }, false, 'setCurrentUser'),

      // API Actions
      fetchUsers: async (params) => {
        const { setLoading, setError, setUsers } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await usersService.getUsersByBranch(params);
          setUsers(response.users, response.total, response.page, response.limit);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      },

      fetchUserById: async (userId, branchId) => {
        const { setLoading, setError, setCurrentUser } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const user = await usersService.getUserById(userId, branchId);
          setCurrentUser(user);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
          setError(errorMessage);
          setCurrentUser(null);
        } finally {
          setLoading(false);
        }
      },

      createUser: async (userData) => {
        const { setLoading, setError, users, setUsers, totalUsers, currentPage, pageLimit } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await usersService.createUser(userData);
          
          // Refresh the user list to show the new user
          const { fetchUsers } = get();
          await fetchUsers({ branch_id: userData.branch_id, page: 1, limit: 50 });
          
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      updateUser: async (userId, branchId, userData) => {
        const { setLoading, setError, updateUserInList } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const updatedUser = await usersService.updateUser(userId, branchId, userData);
          updateUserInList(updatedUser);
          
          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      assignRole: async (userId, branchId, roleData) => {
        const { setLoading, setError, updateUserInList } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const updatedUser = await usersService.assignRole(userId, branchId, roleData);
          updateUserInList(updatedUser);
          
          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to assign role';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      toggleUserStatus: async (userId, branchId, isActive) => {
        const { setLoading, setError, users, setUsers, totalUsers, currentPage, pageLimit } = get();
        
        // Store the original user for rollback
        const originalUser = users.find(u => u.user_id === userId && u.branch_id === branchId);
        if (!originalUser) {
          throw new Error('User not found in current list');
        }
        
        try {
          setLoading(true);
          setError(null);
          
          // Optimistic update - immediately update the UI
          const optimisticUsers = users.map(user => 
            user.user_id === userId && user.branch_id === branchId
              ? { ...user, is_active: isActive }
              : user
          );
          setUsers(optimisticUsers, totalUsers, currentPage, pageLimit);
          
          // Make the API call
          await usersService.toggleUserStatus(userId, branchId, isActive);
          
          return true;
        } catch (error) {
          // Rollback the optimistic update on error
          const rollbackUsers = users.map(user => 
            user.user_id === userId && user.branch_id === branchId
              ? originalUser
              : user
          );
          setUsers(rollbackUsers, totalUsers, currentPage, pageLimit);
          
          const errorMessage = error instanceof Error ? error.message : 'Failed to toggle user status';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      removeUser: async (userId, branchId) => {
        const { setLoading, setError, removeUserFromList } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await usersService.removeUser(userId, branchId);
          removeUserFromList(userId, branchId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove user';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      // Utility Actions
      reset: () => set({
        users: [],
        currentUser: null,
        loading: false,
        error: null,
        totalUsers: 0,
        currentPage: 1,
        pageLimit: 10,
      }, false, 'reset'),

      updateUserInList: (updatedUser) => {
        const { users, setUsers, totalUsers, currentPage, pageLimit } = get();
        const updatedUsers = users.map(user => 
          user.user_id === updatedUser.user_id && user.branch_id === updatedUser.branch_id
            ? updatedUser 
            : user
        );
        setUsers(updatedUsers, totalUsers, currentPage, pageLimit);
      },

      removeUserFromList: (userId, branchId) => {
        const { users, setUsers, totalUsers, currentPage, pageLimit } = get();
        const updatedUsers = users.filter(user => 
          !(user.user_id === userId && user.branch_id === branchId)
        );
        setUsers(updatedUsers, Math.max(0, totalUsers - 1), currentPage, pageLimit);
      },
    }),
    { name: 'users-store' }
  )
);

// Convenience hooks for specific actions
export const useUsers = () => {
  const store = useUsersStore();
  return {
    users: store.users,
    loading: store.loading,
    error: store.error,
    totalUsers: store.totalUsers,
    currentPage: store.currentPage,
    pageLimit: store.pageLimit,
    fetchUsers: store.fetchUsers,
    reset: store.reset,
  };
};

export const useUserMutations = () => {
  const store = useUsersStore();
  return {
    createUser: store.createUser,
    updateUser: store.updateUser,
    assignRole: store.assignRole,
    toggleUserStatus: store.toggleUserStatus,
    removeUser: store.removeUser,
    loading: store.loading,
    error: store.error,
  };
};

export const useCurrentUser = () => {
  const store = useUsersStore();
  return {
    currentUser: store.currentUser,
    fetchUserById: store.fetchUserById,
    setCurrentUser: store.setCurrentUser,
    loading: store.loading,
    error: store.error,
  };
};