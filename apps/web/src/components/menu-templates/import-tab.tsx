"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { branchesService, type Branch } from '@/services/branches.service'
import toast from 'react-hot-toast'

export function ImportTab() {
  const { language } = useLanguage()
  const { chainId, user } = useEnhancedAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load branches
  const loadBranches = async () => {
    if (!chainId || !user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const result = await branchesService.getBranches({ chain_id: chainId })
      setBranches(result.branches || [])
    } catch (error) {
      console.error('Failed to load branches:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors du chargement des succursales'
          : 'Failed to load branches'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle import from branch
  const handleImportFromBranch = async (branchId: string) => {
    try {
      const selectedBranch = branches.find(b => b.id === branchId)
      if (!selectedBranch) {
        toast.error(
          language === 'fr'
            ? 'Succursale introuvable'
            : 'Branch not found'
        )
        return
      }

      if (selectedBranch.categories_count === 0) {
        toast.error(
          language === 'fr'
            ? 'Aucune catégorie disponible dans cette succursale'
            : 'No categories available in this branch'
        )
        return
      }

      toast.success(
        language === 'fr'
          ? `Fonctionnalité d'importation disponible prochainement pour ${selectedBranch.name}`
          : `Import functionality coming soon for ${selectedBranch.name}`
      )
    } catch (error) {
      console.error('Failed to import from branch:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors de l\'importation'
          : 'Import failed'
      )
    }
  }

  useEffect(() => {
    if (chainId && user && typeof window !== 'undefined') {
      loadBranches()
    } else {
      setBranches([])
      setIsLoading(false)
    }
  }, [chainId, user])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {language === 'fr' ? 'Importer de Succursales' : 'Import from Branches'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'fr'
            ? 'Créez des modèles à partir des menus existants de vos succursales'
            : 'Create templates from existing menus of your branches'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">
            {language === 'fr' ? 'Chargement des succursales...' : 'Loading branches...'}
          </span>
        </div>
      ) : (
        <>
          {branches.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => (
                <Card key={branch.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{branch.name}</CardTitle>
                    <CardDescription>
                      {language === 'fr'
                        ? `${branch.categories_count} catégories, ${branch.items_count} articles`
                        : `${branch.categories_count} categories, ${branch.items_count} items`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {branch.categories_count} {language === 'fr' ? 'cat.' : 'cat.'}
                        </Badge>
                        <Badge variant="outline">
                          {branch.items_count} {language === 'fr' ? 'art.' : 'items'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleImportFromBranch(branch.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {language === 'fr' ? 'Importer' : 'Import'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'fr'
                  ? 'Aucune succursale disponible pour l\'importation'
                  : 'No branches available for import'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}