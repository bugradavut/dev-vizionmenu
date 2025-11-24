"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { Skeleton } from "@/components/ui/skeleton"
import { useUsers } from "@/hooks"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type { BranchUser } from "@repo/types/auth"

const roleLabels: Record<string, { en: string; fr: string; badgeClass: string; avatarClass: string }> = {
  branch_manager: {
    en: "Manager",
    fr: "Gérant",
    badgeClass: "border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/20",
    avatarClass: "border-2 border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
  },
  branch_staff: {
    en: "Staff",
    fr: "Personnel",
    badgeClass: "border-green-200 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/20",
    avatarClass: "border-2 border-green-200 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
  },
  branch_cashier: {
    en: "Cashier",
    fr: "Caissier",
    badgeClass: "border-orange-200 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-900/20",
    avatarClass: "border-2 border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
  },
  chain_owner: {
    en: "Owner",
    fr: "Propriétaire",
    badgeClass: "border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-900/20",
    avatarClass: "border-2 border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
  },
}

function getInitials(user: BranchUser): string {
  const name = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name
  const email = (user as unknown as Record<string, unknown>).email || user.user?.email

  if (name && typeof name === 'string') {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return (email && typeof email === 'string') ? email.substring(0, 2).toUpperCase() : 'U'
}

export function TeamMembersCard() {
  const { language } = useLanguage()
  const { branchId } = useEnhancedAuth()
  const { users, loading, fetchUsers } = useUsers()

  useEffect(() => {
    if (branchId) {
      fetchUsers({
        branch_id: branchId,
        page: 1,
        limit: 10
      })
    }
  }, [branchId, fetchUsers])

  if (loading) {
    return (
      <Card className="flex flex-col h-[420px]">
        <CardHeader className="pb-3 shrink-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
          <div className="flex-1 space-y-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1 min-w-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t shrink-0">
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter only active users
  const activeUsers = users.filter(user => user.is_active)

  return (
    <Card className="flex flex-col h-[420px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base font-medium">
          {language === 'fr' ? 'Membres de l\'Équipe' : 'Team Members'}
        </CardTitle>
        <CardDescription>
          {language === 'fr'
            ? 'Collaborateurs ayant accès à cette succursale'
            : 'Collaborators with access to this branch'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
        {activeUsers.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-border pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
              {activeUsers.map((user) => {
                const fullName = (user as unknown as Record<string, unknown>).full_name || user.user?.full_name
                const email = (user as unknown as Record<string, unknown>).email || user.user?.email
                const avatarUrl = (user as unknown as Record<string, unknown>).avatar_url || user.user?.avatar_url

                const roleInfo = roleLabels[user.role] || {
                  en: user.role,
                  fr: user.role,
                  badgeClass: "border-gray-200 text-gray-700 bg-gray-50",
                  avatarClass: "border-2 border-gray-300 bg-gray-100 text-gray-700"
                }

                return (
                  <div key={`${user.user_id}-${user.branch_id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className={`h-10 w-10 shrink-0 ${roleInfo.avatarClass}`}>
                      <AvatarImage src={typeof avatarUrl === 'string' ? avatarUrl : undefined} alt={typeof fullName === 'string' ? fullName : ''} />
                      <AvatarFallback className="bg-transparent text-sm font-medium">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {typeof fullName === 'string' ? fullName : 'No name'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {typeof email === 'string' ? email : 'No email'}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleInfo.badgeClass}`}>
                      {language === 'fr' ? roleInfo.fr : roleInfo.en}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="pt-4 mt-4 border-t shrink-0">
              <Link href="/settings/users">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir tous les membres' : 'View All Members'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? 'Aucun membre trouvé'
                  : 'No members found'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t shrink-0">
              <Link href="/settings/users">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Gérer les membres' : 'Manage Members'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
