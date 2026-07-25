import { Phone, Mail, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full bg-card/30 backdrop-blur-md border-t border-border mt-20 py-8 relative z-20">
      <div className="max-w-5xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-2">
          <h3 className="font-bold text-lg text-foreground bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-500">
            VNR Pool
          </h3>
          <p className="text-sm text-muted-foreground">
            Exclusive ride-sharing platform for VNR VJIET students.
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
            Customer Care Support
          </p>
          <a href="tel:+917207632275" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            <Phone className="w-4 h-4" />
            +91 7207632275
          </a>
          <a href="mailto:support@vnrpool.in" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="w-4 h-4" />
            support@vnrpool.in
          </a>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        Made with <Heart className="w-3 h-3 text-red-500 fill-current" /> for VNR VJIET
      </div>
    </footer>
  )
}
