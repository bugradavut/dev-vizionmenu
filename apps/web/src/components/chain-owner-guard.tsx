"use client"

import React from 'react'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { useLanguage } from '@/contexts/language-context'
import { Shield } from 'lucide-react'

interface ChainOwnerGuardProps {
  children: React.ReactNode
}

export const ChainOwnerGuard: React.FC<ChainOwnerGuardProps> = ({ children }) => {
  const { isChainOwner, loading, chainId } = useEnhancedAuth()
  const { language } = useLanguage()

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {language === 'fr' ? 'Vérification des autorisations...' : 'Checking permissions...'}
          </p>
        </div>
      </div>
    )
  }

  // Show access denied for non-chain owners
  if (!isChainOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">
            {language === 'fr' ? 'Accès Refusé' : 'Access Denied'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === 'fr'
              ? 'Cette page est réservée aux propriétaires de chaîne. Vous devez être propriétaire de chaîne pour accéder à cette fonctionnalité.'
              : 'This page is restricted to chain owners. You must be a chain owner to access this functionality.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Si vous pensez qu\'il s\'agit d\'une erreur, veuillez contacter votre administrateur.'
              : 'If you believe this is an error, please contact your administrator.'}
          </p>
        </div>
      </div>
    )
  }

  // Show no chain error
  if (!chainId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">
            {language === 'fr' ? 'Chaîne Non Trouvée' : 'Chain Not Found'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === 'fr'
              ? 'Aucune chaîne de restaurant n\'est associée à votre compte.'
              : 'No restaurant chain is associated with your account.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Veuillez contacter le support pour configurer votre chaîne.'
              : 'Please contact support to set up your chain.'}
          </p>
        </div>
      </div>
    )
  }

  // Render children if all checks pass
  return <>{children}</>
}