# FlowSign — Intelligent Employee Onboarding

AI-powered onboarding demo built with Next.js, Claude, Supabase, Clerk, and Resend.

---

## Architecture

```
Next.js (Vercel)
  └── Clerk Auth (RBAC)
  └── Agent Layer
        ├── Alex Agent       — Conversational onboarding (Claude)
        ├── Orchestrator     — Flow coordination & state
        └── Ticket Agent     — SNow ticket generation
  └── Adapter Layer (swap fake → real)
        ├── HRIS             → Workday
        ├── Device           → Jamf / Apple Business
        ├── Ticketing        → ServiceNow
        └── Email            → Resend
  └── Supabase
        ├── State & session storage
        └── Realtime subscriptions
```

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd flowsign
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ONBOARDING_ASSISTANT_ID`
- `OPENAI_IT_ASSISTANT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`

### 3. Supabase — run the schema

1. Go to your Supabase project → SQL Editor
2. Open `supabase/schema.sql`
3. Run the entire file
4. This creates all tables and seeds the fake employee data

### 4. Clerk — create demo users

1. Go to Clerk Dashboard → Users → Create User
2. Create these four users with **exactly** these emails:

| Name | Email | Role (metadata) |
|---|---|---|
| Jordan Chen | jordan.standard@example.com | new_hire |
| Jordan Chen (exception) | jordan.exception@example.com | new_hire |
| Priya Rajan | priya@example.com | it_admin |
| Marcus Torres | marcus@example.com | hiring_manager |

3. For each user, add public metadata: `{ "role": "<role>", "employeeId": "<id>" }`

Employee IDs from the seed data:
- Jordan: `a1000000-0000-0000-0000-000000000001`
- Priya: `a1000000-0000-0000-0000-000000000002`
- Marcus: `a1000000-0000-0000-0000-000000000003`

### 5. Update Supabase employee clerk_user_ids

After creating Clerk users, grab their Clerk user IDs and run in Supabase SQL editor:

```sql
update employees set clerk_user_id = 'user_xxxxx' where email = 'jordan.standard@example.com';
update employees set clerk_user_id = 'user_xxxxx' where email = 'priya@example.com';
update employees set clerk_user_id = 'user_xxxxx' where email = 'marcus@example.com';
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Flow

### Standard Path (auto-approval)
1. Select **Jordan Chen — Standard** on the persona picker
2. Alex starts with a short onboarding checklist, then moves into laptop setup
3. Choose the standard device and capture setup preferences
4. Watch the standard request auto-approve and generate a SNow prep ticket
5. Switch to **Priya** → see the ticket in the SNow tab

### Exception Path (approval workflow)
1. Select **Jordan Chen — Exception** on the persona picker
2. Request the MacBook Pro 16"
3. Alex presents a simple choice: stay with standard or file an exception
4. If Jordan insists, the exception is created for review
5. Open **two browser windows**: Marcus + Priya
6. Marcus sees the request in **Needs Your Approval** and approves first
7. Priya then sees IT approval become actionable
8. Once both approve, the SNow device/procurement ticket fires and emails send

---

## Swapping Adapters (production)

Each adapter in `src/lib/adapters/` has a fake implementation and a commented TODO for the real one.

To swap to Workday:
```typescript
// src/lib/agents/orchestrator.ts
// Replace:
import { FakeHRISAdapter } from '../adapters/hris/fake'
// With:
import { WorkdayHRISAdapter } from '../adapters/hris/workday'
```

Same pattern for ServiceNow, Jamf, etc.

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all `.env.local` variables to Vercel dashboard → Settings → Environment Variables.

---

## Notes for Demo / Repo Hygiene

- Vercel is now connected to the GitHub repo, so pushes to `master` should auto-deploy.
- Keep `.vercel/`, `.env*`, and local build output out of git.
- `.env.local.example` is the shareable template; `.env.local` stays local only.
- If onboarding copy starts feeling repetitive again, tune `src/lib/agents/alex.ts` and `src/lib/agents/assistantRuntime.ts` together so the UI and agent prompts stay aligned.

## Stack

- **Frontend**: Next.js 14, Tailwind CSS
- **Auth**: Clerk
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Database**: Supabase (Postgres + Realtime)
- **Email**: Resend
- **Deploy**: Vercel
