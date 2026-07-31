/**
 * VNR Pool Smart Chatbot Engine
 * 
 * A production-grade, zero-API-key chatbot with:
 * - Weighted keyword/phrase intent matching
 * - Conversation context tracking (references previous messages)
 * - Follow-up detection ("how?", "tell me more", etc.)
 * - Typo-tolerant fuzzy matching
 * - Rich, emoji-laden responses
 */

// ─── Types ────────────────────────────────────────────────────────────
export type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Intent = {
  id: string
  keywords: string[]           // exact word matches (lowercased)
  phrases: string[]            // multi-word phrase matches
  response: string | string[]  // string or array (picks random)
  followUp?: string            // suggested follow-up question
  priority?: number            // higher = preferred when tied
}

// ─── Utility: fuzzy word match (handles 1-char typos) ─────────────────
function fuzzyMatch(input: string, target: string): boolean {
  if (input === target) return true
  if (Math.abs(input.length - target.length) > 1) return false
  
  // Allow 1 character difference (simple Levenshtein ≤ 1)
  let diffs = 0
  const longer = input.length >= target.length ? input : target
  const shorter = input.length < target.length ? input : target
  
  let j = 0
  for (let i = 0; i < longer.length; i++) {
    if (shorter[j] !== longer[i]) {
      diffs++
      if (diffs > 1) return false
      if (longer.length === shorter.length) j++
    } else {
      j++
    }
  }
  return true
}

// ─── Knowledge Base ───────────────────────────────────────────────────
const INTENTS: Intent[] = [
  // ── Greetings ─────────────────────────────
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'hii', 'hiii', 'sup', 'yo', 'helo', 'hola', 'namaste', 'howdy'],
    phrases: ['good morning', 'good afternoon', 'good evening', 'good night', 'what\'s up', 'whats up'],
    response: [
      "Hey there! 👋 Welcome to VNR Pool! I'm your ride-sharing assistant. How can I help you today?\n\nHere's what I can help with:\n🚗 Finding or posting a ride\n💰 Splitting fares\n🛡️ Safety & trust features\n🌱 Eco Points & leaderboard\n📱 Navigating the app\n\nJust ask away!",
      "Hi! 😊 I'm the VNR Pool Assistant! Whether you need a ride to college or want to share your car — I've got you covered.\n\nTry asking me things like:\n• \"How do I book a ride?\"\n• \"How does fare splitting work?\"\n• \"What are Eco Points?\"",
      "Hello! 🎉 Welcome aboard VNR Pool! I'm here to make your commute easier. What would you like to know?"
    ],
    priority: 1,
  },

  // ── Farewell ──────────────────────────────
  {
    id: 'farewell',
    keywords: ['bye', 'goodbye', 'thanks', 'thank', 'thankyou', 'cya', 'later', 'tata', 'byee'],
    phrases: ['thank you', 'thanks a lot', 'see you', 'see ya', 'that\'s all', 'thats all', 'bye bye', 'ok thanks', 'okay thanks', 'got it thanks'],
    response: [
      "You're welcome! 🙌 Happy riding with VNR Pool! Feel free to come back anytime you need help. Have a great day! 🚗💨",
      "Glad I could help! 😊 Catch you later on VNR Pool. Safe travels! 🛣️",
      "Anytime! 🤝 If you ever need help again, I'm just a click away. Happy commuting! 🌟"
    ],
    priority: 1,
  },

  // ── How to Book / Find a Ride ─────────────
  {
    id: 'find_ride',
    keywords: ['book', 'find', 'search', 'looking', 'need', 'want', 'get', 'join', 'request'],
    phrases: ['find a ride', 'book a ride', 'get a ride', 'need a ride', 'want a ride', 'search ride', 'looking for ride', 'how to book', 'how to find', 'join a ride', 'request a ride', 'find ride', 'book ride', 'i need ride', 'ride to college', 'ride from', 'ride to'],
    response: "🔍 **Finding a Ride is super easy!** Here's how:\n\n1️⃣ Go to the **Dashboard** (you're probably already there!)\n2️⃣ Click the **\"Find a Ride\"** tab at the top\n3️⃣ Enter your **Origin** and **Destination** in the search bar\n4️⃣ Browse available rides — you'll see driver name, vehicle type, time, and seats\n5️⃣ Click **\"Book Ride\"** on the one that works for you\n6️⃣ Wait for the driver to **approve** your request ✅\n\n💡 **Pro tip:** Check the **Route Maps** button to see all rides on an interactive map!\n\nOnce approved, you can chat with your driver directly in the app! 💬",
    followUp: "Want to know how to post your own ride instead?",
    priority: 5,
  },

  // ── How to Post / Offer a Ride ────────────
  {
    id: 'post_ride',
    keywords: ['post', 'offer', 'publish', 'create', 'share', 'drive', 'driver', 'giving'],
    phrases: ['post a ride', 'offer a ride', 'share my ride', 'i am driving', 'i\'m driving', 'post ride', 'create ride', 'offer ride', 'give a ride', 'share ride', 'i have a car', 'i have car', 'i have bike', 'empty seats', 'extra seats', 'how to post'],
    response: "🚗 **Posting a Ride as a Driver:**\n\n1️⃣ Go to the **Dashboard** and click the **\"Offer a Ride\"** tab\n2️⃣ Choose your **ride category:**\n   • 🟡 **Auto Split** — Share an auto/cab fare with others on the same route\n   • 🔵 **Personal Vehicle** — Offer seats in your own car or bike\n3️⃣ Fill in the details:\n   • 📍 Origin & Destination\n   • 🕐 Departure Time\n   • 🚘 Vehicle Type (Car/Bike/Auto)\n   • 💺 Available Seats\n   • 💰 Price per seat\n4️⃣ Hit **\"Post Ride\"** and you're live! 🎉\n\nPassengers will send you booking requests that you can approve or decline from your **My Rides** section.",
    followUp: "Need help with setting the right price?",
    priority: 5,
  },

  // ── Cancel a Ride ─────────────────────────
  {
    id: 'cancel',
    keywords: ['cancel', 'remove', 'delete', 'undo', 'withdraw', 'unbook'],
    phrases: ['cancel ride', 'cancel booking', 'how to cancel', 'cancel my ride', 'remove booking', 'delete ride', 'i want to cancel', 'cancel a ride', 'unbook ride'],
    response: "❌ **To Cancel a Booking:**\n\n1️⃣ Go to the **\"My Rides\"** section (accessible from the Dashboard)\n2️⃣ Find the ride you want to cancel\n3️⃣ Click the **\"Cancel\"** button next to it\n4️⃣ Confirm the cancellation ✅\n\n⚠️ **Note:** Please try to cancel well in advance so the driver can adjust their plans. Frequent last-minute cancellations may affect your **Trust Score**.\n\nIf you're a driver and need to cancel, the process is the same — but please message your passengers first to let them know! 💬",
    priority: 5,
  },

  // ── Fare Splitting (Main) ──────────────────
  {
    id: 'fare_split',
    keywords: ['fare', 'split', 'cost', 'price', 'pay', 'payment', 'money', 'charge', 'fee', 'upi', 'gpay', 'phonepe', 'paytm'],
    phrases: ['split fare', 'fare split', 'how much', 'how to pay', 'split cost', 'fare splitting', 'payment method', 'how to split', 'split the fare', 'pay the driver', 'fare calculator', 'price per seat', 'how much does it cost', 'cost of ride'],
    response: "💰 **Fare Splitting in VNR Pool:**\n\nVNR Pool has TWO smart pricing systems depending on the ride category:\n\n🔵 **1. Personal Vehicle — Fractional Pricing:**\n• Driver sets a **total price per seat** for the full route\n• If you board **midway** or exit early, you pay only for YOUR portion\n• The app auto-calculates based on your pickup/drop waypoints on the route\n• Formula: `(your stops ÷ driver's total stops) × seat price`\n\n🟡 **2. Auto Split — Dynamic Split Pricing:**\n• Total auto fare is divided among ALL passengers proportionally\n• Each person pays based on **how far they travel** relative to others\n• More passengers = cheaper for everyone! The split adjusts dynamically\n• Formula: `(your distance ÷ total combined distance) × total trip cost`\n\n💸 **How to actually pay:**\n• Pay via **UPI** after the ride — GPay, PhonePe, or Paytm\n• The fare is shown on each ride card BEFORE you book — no surprises! 🤝\n• Minimum fare is always ₹10\n\n💡 **Tip:** Ask me about \"dynamic splitting\" or \"joining mid-route\" for detailed examples!",
    followUp: "Want to see a real example of how mid-route pricing works?",
    priority: 5,
  },

  // ── Dynamic Split Pricing (Auto) ──────────
  {
    id: 'dynamic_split',
    keywords: ['dynamic', 'proportional', 'auto', 'divide', 'divided', 'equally', 'equal', 'distribution', 'shared'],
    phrases: ['dynamic split', 'dynamic pricing', 'dynamic splitting', 'auto split pricing', 'how auto split works', 'auto fare split', 'proportional split', 'proportional pricing', 'divide fare', 'fare divided', 'shared auto', 'share auto fare', 'auto split fare', 'how is auto fare calculated', 'auto fare calculation'],
    response: "🛺 **Dynamic Split Pricing (Auto Split Mode):**\n\nThis is VNR Pool's smartest feature! When multiple passengers share an auto, the fare isn't just split equally — it's split **proportionally based on distance traveled.**\n\n📐 **How the algorithm works:**\n1️⃣ The route has multiple **waypoints** (stops along the way)\n2️⃣ Each passenger's **travel distance** = number of segments they ride\n3️⃣ All distances are summed up to get the **total combined distance**\n4️⃣ Your share = `(your distance ÷ total combined distance) × total trip cost`\n\n📊 **Real Example:**\nRoute: Kompally → Jeedimetla → JNTU → KPHB → VNR\nTotal auto fare: ₹200\n\n👤 Ravi: Kompally → VNR (4 segments)\n👤 Priya: Jeedimetla → KPHB (2 segments)\n👤 Amit: JNTU → VNR (2 segments)\n\nTotal combined distance = 4 + 2 + 2 = **8 segments**\n\n💰 **Ravi pays:** (4/8) × ₹200 = **₹100** (travels farthest, pays most)\n💰 **Priya pays:** (2/8) × ₹200 = **₹50**\n💰 **Amit pays:** (2/8) × ₹200 = **₹50**\n\n✅ Total: ₹100 + ₹50 + ₹50 = **₹200** ← exact match!\n\n🎯 **Why this is fair:**\n• Longer distance = higher share (but still cheaper than solo!)\n• Shorter distance = lower share\n• Everyone saves compared to riding alone! 🙌",
    followUp: "Want to know how it works when you join mid-route?",
    priority: 7,
  },

  // ── Joining Mid-Route ─────────────────────
  {
    id: 'mid_route_join',
    keywords: ['middle', 'midway', 'halfway', 'partial', 'between', 'midroute', 'portion', 'segment', 'part', 'fraction', 'fractional'],
    phrases: ['join mid route', 'join in middle', 'join midway', 'board midway', 'pickup midway', 'join in between', 'partial route', 'half the route', 'part of route', 'not full route', 'only part', 'travel part', 'mid route joining', 'fractional price', 'fractional pricing', 'only going half', 'shorter distance', 'partial distance', 'get off early', 'exit early', 'board late', 'pickup in between', 'drop midway', 'drop in between'],
    response: "🚏 **Joining Mid-Route — Pay Only For Your Portion!**\n\nYou don't have to travel the FULL route to book a ride. VNR Pool's **fractional pricing** ensures you only pay for the portion you actually travel.\n\n🔧 **How it works (Personal Vehicle):**\n1️⃣ The driver posts a route, e.g., **Kompally → VNR** with ₹80/seat\n2️⃣ You only need **JNTU → VNR** (which is 2 out of 4 total stops)\n3️⃣ Your fare = (2 ÷ 4) × ₹80 = **₹40** ← half the route, half the price! 🎉\n\n📍 **Step-by-step to book a partial ride:**\n1️⃣ Search for rides on the Dashboard\n2️⃣ Find a ride whose route PASSES THROUGH your origin and destination\n3️⃣ When you book, enter YOUR actual pickup and drop locations\n4️⃣ The app automatically calculates your fractional fare!\n\n📊 **More examples:**\n• Full route has **5 stops**, you travel **3 stops** → pay **60%** of seat price\n• Full route has **6 stops**, you travel **1 stop** → pay ~**17%** (minimum ₹10)\n• Full route has **4 stops**, you travel **4 stops** → pay **100%** (full price)\n\n⚡ **Key points:**\n• Minimum fare is always **₹10** — even for tiny segments\n• The fare is calculated BEFORE you confirm — you see it on the ride card\n• Works for both **Car** and **Bike** rides\n• For **Auto Split**, mid-route joining uses dynamic proportional splitting instead\n\n💡 **Pro tip:** Use the **Route Maps** feature to visually see which rides pass through your area!",
    followUp: "Want to see how Auto Split dynamic pricing works differently?",
    priority: 7,
  },

  // ── Fare Examples / Calculator ────────────
  {
    id: 'fare_examples',
    keywords: ['example', 'examples', 'calculate', 'calculation', 'calculator', 'scenario', 'math', 'formula', 'much', 'rupees'],
    phrases: ['fare example', 'pricing example', 'show me example', 'give me example', 'how is it calculated', 'fare calculation', 'calculate fare', 'how much will i pay', 'what will i pay', 'show calculation', 'fare formula', 'pricing formula', 'how much for', 'calculate my fare'],
    response: "🧮 **Fare Calculation Examples:**\n\nHere are real-world scenarios showing how VNR Pool pricing works:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔵 **Scenario 1: Personal Vehicle (Fractional)**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDriver: Kompally → Jeedimetla → JNTU → KPHB → VNR\nSeat Price: ₹100\n\n👤 You board at **JNTU**, exit at **VNR** (2 out of 4 stops)\n💰 Your fare: (2/4) × ₹100 = **₹50**\n\n👤 You board at **Kompally**, exit at **KPHB** (3 out of 4 stops)\n💰 Your fare: (3/4) × ₹100 = **₹75**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🟡 **Scenario 2: Auto Split (Dynamic)**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSame route, Total auto fare: ₹150\n3 passengers with different trips:\n\n👤 A: Kompally → VNR (4 segments) → pays **(4/7) × ₹150 = ₹86**\n👤 B: Jeedimetla → JNTU (1 segment) → pays **(1/7) × ₹150 = ₹21**\n👤 C: JNTU → VNR (2 segments) → pays **(2/7) × ₹150 = ₹43**\n\n✅ Total: ₹86 + ₹21 + ₹43 = **₹150** ← perfect match!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚡ **Key Takeaways:**\n• You NEVER pay more than the full seat price\n• Minimum fare is always ₹10\n• Shorter distance = proportionally cheaper\n• The app does ALL the math for you — just book! 🎉",
    followUp: "Any other questions about pricing?",
    priority: 6,
  },

  // ── Driver No-Show ────────────────────────
  {
    id: 'driver_noshow',
    keywords: ['noshow', 'didnt', 'didn\'t', 'absent', 'missing', 'ghosted', 'stood'],
    phrases: ['driver didn\'t show', 'driver didnt show', 'driver not coming', 'driver didn\'t come', 'driver didnt come', 'stood me up', 'no show', 'driver absent', 'where is my driver', 'driver missing', 'driver is late', 'driver late', 'waiting for driver'],
    response: "😟 **If your driver didn't show up:**\n\n1️⃣ **Message them** directly using the in-app chat 💬\n2️⃣ **Call them** — their phone number is visible on the ride details 📞\n3️⃣ If they're unresponsive for 10+ minutes:\n   • **Cancel the booking** from My Rides\n   • **Search for another ride** on the Dashboard\n4️⃣ You can optionally **report the driver** — this affects their Trust Score\n\n⚡ **Quick tip:** Drivers with higher ⭐ Trust Scores are more reliable. Look for 4+ star drivers when booking!\n\nSorry about the inconvenience — we're working hard to make every ride reliable! 💪",
    priority: 6,
  },

  // ── Safety & Trust ────────────────────────
  {
    id: 'safety',
    keywords: ['safe', 'safety', 'trust', 'secure', 'security', 'verify', 'verified', 'rating', 'rate', 'report', 'score', 'trustscore'],
    phrases: ['is it safe', 'how safe', 'trust score', 'trust points', 'how to rate', 'report user', 'safety features', 'verified users', 'is this safe', 'can i trust', 'rate a driver', 'rate driver', 'report driver', 'report a driver'],
    response: "🛡️ **VNR Pool's Safety & Trust System:**\n\n✅ **Verified Users Only:**\n• Every user must have a valid **@vnrvjiet.in** email — no outsiders!\n• Phone numbers are verified via OTP\n• Optional DigiLocker verification for extra trust\n\n⭐ **Trust Score System:**\n• After each ride, both driver and passenger **rate each other** (1-5 stars)\n• High trust scores = more bookings!\n• Frequent cancellations or no-shows lower your score\n\n🚨 **Reporting:**\n• You can report problematic users from their profile\n• Reports are reviewed by admins\n• Serious violations can lead to account suspension\n\n💡 **Pro tip:** Look for drivers with ⭐ 4+ trust scores for the most reliable rides!",
    followUp: "Want to know about Eco Points too?",
    priority: 4,
  },

  // ── Eco Points ────────────────────────────
  {
    id: 'eco_points',
    keywords: ['eco', 'green', 'carbon', 'environment', 'points', 'leaderboard', 'environmental', 'footprint', 'sustainable', 'sustainability'],
    phrases: ['eco points', 'eco score', 'what are eco points', 'how to earn points', 'leaderboard', 'eco leaderboard', 'eco impacts', 'carbon footprint', 'green points', 'earn points', 'how do eco points work', 'environmental impact'],
    response: "🌱 **Eco Points — Save the Planet While You Commute!**\n\nEvery shared ride reduces carbon emissions, and VNR Pool rewards you for it!\n\n📊 **How you earn Eco Points:**\n• 🚗 **Sharing a Car ride** → +10 points\n• 🏍️ **Sharing a Bike ride** → +8 points\n• 🛺 **Splitting an Auto** → +6 points\n• 📅 **Consecutive days carpooling** → Bonus streak points!\n\n🏆 **Eco Leaderboard:**\n• Check the **\"Eco Impacts Leaderboard\"** button on the Dashboard\n• Compete with fellow VNR students!\n• Top eco warriors get bragging rights 🎖️\n\n🌍 **Fun fact:** Every shared ride saves approximately 2.5 kg of CO₂ emissions. That's like planting a small tree every week!",
    followUp: "Check out the leaderboard on your Dashboard!",
    priority: 4,
  },

  // ── Who Can Use / VNR Only ────────────────
  {
    id: 'eligibility',
    keywords: ['who', 'eligible', 'vnr', 'vnrvjiet', 'college', 'student', 'students', 'outsider', 'outsiders', 'anyone', 'everybody', 'everyone'],
    phrases: ['who can use', 'only for vnr', 'is this for everyone', 'can anyone use', 'only students', 'only for students', 'who is eligible', 'vnr only', 'for vnr students', 'non vnr', 'outside students', 'other college'],
    response: "🎓 **VNR Pool is exclusively for VNRVJIET students!**\n\n🔐 **How access works:**\n• You **must** have a valid **@vnrvjiet.in** email address to sign up\n• Email is verified via OTP during registration\n• No outside users can create accounts — it's a **closed ecosystem**\n\n🛡️ **Why?**\n• Ensures every rider/driver is a known college peer\n• Builds inherent trust — you're sharing rides with classmates!\n• Creates a safe, familiar community\n\nThis is what makes VNR Pool unique — it's YOUR college's private ride network! 🏫",
    priority: 4,
  },

  // ── Messaging / Chat ──────────────────────
  {
    id: 'messaging',
    keywords: ['message', 'chat', 'contact', 'talk', 'communicate', 'dm', 'text', 'msg'],
    phrases: ['how to message', 'chat with driver', 'contact driver', 'message driver', 'in app chat', 'talk to driver', 'how to contact', 'send message', 'message passenger', 'chat feature'],
    response: "💬 **In-App Messaging:**\n\nOnce a ride booking is **approved**, a chat window opens between you and your ride partner!\n\n📱 **How to use it:**\n1️⃣ Go to **My Rides** on the Dashboard\n2️⃣ Find your approved ride\n3️⃣ Click the **💬 Chat** button\n4️⃣ Coordinate meetup points, timing, etc.\n\n📞 **Need to call instead?**\nThe driver's/passenger's phone number is visible on the ride details card.\n\n💡 **Good messaging etiquette:**\n• Confirm pickup location before departure\n• Let them know if you're running late\n• Be friendly — they're your classmates! 😄",
    priority: 4,
  },

  // ── Vehicle Types ─────────────────────────
  {
    id: 'vehicles',
    keywords: ['vehicle', 'car', 'bike', 'auto', 'rickshaw', 'scooty', 'motorcycle', 'scooter'],
    phrases: ['vehicle type', 'what vehicles', 'car or bike', 'types of vehicles', 'which vehicles', 'auto rickshaw', 'can i use bike', 'two wheeler'],
    response: "🚘 **Vehicle Types on VNR Pool:**\n\n🚗 **Car** — Up to 3 passenger seats\n• Best for longer commutes\n• Most comfortable option\n• Great for rainy days! ☔\n\n🏍️ **Bike** — 1 passenger seat\n• Quick and nimble through traffic\n• Perfect for solo riders\n• Great for short distances\n\n🛺 **Auto** — Shared auto-rickshaw\n• Use the **Auto Split** category\n• Split the fare with others on the same route\n• Most economical option! 💰\n\n💡 **Tip:** When posting a ride, you'll also need to enter your **vehicle number** for verification!",
    priority: 3,
  },

  // ── Route & Categories ────────────────────
  {
    id: 'ride_categories',
    keywords: ['category', 'categories', 'type', 'types', 'autosplit', 'personal'],
    phrases: ['ride category', 'ride type', 'auto split', 'personal vehicle', 'what is auto split', 'difference between', 'which category', 'ride categories'],
    response: "📂 **VNR Pool Ride Categories:**\n\n🟡 **Auto Split:**\n• Share an auto-rickshaw fare with others\n• Great for students heading in the same direction\n• The app finds others on your route automatically\n• Most budget-friendly option! 💸\n\n🔵 **Personal Vehicle:**\n• Offer seats in your own car or bike\n• You're the driver — set your own schedule\n• Set your own price per seat\n• Earn Eco Points for every shared ride! 🌱\n\n💡 **Which to choose?**\n• Don't have a vehicle? → Look for rides in both categories\n• Have a car with empty seats? → Post as Personal Vehicle\n• Want to share an auto fare? → Use Auto Split",
    priority: 4,
  },

  // ── My Rides ──────────────────────────────
  {
    id: 'my_rides',
    keywords: ['myrides', 'bookings', 'history', 'past', 'previous', 'upcoming'],
    phrases: ['my rides', 'my bookings', 'ride history', 'past rides', 'upcoming rides', 'where are my rides', 'see my rides', 'view my rides', 'check my rides', 'booked rides'],
    response: "📋 **My Rides Section:**\n\nYou can find all your rides in the **My Rides** area on the Dashboard!\n\n📌 **What you'll see:**\n• **Upcoming rides** — rides you've booked or posted that haven't happened yet\n• **Pending requests** — booking requests waiting for driver approval\n• **Past rides** — your ride history\n\n🔧 **What you can do:**\n• ✅ Approve or decline booking requests (if you're the driver)\n• ❌ Cancel bookings\n• 💬 Chat with your ride partner\n• ⭐ Rate completed rides\n\n💡 Click on any ride card to see full details including route, price, and passenger/driver info!",
    priority: 3,
  },

  // ── Profile & Account ─────────────────────
  {
    id: 'profile',
    keywords: ['profile', 'account', 'settings', 'edit', 'name', 'photo', 'avatar', 'bio', 'details'],
    phrases: ['my profile', 'edit profile', 'change name', 'update profile', 'profile settings', 'account settings', 'change photo', 'update photo', 'my account', 'profile picture', 'set up profile'],
    response: "👤 **Your Profile:**\n\nClick your **profile icon** on the Dashboard to edit your details!\n\n✏️ **You can update:**\n• Display name\n• Profile photo\n• Phone number\n• Bio\n\n📊 **Your profile shows:**\n• ⭐ Trust Score (from ride ratings)\n• 🌱 Eco Points earned\n• 📅 Member since date\n• 🚗 Total rides shared\n\n💡 **Tip:** A complete profile with a photo gets more ride approvals! Drivers and passengers prefer to ride with someone they can identify. 📸",
    priority: 3,
  },

  // ── How the App Works (General) ───────────
  {
    id: 'how_it_works',
    keywords: ['how', 'work', 'works', 'explain', 'about', 'what', 'features', 'overview'],
    phrases: ['how does it work', 'how it works', 'what is vnr pool', 'what is this', 'what does this do', 'explain the app', 'tell me about', 'app features', 'what can i do', 'what are the features', 'how does this work', 'how does the app work'],
    response: "🚀 **How VNR Pool Works:**\n\nVNR Pool is a **ride-sharing platform exclusively for VNRVJIET students**. Here's the quick overview:\n\n1️⃣ **Sign Up** with your @vnrvjiet.in email\n2️⃣ **Find a Ride** — Search by origin & destination\n3️⃣ **Book It** — Request a seat, wait for driver approval\n4️⃣ **Ride Together** — Meet up, share the commute\n5️⃣ **Split & Rate** — Pay your share via UPI, rate each other\n\n🌟 **Key Features:**\n• 🗺️ **Route Maps** — Visual map of all available rides\n• 💰 **Smart Fare Splitting** — Pay only for your portion of the route\n• 🌱 **Eco Points** — Earn points for every shared ride\n• ⭐ **Trust Scores** — Community-driven safety ratings\n• 💬 **In-App Chat** — Coordinate with your ride partner\n• 🔒 **VNR-Only** — Closed ecosystem for maximum safety",
    followUp: "What specific feature would you like to know more about?",
    priority: 2,
  },

  // ── Signup / Login Issues ─────────────────
  {
    id: 'signup',
    keywords: ['signup', 'register', 'login', 'signin', 'otp', 'password', 'forgot', 'reset', 'email', 'verification'],
    phrases: ['sign up', 'create account', 'log in', 'sign in', 'can\'t login', 'cant login', 'forgot password', 'reset password', 'otp not coming', 'email verification', 'how to register', 'how to sign up', 'registration', 'new account'],
    response: "🔐 **Signup & Login Help:**\n\n📝 **To Create an Account:**\n1️⃣ Enter your **@vnrvjiet.in** email address\n2️⃣ You'll receive an **OTP** to verify your email\n3️⃣ Set your password and fill in your profile\n4️⃣ Verify your phone number via OTP\n5️⃣ You're in! 🎉\n\n🔑 **Login Issues?**\n• **Forgot password?** → Use the \"Forgot Password\" link on the login page\n• **OTP not arriving?** → Check your spam folder, or try again in 60 seconds\n• **Can't login?** → Make sure you're using your @vnrvjiet.in email\n\n⚠️ **Remember:** Only @vnrvjiet.in emails are accepted. Personal Gmail/Yahoo won't work!",
    priority: 4,
  },

  // ── Route Map ─────────────────────────────
  {
    id: 'route_map',
    keywords: ['map', 'maps', 'route', 'routes', 'location', 'gps', 'directions', 'navigate'],
    phrases: ['route map', 'route maps', 'show map', 'see on map', 'view map', 'live map', 'where is the map', 'how to use map', 'map feature', 'see routes on map'],
    response: "🗺️ **Route Maps Feature:**\n\nSee all available rides on an **interactive map!**\n\n📍 **How to access:**\n1️⃣ Go to the **Dashboard** → **Find a Ride** tab\n2️⃣ Click the **\"Route Maps\"** button (the blue one with the map pin)\n3️⃣ A full-screen map opens showing all available rides!\n\n🎯 **What you'll see:**\n• 🔵 Blue markers for ride origins\n• 🔴 Red markers for destinations\n• 📏 Route lines showing the path\n• 🏫 VNR VJIET campus location\n• Click any marker for ride details!\n\n💡 **Tip:** Use the search filters first, then open the map to see filtered results visually!",
    priority: 3,
  },

  // ── Price / Cost ──────────────────────────
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'cost', 'expensive', 'cheap', 'affordable', 'rupees', 'rs', 'inr'],
    phrases: ['how much does it cost', 'what is the price', 'how is price calculated', 'pricing model', 'is it free', 'is it expensive', 'how are prices set', 'set price', 'price per seat'],
    response: "💰 **Pricing on VNR Pool:**\n\n📊 **How prices are set:**\n• **Drivers set the price** per seat when posting a ride\n• The app uses **smart route-based pricing** — if you travel only part of the route, you pay proportionally less!\n\n🧮 **Example:**\n• Full route price: ₹80/seat\n• You travel 60% of the route → You pay ~₹48\n\n🛺 **Auto Split pricing:**\n• The total auto fare is divided equally among all passengers\n• More riders = cheaper for everyone!\n\n💸 **Is VNR Pool free to use?**\n• The **app is completely free** — no service charges!\n• You only pay the ride fare directly to the driver/auto via UPI\n\n💡 **Tip:** Prices are shown on each ride card, so you always know the cost before booking!",
    priority: 4,
  },

  // ── App Issues / Bugs ─────────────────────
  {
    id: 'issues',
    keywords: ['bug', 'error', 'crash', 'broken', 'issue', 'problem', 'glitch', 'stuck', 'loading', 'slow', 'lag'],
    phrases: ['app not working', 'page not loading', 'something is broken', 'found a bug', 'report bug', 'app is slow', 'app crashed', 'not responding', 'having issues'],
    response: "🔧 **Having Technical Issues?**\n\nHere are some quick fixes:\n\n1️⃣ **Page not loading?** → Try a hard refresh (Ctrl + Shift + R)\n2️⃣ **App is slow?** → Clear your browser cache and cookies\n3️⃣ **Login issues?** → Make sure you're using your @vnrvjiet.in email\n4️⃣ **Features not working?** → Try logging out and back in\n\n📧 **Still having problems?**\nContact the VNR Pool team — we're constantly improving the app! Your feedback helps us squash bugs faster 🐛\n\n💡 **Tip:** VNR Pool works best on Chrome or Edge. Make sure your browser is up to date!",
    priority: 3,
  },

  // ── What can you do (bot capabilities) ────
  {
    id: 'bot_capabilities',
    keywords: ['can', 'you', 'bot', 'chatbot', 'assistant', 'help', 'ai'],
    phrases: ['what can you do', 'what do you do', 'how can you help', 'who are you', 'are you ai', 'are you a bot', 'what are you', 'help me', 'i need help', 'can you help'],
    response: "🤖 **I'm your VNR Pool Assistant!**\n\nI can help you with absolutely everything in the app! Here's a taste:\n\n🚗 **Rides:** Post, find, group rides, auto-split vs personal, routes, locations.\n💰 **Pricing:** Fare calculation, dynamic splitting, mid-route joining.\n🛡️ **Safety:** DigiLocker verification, Women-Only rides, trust scores, SOS info.\n⏰ **Timing:** Ride start windows, daily limits, exam/late schedules.\n⚙️ **App Features:** Dark mode, PWA installation, notifications, stats.\n\nJust ask me anything naturally! Try:\n• *\"How does Auto Split work?\"*\n• *\"Can I cancel a ride?\"*\n• *\"What is DigiLocker verification?\"*\n• *\"How many rides can I post a day?\"*",
    priority: 2,
  },

  // ── Compliments ───────────────────────────
  {
    id: 'compliment',
    keywords: ['awesome', 'great', 'amazing', 'cool', 'nice', 'love', 'loved', 'good', 'excellent', 'brilliant', 'fantastic', 'wonderful'],
    phrases: ['this is great', 'love this app', 'great app', 'nice app', 'amazing app', 'well done', 'good job', 'love it', 'this is awesome', 'this is cool'],
    response: [
      "Aww, thank you so much! 😊💕 We're building VNR Pool with love for the VNRVJIET community. Your support means everything! Keep sharing rides and spreading the green vibes! 🌱🚗",
      "That means a lot! 🥰 VNR Pool is made BY VNR students, FOR VNR students. Glad you're enjoying it! Share it with your classmates! 🎉",
      "Thanks! 😄 You're awesome too! Keep carpooling and earning those Eco Points! 🌍💚"
    ],
    priority: 2,
  },

  // ── Funny / Joke ──────────────────────────
  {
    id: 'joke',
    keywords: ['joke', 'funny', 'laugh', 'lol', 'haha', 'humor', 'meme'],
    phrases: ['tell me a joke', 'make me laugh', 'say something funny', 'tell joke'],
    response: [
      "😄 Why did the VNR student start carpooling?\n\nBecause they realized solo commuting was *exhausting* their wallet AND the planet! 🌍💸\n\n...I'll stick to ride-sharing advice 😅 How can I help you today?",
      "🤣 Here's one:\n\nStudent 1: \"I spend ₹200 on autos every day!\"\nStudent 2: \"Bro, have you heard of VNR Pool?\"\nStudent 1: *Downloads app*\nStudent 1's wallet: \"Finally, I can breathe!\" 💰😮‍💨\n\nAnything else I can help with? 😊",
    ],
    priority: 1,
  },

  // ── Time / Schedule ───────────────────────
  {
    id: 'timing',
    keywords: ['time', 'timing', 'schedule', 'morning', 'evening', 'peak', 'rush'],
    phrases: ['best time', 'peak hours', 'rush hour', 'when to book', 'morning rides', 'evening rides', 'what time', 'when should i book', 'advance booking'],
    response: "⏰ **Ride Timing Tips:**\n\n🌅 **Morning Rush (7:30 AM - 9:30 AM):**\n• Most rides available heading TO college\n• Book early for guaranteed seats!\n\n🌆 **Evening Rush (3:30 PM - 6:00 PM):**\n• Most rides heading FROM college\n• Great time to share autos!\n\n💡 **Pro Tips:**\n• Post/search rides **the night before** for the best matches\n• Set your departure time accurately — it helps others find you\n• Morning rides fill up fast, so don't wait last minute!\n\n📅 You can book rides for any time — just set the departure time when posting or searching!",
    priority: 3,
  },

  // ── Popular Routes & Areas ────────────────
  {
    id: 'popular_routes',
    keywords: ['kompally', 'kphb', 'jntu', 'miyapur', 'ameerpet', 'secunderabad', 'kukatpally', 'bachupally', 'nizampet', 'dilsukhnagar', 'lb', 'nagar', 'uppal', 'gachibowli', 'hitech', 'madhapur', 'kondapur', 'tarnaka', 'ecil', 'alwal', 'attapur', 'mehdipatnam', 'shamshabad', 'medchal', 'paradise', 'habsiguda', 'bowenpally', 'balanagar', 'lingampally', 'patancheru', 'bhel', 'manikonda', 'nagole', 'malkajgiri', 'suchitra', 'beeramguda'],
    phrases: ['popular routes', 'which routes', 'available routes', 'route from kompally', 'route from kphb', 'ride from miyapur', 'ride from ameerpet', 'common routes', 'bus routes', 'college routes', 'routes available', 'which areas', 'where can i get ride', 'areas covered', 'locations covered', 'ride from secunderabad', 'ride from dilsukhnagar', 'ride from gachibowli', 'ride to vnr', 'ride to college'],
    response: "🗺️ **Popular Routes to VNR VJIET:**\n\nVNR Pool covers **40+ predefined routes** across Hyderabad! Here are the most popular ones:\n\n🔵 **North Hyderabad:**\n• Kompally → Suchitra → Bachupally → VNR\n• Medchal → Kompally → Bachupally → VNR\n• Alwal → Suchitra → Jeedimetla → VNR\n\n🟢 **West Hyderabad (Most Popular!):**\n• KPHB → JNTU → Nizampet → Pragathi Nagar → VNR\n• Miyapur → Hafeezpet → Nizampet → VNR\n• Kukatpally → KPHB → JNTU → VNR\n• BHEL → Chandanagar → Miyapur → VNR\n\n🟡 **Central/South:**\n• Ameerpet → SR Nagar → Kukatpally → VNR\n• Mehdipatnam → Gachibowli → Hi-Tech City → VNR\n• Secunderabad → Paradise → Balanagar → VNR\n\n🔴 **East Hyderabad:**\n• ECIL → Bowenpally → Kukatpally → VNR\n• Uppal → Tarnaka → Secunderabad → VNR\n• LB Nagar → Dilsukhnagar → Ameerpet → VNR\n\n💡 **Pro tip:** Even if your exact location isn't listed, search for rides — the app matches partial routes too!",
    followUp: "Tell me your area and I'll suggest the best route!",
    priority: 4,
  },

  // ── VNR VJIET College Info ─────────────────
  {
    id: 'college_info',
    keywords: ['vnrvjiet', 'vnr', 'college', 'campus', 'gate', 'hostel', 'bachupally', 'pragathi'],
    phrases: ['about vnr', 'about vnrvjiet', 'college address', 'where is vnr', 'vnr location', 'campus location', 'college location', 'vnr address', 'vnr vjiet address', 'which college', 'gate 1', 'gate 2', 'college gate', 'vnr campus'],
    response: "🏫 **VNR VJIET Campus Info:**\n\n📍 **Location:** Bachupally, Nizampet, Hyderabad - 500090\n📌 **Coordinates:** 17.5389°N, 78.3868°E\n\n🚪 **Campus Gates:**\n• **Gate 1** — Main entrance (Bachupally Road)\n• **Gate 2** — Side entrance\n\n🏠 **Nearby Landmarks:**\n• Pragathi Nagar Lake\n• Simhapuri Colony\n• VNR Hostel Road\n• Bachupally Bus Stop\n\n🍽️ **Nearby Food Spots:**\n• Ullas Restaurant\n• SR Nagar Food Street\n• Bachupally Junction\n\n💡 When booking rides, you can set **VNR VJIET**, **Gate 1**, **Gate 2**, or **VNR Bus Stop** as your destination!",
    priority: 3,
  },

  // ── DigiLocker Verification ────────────────
  {
    id: 'digilocker',
    keywords: ['digilocker', 'verify', 'verification', 'document', 'id', 'identity', 'aadhar', 'aadhaar', 'license', 'dl', 'verified', 'badge'],
    phrases: ['digilocker verification', 'verify identity', 'verify id', 'how to verify', 'get verified', 'verification badge', 'digilocker login', 'connect digilocker', 'identity verification', 'aadhar verification', 'driving license verification', 'verified badge', 'how to get verified'],
    response: "🪪 **DigiLocker Verification:**\n\nGet a **verified badge** on your profile for extra trust!\n\n🔗 **How to verify:**\n1️⃣ Go to your **Profile Settings**\n2️⃣ Click **\"Verify with DigiLocker\"**\n3️⃣ Log in with your DigiLocker credentials\n4️⃣ Authorize VNR Pool to verify your identity\n5️⃣ You'll get a ✅ verified badge on your profile!\n\n📋 **What gets verified:**\n• Your name matches your college records\n• Your identity is confirmed via government documents\n• No personal documents are stored — just verification status\n\n🛡️ **Why verify?**\n• Verified users get MORE ride approvals\n• Drivers prefer passengers with verified identities\n• Builds maximum trust in the community\n\n💡 DigiLocker is India's official document wallet by the Government — it's 100% safe! 🇮🇳",
    priority: 4,
  },

  // ── Install App / PWA ─────────────────────
  {
    id: 'install_app',
    keywords: ['install', 'download', 'app', 'pwa', 'homescreen', 'desktop', 'mobile', 'phone', 'android', 'ios', 'iphone', 'offline'],
    phrases: ['install app', 'download app', 'add to homescreen', 'add to home screen', 'is there an app', 'mobile app', 'android app', 'ios app', 'iphone app', 'play store', 'app store', 'works offline', 'use on phone', 'install on phone'],
    response: "📱 **Install VNR Pool on Your Phone:**\n\nVNR Pool is a **Progressive Web App (PWA)** — you can install it like a native app!\n\n🤖 **Android (Chrome):**\n1️⃣ Open VNR Pool in Chrome\n2️⃣ Tap the **three dots** (⋮) menu\n3️⃣ Select **\"Add to Home Screen\"**\n4️⃣ Tap **\"Install\"** — done! 🎉\n\n🍎 **iPhone (Safari):**\n1️⃣ Open VNR Pool in Safari\n2️⃣ Tap the **Share** button (↑)\n3️⃣ Select **\"Add to Home Screen\"**\n4️⃣ Tap **\"Add\"** — done! 🎉\n\n💻 **Desktop (Chrome/Edge):**\n1️⃣ Look for the **install icon** (⊕) in the address bar\n2️⃣ Click **\"Install\"**\n\n⚡ **Benefits of installing:**\n• App icon on your home screen\n• Faster loading\n• Push notifications for ride updates\n• Feels like a native app!",
    priority: 4,
  },

  // ── Notifications & Reminders ──────────────
  {
    id: 'notifications',
    keywords: ['notification', 'notifications', 'notify', 'alert', 'alerts', 'reminder', 'reminders', 'push', 'bell'],
    phrases: ['ride notifications', 'push notifications', 'get notified', 'ride alerts', 'ride reminders', 'booking notification', 'how to get alerts', 'enable notifications', 'notification settings', 'will i be notified', 'reminder before ride'],
    response: "🔔 **Notifications & Ride Reminders:**\n\nVNR Pool keeps you updated at every step!\n\n📬 **You'll get notified when:**\n• ✅ Your booking is **approved** by the driver\n• ❌ Your booking is **declined**\n• 💬 You receive a **new message** from your ride partner\n• ⏰ Your ride is **30 minutes away** (reminder!)\n• 🚗 New rides match your **saved search**\n\n🔧 **Enable notifications:**\n1️⃣ When prompted, click **\"Allow\"** for browser notifications\n2️⃣ If you missed it, go to browser settings → Site permissions → Notifications\n3️⃣ Install the PWA for more reliable notifications\n\n💡 **Tip:** Installing VNR Pool as an app (PWA) gives you the best notification experience!",
    priority: 3,
  },

  // ── Ride Approval Process ──────────────────
  {
    id: 'ride_approval',
    keywords: ['approve', 'approved', 'approval', 'accept', 'accepted', 'decline', 'declined', 'reject', 'rejected', 'pending', 'waiting', 'confirm', 'confirmed', 'confirmation'],
    phrases: ['how to approve', 'approve booking', 'accept booking', 'decline booking', 'reject booking', 'booking pending', 'waiting for approval', 'how long to approve', 'ride confirmed', 'booking confirmed', 'pending request', 'approve or decline', 'when will driver approve'],
    response: "✅ **Ride Approval Process:**\n\n**For Passengers:**\n1️⃣ You send a **booking request**\n2️⃣ The driver gets notified\n3️⃣ They **approve** or **decline** your request\n4️⃣ You get notified of their decision\n5️⃣ If approved → Chat opens! 💬\n\n**For Drivers:**\n1️⃣ Go to **My Rides** section\n2️⃣ You'll see **pending requests** with passenger details\n3️⃣ Click ✅ **Approve** or ❌ **Decline**\n4️⃣ The passenger is notified instantly\n\n⏱️ **How long does approval take?**\n• It's up to the driver — usually within minutes\n• If no response, try messaging the driver\n• You can cancel and book another ride while waiting\n\n💡 **Tip:** Complete your profile and get DigiLocker verified — drivers approve verified passengers faster! ⚡",
    priority: 5,
  },

  // ── Women's Safety ────────────────────────
  {
    id: 'women_safety',
    keywords: ['women', 'woman', 'girl', 'girls', 'female', 'ladies', 'lady', 'safe', 'safety', 'alone'],
    phrases: ['women safety', 'safe for women', 'safe for girls', 'is it safe for girls', 'girls only', 'female only', 'women only ride', 'riding alone', 'solo female', 'women safety features', 'safe for ladies'],
    response: "👩 **Women's Safety on VNR Pool:**\n\nYour safety is our top priority! Here's what makes VNR Pool safe for everyone:\n\n🔐 **Built-in Safety:**\n• ✅ All users verified with **@vnrvjiet.in** email — only college peers\n• 📞 Driver/passenger phone numbers visible for direct contact\n• ⭐ **Trust Scores** — check ratings before booking\n• 🪪 **DigiLocker verification** for identity confirmation\n• 💬 In-app chat so you don't need to share personal numbers\n\n🛡️ **Safety Tips:**\n• Check the driver's **trust score** before booking (4+ stars recommended)\n• Share your ride details with a friend or family member\n• Prefer rides with **verified drivers** (✅ badge)\n• For late evening rides, prefer **car rides** with other passengers\n• Always meet at well-lit, public pickup points\n\n🚨 **If something goes wrong:**\n• Report the user from their profile\n• Contact campus security\n• Cancel the ride immediately if you feel unsafe\n\n💡 We're working on adding gender-preference filters in future updates!",
    priority: 5,
  },

  // ── Rainy Day / Weather Tips ───────────────
  {
    id: 'weather',
    keywords: ['rain', 'rainy', 'raining', 'weather', 'monsoon', 'wet', 'umbrella', 'flood', 'waterlogging'],
    phrases: ['rainy day', 'what if it rains', 'ride in rain', 'monsoon rides', 'rain tips', 'bad weather', 'raining today', 'weather conditions', 'waterlogging'],
    response: "🌧️ **Rainy Day Ride Tips:**\n\n☔ **During monsoon season:**\n\n🚗 **Prefer Car rides** over bikes/autos\n• Stay dry and comfortable\n• Cars handle waterlogged roads better\n• More seats = share with more people!\n\n📱 **Book in advance:**\n• Rainy days = higher demand for rides\n• Post/search the night before\n• Morning slots fill up fast on rainy days!\n\n🏍️ **If taking a bike ride:**\n• Carry a raincoat (not just an umbrella!)\n• Ask the driver about rain gear availability\n• Avoid bike rides during heavy downpour\n\n📍 **Meeting point tips:**\n• Choose a **covered/sheltered** pickup spot\n• Metro stations make great meeting points\n• College gates have covered areas\n\n💡 **Pro tip:** On rainy days, check Route Maps for car rides specifically — filter by vehicle type!",
    priority: 3,
  },

  // ── Hostel Students ───────────────────────
  {
    id: 'hostel',
    keywords: ['hostel', 'hosteler', 'hosteller', 'hostelite', 'staying', 'pg', 'paying', 'guest', 'accommodation', 'room'],
    phrases: ['hostel student', 'i stay in hostel', 'hostel to college', 'hostel rides', 'near hostel', 'vnr hostel', 'bachupally hostel', 'pg near vnr', 'paying guest', 'room near vnr', 'need ride from hostel'],
    response: "🏠 **For Hostel & PG Students:**\n\nEven if you stay near campus, VNR Pool is useful for you!\n\n🚌 **Weekend trips home:**\n• Find rides to your hometown area\n• Share auto fares to bus stations/railway stations\n• Split cab fares to Secunderabad/Nampally stations\n\n🛒 **Errands & hangouts:**\n• Rides to malls (Nexus, Manjeera)\n• Trips to KPHB/JNTU food street\n• Visits to other areas in Hyderabad\n\n📍 **Nearby pickup points for hostel students:**\n• VNR Hostel Road\n• Simhapuri Colony\n• Bachupally Junction\n• VNR Bus Stop (Pragathi Nagar)\n\n💡 **Tip:** Post rides for your weekend commute home — other students from your area might want to share!",
    priority: 3,
  },

  // ── Savings / Money Saved ──────────────────
  {
    id: 'savings',
    keywords: ['save', 'saving', 'savings', 'saved', 'cheaper', 'budget', 'economical', 'daily', 'monthly', 'weekly', 'compare'],
    phrases: ['how much can i save', 'money saved', 'daily savings', 'monthly savings', 'cost comparison', 'cheaper than auto', 'cheaper than cab', 'how much cheaper', 'compare cost', 'is it cheaper', 'save money', 'budget friendly'],
    response: "💸 **How Much Can You Save with VNR Pool?**\n\nLet's do the math! 🧮\n\n🛺 **Without VNR Pool (Solo Auto):**\n• Daily auto fare: ~₹150-250 (one way)\n• Monthly (25 days): ₹3,750 - ₹6,250\n• Per semester (5 months): ₹18,750 - ₹31,250 😱\n\n🚗 **With VNR Pool (Shared):**\n• Daily shared fare: ~₹40-80 (one way)\n• Monthly: ₹1,000 - ₹2,000\n• Per semester: ₹5,000 - ₹10,000 🎉\n\n📊 **You save approximately:**\n• **₹100-170 per day** 💰\n• **₹2,500-4,250 per month** 💰💰\n• **₹12,500-21,250 per semester** 💰💰💰\n\n🌍 **PLUS environmental savings:**\n• ~2.5 kg CO₂ saved per shared ride\n• ~125 kg CO₂ saved per semester\n• That's like planting 5+ trees! 🌳\n\nStart sharing rides and watch your wallet thank you! 🙌",
    followUp: "Want to know the best routes for savings?",
    priority: 4,
  },

  // ── Ride Etiquette ────────────────────────
  {
    id: 'etiquette',
    keywords: ['etiquette', 'rules', 'behavior', 'behaviour', 'manners', 'tips', 'guidelines', 'dos', 'donts', 'do', 'dont', 'polite', 'rude'],
    phrases: ['ride etiquette', 'ride rules', 'ride tips', 'dos and donts', 'how to behave', 'first time', 'first ride', 'what to expect', 'ride guidelines', 'carpooling etiquette', 'carpooling rules', 'sharing etiquette', 'new to carpooling', 'never carpooled before'],
    response: "📋 **Ride Etiquette — Dos & Don'ts:**\n\n✅ **DO:**\n• Be at the pickup point **on time** ⏰\n• Confirm pickup location via **chat** before the ride\n• Say hi — they're your classmates! 👋\n• Rate your ride partner fairly after the trip ⭐\n• Pay your fare promptly via UPI 💸\n• Keep the vehicle clean 🧹\n• Wear your seatbelt in cars 🔐\n\n❌ **DON'T:**\n• Don't cancel last minute without informing 🚫\n• Don't make the driver wait — respect their time ⏰\n• Don't eat messy food in someone's car 🍔\n• Don't play loud music without asking 🎵\n• Don't leave trash in the vehicle 🗑️\n• Don't be a no-show — it affects your Trust Score! 📉\n\n💡 **First time?**\n• Message the driver beforehand\n• Confirm the meeting point\n• Have UPI ready for payment\n• Be friendly and enjoy the ride! 😊\n\nGood etiquette = higher Trust Score = more ride approvals! 🏆",
    priority: 3,
  },

  // ── Auto vs Cab vs Personal ────────────────
  {
    id: 'comparison',
    keywords: ['vs', 'versus', 'compare', 'comparison', 'difference', 'better', 'best', 'which', 'choose', 'option', 'options', 'ola', 'uber', 'rapido'],
    phrases: ['auto vs car', 'auto or car', 'which is better', 'best option', 'compare options', 'auto vs cab', 'ola vs vnr pool', 'uber vs vnr pool', 'rapido vs vnr pool', 'why not ola', 'why not uber', 'better than ola', 'better than uber', 'vnr pool vs ola', 'vnr pool vs uber', 'auto split vs personal'],
    response: "⚖️ **VNR Pool vs Other Options:**\n\n| Feature | VNR Pool | Ola/Uber | Solo Auto |\n|---------|----------|----------|-----------|\n| 💰 Cost | ₹40-80 | ₹150-300 | ₹150-250 |\n| 🛡️ Safety | College peers only | Strangers | Strangers |\n| 🌱 Eco | Green points! | No incentive | High carbon |\n| 🕐 Wait | Scheduled | Varies | Hail on road |\n| 💸 Surge | Never! | Yes 😤 | Sometimes |\n\n📊 **Auto Split vs Personal Vehicle:**\n\n🟡 **Auto Split:**\n• Best for: Budget commuters\n• Cost: Lowest (shared auto fare)\n• Comfort: Basic\n• Flexibility: Fixed route\n\n🔵 **Personal Vehicle:**\n• Best for: Comfort seekers\n• Cost: Moderate (fractional pricing)\n• Comfort: High (car/bike)\n• Flexibility: Driver's schedule\n\n🏆 **Why VNR Pool wins:**\n• 🔒 Closed ecosystem — only VNR students\n• 💰 No surge pricing, ever\n• 🌱 Earn Eco Points\n• ⭐ Trust-based community\n• 📱 Free to use — no service charges!",
    priority: 4,
  },

  // ── Night / Late Rides ─────────────────────
  {
    id: 'night_rides',
    keywords: ['night', 'late', 'evening', 'dark', 'midnight', 'after', 'hours'],
    phrases: ['night ride', 'late night', 'late ride', 'evening ride', 'after college', 'after class', 'late evening', 'ride at night', 'is it available at night', 'rides available late', 'after 8pm', 'after 9pm'],
    response: "🌙 **Late / Evening Rides:**\n\n⏰ **Typical ride availability:**\n• Morning: 7:00 AM - 10:00 AM (peak! 📈)\n• Afternoon: 12:00 PM - 2:00 PM\n• Evening: 3:30 PM - 7:00 PM (peak! 📈)\n• Late evening: 7:00 PM - 9:00 PM (limited)\n\n🌃 **For late rides:**\n• Check the Dashboard for available rides\n• Post your own ride — others might be heading the same way!\n• Use **Auto Split** to share a late-night auto\n• Message your ride partner to confirm timing\n\n🛡️ **Safety tips for evening rides:**\n• Prefer **car rides** over bikes after dark\n• Share ride details with a friend/family\n• Choose well-lit pickup/drop points\n• Check the driver's Trust Score\n\n💡 **Tip:** Post a late ride the night before — others searching will find it!",
    priority: 3,
  },

  // ── Group Rides ────────────────────────────
  {
    id: 'group_rides',
    keywords: ['group', 'friends', 'together', 'batch', 'classmates', 'multiple', 'bulk', 'many', 'team', 'gang', 'squad'],
    phrases: ['group ride', 'ride with friends', 'book for group', 'multiple people', 'all of us', 'my friends', 'book together', 'ride together', 'classmates ride', 'same class', 'bulk booking', 'team ride', 'squad ride'],
    response: "👥 **Group Rides — Ride With Your Squad!**\n\n🎯 **How to ride with friends:**\n\n**Option 1: Share the same ride**\n1️⃣ Find a ride with enough **available seats**\n2️⃣ Each person books the **same ride** individually\n3️⃣ The driver approves all of you\n4️⃣ Ride together! 🎉\n\n**Option 2: One friend is the driver**\n1️⃣ The driver friend **posts a ride** with total seats\n2️⃣ Friends send booking requests\n3️⃣ Driver approves everyone\n4️⃣ Split the fuel cost via UPI after! 💸\n\n**Option 3: Auto Split**\n1️⃣ Post an **Auto Split** ride\n2️⃣ Share the ride link with friends\n3️⃣ Everyone joins and fare splits automatically\n\n💡 **Pro tips for group rides:**\n• Coordinate via the in-app chat\n• Set a single pickup point for the whole group\n• If 4+ people, a car ride is most economical\n• Rate your driver after — they did you all a favor! ⭐",
    priority: 3,
  },

  // ── Emergency / Help ──────────────────────
  {
    id: 'emergency',
    keywords: ['emergency', 'sos', 'accident', 'police', 'ambulance', 'help', 'danger', 'unsafe', 'threat', 'harass', 'harassment'],
    phrases: ['emergency help', 'i need help', 'emergency contact', 'feel unsafe', 'in danger', 'accident happened', 'call police', 'sos help', 'harassed by driver', 'harassment', 'unsafe situation'],
    response: "🚨 **Emergency Help:**\n\nIf you're in immediate danger, **call these numbers first:**\n\n📞 **Emergency Numbers:**\n• Police: **100**\n• Women Helpline: **181**\n• Ambulance: **108**\n• VNR VJIET Campus Security: Contact through college website\n\n🛑 **If you feel unsafe during a ride:**\n1️⃣ Ask the driver to **stop immediately**\n2️⃣ **Exit the vehicle** at a safe, public location\n3️⃣ Call **100** if needed\n4️⃣ **Report the user** on VNR Pool immediately\n5️⃣ Contact campus administration\n\n📱 **In the app:**\n• Report the user from their profile\n• Cancel the ride immediately\n• Message VNR Pool admins\n\n⚠️ **Remember:** Every VNR Pool user is a verified VNRVJIET student with a tracked identity. Serious violations lead to **permanent account suspension** and can be escalated to college administration.\n\nYour safety matters above everything else. 💛",
    priority: 8,
  },

  // ── Semester / Exam Tips ───────────────────
  {
    id: 'semester_tips',
    keywords: ['exam', 'exams', 'semester', 'midsem', 'endsem', 'lab', 'workshop', 'class', 'attendance'],
    phrases: ['during exams', 'exam time rides', 'semester schedule', 'exam schedule', 'rides during exams', 'early morning exam', 'late lab', 'workshop', 'different timing'],
    response: "📚 **Rides During Exams & Special Schedules:**\n\n🎓 **During Exam Season:**\n• Timings change — morning exams start at 9:30 AM usually\n• Post rides with **exact exam timing**\n• More students need rides → more options available!\n• Book the night before — don't risk being late!\n\n🔬 **Lab / Workshop Days:**\n• Late labs? Post an evening ride\n• Saturday workshops? Check for weekend rides\n• Different building? Set accurate pickup/drop\n\n📋 **Tips for irregular schedules:**\n1️⃣ **Post your ride** even if the timing is unusual\n2️⃣ Others with the same schedule will find you\n3️⃣ Check frequently during exam weeks — new rides appear often\n4️⃣ Use Auto Split for quick one-off trips\n\n💡 **Pro tip:** Communicate the exact timing with your driver. Exams run on strict schedules — being late is NOT an option! 📖⏰",
    priority: 3,
  },

  // ── Vehicle Number Validation ──────────────
  {
    id: 'vehicle_number',
    keywords: ['registration', 'number', 'plate', 'numberplate', 'rto', 'ts', 'ap', 'vehicle'],
    phrases: ['vehicle number', 'number plate', 'vehicle registration', 'how to enter vehicle number', 'vehicle number format', 'what format', 'ts number', 'ap number', 'registration number'],
    response: "🚘 **Vehicle Number Format:**\n\nWhen posting a ride, you need to enter your **vehicle registration number**.\n\n📝 **Accepted formats:**\n• **TS 09 AB 1234** (Telangana)\n• **AP 09 AB 1234** (Andhra Pradesh)\n• **MH 12 AB 1234** (Maharashtra)\n• Any valid Indian vehicle registration!\n\n✅ **Rules:**\n• Must be a valid Indian registration format\n• 2-letter state code + 2-digit district + letters + 4 digits\n• The app validates this automatically\n• Incorrect format = can't post the ride\n\n💡 **Don't worry** — for Auto Split rides, the vehicle number isn't always required since you're sharing a commercial auto!",
    priority: 3,
  },

  // ── Seats & Capacity ──────────────────────
  {
    id: 'seats',
    keywords: ['seat', 'seats', 'capacity', 'space', 'available', 'full', 'empty', 'left', 'remaining'],
    phrases: ['available seats', 'how many seats', 'seats available', 'seats left', 'ride full', 'no seats', 'out of seats', 'maximum seats', 'seat capacity', 'how many can join', 'is there space'],
    response: "💺 **Seats & Capacity:**\n\n🚗 **Car:** Up to **3 passenger seats** available\n🏍️ **Bike:** **1 passenger seat**\n🛺 **Auto:** Up to **3 passenger seats** (shared)\n\n📊 **How seats work:**\n• Driver sets **available seats** when posting a ride\n• Each booking takes **1 seat**\n• When all seats are booked, the ride shows as **FULL**\n• Driver can also **close bookings** early if needed\n\n🔍 **Finding rides with seats:**\n• Ride cards show **remaining seats** with a seat icon\n• Rides with 0 seats are either hidden or show \"Full\"\n• New rides appear frequently — keep checking!\n\n💡 **Tip:** If a ride is full, try messaging the driver — sometimes plans change and a seat opens up!",
    priority: 3,
  },

  // ── Pickup & Drop Points ──────────────────
  {
    id: 'pickup_drop',
    keywords: ['pickup', 'drop', 'meetup', 'meeting', 'point', 'where', 'pick', 'meet', 'stop'],
    phrases: ['pickup point', 'drop point', 'where to meet', 'meeting point', 'pickup location', 'drop location', 'where does driver pick', 'where do i meet', 'where do i wait', 'pick me up', 'drop me off', 'best pickup point', 'convenient pickup'],
    response: "📍 **Pickup & Drop Points:**\n\n🎯 **How to set your pickup/drop:**\n1️⃣ When searching/booking, enter your **exact location**\n2️⃣ The app suggests nearby **known landmarks**\n3️⃣ Confirm with the driver via **in-app chat** 💬\n\n📌 **Best pickup points (easy to find):**\n• Metro stations (KPHB, Miyapur, Ameerpet, etc.)\n• Major intersections & X Roads\n• Shopping malls (Nexus, Manjeera)\n• Bus stands & depots\n• College gates\n\n🏫 **Near VNR VJIET:**\n• VNR Gate 1 (Main entrance)\n• VNR Gate 2\n• VNR Bus Stop (Pragathi Nagar)\n• Bachupally Junction\n• Simhapuri Colony Kaman\n\n💡 **Tips:**\n• Choose a spot that's **easy to find on Google Maps**\n• Confirm the exact spot via chat\n• Be there **5 minutes early**\n• Share a Google Maps pin if needed!",
    priority: 3,
  },

  // ── Logout / Sign Out ─────────────────────
  {
    id: 'logout',
    keywords: ['logout', 'signout', 'log', 'out', 'sign', 'exit', 'leave'],
    phrases: ['how to logout', 'how to log out', 'sign out', 'how to sign out', 'log out of app', 'exit account', 'leave account', 'switch account'],
    response: "🚪 **Logging Out:**\n\n1️⃣ Click the **LogOut** button on the Dashboard\n2️⃣ You'll be redirected to the login page\n3️⃣ Your data is safe — log back in anytime!\n\n🔄 **Want to switch accounts?**\n• Log out first\n• Then log in with a different @vnrvjiet.in email\n\n💡 **Note:** Logging out clears your current session but keeps all your rides, bookings, and chat history intact!",
    priority: 2,
  },

  // ── Dark Mode / Theme ─────────────────────
  {
    id: 'theme',
    keywords: ['dark', 'light', 'theme', 'mode', 'color', 'colours', 'appearance', 'display'],
    phrases: ['dark mode', 'light mode', 'change theme', 'switch theme', 'how to change theme', 'dark theme', 'light theme', 'night mode', 'dark background', 'change appearance'],
    response: "🎨 **Dark Mode / Theme Toggle:**\n\nVNR Pool supports **Dark Mode, Light Mode, and System theme!**\n\n🌙 **How to switch:**\n1️⃣ Look for the **theme toggle** icon on the Dashboard (🌙/☀️)\n2️⃣ Click it to cycle between:\n   • 🌙 **Dark Mode** — Easy on the eyes, great for night\n   • ☀️ **Light Mode** — Bright and clean\n   • 🖥️ **System** — Follows your device setting\n\n💡 **Dark mode benefits:**\n• Easier on your eyes at night\n• Saves battery on OLED screens\n• Looks absolutely gorgeous! 😎",
    priority: 2,
  },

  // ── Future Features / Roadmap ──────────────
  {
    id: 'future',
    keywords: ['future', 'upcoming', 'planned', 'roadmap', 'coming', 'new', 'next', 'update', 'updates', 'feature', 'request', 'wish', 'suggestion', 'suggest'],
    phrases: ['future features', 'upcoming features', 'new features', 'what\'s coming', 'whats next', 'any updates', 'feature request', 'suggest a feature', 'wish list', 'when will', 'planned features', 'future updates', 'next update'],
    response: "🚀 **Future Features & Roadmap:**\n\nWe're always improving VNR Pool! Here's what's on the horizon:\n\n🔮 **Coming Soon:**\n• 💳 **In-app UPI payments** — Pay directly within the app\n• 👩 **Gender-preference filters** — Women-only ride options\n• 🔄 **Recurring rides** — Auto-post daily commute rides\n• 📊 **Ride analytics** — Track your savings over time\n• 🏆 **Achievement badges** — Gamified milestones\n\n🤔 **Under Consideration:**\n• SOS emergency button with live location sharing\n• Ride scheduling with calendar integration\n• Inter-college ride sharing (other JNTUH colleges)\n• Carbon offset certificates\n• Ride insurance integration\n\n💬 **Have a suggestion?**\nWe love hearing from users! Share your ideas with the VNR Pool team — the best features come from student feedback! 🎉",
    priority: 3,
  },

  // ── Data & Privacy ────────────────────────
  {
    id: 'privacy',
    keywords: ['privacy', 'data', 'private', 'personal', 'information', 'share', 'shared', 'secure', 'encrypted'],
    phrases: ['is my data safe', 'data privacy', 'personal information', 'who can see', 'privacy policy', 'is it private', 'my phone number', 'who sees my data', 'data security', 'information safe', 'is data shared'],
    response: "🔒 **Privacy & Data Security:**\n\n🛡️ **Your data is protected:**\n• All data is stored on **Supabase** with enterprise-grade security\n• Passwords are **hashed** — even we can't see them\n• Communication is encrypted via **HTTPS**\n• Row-Level Security (RLS) ensures you only see YOUR data\n\n👁️ **What others can see:**\n• Your **name, photo, trust score** — on ride cards\n• Your **phone number** — only to approved ride partners\n• Your **ride history** — only you can see this\n\n🚫 **What we DON'T do:**\n• ❌ Sell your data to third parties\n• ❌ Share your email with anyone\n• ❌ Track your location when not using the app\n• ❌ Store your DigiLocker documents — only verification status\n\n💡 VNR Pool is built BY students, FOR students. Your trust is everything to us! 🤝",
    priority: 3,
  },

  // ── Contact / Support ─────────────────────
  {
    id: 'contact_support',
    keywords: ['contact', 'support', 'team', 'developer', 'admin', 'email', 'reach', 'complaint', 'feedback', 'owner', 'built', 'made', 'creator', 'who'],
    phrases: ['contact support', 'contact team', 'contact admin', 'who made this', 'who built this', 'developer contact', 'report issue', 'file complaint', 'give feedback', 'how to contact', 'reach out', 'support team', 'customer support', 'who is the developer'],
    response: "📧 **Contact & Support:**\n\nVNR Pool is built with ❤️ by VNRVJIET students!\n\n📬 **How to reach us:**\n• **In-app:** Use this chatbot for instant help!\n• **Email:** Contact through the college department\n• **Report users:** From their profile page directly\n\n💬 **For different issues:**\n• 🐛 **Bug reports** → Describe the issue here, or report via email\n• 💡 **Feature suggestions** → Share your ideas with the team\n• 🚨 **Safety concerns** → Report immediately + contact campus security\n• ⭐ **Feedback** → We love hearing from you!\n\n🏫 **College involvement:**\nVNR Pool is a student project aligned with VNRVJIET's commitment to innovation and sustainability. Reach out through the CSE/IT department if needed.\n\nWe read every piece of feedback! 📖",
    priority: 3,
  },

  // ── Hindi/Telugu Language ──────────────────
  {
    id: 'language',
    keywords: ['hindi', 'telugu', 'language', 'english', 'translate', 'telangana'],
    phrases: ['in hindi', 'in telugu', 'hindi me', 'telugu lo', 'change language', 'other language', 'which language', 'language support'],
    response: "🌐 **Language Support:**\n\nCurrently, VNR Pool is available in **English only**.\n\nBut don't worry — I understand casual language! You can type naturally:\n• \"bro how to book\" ✅\n• \"yaar ride chahiye\" → Try \"I need a ride\" 😊\n• \"cancel cheyandi\" → Try \"How to cancel\" 😊\n\n🔮 **Coming soon:** We're considering Telugu and Hindi language support in future updates!\n\nFor now, just type your question in simple English and I'll help you out! 💬",
    priority: 2,
  },

  // ── VNR Pool Stats ────────────────────────
  {
    id: 'stats',
    keywords: ['stats', 'statistics', 'numbers', 'count', 'total', 'users', 'rides', 'members', 'active', 'registered'],
    phrases: ['how many users', 'total users', 'total rides', 'app statistics', 'how many rides', 'how many students', 'is it popular', 'how big is vnr pool', 'active users', 'number of users'],
    response: "📊 **VNR Pool at a Glance:**\n\n🎓 **Platform:** Exclusive to VNRVJIET students\n📍 **Coverage:** 40+ predefined routes across Hyderabad\n🗺️ **Locations:** 500+ recognized landmarks & stops\n🚗 **Vehicle Types:** Cars, Bikes, and Auto-rickshaws\n\n🌟 **Features:**\n• Smart route matching with fractional pricing\n• Dynamic auto fare splitting\n• Interactive route maps\n• Eco Points & leaderboard\n• In-app messaging\n• DigiLocker verification\n• Trust score system\n• PWA — installable on any device\n\n🌱 **Impact:**\n• Every shared ride saves ~2.5 kg CO₂\n• Reduces campus traffic congestion\n• Builds a close-knit student community\n\n💡 Invite your classmates — the more users, the more rides available for everyone! 🚀",
    priority: 2,
  },
  // ── Daily Posting Limit ───────────────────
  {
    id: 'daily_limit',
    keywords: ['limit', 'maximum', 'post', 'posting', 'daily', 'day', 'once', 'twice', 'multiple'],
    phrases: ['how many rides can i post', 'daily limit', 'maximum rides', 'post multiple rides', 'can i post again', 'only one ride', 'limit per day'],
    response: "🚦 **Daily Ride Posting Limit:**\n\nTo keep the platform fair and prevent spam, there is a **daily limit** for drivers:\n\n• You can only have **1 active or in-progress ride per calendar day**.\n• Once you complete or cancel a ride, you can post another one!\n\nThis ensures genuine carpoolers get visibility and keeps the dashboard clean for everyone searching for rides. 🚗",
    priority: 5,
  },

  // ── Ride Start Window ─────────────────────
  {
    id: 'ride_start_window',
    keywords: ['start', 'begin', 'starting', 'window', 'early', 'when', 'button'],
    phrases: ['when can i start', 'start ride button', 'how to start ride', 'cant start ride', 'start button disabled', 'when to start', 'start ride early'],
    response: "▶️ **Starting Your Ride (For Drivers):**\n\nYou can only start your ride when it's almost time to leave!\n\n⏰ **The 30-Minute Rule:**\n• The \"Start Ride\" button becomes active exactly **30 minutes before** your scheduled departure time.\n• Once you click it, all approved passengers get a push notification: *\"Ride Started! 🚗\"*\n\nIf you try to start it too early, the button will be disabled. Just hang tight! ⏳",
    priority: 5,
  },

  // ── Booking/Routing Rules ─────────────────
  {
    id: 'booking_rules',
    keywords: ['rule', 'rules', 'bound', 'bounds', 'origin', 'destination', 'must'],
    phrases: ['ride rules', 'booking rules', 'why cant i post', 'origin destination rule', 'vnr rule', 'where can i go'],
    response: "📏 **Ride Routing Rules:**\n\nVNR Pool is designed exclusively for the college commute!\n\n✅ **The Golden Rule:**\nEither your **Origin** OR your **Destination** MUST be VNR VJIET (or a recognized campus gate/stop).\n\n• You can post: KPHB → VNR VJIET (Valid ✅)\n• You can post: VNR VJIET → Secunderabad (Valid ✅)\n• You CANNOT post: KPHB → Secunderabad (Invalid ❌)\n\nThis keeps our ecosystem focused on helping students get to and from college safely!",
    priority: 4,
  },

  // ── Women-Only Specifics ──────────────────
  {
    id: 'women_only_details',
    keywords: ['female-only', 'women-only', 'girls-only', 'hidden', 'invisible'],
    phrases: ['who can see women rides', 'cant see women rides', 'hidden rides', 'invisible rides', 'women only feature'],
    response: "🌸 **How Women-Only Rides Work:**\n\nOur Women-Only feature is strictly enforced for safety:\n\n👩 **For Female Drivers:**\n• Turn on the \"Women Only\" toggle when posting a ride.\n• Your ride will get a special Pink Shield badge.\n\n👁️ **Visibility Rules:**\n• **Only female users** can see Women-Only rides on the dashboard and map.\n• **Male users** cannot see, search for, or book these rides at all — they are completely invisible to them.\n\nIt's a safe, closed ecosystem within VNR Pool! 🛡️",
    priority: 6,
  },

  // ── Blocked Users ─────────────────────────
  {
    id: 'blocked_users',
    keywords: ['block', 'blocked', 'blocking', 'unblock', 'ban', 'banned', 'restrict'],
    phrases: ['how to block', 'block user', 'blocked someone', 'unblock user', 'what happens if i block', 'block driver', 'block passenger'],
    response: "🚫 **Blocking Users:**\n\nIf someone makes you uncomfortable or violates etiquette, you can block them:\n\n🔒 **What blocking does:**\n• They can no longer see your rides on the dashboard.\n• You won't see their rides either.\n• They cannot send you ride requests or messages.\n\nTo block someone, visit their Public Profile and use the block option. We take community safety seriously, and consistent bad behavior can lead to permanent bans. Stay safe! 💛",
    priority: 5,
  },
  // ── Lost & Found ──────────────────────────
  {
    id: 'lost_and_found',
    keywords: ['lost', 'found', 'forgot', 'left', 'phone', 'bag', 'wallet', 'item', 'belongings'],
    phrases: ['i lost my phone', 'i forgot my bag', 'left my wallet', 'lost item', 'lost and found', 'forgot something in car', 'driver forgot', 'left behind'],
    response: "🔍 **Lost & Found:**\n\nDid you leave something behind in a ride?\n\n1️⃣ **Contact the Driver/Passenger immediately:** Go to **My Rides** → find the completed ride → click the Call or Chat button.\n2️⃣ **If they don't answer:** Send them an in-app message, they might see it later.\n3️⃣ **Found something?** If you're a driver and found an item, message your last passengers to let them know!\n\n💡 Try to check your seat before you exit the vehicle. We hope you get your item back! 🤞",
    priority: 4,
  },

  // ── Luggage & Bags ────────────────────────
  {
    id: 'luggage',
    keywords: ['luggage', 'bag', 'bags', 'suitcase', 'backpack', 'heavy', 'carry', 'space', 'trunk', 'boot'],
    phrases: ['can i bring a bag', 'can i bring luggage', 'heavy luggage', 'big suitcase', 'space for bags', 'trunk space', 'carry bags', 'laptop bag'],
    response: "🎒 **Luggage & Bags:**\n\n• **Backpacks & Laptop bags:** Always fine! Just keep them on your lap or by your feet.\n• **Big Suitcases/Heavy Luggage:** You MUST ask the driver first via chat before the ride. Not all cars have empty trunk space, and bikes definitely don't!\n• **Auto Split:** Autos have limited space, so big luggage might be uncomfortable for others.\n\n💡 **Rule of thumb:** If it doesn't fit on your lap, message the driver first to confirm! 🚗",
    priority: 3,
  },

  // ── Traffic & Delays ──────────────────────
  {
    id: 'traffic',
    keywords: ['traffic', 'jam', 'delay', 'delayed', 'late', 'stuck', 'slow', 'wait'],
    phrases: ['heavy traffic', 'stuck in traffic', 'what if im late', 'driver is late', 'traffic jam', 'running late', 'will be late', 'route traffic'],
    response: "🚦 **Traffic & Delays:**\n\nHyderabad traffic can be unpredictable! 😫\n\n• **If you're running late:** Message or call your ride partner immediately. Drivers usually wait 5-10 minutes, but it's up to them.\n• **If the driver is stuck in traffic:** Check the chat for updates. You can track their live location if they share a Google Maps link.\n• **Alternative routes:** If there's a huge jam (like on Kukatpally main road), drivers might take inner roads (like Pragathi Nagar). Don't panic as long as you're heading to VNR!\n\n💡 Always aim to be at the pickup point 5 mins early to account for unexpected delays! ⏰",
    priority: 4,
  },

  // ── Music & AC in Car ─────────────────────
  {
    id: 'music_ac',
    keywords: ['music', 'song', 'songs', 'ac', 'air', 'conditioning', 'aux', 'bluetooth', 'play', 'loud'],
    phrases: ['can i play music', 'turn on ac', 'play songs', 'connect bluetooth', 'aux cable', 'is there ac', 'car ac', 'loud music'],
    response: "🎵 **Music & AC Etiquette:**\n\n🚗 **For Car Rides:**\n• **AC:** It's usually up to the driver. If you're feeling too hot/cold, politely ask them to adjust it! ❄️\n• **Music:** The driver controls the aux/bluetooth. Don't play your own music out loud on your phone — use earphones if you want to listen to your own playlist. 🎧\n\nRemember, you're sharing the space with classmates. Keep the vibes good and the volume reasonable! 😎",
    priority: 3,
  },

  // ── Smoking, Drinking, Vaping ─────────────
  {
    id: 'smoking',
    keywords: ['smoke', 'smoking', 'cigarette', 'vape', 'vaping', 'drink', 'drinking', 'alcohol', 'drunk'],
    phrases: ['can i smoke', 'can i vape', 'smoking allowed', 'drinking allowed', 'drunk passenger', 'driver is smoking'],
    response: "🚫 **Strict No-Smoking & Zero Tolerance Policy:**\n\n🚭 **Smoking & Vaping:** STRICTLY PROHIBITED inside any vehicle during a VNR Pool ride. This applies to both drivers and passengers.\n🍻 **Alcohol/Intoxication:** Zero tolerance. Do not use VNR Pool if you are intoxicated. Drivers have the right to refuse service to anyone who appears drunk.\n\n🚨 **Violations:** If someone is smoking, vaping, or intoxicated, cancel the ride, leave the vehicle, and **report them immediately**. This leads to a permanent ban from VNR Pool and potential escalation to college authorities.",
    priority: 7,
  },

  // ── Wait Times ────────────────────────────
  {
    id: 'wait_time',
    keywords: ['wait', 'waiting', 'how', 'long', 'minutes', 'min', 'mins', 'leave', 'left'],
    phrases: ['how long will driver wait', 'how long to wait', 'will they wait for me', 'waiting time', 'max wait time', 'driver left without me'],
    response: "⏱️ **Driver Waiting Time:**\n\nDrivers are fellow students trying to get to class on time!\n\n• **Standard Courtesy:** Drivers will typically wait **max 5-10 minutes** past the agreed time.\n• If you aren't there, they have the right to cancel your seat and leave so they (and other passengers) don't get marked absent for the 1st hour! 🏃‍♂️\n\n💡 **Tip:** Be at the pickup spot 5 mins early. If you're 2 mins away, CALL the driver so they know you're coming!",
    priority: 4,
  },

  // ── Low Ratings / Trust Score Impact ──────
  {
    id: 'low_rating',
    keywords: ['rating', 'ratings', 'star', 'stars', 'score', 'trust', 'low', 'bad', 'poor'],
    phrases: ['what happens if i get 1 star', 'bad rating', 'low trust score', 'improve rating', 'fake rating', 'someone gave me bad rating', 'how to increase score'],
    response: "📉 **Trust Scores & Low Ratings:**\n\nYour Trust Score (⭐) is your reputation on VNR Pool.\n\n• **What lowers it:** Canceling last minute, being late, rude behavior, reckless driving, or being a no-show.\n• **Consequences of a low score (< 3.0):** Drivers will reject your booking requests. Passengers won't book your rides.\n• **Can I dispute a rating?** We don't remove ratings manually to keep the system fair. The best way to fix a low score is to do better on your next rides! \n\nConsistent 1-star ratings for safety or harassment will result in an automatic account review and potential ban. 🛡️",
    priority: 5,
  },

  // ── ORR Tolls & Parking ───────────────────
  {
    id: 'tolls',
    keywords: ['toll', 'tolls', 'orr', 'gate', 'tax', 'parking', 'fee', 'extra'],
    phrases: ['who pays toll', 'orr toll', 'extra charges', 'parking fee', 'toll gate fee', 'is toll included', 'pay for toll'],
    response: "🛣️ **Tolls (ORR) & Extra Fees:**\n\nSometimes a ride takes the Outer Ring Road (ORR) which has toll gates.\n\n• **Rule:** The driver is responsible for the toll fee, UNLESS agreed otherwise in the chat before the ride starts.\n• **Passengers:** You only pay the exact seat price shown on the app. No surprise extra charges! 💸\n\nIf the driver asks you to split the toll, they must discuss it in the group chat *before* you board. If you don't agree, you can cancel the ride.",
    priority: 4,
  },

  // ── Referrals & Invites ───────────────────
  {
    id: 'referral',
    keywords: ['refer', 'referral', 'invite', 'friends', 'friend', 'share', 'link'],
    phrases: ['how to invite', 'refer a friend', 'referral code', 'share app', 'invite friends', 'do we get points for referring'],
    response: "🤝 **Inviting Friends to VNR Pool:**\n\nVNR Pool thrives on community! The more students use it, the more rides are available for everyone.\n\n• **How to share:** Just send them the website link! They can install it as an app from their browser.\n• **Who can join?** ONLY active VNR VJIET students with a valid `@vnrvjiet.in` email address.\n• **Referral Points?** We don't have a referral code system right now, but you earn Eco Points for every ride you take! 🌱\n\nTell your classmates and help reduce campus traffic! 🚀",
    priority: 3,
  },

  // ── Alumni & Passed Out Students ──────────
  {
    id: 'alumni',
    keywords: ['alumni', 'passed', 'out', 'graduated', 'graduate', 'seniors', 'passout'],
    phrases: ['can alumni use this', 'passed out students', 'i graduated', 'my vnrvjiet email expired', 'for alumni', 'former students'],
    response: "🎓 **Alumni & Graduated Students:**\n\nVNR Pool requires an active, verified `@vnrvjiet.in` email address to log in.\n\n• If your college email is still active, you can use the app!\n• Once the college deactivates your email after graduation, you won't be able to log in or create a new account.\n\nThis strict rule ensures that every user is a currently enrolled student or staff member, maintaining 100% safety for the community! 🔒",
    priority: 3,
  },

  // ── Helmets for Bike Rides ────────────────
  {
    id: 'helmet',
    keywords: ['helmet', 'helmets', 'bike', 'two', 'wheeler', 'police', 'challan'],
    phrases: ['do i need a helmet', 'bring my own helmet', 'does driver have helmet', 'bike ride helmet', 'police challan', 'two wheeler rules'],
    response: "🏍️ **Helmets for Bike Rides:**\n\nSafety first, always! 🪖\n\n• **Passengers:** Most drivers do NOT carry a spare helmet. If you book a bike ride, you should bring your own helmet if possible.\n• **Traffic Police:** Hyderabad Traffic Police strictly enforces helmets for pillion riders (passengers). If you get caught without one, the driver gets the challan!\n• **Best practice:** Message the driver in the app to ask if they have a spare. If not, and you don't have one, consider booking a car or auto ride instead to be completely safe from fines and accidents. 🚓",
    priority: 4,
  },

  // ── Pets in the Ride ──────────────────────
  {
    id: 'pets',
    keywords: ['pet', 'pets', 'dog', 'cat', 'animal', 'puppy', 'kitten'],
    phrases: ['can i bring my dog', 'can i bring my pet', 'are pets allowed', 'pet friendly', 'bring a cat'],
    response: "🐶 **Pets in Rides:**\n\nBringing a furry friend? \n\n• You MUST ask the driver for explicit permission via chat *before* booking or arriving at the pickup spot.\n• Most drivers do not allow pets due to allergies, shedding, or car cleanliness.\n• If the driver says no, please respect their decision and look for another ride.\n\n(We love pets, but we gotta respect the car owner's rules! 🐾🚗)",
    priority: 2,
  },
  // ── Missing Location / Suggest Location ───────────
  {
    id: 'location_missing',
    keywords: ['missing', 'location', 'not', 'found', 'add', 'suggest', 'landmark', 'stop', 'area', 'village'],
    phrases: ['location not found', 'cant find my location', 'my location is missing', 'add a location', 'add my area', 'how to add location', 'my stop is not there', 'suggest a location', 'support team location', 'cant see my area', 'my route is not there', 'where is my location'],
    response: "📍 **Can't find your location?**\n\nVNR Pool currently supports 40+ predefined routes and 500+ landmarks across Hyderabad.\n\nIf your specific area, village, or landmark isn't listed:\n1️⃣ **Try a nearby major landmark:** Search for the closest main road, X-roads, or Metro station.\n2️⃣ **Request a new location:** If a major student area is completely missing, please contact the **Support Team** or drop an email to get it added!\n\nWe regularly add new routes and stops based on student requests. Just let us know where you're commuting from! 🗺️",
    priority: 5,
  },
]

// ─── Follow-up Detection ──────────────────────────────────────────────
const FOLLOWUP_PATTERNS = [
  { patterns: ['how', 'how?', 'how do i', 'how to'], type: 'how' },
  { patterns: ['where', 'where?', 'where is', 'where can'], type: 'where' },
  { patterns: ['tell me more', 'more info', 'more details', 'explain more', 'elaborate', 'go on', 'and then', 'what else', 'continue'], type: 'more' },
  { patterns: ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'ya', 'yea', 'yah', 'please', 'do it', 'go ahead'], type: 'affirm' },
  { patterns: ['no', 'nah', 'nope', 'not really', 'nevermind', 'never mind', 'its ok', 'it\'s ok', 'no thanks'], type: 'deny' },
  { patterns: ['what', 'what?', 'what is', 'what\'s'], type: 'what' },
  { patterns: ['why', 'why?', 'why is', 'but why'], type: 'why' },
]

// ─── Context-Aware Related Topic Map ──────────────────────────────────
const RELATED_INTENTS: Record<string, string[]> = {
  'find_ride': ['post_ride', 'fare_split', 'route_map', 'cancel', 'popular_routes', 'timing', 'booking_rules'],
  'post_ride': ['find_ride', 'pricing', 'vehicles', 'ride_categories', 'vehicle_number', 'seats', 'daily_limit', 'booking_rules'],
  'cancel': ['find_ride', 'driver_noshow', 'my_rides', 'ride_approval'],
  'fare_split': ['dynamic_split', 'mid_route_join', 'fare_examples', 'pricing', 'savings'],
  'dynamic_split': ['mid_route_join', 'fare_examples', 'fare_split', 'ride_categories'],
  'mid_route_join': ['dynamic_split', 'fare_examples', 'fare_split', 'route_map', 'popular_routes'],
  'fare_examples': ['fare_split', 'dynamic_split', 'mid_route_join', 'pricing', 'savings'],
  'driver_noshow': ['cancel', 'safety', 'messaging', 'emergency', 'blocked_users'],
  'safety': ['women_safety', 'eligibility', 'eco_points', 'driver_noshow', 'digilocker', 'privacy', 'blocked_users'],
  'eco_points': ['savings', 'safety', 'how_it_works'],
  'messaging': ['find_ride', 'my_rides', 'ride_approval', 'blocked_users'],
  'signup': ['eligibility', 'profile', 'digilocker'],
  'pricing': ['fare_split', 'dynamic_split', 'mid_route_join', 'ride_categories', 'savings', 'comparison'],
  'profile': ['signup', 'safety', 'digilocker', 'logout'],
  'vehicles': ['ride_categories', 'post_ride', 'vehicle_number', 'seats'],
  'ride_categories': ['vehicles', 'pricing', 'fare_split', 'dynamic_split', 'comparison'],
  'route_map': ['find_ride', 'mid_route_join', 'popular_routes', 'pickup_drop'],
  'my_rides': ['cancel', 'messaging', 'find_ride', 'ride_approval', 'ride_start_window'],
  'popular_routes': ['route_map', 'find_ride', 'college_info', 'pickup_drop'],
  'college_info': ['popular_routes', 'hostel', 'pickup_drop', 'booking_rules'],
  'digilocker': ['safety', 'profile', 'signup', 'women_safety'],
  'install_app': ['notifications', 'how_it_works', 'theme'],
  'notifications': ['install_app', 'ride_approval', 'my_rides', 'ride_start_window'],
  'ride_approval': ['my_rides', 'messaging', 'cancel', 'notifications'],
  'women_safety': ['safety', 'emergency', 'digilocker', 'night_rides', 'women_only_details'],
  'weather': ['vehicles', 'timing', 'find_ride'],
  'hostel': ['college_info', 'popular_routes', 'savings'],
  'savings': ['fare_split', 'comparison', 'eco_points', 'pricing'],
  'etiquette': ['ride_approval', 'safety', 'messaging', 'blocked_users'],
  'comparison': ['savings', 'pricing', 'ride_categories'],
  'night_rides': ['women_safety', 'safety', 'timing'],
  'group_rides': ['seats', 'fare_split', 'find_ride'],
  'emergency': ['women_safety', 'safety', 'contact_support', 'blocked_users'],
  'semester_tips': ['timing', 'find_ride', 'hostel'],
  'vehicle_number': ['vehicles', 'post_ride'],
  'seats': ['vehicles', 'find_ride', 'group_rides'],
  'pickup_drop': ['popular_routes', 'route_map', 'college_info', 'booking_rules'],
  'logout': ['profile', 'signup'],
  'theme': ['install_app', 'how_it_works'],
  'future': ['contact_support', 'how_it_works'],
  'privacy': ['safety', 'digilocker', 'contact_support'],
  'contact_support': ['emergency', 'issues', 'future'],
  'language': ['bot_capabilities', 'how_it_works'],
  'stats': ['eco_points', 'how_it_works', 'popular_routes'],
  'daily_limit': ['post_ride', 'my_rides'],
  'ride_start_window': ['my_rides', 'notifications', 'timing'],
  'booking_rules': ['post_ride', 'find_ride', 'pickup_drop'],
  'women_only_details': ['women_safety', 'privacy', 'post_ride'],
  'blocked_users': ['safety', 'etiquette', 'messaging'],
  'lost_and_found': ['messaging', 'my_rides', 'contact_support'],
  'luggage': ['vehicles', 'etiquette', 'messaging'],
  'traffic': ['wait_time', 'messaging', 'safety'],
  'music_ac': ['etiquette', 'vehicles'],
  'smoking': ['safety', 'emergency', 'blocked_users', 'etiquette'],
  'wait_time': ['traffic', 'etiquette', 'messaging', 'driver_noshow'],
  'low_rating': ['etiquette', 'safety', 'blocked_users'],
  'tolls': ['pricing', 'fare_split', 'messaging'],
  'referral': ['eco_points', 'stats', 'how_it_works'],
  'alumni': ['eligibility', 'signup', 'privacy'],
  'helmet': ['vehicles', 'safety', 'etiquette'],
  'pets': ['etiquette', 'messaging'],
  'location_missing': ['contact_support', 'route_map', 'popular_routes', 'pickup_drop'],
}

// ─── Core Engine ──────────────────────────────────────────────────────
function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^\w\s'?!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeInput(text).split(' ').filter(Boolean)
}

function scoreIntent(input: string, tokens: string[], intent: Intent): number {
  let score = 0
  const normalized = normalizeInput(input)

  // 1. Exact phrase matches (highest value)
  for (const phrase of intent.phrases) {
    if (normalized.includes(phrase)) {
      score += 15 + phrase.split(' ').length * 3 // longer phrases = more specific = higher score
    }
  }

  // 2. Keyword matches
  for (const keyword of intent.keywords) {
    for (const token of tokens) {
      if (token === keyword) {
        score += 5
      } else if (fuzzyMatch(token, keyword)) {
        score += 3 // fuzzy match gets partial credit
      }
    }
  }

  // 3. Priority bonus
  score += (intent.priority || 0)

  return score
}

function getLastAssistantIntentId(history: ChatMessage[]): string | null {
  // Walk backwards through history to find what topic we were discussing
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant') {
      const content = history[i].content.toLowerCase()
      // Match the response to an intent by checking distinctive keywords
      for (const intent of INTENTS) {
        const resp = Array.isArray(intent.response) ? intent.response[0] : intent.response
        // Check first 50 chars of the intent response against the assistant message
        const snippet = resp.substring(0, 80).toLowerCase()
        if (content.includes(snippet.substring(0, 40))) {
          return intent.id
        }
      }
    }
  }
  return null
}

function detectFollowUp(input: string): string | null {
  const normalized = normalizeInput(input)
  const tokens = tokenize(input)
  
  // Very short inputs are likely follow-ups
  if (tokens.length <= 3) {
    for (const fp of FOLLOWUP_PATTERNS) {
      for (const pattern of fp.patterns) {
        if (normalized === pattern || normalized.startsWith(pattern + ' ')) {
          return fp.type
        }
      }
    }
  }
  return null
}

export function generateResponse(input: string, history: ChatMessage[]): string {
  const normalized = normalizeInput(input)
  const tokens = tokenize(input)

  // ── Empty input guard ───────────────────────
  if (!normalized || tokens.length === 0) {
    return "I didn't quite catch that! 😅 Try asking me about booking rides, fare splitting, or anything about VNR Pool!"
  }

  // ── Follow-up detection ─────────────────────
  const followUpType = detectFollowUp(normalized)
  if (followUpType && history.length >= 2) {
    const lastIntentId = getLastAssistantIntentId(history)

    if (followUpType === 'deny') {
      return "No problem! 😊 Is there anything else I can help you with? Feel free to ask about rides, fares, safety, or anything about VNR Pool!"
    }

    if (followUpType === 'affirm' || followUpType === 'more') {
      if (lastIntentId && RELATED_INTENTS[lastIntentId]) {
        const relatedIds = RELATED_INTENTS[lastIntentId]
        const relatedIntent = INTENTS.find(i => i.id === relatedIds[0])
        if (relatedIntent) {
          const resp = Array.isArray(relatedIntent.response)
            ? relatedIntent.response[Math.floor(Math.random() * relatedIntent.response.length)]
            : relatedIntent.response
          return resp + (relatedIntent.followUp ? `\n\n💡 ${relatedIntent.followUp}` : '')
        }
      }
    }

    // For "how"/"where"/"what" follow-ups, provide context-specific help
    if ((followUpType === 'how' || followUpType === 'where' || followUpType === 'what') && lastIntentId) {
      const contextIntent = INTENTS.find(i => i.id === lastIntentId)
      if (contextIntent) {
        const resp = Array.isArray(contextIntent.response)
          ? contextIntent.response[0]
          : contextIntent.response
        return `Here's a more detailed look:\n\n${resp}`
      }
    }
  }

  // ── Score all intents ───────────────────────
  const scored = INTENTS.map(intent => ({
    intent,
    score: scoreIntent(normalized, tokens, intent),
  })).filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  // ── Return best match ───────────────────────
  if (scored.length > 0 && scored[0].score >= 5) {
    const bestIntent = scored[0].intent
    let response = Array.isArray(bestIntent.response)
      ? bestIntent.response[Math.floor(Math.random() * bestIntent.response.length)]
      : bestIntent.response

    const wantsDetails = /\b(detail|details|detailed|elaborate|explain|more|everything|long|full)\b/i.test(normalized)

    // Truncate long responses for brevity unless details are requested
    if (!wantsDetails && response.includes('\n\n')) {
      const parts = response.split('\n\n');
      if (parts.length > 2) {
        response = parts.slice(0, 2).join('\n\n');
        const followUpText = bestIntent.followUp 
          ? `💡 ${bestIntent.followUp} (Or say "elaborate" for full details)`
          : `💡 Want more details? Just ask me to elaborate!`;
        return `${response}\n\n${followUpText}`;
      }
    }

    // Add follow-up suggestion if available and no truncation happened
    if (bestIntent.followUp) {
      return `${response}\n\n💡 ${bestIntent.followUp}`
    }
    return response
  }

  // ── Contextual fallback (reference previous topic) ──
  if (history.length >= 2) {
    const lastIntentId = getLastAssistantIntentId(history)
    if (lastIntentId) {
      return `Hmm, I'm not sure about that specific question 🤔\n\nWe were just talking about **${lastIntentId.replace(/_/g, ' ')}** — do you have more questions about that?\n\nOr try asking me about:\n🚗 Booking or posting rides\n💰 Fare splitting\n🛡️ Safety features\n🌱 Eco Points\n📱 Using the app\n\nI'm here to help! 😊`
    }
  }

  // ── Generic fallback ────────────────────────
  return "I'm not quite sure about that one! 🤔\n\nHere are things I can definitely help with:\n\n🚗 **\"How do I find a ride?\"**\n📝 **\"How do I post a ride?\"**\n💰 **\"How does fare splitting work?\"**\n❌ **\"How do I cancel a booking?\"**\n🛡️ **\"Is it safe?\"**\n🌱 **\"What are Eco Points?\"**\n🔐 **\"Who can use VNR Pool?\"**\n\nJust pick a topic or rephrase your question! 😊"
}
