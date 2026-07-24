const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

// 1. Add total_rating_score, rating_count to the query
content = content.replace(
  'driver:users!rides_driver_id_fkey(full_name, gender, mobile_number)',
  'driver:users!rides_driver_id_fkey(full_name, gender, mobile_number, total_rating_score, rating_count)'
);

// 2. Add Star to lucide-react imports
if (!content.includes('Star')) {
  content = content.replace(
    "import { Users, Navigation, MapPin, Search, Clock, Plus, Shield, Bike, Car, Filter, ArrowRight, ShieldCheck, CheckCircle2, MessageCircle } from 'lucide-react'",
    "import { Users, Navigation, MapPin, Search, Clock, Plus, Shield, Bike, Car, Filter, ArrowRight, ShieldCheck, CheckCircle2, MessageCircle, Star } from 'lucide-react'"
  );
}

// 3. Add renderStars helper
const renderStars = `
  // Calculate stars helper
  const renderStars = (score, count) => {
    if (!count || count === 0) return <span className="text-[10px] font-normal text-muted-foreground ml-1">New</span>
    const avg = (score / count).toFixed(1)
    return (
      <span className="flex items-center text-[10px] font-bold text-yellow-500 ml-1 bg-yellow-500/10 px-1 rounded">
        <Star className="w-2.5 h-2.5 mr-0.5 fill-current" /> {avg} <span className="text-muted-foreground font-normal ml-0.5">({count})</span>
      </span>
    )
  }
`;

if (!content.includes('const renderStars')) {
  content = content.replace(
    'const hasAnimatedFeed = useRef(false)',
    renderStars + '\n  const hasAnimatedFeed = useRef(false)'
  );
}

// 4. Show stars in the UI next to driver name
content = content.replace(
  '<p className="text-base font-extrabold text-foreground leading-tight">{ride.driver.full_name}</p>',
  '<p className="text-base font-extrabold text-foreground leading-tight flex items-center">{ride.driver.full_name} {renderStars(ride.driver.total_rating_score, ride.driver.rating_count)}</p>'
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
