"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export function RideCardSkeleton() {
  return (
    <SpotlightCard
      spotlightColor="oklch(0.58 0.22 255 / 0.10)"
      className="bg-card text-card-foreground rounded-2xl overflow-hidden relative shadow-md border border-border/50"
    >
      <div className="absolute top-0 inset-x-0 h-1.5 bg-muted/50" />
      
      <div className="p-5 pb-4 space-y-4">
        {/* Route & Time */}
        <div className="flex justify-between items-start">
          <div className="space-y-3 w-1/2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          
          <div className="text-right space-y-3 w-1/3 flex flex-col items-end">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* DRIVER INFO & ACTION BAR */}
      <div className="bg-muted/10 border-t border-border/50 p-4 pb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </SpotlightCard>
  );
}
