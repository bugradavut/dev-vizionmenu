"use client";

/**
 * User List Table Component
 * ShadCN DataTable with user management functionality
 */

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@repo/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MoreHorizontal, Search, UserPlus } from 'lucide-react';
import { useUsers, useUserMutations } from '@/hooks';
import { usePermissions } from '@/hooks/use-enhanced-auth';
import type { BranchUser, BranchRole } from '@repo/types/auth';
import { cn } from '@/lib/utils';

interface UserListTableProps {
  branchId: string;
  onCreateUser?: () => void;
  onEditUser?: (user: BranchUser) => void;
  className?: string;
}

const ROLE_STYLES: Record<BranchRole, { bg: string; text: string; border: string }> = {
  chain_owner: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-700'
  },
  branch_manager: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700'
  },
  branch_staff: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-700'
  },
  branch_cashier: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-700'
  },
};

const ROLE_LABELS: Record<BranchRole, string> = {
  chain_owner: 'Chain Owner',
  branch_manager: 'Branch Manager',
  branch_staff: 'Staff',
  branch_cashier: 'Cashier',
};

export function UserListTable({
  branchId,
  onCreateUser,
  onEditUser,
  className
}: UserListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<BranchRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const { users, loading, error, fetchUsers, totalUsers } = useUsers();
  const { toggleUserStatus, removeUser } = useUserMutations();

  // Fetch users from API
  useEffect(() => {
    if (branchId && branchId !== 'undefined') {
      fetchUsers({
        branch_id: branchId,
        page: 1,
        limit: 50
      });
    }
  }, [branchId, fetchUsers]);

  const displayUsers = users;


  const filteredUsers = displayUsers.filter(user => {
    const matchesSearch = !searchQuery ||
      user.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? user.is_active : !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = async (user: BranchUser) => {
    try {
      await toggleUserStatus(user.user_id, user.branch_id, !user.is_active);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (user: BranchUser) => {
    if (!confirm(`Are you sure you want to permanently delete ${user.user.full_name || user.user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await removeUser(user.user_id, user.branch_id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  // Real permission checks using enhanced auth
  const permissions = usePermissions();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        {/* Header with Title and Actions */}
        <div className="space-y-4">
          {/* Header with Title and Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Team Members ({totalUsers})
              </CardTitle>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="relative w-full md:w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full lg:min-w-[200px]"
                />
              </div>

            {/* Filter Sheet */}
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-[#424245] dark:text-[#86868b]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col">
                <SheetHeader>
                  <SheetTitle>Filter Users</SheetTitle>
                  <SheetDescription>
                    Filter users by role and status
                  </SheetDescription>
                </SheetHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid gap-6 py-6">
                    {/* Role Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Role</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRoleFilter('all')}
                          className={`justify-start ${roleFilter === 'all'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          All Roles
                        </Button>
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                          <Button
                            key={role}
                            variant="outline"
                            size="sm"
                            onClick={() => setRoleFilter(role as BranchRole)}
                            className={`justify-start ${roleFilter === role
                              ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                              : ''
                              }`}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Status</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatusFilter('all')}
                          className={`justify-start ${statusFilter === 'all'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          All Users
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatusFilter('active')}
                          className={`justify-start ${statusFilter === 'active'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          Active
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatusFilter('inactive')}
                          className={`justify-start ${statusFilter === 'inactive'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          Inactive
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Bottom Actions */}
                <div className="flex gap-2 pt-4 border-t bg-background">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRoleFilter('all');
                      setStatusFilter('all');
                      setIsFilterSheetOpen(false);
                    }}
                    className="flex-1"
                  >
                    Clear Filters
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="flex-1"
                  >
                    Apply
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Add User Button */}
            {permissions.canManageUsers && onCreateUser && (
              <Button onClick={onCreateUser} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {error && (
          <div className="mb-4 mx-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-md overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-muted">
                <TableHead className="px-4">User</TableHead>
                <TableHead className="px-4">Role</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Joined</TableHead>
                <TableHead className="w-[70px] px-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                        <div className="space-y-1">
                          <div className="h-4 w-32 animate-pulse bg-muted" />
                          <div className="h-3 w-48 animate-pulse bg-muted" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><div className="h-6 w-20 animate-pulse bg-muted" /></TableCell>
                    <TableCell><div className="h-6 w-16 animate-pulse bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse bg-muted" /></TableCell>
                    <TableCell><div className="h-8 w-8 animate-pulse bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={`${user.user_id}-${user.branch_id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(user.user.full_name, user.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.user.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium ${ROLE_STYLES[user.role].bg} ${ROLE_STYLES[user.role].text} ${ROLE_STYLES[user.role].border}`}>
                        {ROLE_LABELS[user.role]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {user.is_active ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Active</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-900/20 dark:border-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Inactive</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        // Check if any actions are available for this user
                        const canEdit = onEditUser && permissions.canEditUser(user.role);
                        const canToggleStatus = permissions.canManageUsers && permissions.canEditUser(user.role);
                        const canDelete = permissions.canDeleteUsers && permissions.canEditUser(user.role);
                        const hasAnyActions = canEdit || canToggleStatus || canDelete;

                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                disabled={!hasAnyActions}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {onEditUser && permissions.canEditUser(user.role) && (
                                <DropdownMenuItem onClick={() => onEditUser(user)}>
                                  Edit User
                                </DropdownMenuItem>
                              )}

                              {permissions.canManageUsers && permissions.canEditUser(user.role) && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              )}

                              {permissions.canDeleteUsers && permissions.canEditUser(user.role) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    Delete User
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>


      </CardContent>
    </Card>
  );
}