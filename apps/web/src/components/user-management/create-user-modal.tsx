"use client";

/**
 * Create User Modal Component
 * ShadCN Dialog-based user creation modal
 */

import { useState } from 'react';
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
// Simple select without external dependencies
import { useUserMutations } from '@/hooks';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import type { BranchRole, CreateUserRequest } from '@repo/types/auth';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
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
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    role: 'branch_staff' as BranchRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { createUser } = useUserMutations();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  // Dynamic role options based on language
  const getRoleOptions = () => [
    { value: 'branch_staff' as BranchRole, label: t.settingsUsers.userTable.staff },
    { value: 'branch_cashier' as BranchRole, label: t.settingsUsers.userTable.cashier },
    { value: 'branch_manager' as BranchRole, label: t.settingsUsers.userTable.branchManager },
    { value: 'chain_owner' as BranchRole, label: t.settingsUsers.userTable.chainOwner },
  ];

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
      const userData: CreateUserRequest = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        branch_id: branchId,
        role: formData.role,
        permissions: DEFAULT_PERMISSIONS[formData.role],
      };

      await createUser(userData);
      
      // Reset form and close modal
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        role: 'branch_staff',
      });
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
        role: 'branch_staff',
      });
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

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">{t.settingsUsers.createUserModal.role} *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as BranchRole }))}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              {getRoleOptions().map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
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