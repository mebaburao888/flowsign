# FlowSign — Full Rebuild Task

## Goal
Flip the onboarding flow from chat-first to checklist-first. The checklist dashboard IS the home screen. Chat/agent is a tool within each step.

## Current State
- `/onboarding` → opens a chatbot
- `/onboarding/docs` → doc signing panel
- `/onboarding/documents` → intro screen before docs

## Target State

### `/onboarding` → Checklist Dashboard (REPLACE ENTIRELY)
This page must:
1. Load all onboarding tasks from `/api/tasks?employeeId=a1000000-0000-0000-0000-000000000001`
2. Show a visual checklist with 4 items:
   - Sign NDA (task_type: doc_signing)
   - Laptop Setup (task_type: device_setup)
   - Payroll & Benefits (task_type: payroll_setup)
   - Orientation (task_type: orientation)
3. Each item shows status: ✅ done | 🟡 in_progress | ⚪ pending | 🔴 blocked
4. Each item is clickable → routes to its dedicated page
5. Greet by name: "Welcome, Jordan!" at the top
6. Show overall progress: "2 of 4 complete"
7. On re-entry, always reads from DB — never resets
8. For device_setup tasks that are `in_progress` (exception filed): show the approval chain status inline on the card:
   - Read from device_requests table via `/api/requests?type=my_requests&employeeId=...`
   - Show: "Pending manager approval" / "Manager approved — pending IT" / "Fully approved" / "Shipped"
   - Make card non-clickable while in exception approval chain (show status only)
9. Header: FlowSign logo + "Jordan Chen" avatar + reset button

### New API endpoint needed: GET `/api/tasks?employeeId=xxx`
Add to `src/app/api/tasks/route.ts`:
- Returns all tasks for employee from `onboarding_tasks` table
- Returns device_request status if task_type=device_setup has a pending exception

### `/onboarding/documents` → Intro screen (keep existing but update)
- Route: show only NDA (not Benefits)
- Benefits belongs in `/onboarding/payroll` instead
- Button routes to `/onboarding/docs`

### `/onboarding/docs` → Doc signing (NDA ONLY)
- Remove Benefits document entirely from this page
- Only show NDA
- REQUIRED_DOC_IDS = ['nda'] (update in src/lib/documents.ts)
- On complete → mark doc_signing task done → route back to `/onboarding` checklist

### `/onboarding/laptop` → NEW: Laptop setup page (replaces old chat-based laptop flow)
Create `src/app/onboarding/laptop/page.tsx`:
- This is an Alex chat page, same UX as the old `/onboarding` chat
- But scoped only to laptop setup
- Copy the existing onboarding chat page (src/app/onboarding/page.tsx) as the base
- Strip the checklist sidebar widget (it's now on the dashboard)
- Strip contextual chips entirely (they were removed already)
- Alex focuses only on laptop: confirm standard or request exception
- On READY_TO_SUBMIT → mark device_setup task done → redirect to `/onboarding`
- On EXCEPTION_REQUESTED → mark device_setup as in_progress → redirect to `/onboarding` (checklist shows approval status)
- Header shows back button → `/onboarding`

### `/onboarding/payroll` → NEW: Payroll & Benefits page
Create `src/app/onboarding/payroll/page.tsx`:
- Simple informational + acknowledgment page (no agent needed)
- Show the Benefits & Payroll document from src/lib/documents.ts (the 'benefits' doc)
- Show the document content in a scrollable panel
- "I acknowledge and agree" button at bottom
- On click → POST /api/docs with action: 'sign', docId: 'benefits' → mark payroll_setup task done → redirect to `/onboarding`
- Alex Q&A sidebar (same as docs page) for questions about benefits

### `/onboarding/orientation` → NEW: Orientation page
Create `src/app/onboarding/orientation/page.tsx`:
- Show 3 hardcoded orientation session options as clickable cards:
  1. "Engineering Onboarding" — Tue Apr 14 · 10:00 AM (60 min) — Meet the team, tooling overview
  2. "Product Walkthrough" — Wed Apr 15 · 2:00 PM (45 min) — Product demo, roadmap
  3. "Manager 1:1" — Thu Apr 16 · 9:00 AM (30 min) — Goals, expectations, first 30 days
- On select → confirm dialog → mark orientation task done → redirect to `/onboarding`
- Show "Calendar invite will be sent to jordan.chen@flowsign.com"

### State persistence fixes
In `/onboarding/laptop/page.tsx` (copy of old onboarding page):
- Keep the session persistence logic (reads saved conversation from DB on reload)
- Keep the thread ID persistence
- Keep the submittingRef guard for duplicate tickets

### API: GET `/api/requests?type=my_requests&employeeId=xxx`
Add to the existing requests route GET handler:
- Query device_requests where employee_id = employeeId
- Return the most recent one with fields: request_type, status, manager_approval, it_admin_approval, snow_device_ticket
- This powers the checklist dashboard approval chain display

### Reset behavior
The reset action in `/api/requests` already clears signed_documents, device_requests, and tasks.
Make sure the reset button on the laptop page also resets tasks back to pending.

## Files to create/modify

CREATE:
- src/app/api/tasks/route.ts
- src/app/onboarding/laptop/page.tsx (copy + trim onboarding/page.tsx)
- src/app/onboarding/payroll/page.tsx
- src/app/onboarding/orientation/page.tsx

MODIFY:
- src/app/onboarding/page.tsx → replace with checklist dashboard
- src/app/onboarding/documents/page.tsx → update to only mention NDA
- src/lib/documents.ts → REQUIRED_DOC_IDS = ['nda'] only
- src/app/api/requests/route.ts → add my_requests GET type
- middleware.ts → add /api/tasks to public routes

DO NOT MODIFY:
- src/app/onboarding/docs/page.tsx (doc signing panel — already works)
- src/lib/agents/ (agent logic — leave alone)
- src/lib/adapters/ (leave alone)
- supabase/schema.sql (leave alone — DB is live)

## Supabase tables available
- onboarding_tasks: id, employee_id, task_type, title, status, priority, metadata
- device_requests: id, employee_id, status, manager_approval, it_admin_approval, snow_device_ticket, request_type
- signed_documents: id, employee_id, doc_id

## Important constraints
- TypeScript strict mode — no `any` unless absolutely necessary, use proper types
- All pages are 'use client'
- API routes are server-side (no 'use client')
- useSearchParams() must be wrapped in Suspense
- No new npm packages — only use what's already in package.json
- Tailwind only for styling
- Keep brand colors: brand-500 (#0c81eb equivalent), slate palette
- Lucide icons only

## After building
Run: git add -A && git commit -m "feat: checklist-first dashboard, dedicated step pages, state persistence, NDA-only docs" && git push origin master
Then: openclaw system event --text "Done: FlowSign checklist rebuild complete — checklist dashboard, laptop/payroll/orientation pages, NDA-only, state persistence" --mode now
