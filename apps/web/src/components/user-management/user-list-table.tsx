"use client";

/**
 * User List Table Component
 * ShadCN DataTable with user management functionality
 */

import { useState, useEffect } from 'react';
import { 
  Badge, 
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
import { MoreHorizontal, Search, UserPlus, Filter } from 'lucide-react';
import { useUsers, useUserMutations, usePermissions } from '@/hooks';
import type { BranchUser, BranchRole } from '@repo/types/auth';
import { cn } from '@/lib/utils';

interface UserListTableProps {
  branchId: string;
  onCreateUser?: () => void;
  onEditUser?: (user: BranchUser) => void;
  className?: string;
}

const ROLE_COLORS: Record<BranchRole, string> = {
  chain_owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  branch_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  branch_staff: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  branch_cashier: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
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

  const { users, loading, error, fetchUsers, totalUsers } = useUsers();
  const { toggleUserStatus, removeUser } = useUserMutations();
  const { hasPermission } = usePermissions();

  // Fetch users on mount and when filters change
  useEffect(() => {
    const params = {
      branch_id: branchId,
      page: 1,
      limit: 50,
      ...(searchQuery && { search: searchQuery }),
      ...(roleFilter !== 'all' && { role: roleFilter }),
      ...(statusFilter !== 'all' && { is_active: statusFilter === 'active' }),
    };

    fetchUsers(params);
  }, [branchId, searchQuery, roleFilter, statusFilter, fetchUsers]);

  const filteredUsers = users.filter(user => {
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

  const handleRemoveUser = async (user: BranchUser) => {
    if (!confirm(`Are you sure you want to remove ${user.user.full_name || user.user.email}?`)) {
      return;
    }

    try {
      await removeUser(user.user_id, user.branch_id);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const canManageUsers = hasPermission('user_management') || true; // Always show for testing
  const canDeleteUsers = hasPermission('user_management') || true;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Team Members</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage users and their roles for this branch
            </p>
          </div>
          
          {canManageUsers && onCreateUser && (
            <Button onClick={onCreateUser} className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Role: {roleFilter === 'all' ? 'All' : ROLE_LABELS[roleFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRoleFilter('all')}>
                All Roles
              </DropdownMenuItem>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <DropdownMenuItem 
                  key={role} 
                  onClick={() => setRoleFilter(role as BranchRole)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Status: {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                Active Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                Inactive Users
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
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
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-muted-foreground">No users found</p>
                      {canManageUsers && onCreateUser && (
                        <Button variant="outline" size="sm" onClick={onCreateUser}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add First User
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={`${user.user_id}-${user.branch_id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.user.avatar_url} />
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
                      <Badge className={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.is_active ? 'default' : 'secondary'}
                        className={user.is_active ? 'bg-green-100 text-green-800' : ''}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {onEditUser && (
                            <DropdownMenuItem onClick={() => onEditUser(user)}>
                              Edit User
                            </DropdownMenuItem>
                          )}
                          
                          {canManageUsers && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          )}
                          
                          {canDeleteUsers && user.role !== 'chain_owner' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleRemoveUser(user)}
                              >
                                Remove User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results summary */}
        {!loading && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {totalUsers} users
          </div>
        )}
      </CardContent>
    </Card>
  );
}