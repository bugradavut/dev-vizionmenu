"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/language-context"
import { ArrowRight, TrendingUp } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface PopularItem {
  id: string
  name: string
  category?: string
  total_quantity: number
  total_revenue: number
  image_url?: string
}

interface PopularItemsCardProps {
  items: PopularItem[]
  loading?: boolean
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export function PopularItemsCard({ items, loading }: PopularItemsCardProps) {
  const { language } = useLanguage()

  if (loading) {
    return (
      <Card className="flex flex-col h-[420px]">
        <CardHeader className="pb-3 shrink-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
          <div className="flex-1 space-y-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1 min-w-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
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

  return (
    <Card className="flex flex-col h-[420px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base font-medium">
          {language === 'fr' ? 'Articles Populaires' : 'Popular Items'}
        </CardTitle>
        <CardDescription>
          {language === 'fr'
            ? '7 derniers jours'
            : 'Last 7 days'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
        {items.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto pr-1 divide-y divide-border [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-0"
                >
                  {/* Rank Badge */}
                  <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted text-foreground text-xs font-semibold shrink-0">
                    {index + 1}
                  </div>

                  {/* Item Image */}
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl">
                        🍔
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.total_quantity} {language === 'fr' ? 'vendus' : 'sold'}
                    </p>
                  </div>

                  {/* Revenue */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {formatCurrency(item.total_revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 mt-4 border-t shrink-0">
              <Link href="/menu-management">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir le menu' : 'View Menu'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? 'Aucune donnée disponible'
                  : 'No data available'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t shrink-0">
              <Link href="/menu-management">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir le menu' : 'View Menu'}
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
