import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function manageUsers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error("Failed to fetch users:", error.message)
    return
  }

  console.log("=== CURRENT USERS IN SUPABASE ===")
  if (users.length === 0) {
    console.log("No users found.")
  } else {
    users.forEach((u, i) => {
      console.log(`[${i + 1}] Email: ${u.email} | ID: ${u.id}`)
    })
  }
}

manageUsers()
