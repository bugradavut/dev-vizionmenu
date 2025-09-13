"use client"

import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { NotificationProvider } from "@/contexts/notification-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard Layout Wrapper
 * Provides notifications and sidebar context for admin/dashboard pages
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <NotificationProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </NotificationProvider>
  );
};