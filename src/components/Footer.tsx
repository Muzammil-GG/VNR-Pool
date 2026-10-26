import { Phone, Mail, Heart } from 'lucide-react'
import { Righteous } from 'next/font/google'

const righteous = Righteous({ weight: '400', subsets: ['latin'] })

export function Footer() {
  return (
    <footer className="global-layout-footer w-full bg-card/60 backdrop-blur-2xl border-t border-border/60 mt-16 md:mt-24 py-12 relative z-20">
      <div className="max-w-5xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
        
        {/* Brand Section */}
        <div className="text-center md:text-left space-y-2 flex flex-col items-center md:items-start">
          <h3 className={`font-black text-3xl gradient-text-shine ${righteous.className}`}>
            VNR Pool
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs font-medium">
            Exclusive hyperlocal ride-sharing and carpooling platform for VNR VJIET campus students.
          </p>
        </div>
        
        {/* Mobile Divider */}
        <div className="w-20 h-[1.5px] bg-border/80 md:hidden rounded-full" />
        
        {/* Contact Section */}
        <div className="flex flex-col items-center md:items-end space-y-3 w-full md:w-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
            Campus Support & Contacts
          </p>
          <a href="tel:+917207632275" className="flex items-center gap-3 text-sm font-semibold text-foreground hover:text-blue-500 transition-all bg-secondary/70 hover:bg-secondary px-5 py-2.5 rounded-2xl w-full md:w-auto justify-center md:justify-end border border-border/60 shadow-sm">
            <Phone className="w-4 h-4 text-blue-500 shrink-0" />
            +91 7207632275
          </a>
          <a href="mailto:support.vnrpool@gmail.com" className="flex items-center gap-3 text-sm font-semibold text-foreground hover:text-blue-500 transition-all bg-secondary/70 hover:bg-secondary px-5 py-2.5 rounded-2xl w-full md:w-auto justify-center md:justify-end border border-border/60 shadow-sm">
            <Mail className="w-4 h-4 text-blue-500 shrink-0" />
            support.vnrpool@gmail.com
          </a>
        </div>
      </div>
      
      {/* Footer Bottom */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 mt-10 pt-6 border-t border-border/40 text-center text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2">
        Crafted with <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" /> for VNR VJIET Community
      </div>
    </footer>
  )
}
