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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  MapPin,
  Ban,
  CheckCircle,
  Phone,
  Mail
} from 'lucide-react'
import { Branch } from '@/services/branches.service'
import { Chain } from '@/services/chains.service'

interface BranchListTableProps {
  branches: Branch[]
  chains: Chain[]
  loading: boolean
  onCreateBranch: () => void
  onEditBranch: (branch: Branch) => void
  onToggleActive: (branch: Branch) => void
  className?: string
}

export function BranchListTable({
  branches,
  chains,
  loading,
  onCreateBranch,
  onEditBranch,
  onToggleActive,
  className
}: BranchListTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChainId, setSelectedChainId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const { language } = useLanguage()

  // Filter branches based on search, chain selection, and status
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = searchQuery === '' || 
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof branch.address === 'string' ? branch.address : 
        typeof branch.address === 'object' && branch.address ? 
        `${branch.address.street || ''} ${branch.address.city || ''} ${branch.address.province || ''}`.trim() : 
        '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (branch.chain?.name || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesChain = selectedChainId === 'all' || branch.chain_id === selectedChainId
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && branch.is_active) ||
      (statusFilter === 'inactive' && !branch.is_active)

    return matchesSearch && matchesChain && matchesStatus
  })

  return (
    <Card className={className}>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {language === 'fr' ? 'Succursales' : 'Branches'} ({filteredBranches.length})
              </CardTitle>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full md:w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={language === 'fr' ? 'Rechercher des succursales...' : 'Search branches...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full lg:min-w-[200px]"
                />
              </div>

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
                      {language === 'fr' ? 'Filtrer par chaîne et statut' : 'Filter by chain and status'}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto">
                    <div className="grid gap-6 py-6">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">
                          {language === 'fr' ? 'Chaîne' : 'Chain'}
                        </h4>
                        <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {language === 'fr' ? 'Toutes les chaînes' : 'All Chains'}
                            </SelectItem>
                            {chains.map((chain) => (
                              <SelectItem key={chain.id} value={chain.id}>
                                {chain.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
                  
                  <div className="flex gap-2 pt-4 border-t bg-background">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setSelectedChainId('all');
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

              <Button onClick={onCreateBranch}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Nouvelle Succursale' : 'New Branch'}
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
        ) : filteredBranches.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || selectedChainId !== 'all' || statusFilter !== 'all' 
                ? (language === 'fr' ? 'Aucune succursale trouvée avec les filtres actuels' : 'No branches found with current filters')
                : (language === 'fr' ? 'Aucune succursale trouvée' : 'No branches found')
              }
            </p>
            {!searchQuery && selectedChainId === 'all' && statusFilter === 'all' && (
              <Button onClick={onCreateBranch} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Créer votre première succursale' : 'Create your first branch'}
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">
                    {language === 'fr' ? 'Nom de la Succursale' : 'Branch Name'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Chaîne' : 'Chain'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Adresse' : 'Address'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Contact' : 'Contact'}
                  </TableHead>
                  <TableHead>
                    {language === 'fr' ? 'Statut' : 'Status'}
                  </TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{branch.name}</div>
                        {branch.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {branch.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {branch.chain?.name || 'No Chain'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="truncate max-w-xs">
                          {typeof branch.address === 'string' ? branch.address : 
                            typeof branch.address === 'object' && branch.address ? 
                            `${branch.address.street || ''} ${branch.address.city || ''} ${branch.address.province || ''}`.trim() : 
                            'No Address'}
                        </div>
                        {/* Coordinates removed for now */}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {branch.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{branch.phone}</span>
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-32">{branch.email}</span>
                          </div>
                        )}
                        {!branch.phone && !branch.email && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {branch.is_active ? (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onToggleActive(branch)}>
                            {branch.is_active ? (
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
                          <DropdownMenuItem onClick={() => onEditBranch(branch)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {language === 'fr' ? 'Modifier' : 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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