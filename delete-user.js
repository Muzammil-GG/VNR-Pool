import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function forceDeleteUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const emailToDelete = '25071a05a7@vnrvjiet.in'
  console.log(`Force deleting user: ${emailToDelete}...`)

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) return console.error(listError)

  const user = users.find(u => u.email === emailToDelete)
  if (!user) {
    console.log("User not found in Auth system.")
    return
  }

  console.log("0. Deleting from avatars...")
  await supabase.from('avatars').delete().eq('id', user.id)

  console.log("1. Deleting from messages...")
  await supabase.from('messages').delete().eq('sender_id', user.id)
  await supabase.from('messages').delete().eq('receiver_id', user.id)

  console.log("2. Deleting from blocked_users...")
  await supabase.from('blocked_users').delete().eq('blocker_id', user.id)
  await supabase.from('blocked_users').delete().eq('blocked_id', user.id)

  console.log("3. Deleting from notifications...")
  await supabase.from('notifications').delete().eq('user_id', user.id)
  
  console.log("4. Deleting from ratings...")
  await supabase.from('ratings').delete().eq('rater_id', user.id)
  await supabase.from('ratings').delete().eq('ratee_id', user.id)

  console.log("5. Deleting from bookings...")
  await supabase.from('bookings').delete().eq('passenger_id', user.id)

  console.log("6. Deleting from rides...")
  await supabase.from('rides').delete().eq('driver_id', user.id)

  console.log("7. Deleting from public.users profile...")
  await supabase.from('users').delete().eq('id', user.id)

  console.log("8. Deleting auth account...")
  const { error: delError } = await supabase.auth.admin.deleteUser(user.id)
  
  if (delError) {
    console.error("Failed to delete auth user:", delError)
  } else {
    console.log(`✅ Successfully nuked ${emailToDelete} from the entire database!`)
  }
}

forceDeleteUser()
