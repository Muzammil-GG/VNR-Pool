import { Phone, Mail, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full bg-card/30 backdrop-blur-md border-t border-border/50 mt-12 md:mt-20 py-10 relative z-20">
      <div className="max-w-5xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-10 md:gap-4">
        
        {/* Brand Section */}
        <div className="text-center md:text-left space-y-3 flex flex-col items-center md:items-start">
          <h3 className="font-black text-2xl text-foreground bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
            VNR Pool
          </h3>
          <p className="text-sm text-muted-foreground/80 max-w-xs">
            Exclusive ride-sharing platform for VNR VJIET students.
          </p>
        </div>
        
        {/* Mobile Divider */}
        <div className="w-16 h-[1px] bg-border/60 md:hidden rounded-full" />
        
        {/* Contact Section */}
        <div className="flex flex-col items-center md:items-end space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Support
          </p>
          <a href="tel:+917207632275" className="flex items-center gap-2.5 text-sm font-medium text-foreground hover:text-blue-500 transition-colors bg-secondary/50 px-4 py-2 rounded-full w-full justify-center md:justify-end border border-border/40 shadow-sm">
            <Phone className="w-4 h-4 text-blue-500" />
            +91 7207632275
          </a>
          <a href="mailto:support@vnrpool.in" className="flex items-center gap-2.5 text-sm font-medium text-foreground hover:text-blue-500 transition-colors bg-secondary/50 px-4 py-2 rounded-full w-full justify-center md:justify-end border border-border/40 shadow-sm">
            <Mail className="w-4 h-4 text-blue-500" />
            support@vnrpool.in
          </a>
        </div>
      </div>
      
      {/* Footer Bottom */}
      <div className="mt-12 pt-6 border-t border-border/30 text-center text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
        Made with <Heart className="w-3 h-3 text-red-500 fill-current" /> for VNR VJIET
      </div>
    </footer>
  )
}
