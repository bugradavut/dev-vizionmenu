"use client";

/**
 * Edit User Modal Component
 * ShadCN Dialog-based user editing modal
 */

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  Button,
  Input,
  Label
} from '@repo/ui';
import { useUserMutations } from '@/hooks';
import { useUsersStore } from '@/hooks/use-users';
import { usePermissions } from '@/hooks/use-enhanced-auth';
import { apiClient } from '@/services/api-client';
import type { BranchRole, BranchUser, UpdateUserRequest } from '@repo/types/auth';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: BranchUser | null;
}

const ROLE_OPTIONS: { value: BranchRole; label: string }[] = [
  { value: 'branch_staff', label: 'Branch Staff' },
  { value: 'branch_cashier', label: 'Branch Cashier' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'chain_owner', label: 'Chain Owner' },
];

export function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'branch_staff' as BranchRole,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { updateUser } = useUserMutations();
  const { updateUserInList } = useUsersStore();
  const permissions = usePermissions();

  // Only chain owners and branch managers can assign roles
  const canAssignRoles = permissions.isChainOwner || permissions.hasRole('branch_manager');


  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.user.email || '',
        full_name: user.user.full_name || '',
        phone: user.user.phone || '',
        role: user.role,
        is_active: user.is_active,
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user) {
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const updateData: UpdateUserRequest = {
        email: formData.email.trim() !== user.user.email ? formData.email.trim() : undefined,
        full_name: formData.full_name.trim() !== user.user.full_name ? formData.full_name.trim() : undefined,
        phone: formData.phone.trim() !== (user.user.phone || '') ? (formData.phone.trim() || undefined) : undefined,
        is_active: formData.is_active !== user.is_active ? formData.is_active : undefined,
      };

      // Only include fields that have actually changed
      const hasChanges = Object.values(updateData).some(value => value !== undefined);
      const roleChanged = formData.role !== user.role;
      
      if (!hasChanges && !roleChanged) {
        onClose();
        return;
      }

      await updateUser(user.user_id, user.branch_id, updateData);

      // Handle role assignment separately if role has changed and user has permission
      if (canAssignRoles && formData.role !== user.role) {
        try {
          await apiClient.post(`/api/v1/users/${user.user_id}/branch/${user.branch_id}/assign-role`, {
            role: formData.role
          });
          
          // Update the user in local state to reflect role change
          const updatedUser: BranchUser = {
            ...user,
            role: formData.role,
            user: {
              ...user.user,
              ...(formData.email.trim() !== user.user.email && { email: formData.email.trim() }),
              ...(formData.full_name.trim() !== user.user.full_name && { full_name: formData.full_name.trim() }),
              ...(formData.phone.trim() !== (user.user.phone || '') && { phone: formData.phone.trim() || undefined }),
            },
            ...(formData.is_active !== user.is_active && { is_active: formData.is_active }),
          };
          
          updateUserInList(updatedUser);
        } catch (roleError) {
          console.error('Role assignment failed:', roleError);
          // Still close modal since profile update succeeded
          // Could show a toast notification here
        }
      }

      onClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to update user'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and settings for {user.user.full_name || user.user.email}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isSubmitting}
              autoFocus={false}
              required
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className={errors.full_name ? 'border-red-500' : ''}
              disabled={isSubmitting}
              required
            />
            {errors.full_name && (
              <p className="text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className={errors.phone ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as BranchRole }))}
              disabled={!canAssignRoles}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="is_active">Status</Label>
            <select
              id="is_active"
              value={formData.is_active ? 'active' : 'inactive'}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}