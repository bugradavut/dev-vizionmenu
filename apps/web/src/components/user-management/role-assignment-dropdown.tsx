/**
 * Role Assignment Dropdown Component
 * Inline role changes in UserListTable
 */

"use client";

import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/services/api-client';
import { usePermissions } from '@/hooks/use-enhanced-auth';
import type { BranchRole } from '@repo/types/auth';

interface RoleAssignmentDropdownProps {
  userId: string;
  branchId: string;
  currentRole: BranchRole;
  onRoleChange?: (newRole: BranchRole) => void;
}

const ROLE_LABELS: Record<BranchRole, string> = {
  chain_owner: 'Chain Owner',
  branch_manager: 'Branch Manager', 
  branch_staff: 'Branch Staff',
  branch_cashier: 'Branch Cashier'
};

const ROLE_COLORS: Record<BranchRole, string> = {
  chain_owner: 'text-purple-600 bg-purple-50',
  branch_manager: 'text-blue-600 bg-blue-50',
  branch_staff: 'text-green-600 bg-green-50', 
  branch_cashier: 'text-orange-600 bg-orange-50'
};

export function RoleAssignmentDropdown({ 
  userId, 
  branchId, 
  currentRole, 
  onRoleChange 
}: RoleAssignmentDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<BranchRole>(currentRole);
  const permissions = usePermissions();

  // Only chain owners and branch managers can assign roles
  const canAssignRoles = permissions.isChainOwner || permissions.hasRole('branch_manager');

  const handleRoleChange = async (newRole: BranchRole) => {
    if (newRole === selectedRole || isLoading) return;

    setIsLoading(true);
    try {
      await apiClient.post(`/api/v1/users/${userId}/branch/${branchId}/assign-role`, {
        role: newRole
      });

      setSelectedRole(newRole);
      onRoleChange?.(newRole);
      
      // Show success feedback (could add toast here)
      
    } catch (error) {
      console.error('Failed to assign role:', error);
      // Reset to previous role on error
      setSelectedRole(currentRole);
      
      // Show error feedback (could add toast here)
      alert('Failed to change role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If user can't assign roles, show read-only badge
  if (!canAssignRoles) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[selectedRole]}`}>
        {ROLE_LABELS[selectedRole]}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2.5 text-xs font-medium rounded-full ${ROLE_COLORS[selectedRole]} hover:opacity-80`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <ChevronDown className="h-3 w-3 mr-1" />
          )}
          {ROLE_LABELS[selectedRole]}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleChange(role as BranchRole)}
            className="flex items-center justify-between text-sm"
            disabled={isLoading}
          >
            <span>{label}</span>
            {selectedRole === role && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}