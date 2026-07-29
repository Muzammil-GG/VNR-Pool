"use client";

import { useState, useRef, ReactNode, TouchEvent } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxPull = 100; // max px to pull down

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!pulling || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      // Prevent default scrolling when pulling down
      if (e.cancelable) e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, maxPull));
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;
    
    setPulling(false);
    
    if (pullDistance > 60) {
      setRefreshing(true);
      setPullDistance(60); // hold at 60px while refreshing
      await onRefresh();
      setRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overflow: "hidden" }}
    >
      <div 
        className="flex items-center justify-center w-full transition-all duration-300 ease-out overflow-hidden bg-slate-900/10"
        style={{ 
          height: `${pullDistance}px`,
          opacity: pullDistance / 60 
        }}
      >
        <div className={`text-blue-500 flex flex-col items-center ${refreshing ? "animate-spin" : ""}`}>
          <Loader2 
            className="w-6 h-6" 
            style={{ 
              transform: `rotate(${pullDistance * 5}deg)`,
              opacity: refreshing ? 1 : pullDistance / maxPull
            }} 
          />
        </div>
      </div>
      <div 
        className="transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${refreshing ? 0 : 0}px)` }} // content doesn't push down, it just reveals the loader
      >
        {children}
      </div>
    </div>
  );
}
