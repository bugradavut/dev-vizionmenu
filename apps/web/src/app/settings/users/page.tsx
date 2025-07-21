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
import { UserListTable, CreateUserModal } from "@/components/user-management"
import { useUsers, usePermissions, useAuthApi } from "@/hooks"
import type { BranchUser } from '@repo/types/auth'

export default function UserManagementPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { users, totalUsers } = useUsers();
  const { user } = useAuthApi();

  // Get current branch ID from authenticated user
  const currentBranchId = user?.branch_id || "550e8400-e29b-41d4-a716-446655440002";

  const activeUsers = users.filter(user => user.is_active).length;
  const adminUsers = users.filter(user => ['chain_owner', 'branch_manager'].includes(user.role)).length;

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const handleEditUser = (_user: BranchUser) => {
    // TODO: Implement edit user functionality
  };

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
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
          
          <div className="flex flex-1 flex-col gap-6 py-4 px-4 md:px-8 lg:px-12 pt-8">
            <div className="max-w-6xl">
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">User Management</h2>
                    <p className="text-muted-foreground mt-2">
                      Manage restaurant staff, roles, and permissions.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        Team members
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        Currently active
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                      <Shield className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{adminUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        Admin access
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* User List Table */}
                <UserListTable
                  branchId={currentBranchId}
                  onCreateUser={handleCreateUser}
                  onEditUser={handleEditUser}
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        branchId={currentBranchId}
      />
    </AuthGuard>
  )
}