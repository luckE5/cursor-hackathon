🧠 ChronoSync — AI-Powered Scheduling & Coordination Platform
ChronoSync is a modern, AI-powered scheduling platform designed to help individuals, students, and teams plan their time intelligently and coordinate effortlessly.
Unlike traditional calendar apps, ChronoSync focuses on decision-making and negotiation of time, not just tracking it.
🚀 Problem
Managing time across people is still messy:
Endless back-and-forth messages
No clear visibility of availability
Hard to plan tasks without structure
Calendars don’t help you decide time, they only show time
💡 Solution
ChronoSync solves this by combining:
🧠 AI-powered schedule generation
🔄 Real-time schedule coordination
🤝 Time request & negotiation system
✨ Key Features
🧑‍💻 Personal Scheduling
Create flexible daily/weekly schedules
Add time blocks (work, study, meetings, free time)
Fully editable and customizable
🤖 AI Schedule Generation
Input natural language:
“I have DSA, gym, classes, I am a night owl”
AI generates structured schedules automatically
Considers:
preferences (morning/night)
workload balance
breaks
📋 Task-to-Schedule Conversion
Input only tasks
AI assigns optimal time slots
Ideal for students and productivity-focused users
🔐 Permission-Based Sharing
Users control who can view their schedule
Request-based visibility
Privacy-first approach
📩 Time Request System (Core Feature)
Request specific time slots from others
Works in 2 scenarios:
1. Overlap exists
Auto-suggest best time
One-click confirmation
2. No overlap
Request any time
Receiver can:
accept
reject
suggest alternative
🔄 Negotiation Flow
Real-world scheduling flexibility
Dynamic interaction between users
👀 Shared Schedule View
Visual comparison of schedules
Highlights:
overlapping time
conflicts
requested slots
⚡ Real-Time Updates
Instant synchronization
Both users’ schedules update after confirmation
🏢 Organization / Corporate Mode (Concept)
Shared visibility within teams
Managers can assign meeting slots
Efficient coordination within working hours
🛠️ Tech Stack
Frontend
Next.js (App Router)
TypeScript
Tailwind CSS
shadcn/ui
v0 (UI generation)
Backend
Convex (database + real-time functions)
AI
OpenAI API (schedule generation & parsing)
Development
Cursor (AI-assisted coding)
Design
Mobbin (UI inspiration)
🧩 Architecture
Id="arch"
Copy code
Frontend (Next.js)
      ↓
Convex (Realtime Backend)
      ↓
OpenAI (AI Engine)
      ↓
Convex (Store Results)
      ↓
Frontend (Live Updates)
🔁 User Flow
User signs in
Inputs tasks or schedule preferences
AI generates structured schedule
User sends time request
Receiver accepts/rejects/suggests
Meeting is finalized
Both schedules update in real-time
🧪 Running Locally
1. Clone the repo
Bash id="clone"
Copy code
git clone <your-repo-url>
cd chronosync
2. Install dependencies
Bash id="install"
Copy code
npm install
3. Start Convex backend
Bash id="convex"
Copy code
npx convex dev
4. Setup environment variables
Create .env.local and add:
Env id="env"
Copy code
NEXT_PUBLIC_CONVEX_URL=your_convex_url
OPENAI_API_KEY=your_openai_key
5. Start frontend
Bash id="dev"
Copy code
npm run dev
6. Open in browser
Copy code

http://localhost:3000
🎬 Demo
(Add your demo video link here)
🌍 Vision
ChronoSync is built for the next billion users — simplifying time management and making coordination effortless across personal and professional environments.
📌 Future Improvements
Google Calendar integration
Advanced privacy controls
Smart multi-user scheduling (AI group coordination)
Notifications & reminders
👥 Team
(Add your team members here)
📄 License
MIT License
🔥 Final Note
ChronoSync is not just a calendar —
it’s a smarter way to plan, decide, and coordinate time.
