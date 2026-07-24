require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      rides (
        id,
        origin,
        destination,
        departure_time,
        status
      )
    `)
    .eq('status', 'approved')
    .neq('rides.status', 'completed')
    .neq('rides.status', 'cancelled')
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
