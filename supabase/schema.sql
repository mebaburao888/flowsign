-- ─────────────────────────────────────
-- FlowSign — Supabase Schema
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────

-- EMPLOYEES (fake HRIS data)
create table employees (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  name text not null,
  email text not null,
  role text not null,
  team text not null,
  department text not null,
  manager_id uuid references employees(id),
  start_date date,
  location text,
  status text default 'pending', -- pending | active
  created_at timestamptz default now()
);

-- DEVICE STANDARDS (per team/role)
create table device_standards (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  role text not null,
  device_model text not null,
  device_spec jsonb not null,
  standard_apps text[] not null,
  created_at timestamptz default now()
);

-- ONBOARDING SESSIONS (conversation state)
create table onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  status text default 'in_progress', -- in_progress | complete
  conversation jsonb default '[]',
  preferences jsonb default '{}',
  onboarding_thread_id text,  -- OpenAI thread ID for Alex
  it_thread_id text,          -- OpenAI thread ID for IT agent
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add thread IDs to existing sessions
-- alter table onboarding_sessions add column if not exists onboarding_thread_id text;
-- alter table onboarding_sessions add column if not exists it_thread_id text;

-- DEVICE REQUESTS
create table device_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  session_id uuid references onboarding_sessions(id),
  request_type text not null, -- standard | exception
  device_spec jsonb not null,
  preferences jsonb not null,
  justification text,
  status text default 'pending', -- pending | approved | denied | procurement
  in_stock boolean default true,
  procurement_days integer,
  it_admin_approval timestamptz,
  it_admin_id uuid references employees(id),
  manager_approval timestamptz,
  manager_id uuid references employees(id),
  snow_exception_ticket text,
  snow_device_ticket text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SNOW TICKETS (simulated)
create table snow_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  ticket_type text not null, -- exception | device_prep
  parent_ticket_id uuid references snow_tickets(id),
  device_request_id uuid references device_requests(id),
  employee_id uuid references employees(id),
  status text default 'open', -- open | in_progress | resolved
  priority text default 'P2',
  payload jsonb not null,
  assigned_to text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SIGNED DOCUMENTS
create table signed_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  session_id uuid references onboarding_sessions(id),
  doc_id text not null, -- offer_letter | nda
  signed_at timestamptz default now()
);

-- EMAIL LOG
create table email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  to_name text not null,
  subject text not null,
  type text not null, -- welcome | approval_request | approved | denied | confirmation
  device_request_id uuid references device_requests(id),
  sent_at timestamptz default now()
);

-- ─────────────────────────────────────
-- REALTIME — enable for live updates
-- ─────────────────────────────────────
alter publication supabase_realtime add table device_requests;
alter publication supabase_realtime add table snow_tickets;
alter publication supabase_realtime add table onboarding_sessions;
alter publication supabase_realtime add table signed_documents;

-- ─────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────

-- Employees
insert into employees (id, name, email, role, team, department, start_date, location, status) values
  ('a1000000-0000-0000-0000-000000000001', 'Jordan Chen', 'jordan.chen@flowsign.com', 'Software Engineer', 'Platform Engineering', 'Engineering', '2024-03-31', 'Remote', 'pending'),
  ('a1000000-0000-0000-0000-000000000002', 'Priya Rajan', 'priya.rajan@flowsign.com', 'IT Admin', 'IT Operations', 'IT', '2023-01-15', 'HQ', 'active'),
  ('a1000000-0000-0000-0000-000000000003', 'Marcus Torres', 'marcus.torres@flowsign.com', 'Engineering Manager', 'Platform Engineering', 'Engineering', '2022-06-01', 'HQ', 'active');

-- Set Jordan's manager to Marcus
update employees set manager_id = 'a1000000-0000-0000-0000-000000000003' where id = 'a1000000-0000-0000-0000-000000000001';

-- ONBOARDING TASKS (run after creating an onboarding session for Jordan)
-- insert into onboarding_tasks (employee_id, task_type, title, description, status, owner, priority) values
--   ('a1000000-0000-0000-0000-000000000001', 'doc_signing', 'Sign Documents', 'Review and sign offer letter and NDA', 'pending', 'employee', 1),
--   ('a1000000-0000-0000-0000-000000000001', 'device_setup', 'IT Setup', 'Choose and configure your laptop', 'pending', 'employee', 2),
--   ('a1000000-0000-0000-0000-000000000001', 'payroll_setup', 'Payroll Setup', 'Set up direct deposit and tax forms', 'pending', 'employee', 3),
--   ('a1000000-0000-0000-0000-000000000001', 'orientation', 'Orientation Scheduling', 'Schedule your Day 1 orientation session', 'pending', 'employee', 4);

-- Device Standards
insert into device_standards (team, role, device_model, device_spec, standard_apps) values
  ('Platform Engineering', 'Software Engineer',
   'MacBook Pro 14" M3 Pro',
   '{"ram": "18GB", "storage": "512GB SSD", "chip": "M3 Pro", "screen": "14 inch"}',
   ARRAY['Slack', 'Zoom', 'Chrome', '1Password', 'Okta', 'GitHub Desktop', 'Docker', 'Jira', 'Confluence']),
  ('IT Operations', 'IT Admin',
   'MacBook Pro 14" M3',
   '{"ram": "16GB", "storage": "256GB SSD", "chip": "M3", "screen": "14 inch"}',
   ARRAY['Slack', 'Zoom', 'Chrome', '1Password', 'Okta', 'Jamf Pro', 'Apple Configurator']),
  ('Engineering', 'Engineering Manager',
   'MacBook Pro 14" M3 Pro',
   '{"ram": "18GB", "storage": "512GB SSD", "chip": "M3 Pro", "screen": "14 inch"}',
   ARRAY['Slack', 'Zoom', 'Chrome', '1Password', 'Okta', 'Jira', 'Confluence', 'Notion']);
