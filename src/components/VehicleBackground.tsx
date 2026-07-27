"use client"

export function VehicleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-background flex items-center justify-center">
      {/* Premium Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(79, 70, 229, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(79, 70, 229, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 20%, transparent 100%)',
        }}
      />
      
      {/* Ambient Glowing Orbs */}
      <div 
        className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/15 blur-[120px] mix-blend-normal dark:mix-blend-screen animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-normal dark:mix-blend-screen animate-pulse" 
        style={{ animationDuration: '10s', animationDelay: '2s' }} 
      />
      <div 
        className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] mix-blend-normal dark:mix-blend-screen animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '1s' }} 
      />
    </div>
  )
}
