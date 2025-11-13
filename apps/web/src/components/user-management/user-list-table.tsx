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
import { MoreHorizontal, Search, UserPlus, Download } from 'lucide-react';
import { useUsers, useUserMutations } from '@/hooks';
import { usePermissions } from '@/hooks/use-enhanced-auth';
import { useLanguage } from '@/contexts/language-context';
import { translations } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import type { BranchUser, BranchRole } from '@repo/types/auth';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface UserListTableProps {
  branchId?: string;
  chainId?: string;
  isChainOwner?: boolean;
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

// Role labels will be handled dynamically with translations

export function UserListTable({
  branchId,
  chainId,
  isChainOwner,
  onCreateUser,
  onEditUser,
  className
}: UserListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<BranchRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);

  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const { toast } = useToast();
  
  // Dynamic role labels based on language
  const getRoleLabel = (role: BranchRole): string => {
    switch (role) {
      case 'chain_owner': return t.settingsUsers.userTable.chainOwner;
      case 'branch_manager': return t.settingsUsers.userTable.branchManager;
      case 'branch_staff': return t.settingsUsers.userTable.staff;
      case 'branch_cashier': return t.settingsUsers.userTable.cashier;
      default: return role;
    }
  };

  const { users, loading, error, fetchUsers, fetchChainUsers, totalUsers } = useUsers();
  const { toggleUserStatus, removeUser } = useUserMutations();

  // Fetch users from API - auto-detect context
  useEffect(() => {
    if (isChainOwner && chainId) {
      // Chain owner: fetch all chain users (chain owners + branch users)
      fetchChainUsers({
        branch_id: '',
        chain_id: chainId,
        page: 1,
        limit: 50
      });
    } else if (branchId && branchId !== 'undefined') {
      // Branch user: fetch only branch users
      fetchUsers({
        branch_id: branchId,
        page: 1,
        limit: 50
      });
    }
  }, [branchId, chainId, isChainOwner, fetchUsers, fetchChainUsers]);

  const displayUsers = users;


  const filteredUsers = displayUsers.filter(user => {
    // Handle both unified API structure (direct fields) and legacy structure (nested user object)
    const fullName = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name;
    const email = (user as unknown as Record<string, unknown>).email || user.user?.email;
    
    const matchesSearch = !searchQuery ||
      (typeof fullName === 'string' && fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof email === 'string' && email.toLowerCase().includes(searchQuery.toLowerCase()));

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
    const fullName = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name;
    const email = (user as unknown as Record<string, unknown>).email || user.user?.email;
    const confirmMessage = t.settingsUsers.userTable.deleteConfirm.replace('{name}', (fullName || email || 'Unknown') as string);
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await removeUser(user.user_id, user.branch_id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleExportUserData = async (user: BranchUser) => {
    setExportingUserId(user.user_id);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          variant: 'destructive',
          title: language === 'en' ? 'Authentication Required' : 'Authentification requise',
          description: language === 'en'
            ? 'Please login to export user data'
            : 'Veuillez vous connecter pour exporter les données',
        });
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${user.user_id}/data-export`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Export failed: ${response.status}`
        );
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().split('T')[0];
      const fullName = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name;
      const email = (user as unknown as Record<string, unknown>).email || user.user?.email;
      const userName = (fullName || email || user.user_id.substring(0, 8)) as string;
      const filename = `user-data-export-${userName.replace(/\s+/g, '-')}-${timestamp}.zip`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        variant: 'default',
        title: language === 'en' ? 'Export Successful' : 'Exportation réussie',
        description: language === 'en'
          ? 'User data has been exported successfully'
          : 'Les données utilisateur ont été exportées avec succès',
      });
    } catch (error) {
      console.error('[Export User Data] Error:', error);
      toast({
        variant: 'destructive',
        title: language === 'en' ? 'Export Failed' : 'Échec de l\'exportation',
        description: error instanceof Error
          ? error.message
          : (language === 'en' ? 'Failed to export user data' : 'Échec de l\'exportation des données'),
      });
    } finally {
      setExportingUserId(null);
    }
  };

  const getInitials = (user: BranchUser) => {
    const name = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name;
    const email = (user as unknown as Record<string, unknown>).email || user.user?.email;
    
    if (name && typeof name === 'string') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return (email && typeof email === 'string') ? email.substring(0, 2).toUpperCase() : 'U';
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
                {isChainOwner ? 'Chain Team Members' : 'Branch Team Members'} ({totalUsers})
              </CardTitle>
              {isChainOwner && (
                <p className="text-sm text-muted-foreground">
                  Managing users across all branches in your chain
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="relative w-full md:w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.settingsUsers.userTable.searchPlaceholder}
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
                  <SheetTitle>{t.settingsUsers.userTable.filters}</SheetTitle>
                  <SheetDescription>
                    {t.settingsUsers.userTable.filterByRole} {t.settingsUsers.userTable.filterByStatus.toLowerCase()}
                  </SheetDescription>
                </SheetHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid gap-6 py-6">
                    {/* Role Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">{t.settingsUsers.userTable.role}</h4>
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
                          {t.settingsUsers.userTable.filterAll} {t.settingsUsers.userTable.role}s
                        </Button>
                        {(['chain_owner', 'branch_manager', 'branch_staff', 'branch_cashier'] as BranchRole[]).map((role) => (
                          <Button
                            key={role}
                            variant="outline"
                            size="sm"
                            onClick={() => setRoleFilter(role)}
                            className={`justify-start ${roleFilter === role
                              ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                              : ''
                              }`}
                          >
                            {getRoleLabel(role)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">{t.settingsUsers.userTable.status}</h4>
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
                          {t.settingsUsers.userTable.filterAll}
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
                          {t.settingsUsers.userTable.active}
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
                          {t.settingsUsers.userTable.inactive}
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
                    {t.settingsUsers.userTable.filterAll}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="flex-1"
                  >
                    {t.settingsUsers.userTable.filters}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Add User Button */}
            {permissions.canManageUsers && onCreateUser && (
              <Button onClick={onCreateUser} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                {t.settingsUsers.userTable.addUser}
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
          <Table className="min-w-[700px]">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-muted">
                <TableHead className="px-4">{t.settingsUsers.userTable.name}</TableHead>
                <TableHead className="px-4">{t.settingsUsers.userTable.role}</TableHead>
                <TableHead className="px-4">Branch</TableHead>
                <TableHead className="px-4">{t.settingsUsers.userTable.status}</TableHead>
                <TableHead className="px-4">Joined</TableHead>
                <TableHead className="w-[70px] px-4 text-center">{t.settingsUsers.userTable.actions}</TableHead>
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
                    <TableCell><div className="h-6 w-24 animate-pulse bg-muted" /></TableCell>
                    <TableCell><div className="h-6 w-16 animate-pulse bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse bg-muted" /></TableCell>
                    <TableCell><div className="h-8 w-8 animate-pulse bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-muted-foreground">{t.settingsUsers.userTable.noUsers}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  // Handle both unified API structure and legacy structure
                  const fullName = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name;
                  const email = (user as unknown as Record<string, unknown>).email || user.user?.email;
                  const avatarUrl = (user as unknown as Record<string, unknown>).avatar_url || user.user?.avatar_url;
                  const branchName = (user as unknown as Record<string, unknown>).branch_name;
                  
                  return (
                  <TableRow key={`${user.user_id}-${user.branch_id || 'chain'}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={typeof avatarUrl === 'string' ? avatarUrl : undefined} />
                          <AvatarFallback>
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {typeof fullName === 'string' ? fullName : 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {typeof email === 'string' ? email : 'No email'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium ${ROLE_STYLES[user.role].bg} ${ROLE_STYLES[user.role].text} ${ROLE_STYLES[user.role].border}`}>
                        {getRoleLabel(user.role)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Branch Badge */}
                      <div className="inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300">
                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {(user as BranchUser & { branch_name?: string }).branch_name || (typeof branchName === 'string' ? branchName : '') || 'No Branch'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {user.is_active ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t.settingsUsers.userTable.active}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-900/20 dark:border-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.settingsUsers.userTable.inactive}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('en-CA', {
                        timeZone: 'America/Toronto'
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        // Check if any actions are available for this user
                        const canEdit = onEditUser && permissions.canEditUser(user.role);
                        const canToggleStatus = permissions.canManageUsers && permissions.canEditUser(user.role);
                        const canDelete = permissions.canDeleteUsers && permissions.canEditUser(user.role);
                        const canExport = isChainOwner; // FO-126: Chain owner can export user data
                        const hasAnyActions = canEdit || canToggleStatus || canDelete || canExport;

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
                              <DropdownMenuLabel>{t.settingsUsers.userTable.actions}</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {onEditUser && permissions.canEditUser(user.role) && (
                                <DropdownMenuItem onClick={() => onEditUser(user)}>
                                  {t.settingsUsers.userTable.editUser}
                                </DropdownMenuItem>
                              )}

                              {permissions.canManageUsers && permissions.canEditUser(user.role) && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                  {user.is_active ? t.settingsUsers.userTable.inactive : t.settingsUsers.userTable.active}
                                </DropdownMenuItem>
                              )}

                              {canExport && (
                                <DropdownMenuItem
                                  onClick={() => handleExportUserData(user)}
                                  disabled={exportingUserId === user.user_id}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {exportingUserId === user.user_id
                                    ? (language === 'en' ? 'Exporting...' : 'Exportation...')
                                    : (language === 'en' ? 'Export Data' : 'Exporter Données')}
                                </DropdownMenuItem>
                              )}

                              {permissions.canDeleteUsers && permissions.canEditUser(user.role) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    {t.settingsUsers.userTable.deleteUser}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>


      </CardContent>
    </Card>
  );
}