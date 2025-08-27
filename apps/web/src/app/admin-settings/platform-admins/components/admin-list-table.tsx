'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Plus,
  Search,
  MoreHorizontal,
  UserMinus,
  ShieldCheck
} from 'lucide-react'
import { PlatformAdmin } from '@/services/platform-admin.service'

interface AdminListTableProps {
  admins: PlatformAdmin[]
  loading: boolean
  onAddAdmin: () => void
  onRemoveAdmin: (admin: PlatformAdmin) => void
  currentUserId?: string
  className?: string
}

export function AdminListTable({
  admins,
  loading,
  onAddAdmin,
  onRemoveAdmin,
  currentUserId,
  className
}: AdminListTableProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const { language } = useLanguage()

  // Filter admins based on search
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = searchQuery === '' || 
      admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {language === 'fr' ? 'Administrateurs Plateforme' : 'Platform Administrators'} ({filteredAdmins.length})
              </CardTitle>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full md:w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={language === 'fr' ? 'Rechercher des administrateurs...' : 'Search administrators...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full lg:min-w-[200px]"
                />
              </div>

              <Button onClick={onAddAdmin}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Ajouter Admin' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery 
                ? (language === 'fr' ? 'Aucun administrateur trouvé avec les filtres actuels' : 'No administrators found with current filters')
                : (language === 'fr' ? 'Aucun administrateur trouvé' : 'No administrators found')
              }
            </p>
            {!searchQuery && (
              <Button onClick={onAddAdmin} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Ajouter votre premier admin' : 'Add your first admin'}
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">
                    {language === 'fr' ? 'Administrateur' : 'Administrator'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Email' : 'Email'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Statut' : 'Status'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Ajouté le' : 'Added On'}
                  </TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => {
                  const isCurrentUser = admin.user_id === currentUserId;
                  
                  return (
                    <TableRow key={admin.user_id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getInitials(admin.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {admin.full_name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              {language === 'fr' ? 'Actif' : 'Active'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => onRemoveAdmin(admin)}
                              disabled={isCurrentUser}
                              className="text-destructive"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              {language === 'fr' ? 'Retirer Admin' : 'Remove Admin'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}