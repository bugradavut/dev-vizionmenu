"use client"

import { useState } from 'react';
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@repo/ui"
import { UserCheck, Shield, Users } from "lucide-react"
import { UserListTable, CreateUserModal, EditUserModal } from "@/components/user-management"
import { useUsers, useAuthApi } from "@/hooks"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import type { BranchUser } from "@repo/types/auth"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function UserManagementPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BranchUser | null>(null);

  const { users, totalUsers } = useUsers();
  const { user } = useAuthApi();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  // Auto-detect context: chain owner uses chain API, others use branch API
  const isChainOwner = user?.role === 'chain_owner';
  const currentChainId = user?.chain_id;
  const currentBranchId = user?.branch_id;

  const activeUsers = users.filter(user => user.is_active).length;
  const adminUsers = users.filter(user => ['chain_owner', 'branch_manager'].includes(user.role)).length;

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const handleEditUser = (user: BranchUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      {/* Temporarily disabled ProtectedRoute for debugging */}
      {/* <ProtectedRoute 
        requireAuth={true}
        requiredPermission="users:write"
      > */}
        <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.settingsUsers.pageTitle}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {t.settingsUsers.pageSubtitle}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* Header actions can go here if needed */}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats Cards - Full width on mobile, 8 columns on desktop */}
                <div className="lg:col-span-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t.settingsUsers.totalUsers}</p>
                            <p className="text-xl font-bold">{totalUsers}</p>
                          </div>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t.settingsUsers.activeUsers}</p>
                            <p className="text-xl font-bold">{activeUsers}</p>
                          </div>
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t.settingsUsers.administrators}</p>
                            <p className="text-xl font-bold">{adminUsers}</p>
                          </div>
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* User List Table - Full width */}
                <div className="lg:col-span-12">
                  <UserListTable
                    key={`user-table-${user?.role}-${user?.id}`}
                    branchId={currentBranchId}
                    chainId={currentChainId}
                    isChainOwner={isChainOwner}
                    onCreateUser={handleCreateUser}
                    onEditUser={handleEditUser}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
        </DashboardLayout>
      {/* </ProtectedRoute> */}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        branchId={currentBranchId}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        user={selectedUser}
      />
    </AuthGuard>
  )
}