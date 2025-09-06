"use client"

interface CampaignLoadingSkeletonProps {
  count?: number
}

export function CampaignLoadingSkeleton({ count = 6 }: CampaignLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-16 bg-muted border border-border/50 rounded animate-pulse"></div>
        <div className="h-10 w-20 bg-muted border border-border/50 rounded animate-pulse"></div>
        <div className="h-10 w-18 bg-muted border border-border/50 rounded animate-pulse"></div>
        <div className="h-10 w-14 bg-muted border border-border/50 rounded animate-pulse"></div>
      </div>
      
      {/* Campaign cards grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="h-[200px] w-full bg-muted border border-border/50 rounded-xl animate-pulse"></div>
        ))}
      </div>
    </div>
  )
}