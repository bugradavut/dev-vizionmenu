'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
import { 
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Ban,
  CheckCircle
} from 'lucide-react'
import { Chain, chainsService } from '@/services/chains.service'

interface ChainListTableProps {
  chains: Chain[]
  loading: boolean
  onCreateChain: () => void
  onEditChain: (chain: Chain) => void
  onToggleActive: (chain: Chain) => void
  onRefresh: () => void
  className?: string
}

export function ChainListTable({
  chains,
  loading,
  onCreateChain,
  onEditChain,
  onToggleActive,
  onRefresh,
  className
}: ChainListTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  
  const { language } = useLanguage()

  // Filter chains based on search and status
  const filteredChains = Array.isArray(chains) ? chains.filter(chain => {
    const matchesSearch = chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (chain.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         chain.slug.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && chain.is_active) ||
                         (statusFilter === 'inactive' && !chain.is_active)
    
    return matchesSearch && matchesStatus
  }) : []

  const handleDeleteChain = async (chainId: string, chainName: string) => {
    const confirmMessage = language === 'fr' 
      ? `Êtes-vous sûr de vouloir supprimer la chaîne "${chainName}" ? Cette action est irréversible.`
      : `Are you sure you want to delete chain "${chainName}"? This action cannot be undone.`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await chainsService.deleteChain(chainId)
      onRefresh() // Refresh the list
    } catch (error) {
      const errorMessage = language === 'fr' 
        ? 'Erreur lors de la suppression de la chaîne'
        : 'Error deleting chain'
      alert(errorMessage)
      console.error('Error deleting chain:', error)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        {/* Header with Title and Actions */}
        <div className="space-y-4">
          {/* Header with Title and Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {language === 'fr' ? 'Chaînes de Restaurants' : 'Restaurant Chains'} ({filteredChains.length})
              </CardTitle>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="relative w-full md:w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={language === 'fr' ? 'Rechercher des chaînes...' : 'Search chains...'}
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
                    <SheetTitle>{language === 'fr' ? 'Filtres' : 'Filters'}</SheetTitle>
                    <SheetDescription>
                      {language === 'fr' ? 'Filtrer par statut' : 'Filter by status'}
                    </SheetDescription>
                  </SheetHeader>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid gap-6 py-6">
                      {/* Status Filter */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">{language === 'fr' ? 'Statut' : 'Status'}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                            className={`justify-start ${
                              statusFilter === 'all'
                                ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                                : ''
                            }`}
                          >
                            {language === 'fr' ? 'Tous les statuts' : 'All Status'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusFilter('active')}
                            className={`justify-start ${
                              statusFilter === 'active'
                                ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                                : ''
                            }`}
                          >
                            {language === 'fr' ? 'Actif' : 'Active'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusFilter('inactive')}
                            className={`justify-start ${
                              statusFilter === 'inactive'
                                ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                                : ''
                            }`}
                          >
                            {language === 'fr' ? 'Inactif' : 'Inactive'}
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
                        setStatusFilter('all');
                        setIsFilterSheetOpen(false);
                      }}
                      className="flex-1"
                    >
                      {language === 'fr' ? 'Effacer les filtres' : 'Clear Filters'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsFilterSheetOpen(false)}
                      className="flex-1"
                    >
                      {language === 'fr' ? 'Appliquer les filtres' : 'Apply Filters'}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Create Chain Button */}
              <Button onClick={onCreateChain}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Nouvelle Chaîne' : 'New Chain'}
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
        ) : filteredChains.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? (language === 'fr' ? 'Aucune chaîne trouvée avec les filtres actuels' : 'No chains found with current filters')
                : (language === 'fr' ? 'Aucune chaîne trouvée' : 'No chains found')
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={onCreateChain} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Créer votre première chaîne' : 'Create your first chain'}
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">
                    {language === 'fr' ? 'Nom de la Chaîne' : 'Chain Name'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Identifiant' : 'Slug'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Statut' : 'Status'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Succursales' : 'Branches'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Créé le' : 'Created'}
                  </TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChains.map((chain) => (
                  <TableRow key={chain.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{chain.name}</div>
                        {chain.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {chain.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                        {chain.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {chain.is_active ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              {language === 'fr' ? 'Actif' : 'Active'}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-900/20 dark:border-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {language === 'fr' ? 'Inactif' : 'Inactive'}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {chain.branch_count} {chain.branch_count === 1 
                            ? (language === 'fr' ? 'succursale' : 'branch')
                            : (language === 'fr' ? 'succursales' : 'branches')
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(chain.created_at).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-US')}
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
                          <DropdownMenuItem onClick={() => onToggleActive(chain)}>
                            {chain.is_active ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                {language === 'fr' ? 'Désactiver' : 'Deactivate'}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {language === 'fr' ? 'Activer' : 'Activate'}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditChain(chain)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'fr' ? 'Modifier' : 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteChain(chain.id, chain.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {language === 'fr' ? 'Supprimer' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}