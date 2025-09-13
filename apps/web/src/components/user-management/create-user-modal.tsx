"use client";

/**
 * Create User Modal Component
 * ShadCN Dialog-based user creation modal
 */

import { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserMutations } from '@/hooks';
import { usePermissions } from '@/hooks/use-enhanced-auth';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import { branchesService, type Branch } from '@/services/branches.service';
import { useAuthApi } from '@/hooks';
import type { BranchRole, CreateUserRequest } from '@repo/types/auth';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string; // Optional - will be determined by role
}

// Role options will be handled dynamically with translations

const DEFAULT_PERMISSIONS: Record<BranchRole, string[]> = {
  chain_owner: [
    "users:read", "users:write", "users:delete",
    "menu:read", "menu:write",
    "orders:read", "orders:write",
    "reports:read",
    "settings:read", "settings:write",
    "branch:read", "branch:write"
  ],
  branch_manager: [
    "branch:read", "branch:write",
    "menu:read", "menu:write",
    "orders:read", "orders:write",
    "reports:read",
    "users:read", "users:write",
    "settings:read", "settings:write"
  ],
  branch_staff: [
    "branch:read",
    "menu:read",
    "orders:read", "orders:write",
    "reports:read"
  ],
  branch_cashier: [
    "branch:read",
    "menu:read",
    "orders:read", "orders:write",
    "payments:read", "payments:write"
  ]
};

export function CreateUserModal({ isOpen, onClose, branchId }: CreateUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    role: 'branch_staff' as BranchRole,
    branch_id: branchId || '', // Will be set based on user role
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { createUser } = useUserMutations();
  const { user } = useAuthApi();
  const permissions = usePermissions();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  // Get allowed roles based on current user's permissions
  const allowedRoles = useMemo(() => {
    const roles = permissions.getAllowedRolesToCreate();
    const roleOptions = [
      { value: 'chain_owner' as BranchRole, label: t.settingsUsers.userTable.chainOwner },
      { value: 'branch_manager' as BranchRole, label: t.settingsUsers.userTable.branchManager },
      { value: 'branch_staff' as BranchRole, label: t.settingsUsers.userTable.staff },
      { value: 'branch_cashier' as BranchRole, label: t.settingsUsers.userTable.cashier },
    ];
    return roleOptions.filter(option => roles.includes(option.value));
  }, [permissions, t]);

  // Determine if branch selection is needed
  const needsBranchSelection = useMemo(() => {
    // Check if user is platform admin or chain owner
    const isUserPlatformAdmin = (user as { is_platform_admin?: boolean })?.is_platform_admin === true;
    const isChainOwner = user?.role === 'chain_owner';
    return isUserPlatformAdmin || isChainOwner;
  }, [user]);

  // Load available branches when modal opens
  useEffect(() => {
    if (!isOpen || !needsBranchSelection) return;

    const loadBranches = async () => {
      if (!user?.role || !user?.chain_id) {
        return;
      }
      
      setLoadingBranches(true);
      try {
        const branches = await branchesService.getAvailableBranches(user.role, user.chain_id);
        setAvailableBranches(branches);
        setErrors(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { branches, ...rest } = prev;
          return rest;
        });
      } catch (error) {
        console.error('Failed to load branches:', error);
        setErrors(prev => ({ ...prev, branches: `Failed to load branches: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [isOpen, needsBranchSelection, user?.role, user?.chain_id]);

  // Set default branch for branch managers
  useEffect(() => {
    if (user?.role === 'branch_manager' && user?.branch_id) {
      setFormData(prev => ({ ...prev, branch_id: user.branch_id! }));
    }
  }, [user?.role, user?.branch_id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = t.settingsUsers.createUserModal.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.settingsUsers.createUserModal.emailInvalid;
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = t.settingsUsers.createUserModal.nameRequired;
    }

    if (!formData.password.trim()) {
      newErrors.password = t.settingsUsers.createUserModal.passwordRequired;
    } else if (formData.password.length < 8) {
      newErrors.password = t.settingsUsers.createUserModal.passwordMinLength;
    }

    // Branch selection validation
    if (needsBranchSelection && !formData.branch_id) {
      newErrors.branch_id = 'Please select a branch';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = t.settingsUsers.createUserModal.phoneInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const isUserPlatformAdmin = (user as { is_platform_admin?: boolean })?.is_platform_admin === true;
      
      const userData: CreateUserRequest = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        branch_id: formData.branch_id || branchId || '', // Use selected branch or fallback
        role: formData.role,
        permissions: DEFAULT_PERMISSIONS[formData.role],
        // Set refresh strategy based on user role
        refreshStrategy: (isUserPlatformAdmin || user?.role === 'chain_owner') ? 'chain' : 'branch',
        chain_id: user?.chain_id || undefined,
      };

      await createUser(userData);
      
      // Reset form and close modal
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        role: allowedRoles[0]?.value || 'branch_staff',
        branch_id: user?.role === 'branch_manager' ? (user?.branch_id || '') : '',
      });
      setAvailableBranches([]);
      onClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : t.settingsUsers.createUserModal.createFailed
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        role: allowedRoles[0]?.value || 'branch_staff',
        branch_id: user?.role === 'branch_manager' ? (user?.branch_id || '') : '',
      });
      setAvailableBranches([]);
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t.settingsUsers.createUserModal.title}</DialogTitle>
          <DialogDescription>
            {t.settingsUsers.createUserModal.subtitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t.settingsUsers.createUserModal.email} *</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.settingsUsers.createUserModal.emailPlaceholder}
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
            <Label htmlFor="full_name">{t.settingsUsers.createUserModal.fullName} *</Label>
            <Input
              id="full_name"
              type="text"
              placeholder={t.settingsUsers.createUserModal.fullNamePlaceholder}
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
            <Label htmlFor="phone">{t.settingsUsers.createUserModal.phone}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t.settingsUsers.createUserModal.phonePlaceholder}
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className={errors.phone ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">{t.settingsUsers.createUserModal.tempPassword} *</Label>
            <Input
              id="password"
              type="password"
              placeholder={t.settingsUsers.createUserModal.passwordPlaceholder}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className={errors.password ? 'border-red-500' : ''}
              disabled={isSubmitting}
              required
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t.settingsUsers.createUserModal.passwordHint}
            </p>
          </div>

          {/* Branch Selection (if needed) */}
          {needsBranchSelection && (
            <div className="space-y-2">
              <Label htmlFor="branch_id">Branch *</Label>
              <Select
                value={formData.branch_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value }))}
                disabled={isSubmitting || loadingBranches}
              >
                <SelectTrigger className={errors.branch_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a branch..." />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => {
                    // Get city name from address object or use branch name only
                    const cityName = typeof branch.address === 'object' && branch.address.city 
                      ? branch.address.city 
                      : null;
                    const displayName = cityName ? `${branch.name} (${cityName})` : branch.name;
                    
                    return (
                      <SelectItem key={branch.id} value={branch.id}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.branch_id && (
                <p className="text-sm text-red-600">{errors.branch_id}</p>
              )}
              {loadingBranches && (
                <p className="text-xs text-muted-foreground">Loading branches...</p>
              )}
            </div>
          )}

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">{t.settingsUsers.createUserModal.role} *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as BranchRole }))}
              disabled={isSubmitting || allowedRoles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allowedRoles.length === 0 && (
              <p className="text-xs text-muted-foreground text-red-600">
                No roles available to create
              </p>
            )}
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
              {t.settingsUsers.createUserModal.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t.settingsUsers.createUserModal.creating : t.settingsUsers.createUserModal.createUser}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}