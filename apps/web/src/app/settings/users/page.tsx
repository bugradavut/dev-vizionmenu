"use client"

import { useState } from 'react';
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { UserCheck, Shield, Users } from "lucide-react"
import { UserListTable, CreateUserModal, EditUserModal } from "@/components/user-management"
import { useUsers, useAuthApi } from "@/hooks"
import type { BranchUser } from "@repo/types/auth"

export default function UserManagementPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BranchUser | null>(null);

  const { users, totalUsers } = useUsers();
  const { user } = useAuthApi();
  

  // Get current branch ID from authenticated user
  const currentBranchId = user?.branch_id || "550e8400-e29b-41d4-a716-446655440002";

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
        <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">
                      Settings
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>User Management</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col px-3 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-3 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Manage restaurant staff, roles, and permissions.
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* Header actions can go here if needed */}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-3 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats Cards - Full width on mobile, 8 columns on desktop */}
                <div className="lg:col-span-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
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
                            <p className="text-sm font-medium text-muted-foreground">Active Users</p>
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
                            <p className="text-sm font-medium text-muted-foreground">Administrators</p>
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
                    onCreateUser={handleCreateUser}
                    onEditUser={handleEditUser}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
        </SidebarProvider>
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