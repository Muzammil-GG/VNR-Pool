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
    response: "🤖 **I'm your VNR Pool Assistant!**\n\nI can help you with:\n\n🚗 **Rides** — How to find, book, post, or cancel rides\n💰 **Fares** — How pricing and fare splitting works\n🛡️ **Safety** — Trust scores, ratings, and reporting\n🌱 **Eco Points** — How to earn and track your green impact\n📱 **Navigation** — Finding features in the app\n🔐 **Account** — Signup, login, and profile help\n🗺️ **Maps** — Using route maps to find rides\n❓ **General** — How VNR Pool works overall\n\nJust type your question naturally — I understand casual language! 😊\n\n*Try: \"How do I split the fare?\" or \"My driver didn't show up\"*",
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
  'find_ride': ['post_ride', 'fare_split', 'route_map', 'cancel'],
  'post_ride': ['find_ride', 'pricing', 'vehicles', 'ride_categories'],
  'cancel': ['find_ride', 'driver_noshow', 'my_rides'],
  'fare_split': ['dynamic_split', 'mid_route_join', 'fare_examples', 'pricing'],
  'dynamic_split': ['mid_route_join', 'fare_examples', 'fare_split', 'ride_categories'],
  'mid_route_join': ['dynamic_split', 'fare_examples', 'fare_split', 'route_map'],
  'fare_examples': ['fare_split', 'dynamic_split', 'mid_route_join', 'pricing'],
  'driver_noshow': ['cancel', 'safety', 'messaging'],
  'safety': ['eligibility', 'eco_points', 'driver_noshow'],
  'eco_points': ['safety', 'how_it_works'],
  'messaging': ['find_ride', 'my_rides'],
  'signup': ['eligibility', 'profile'],
  'pricing': ['fare_split', 'dynamic_split', 'mid_route_join', 'ride_categories'],
  'profile': ['signup', 'safety'],
  'vehicles': ['ride_categories', 'post_ride'],
  'ride_categories': ['vehicles', 'pricing', 'fare_split', 'dynamic_split'],
  'route_map': ['find_ride', 'mid_route_join'],
  'my_rides': ['cancel', 'messaging', 'find_ride'],
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
    const response = Array.isArray(bestIntent.response)
      ? bestIntent.response[Math.floor(Math.random() * bestIntent.response.length)]
      : bestIntent.response

    // Add follow-up suggestion if available
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
