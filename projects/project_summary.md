# Project Portfolio Summary (Jan – April 2026)

A comprehensive overview of the 11 active projects in my ecosystem, categorized by their role, impact, and technical architecture.

---

### 1. **StackAlchemist** (The SaaS "Gold" Maker)
*   **In Plain English:** Imagine telling an AI, "I want to build a fitness app with a subscription model," and instead of just getting advice, you get a fully functional, professional-grade codebase that is already tested and ready to launch. It’s an "Alchemist" because it turns rough ideas into "gold" (shippable software) while guaranteeing that the code actually works and isn't just "guessing" (hallucinating).
*   **The Tech Breakdown:** Built with **.NET 10** and **Next.js 15**. It uses **Claude 3.5 Sonnet** as the brain and a custom "Swiss Cheese" logic to inject unique code into solid templates. It even runs real `dotnet build` checks in the background to guarantee the code works before you download it.
*   **Role:** Founder & Lead Architect. I built the "Repair Loop" that prevents AI hallucinations from breaking the final product.

### 2. **Myelix Core** (Proprietary Health Intelligence)
*   **In Plain English:** The "Brain" of the Myelix ecosystem. It handles the heavy-duty research and machine learning that powers privacy-first health monitoring. It processes population-level data anonymously to find health trends without ever knowing who the individual users are.
*   **The Tech Breakdown:** A private **ASP.NET 10** API and **Python/PyTorch** pipeline for training advanced TCN (Temporal Convolutional Network) models. It exports these models as **ONNX** files to run locally on users' phones.
*   **Role:** Principal Researcher. I designed the federated learning pipeline that allows the AI to learn from everyone's data without that data ever leaving their devices.

### 3. **Myelix Community** (Privacy-First Mobile Client)
*   **In Plain English:** The public-facing app for Myelix. It turns your phone into a "Sovereign Vault" that tracks your "resilience" (how well you handle stress) by looking at walking patterns and typing speed. It is 100% privacy-first; your biometric data never leaves your phone.
*   **The Tech Breakdown:** A **.NET 10 MAUI** mobile app (Android/iOS) using **ONNX Runtime** for local AI inference. It uses **SQLite with SQLCipher** for military-grade on-device encryption.
*   **Role:** Platform Lead. I built the "Ghost Mode" baseline engine and the Sync pipeline that guarantees no raw biometric data is ever uploaded.

### 4. **Axon** (The Sovereign Biometric Vault)
*   **In Plain English:** A professional dashboard for "bio-hackers." It pulls data from Garmin, Oura, and Apple Health into a single, high-speed app that runs entirely offline. It’s for people who want total "data sovereignty"—no subscriptions, no cloud, no tracking.
*   **The Tech Breakdown:** A high-performance **C# 14** app using **SkiaSharp** to render millions of data points at a silky-smooth **120fps**. It uses **Native AOT** (Ahead-of-Time compilation) so it starts instantly and uses almost no memory.
*   **Role:** Performance Engineer. I implemented the "LTTB Downsampling" which allows the app to show 10 years of heart rate data without lagging.

### 5. **Synap Ecosystem** (The 2-Minute Learning App)
*   **In Plain English:** A "Duolingo for professional skills." It’s a mobile app that gives you one 2-minute lesson a day. Instead of multiple-choice, it uses AI to listen to your feedback and give you a real grade on how well you understood the concept.
*   **The Tech Breakdown:** A monorepo using **Kotlin Multiplatform (KMP)** for the mobile app and **.NET 10** for the backend. It uses versioned JSON payloads so the app can work perfectly even when you're offline.
*   **Role:** Full-Stack Architect. I’m currently building the "Content Schema" that allows new lessons to be dropped in without updating the app.

### 6. **Syzm** (The AI Revenue Rescuer)
*   **In Plain English:** A FinTech tool for streaming businesses. When a customer's credit card fails, Syzm uses AI to predict when they’ll actually have money in their account (like right after payday) and retries the payment then, instead of just canceling their account.
*   **The Tech Breakdown:** **FastAPI (Python)** for the "Brain" and **Supabase/PostgreSQL** for the heavy lifting. It’s built to be "processor-agnostic," meaning it works with Stripe, Adyen, and Braintree simultaneously.
*   **Role:** Backend/FinTech Specialist. I built the "Retry Guard" that ensures businesses follow 2026 banking compliance rules.

### 7. **Roast & Resolve** (The Viral Funnel)
*   **In Plain English:** A fun, viral website where you upload your resume or dating profile to get "roasted" by a mean AI. Once you're done laughing at the insults, you can pay a few bucks to "Resolve" it—where the same AI gives you a professional, high-end version of what you uploaded.
*   **The Tech Breakdown:** **Next.js 15** and **GPT-4o Vision**. It literally "sees" your resume layout or dating photos to give its critique. It uses **Cloudflare R2** for fast, cheap image storage of your "Roast Cards."
*   **Role:** Growth Engineer. I designed the "two-phase" loop that turns social media laughs into paid professional services.

### 8. **Remit HQ** (Cross-Border Payout Ops)
*   **In Plain English:** A command center for U.S. companies that pay international contractors. It handles the messy stuff like currency conversion, compliance, and tracking invoices across borders in one clean dashboard.
*   **The Tech Breakdown:** A high-end **Next.js 16** prototype using **Tailwind CSS v4** (the newest version) and a **.NET 10** backend scaffold.
*   **Role:** UI/UX & Frontend Lead. I built the "Ops Console" prototype that visualizes global ledgers and payout queues.

### 9. **undertow-engine** (The Video Factory)
*   **In Plain English:** An automated "ghostwriter" for video. It takes a script and automatically renders a short-form video (like a TikTok) with music, captions, and visuals, ready to be posted without a human editor ever touching a mouse.
*   **The Tech Breakdown:** **Python (FastAPI)** and **MoviePy**. It uses **Playwright** to "film" browser-based animations and **Celery** to process the video rendering in the background.
*   **Role:** Automation Architect. I created the "compositing engine" that layers the video elements together.

### 10. **steveackley.org** (The Personal Hub)
*   **In Plain English:** My professional portfolio and the "brains" of my online presence. I've recently turned it into a "monorepo" so that my blog, my projects, and my private admin tools all live together but run independently for maximum speed and security.
*   **The Tech Breakdown:** **Astro 5** (for the public site) and **Next.js 16** (for the private portal). It's hosted on a dedicated **AWS instance** using **Cloudflare Tunnels** for high security.
*   **Role:** Staff Engineer. I’m currently migrating this to a dedicated server to isolate it from my test environments.

### 11. **p1-opshub** (The Operational Nerve Center)
*   **In Plain English:** The private dashboard I use to manage all my *other* projects. It’s my internal "mission control" for monitoring the health of my AWS servers and tracking every deployment I make.
*   **The Tech Breakdown:** **Docker Compose** orchestration on AWS, managing a mix of **PostgreSQL** databases and **Nginx** gateways.
*   **Role:** DevOps/SRE. I maintain the "release gates" and health checks that keep my production apps running 24/7.
