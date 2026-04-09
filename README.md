🎲 IceBreaker HQ
High-energy, non-competitive digital board game to reset brains and build rapport prior to an ideation workshop.

Running Locally
1. Clone/Unzip repository.
2. Install dependencies: npm install
3. Create a .env.local file, with:
   - NEXTPUBLICSUPABASEURL=yoururl
   - NEXTPUBLICSUPABASEANONKEY=your_key
4. Start a development server: npm run dev
5. Access the admin section: /admin

Features
- Join instantly: Participants scan a QR code and do not need to install anything or sign up.
- Role-based: Each team designates a "Captain" to roll dice and send challenges on the big screen, and everyone plays!
- Admin panel: Facilitators can manage prompts-adding, removing, or turning them on/off.
- Wildcard selection: The facilitator chooses the categories to use for the team challenges.
- No competition: A clean way to kick off a workshop without adding any pressure.

Facilitator Guide
1. Launch the application and create a session.
2. Present the QR code on a large screen.
3. Once the teams have joined, click Start Challenge.
4. Use the Admin panel at /admin to pre-load any of your favorite prompts.
5. The facilitator can stop the session whenever they are ready to move into the ideation phase.

Technical Assumptions
1. Realtime Engine: Using Supabase Realtime to synchronise movements.
2. Database for Session and Prompts: All session states and prompts are in a Supabase DB so we can recover a session or replay one.
3. Responsive UI: Designing specifically for a shared projector (host) and phone displays (players).