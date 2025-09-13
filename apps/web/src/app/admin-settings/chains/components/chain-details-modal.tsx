'use client'

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useLanguage } from "@/contexts/language-context"
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Users, 
  Activity,
  User,
  Mail,
  Crown
} from "lucide-react"
import { chainsService, Chain, Branch, ChainWithBranches } from "@/services/chains.service"

interface ChainDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chain: Chain | null
}


export function ChainDetailsModal({ open, onOpenChange, chain }: ChainDetailsModalProps) {
  const { language } = useLanguage()
  
  const [branches, setBranches] = useState<Branch[]>([])
  const [chainDetails, setChainDetails] = useState<ChainWithBranches | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch chain details and branches when modal opens
  useEffect(() => {
    if (chain && open) {
      fetchChainBranches(chain.id)
    }
  }, [chain, open])

  const fetchChainBranches = async (chainId: string) => {
    try {
      setLoading(true)
      const data = await chainsService.getChainById(chainId)
      setBranches(data.branches || [])
      setChainDetails(data)
    } catch (error) {
      console.error('Error fetching chain details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!chain) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {chain.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chain Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'fr' ? 'Informations de la Chaîne' : 'Chain Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Nom' : 'Name'}
                  </label>
                  <p className="font-medium">{chain.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Identifiant URL' : 'URL Slug'}
                  </label>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                    {chain.slug}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Statut' : 'Status'}
                  </label>
                  <div>
                    <Badge variant={chain.is_active ? "default" : "secondary"}>
                      {chain.is_active 
                        ? (language === 'fr' ? 'Actif' : 'Active')
                        : (language === 'fr' ? 'Inactif' : 'Inactive')
                      }
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Date de création' : 'Created Date'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{new Date(chain.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {chain.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Description' : 'Description'}
                  </label>
                  <p className="text-sm mt-1">{chain.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {language === 'fr' ? 'Propriétaire de la Chaîne' : 'Chain Owner'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chainDetails?.owner ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {chainDetails.owner.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{chainDetails.owner.full_name}</h4>
                      <Badge variant={chainDetails.owner.status === 'active' ? "default" : "secondary"}>
                        {chainDetails.owner.status === 'active' 
                          ? (language === 'fr' ? 'Actif' : 'Active')
                          : (language === 'fr' ? 'En attente' : 'Pending')
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Mail className="h-4 w-4" />
                      <span>{chainDetails.owner.email}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Propriétaire non assigné' : 'No owner assigned'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'fr' ? 'Succursales' : 'Branches'}
                    </p>
                    <p className="text-2xl font-bold">{chain.branch_count}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'fr' ? 'Succursales Actives' : 'Active Branches'}
                    </p>
                    <p className="text-2xl font-bold">
                      {branches.filter(b => b.is_active).length}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'fr' ? 'Total Utilisateurs' : 'Total Users'}
                    </p>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Bientôt disponible' : 'Coming soon'}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branches List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {language === 'fr' ? 'Succursales' : 'Branches'}
              </CardTitle>
              {branches.length > 0 && (
                <Badge variant="outline">
                  {branches.length} {language === 'fr' ? 'succursales' : 'branches'}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : branches.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {language === 'fr' ? 'Aucune succursale trouvée' : 'No branches found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {branches.map((branch, index) => (
                    <div key={branch.id}>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{branch.name}</h4>
                            <Badge 
                              variant={branch.is_active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {branch.is_active 
                                ? (language === 'fr' ? 'Actif' : 'Active')
                                : (language === 'fr' ? 'Inactif' : 'Inactive')
                              }
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {branch.address}
                            </div>
                            {branch.phone && (
                              <div className="mt-1">
                                📞 {branch.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {language === 'fr' ? 'Créé le' : 'Created'}
                          </div>
                          <div className="text-sm">
                            {new Date(branch.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {index < branches.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}