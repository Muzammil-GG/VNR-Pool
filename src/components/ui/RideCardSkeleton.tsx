"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { motion } from "framer-motion";

export function RideCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <SpotlightCard
        spotlightColor="oklch(0.58 0.22 255 / 0.08)"
        className="bg-card text-card-foreground rounded-none overflow-hidden relative shadow-xl border-none ring-1 ring-border/50"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 skeleton-shimmer bg-muted" />
        
        <div className="p-5 pb-4 space-y-4">
          {/* Route & Time */}
          <div className="flex justify-between items-start">
            <div className="space-y-3 w-1/2">
              <Skeleton className="h-3 w-12 skeleton-shimmer" />
              <Skeleton className="h-6 w-3/4 skeleton-shimmer" />
              <Skeleton className="h-6 w-1/2 skeleton-shimmer" />
            </div>
            
            <div className="text-right space-y-3 w-1/3 flex flex-col items-end">
              <Skeleton className="h-3 w-16 skeleton-shimmer" />
              <Skeleton className="h-6 w-20 skeleton-shimmer" />
              <Skeleton className="h-4 w-12 skeleton-shimmer" />
            </div>
          </div>

          {/* Badges */}
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
            <Skeleton className="h-5 w-16 rounded-full skeleton-shimmer" />
          </div>
        </div>

        {/* DRIVER INFO & ACTION BAR */}
        <div className="bg-muted/10 border-t border-border/50 p-4 pb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-full skeleton-shimmer" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 skeleton-shimmer" />
              <Skeleton className="h-3 w-16 skeleton-shimmer" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-4 w-16 skeleton-shimmer" />
            <Skeleton className="h-8 w-24 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
