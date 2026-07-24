const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

// 1. Add LogOut to lucide-react imports
if (!code.includes('LogOut')) {
  code = code.replace(
    "import { MapPin, Users, Clock, Shield, MessageCircle, ShieldAlert, Car, Bike, Navigation, Phone, Zap, Star } from 'lucide-react'",
    "import { MapPin, Users, Clock, Shield, MessageCircle, ShieldAlert, Car, Bike, Navigation, Phone, Zap, Star, LogOut } from 'lucide-react'"
  );
}

// 2. Add useRouter import
if (!code.includes('useRouter')) {
  code = code.replace(
    "import { motion } from 'framer-motion'",
    "import { motion } from 'framer-motion'\nimport { useRouter } from 'next/navigation'"
  );
}

// 3. Add router hook and handleLogout inside Dashboard component
if (!code.includes('const handleLogout')) {
  code = code.replace(
    'const supabase = createClient()',
    "const supabase = createClient()\n  const router = useRouter()\n\n  const handleLogout = async () => {\n    await supabase.auth.signOut()\n    router.push('/')\n    router.refresh()\n  }"
  );
}

// 4. Add the actual button to the header
code = code.replace(
  '<ProfileEditor currentUserId={currentUserId} />',
  `<ProfileEditor currentUserId={currentUserId} />
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 h-9 px-3 shrink-0">
            <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Sign Out</span>
          </Button>`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
