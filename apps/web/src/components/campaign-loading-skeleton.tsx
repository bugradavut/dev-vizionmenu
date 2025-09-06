"use client"

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface CampaignLoadingSkeletonProps {
  count?: number
}

export function CampaignLoadingSkeleton({ count = 6 }: CampaignLoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Filter tabs skeleton */}
      <div className="flex gap-2 border-b border-border">
        <Skeleton className="h-10 w-16 rounded-t-md" />
        <Skeleton className="h-10 w-20 rounded-t-md" />
        <Skeleton className="h-10 w-18 rounded-t-md" />
        <Skeleton className="h-10 w-14 rounded-t-md" />
      </div>
      
      {/* Campaign cards grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-8 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}