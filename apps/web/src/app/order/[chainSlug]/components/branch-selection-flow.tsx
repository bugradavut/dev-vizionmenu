"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Clock } from 'lucide-react'
import type { Chain, Branch } from '@/services/customer-chains.service'

interface BranchSelectionFlowProps {
  chain: Chain
  branches: Branch[]
  onBranchSelect: (branch: Branch) => void
}

export function BranchSelectionFlow({ 
  chain, 
  branches, 
  onBranchSelect 
}: BranchSelectionFlowProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4">
            {chain.logo_url && (
              <img 
                src={chain.logo_url} 
                alt={chain.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{chain.name}</h1>
              {chain.description && (
                <p className="text-muted-foreground mt-1">{chain.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Branch Selection */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Choose Your Location</h2>
          <p className="text-muted-foreground">
            Select a restaurant location to view the menu and place your order
          </p>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No active locations found for this restaurant chain.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {branch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Address */}
                    {branch.address && (
                      <div className="text-sm text-muted-foreground">
                        <p>{branch.address.street}</p>
                        <p>{branch.address.city}, {branch.address.province} {branch.address.postal_code}</p>
                      </div>
                    )}

                    {/* Phone */}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>{branch.phone}</span>
                      </div>
                    )}

                    {/* Hours placeholder */}
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Clock className="h-4 w-4" />
                      <span>Open now</span>
                    </div>

                    {/* Select Button */}
                    <Button 
                      onClick={() => onBranchSelect(branch)}
                      className="w-full mt-4"
                    >
                      Order from this location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}