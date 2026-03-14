# ðŸ¥ MedFlow â€” Healthcare Integration Engine & Interoperability Platform
> Stack: Next.js 15 + Supabase + Vercel + TypeScript
> Domain: Healthcare | Category: Interoperability & HIE
> Inspired by: Mirth Connect (open-source HL7 integration)
> Goal: Build locally â†’ test â†’ deploy to Vercel
> MCPs Connected: Supabase MCP + Vercel MCP + GitHub MCP
> GitHub Repo: https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git

---

## ðŸ“‹ BUILD ORDER FOR CODEX

```
PHASE 1 â€” LOCAL DEV:
0A. GitHub MCP: create repo "medflow" in personal GitHub â†’ push initial commit
0B. Supabase MCP: create project + all tables + RLS + seed data
0C. Scaffold Next.js app + install all dependencies
0D. Create .mcp.json for Next.js DevTools MCP
1.  Supabase clients (browser + server) + middleware + TypeScript types
2.  Auth pages (login + register) + server actions + validation
3.  App layout (sidebar + header + mobile drawer)
4.  Dashboard home (stats cards + message volume chart)
5.  Channels list page (table + search + filters)
6.  Add Channel page/dialog
7.  Edit Channel page/dialog
8.  View Channel detail page
9.  Messages list page (table + search + filters)
10. Message detail / audit log view
11. Connectors list + add/edit
12. Monitoring dashboard (throughput, error rates, uptime)
13. Error Logs page
14. Write all Vitest unit tests + Playwright E2E tests
15. GitHub MCP: commit all features

PHASE 2 â€” DEPLOY (only after Phase 1 fully working locally):
16. npm run build â€” fix ALL errors
17. npm run test:run + npm run test:e2e â€” all must pass
18. GitHub MCP: final push to main
19. Vercel MCP: create project + set env vars + deploy
20. Supabase: add Vercel URL to Auth redirect URLs (manual step)
21. Verify production â€” test auth, channels, messages, monitoring
22. Record demo + submit
```

---

## ðŸ—„ï¸ STEP 0A â€” CONNECT TO GITHUB REPO (via GitHub MCP)

**Do this FIRST before anything else.**

```
Using GitHub MCP:
1. Use the existing repository:
   https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
2. Clone it locally:
   git clone https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
   cd mirth_connect_blueprint
3. Confirm the repo is accessible and on the main branch
4. All commits and pushes will go to: AI-Kurukshetra/mirth_connect_blueprint
```

> âš ï¸ Do NOT create a new repo â€” use the existing one above.

---

## ðŸ—„ï¸ STEP 0B â€” CREATE SUPABASE PROJECT (via Supabase MCP)

```
Using Supabase MCP:
1. Create a new Supabase project called "medflow"
2. Wait for provisioning to complete
3. Create all tables below with RLS policies
4. Insert all seed data below
5. Give me these 3 values for .env.local:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
```

---

## ðŸ—ƒï¸ DATABASE SCHEMA

### Table: `profiles`
Extends Supabase auth.users â€” auto-created on signup via trigger.
```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  avatar_url  text,
  role        text not null default 'admin' check (role in ('admin', 'engineer', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### Table: `channels`
Integration channels that define message flow paths.
```sql
create table channels (
  id              uuid primary key default gen_random_uuid(),
  channel_id      text not null unique,           -- e.g. "CH-001"
  name            text not null,
  description     text,
  source_type     text not null,                  -- e.g. "MLLP", "HTTP", "SFTP", "TCP"
  destination_type text not null,                 -- e.g. "Database", "HTTP", "SFTP"
  message_format  text not null default 'HL7v2'   -- "HL7v2", "HL7v3", "FHIR_R4", "FHIR_R5", "JSON", "XML"
                  check (message_format in ('HL7v2', 'HL7v3', 'FHIR_R4', 'FHIR_R5', 'JSON', 'XML')),
  status          text not null default 'active'
                  check (status in ('active', 'inactive', 'error', 'paused')),
  filter_rules    jsonb,                           -- routing/filter rules JSON
  transformation  text,                           -- JS or XSLT transformation script
  retry_count     int not null default 3,
  retry_interval  int not null default 60,        -- seconds
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger channels_updated_at
  before update on channels
  for each row execute procedure update_updated_at();
```

### Table: `connectors`
Source and destination system endpoints.
```sql
create table connectors (
  id              uuid primary key default gen_random_uuid(),
  connector_id    text not null unique,            -- e.g. "CON-001"
  name            text not null,
  type            text not null                    -- "MLLP", "HTTP", "SFTP", "TCP", "Database", "REST", "SOAP"
                  check (type in ('MLLP', 'HTTP', 'SFTP', 'TCP', 'Database', 'REST', 'SOAP', 'File')),
  direction       text not null check (direction in ('source', 'destination', 'bidirectional')),
  host            text,
  port            int,
  path_or_queue   text,
  auth_method     text check (auth_method in ('none', 'basic', 'token', 'certificate')),
  status          text not null default 'connected'
                  check (status in ('connected', 'disconnected', 'error', 'testing')),
  last_ping       timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger connectors_updated_at
  before update on connectors
  for each row execute procedure update_updated_at();
```

### Table: `messages`
All messages processed by the integration engine.
```sql
create table messages (
  id              uuid primary key default gen_random_uuid(),
  message_id      text not null unique,            -- e.g. "MSG-00001"
  channel_id      uuid references channels(id),
  source_system   text not null,
  destination_system text not null,
  message_type    text not null,                   -- e.g. "ADT^A01", "ORU^R01", "Patient", "Observation"
  message_format  text not null,                   -- "HL7v2", "FHIR_R4", etc.
  status          text not null default 'processed'
                  check (status in ('processed', 'failed', 'queued', 'retrying', 'filtered')),
  raw_payload     text,                            -- original message content
  transformed_payload text,                        -- post-transformation content
  error_message   text,
  retry_attempts  int not null default 0,
  processing_time_ms int,                          -- latency in milliseconds
  created_at      timestamptz not null default now()
);
```

### Table: `audit_logs`
Immutable audit trail of all platform actions.
```sql
create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  action          text not null,                   -- e.g. "channel.created", "message.failed"
  entity_type     text not null,                   -- "channel", "message", "connector", "user"
  entity_id       text,
  details         jsonb,
  ip_address      text,
  created_at      timestamptz not null default now()
);
```

### Table: `error_logs`
Detailed error records for failed messages and system errors.
```sql
create table error_logs (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid references messages(id),
  channel_id      uuid references channels(id),
  error_code      text not null,
  error_type      text not null check (error_type in ('validation', 'transformation', 'routing', 'network', 'auth', 'system')),
  error_message   text not null,
  stack_trace     text,
  resolved        boolean not null default false,
  resolved_by     uuid references profiles(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
```

### Table: `performance_metrics`
System health and throughput snapshots (stored hourly).
```sql
create table performance_metrics (
  id              uuid primary key default gen_random_uuid(),
  recorded_at     timestamptz not null default now(),
  messages_total  int not null default 0,
  messages_success int not null default 0,
  messages_failed int not null default 0,
  avg_latency_ms  numeric(10,2),
  throughput_per_min numeric(10,2),
  cpu_usage_pct   numeric(5,2),
  memory_usage_pct numeric(5,2),
  active_channels int not null default 0
);
```

### RLS Policies

```sql
-- profiles
alter table profiles enable row level security;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- channels: authenticated users can do everything
alter table channels enable row level security;
create policy "Authenticated users can view channels"
  on channels for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert channels"
  on channels for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update channels"
  on channels for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete channels"
  on channels for delete using (auth.role() = 'authenticated');

-- connectors
alter table connectors enable row level security;
create policy "Authenticated users can view connectors"
  on connectors for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert connectors"
  on connectors for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update connectors"
  on connectors for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete connectors"
  on connectors for delete using (auth.role() = 'authenticated');

-- messages
alter table messages enable row level security;
create policy "Authenticated users can view messages"
  on messages for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert messages"
  on messages for insert with check (auth.role() = 'authenticated');

-- audit_logs (read-only for users)
alter table audit_logs enable row level security;
create policy "Authenticated users can view audit logs"
  on audit_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert audit logs"
  on audit_logs for insert with check (auth.role() = 'authenticated');

-- error_logs
alter table error_logs enable row level security;
create policy "Authenticated users can view error logs"
  on error_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert error logs"
  on error_logs for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update error logs"
  on error_logs for update using (auth.role() = 'authenticated');

-- performance_metrics
alter table performance_metrics enable row level security;
create policy "Authenticated users can view metrics"
  on performance_metrics for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert metrics"
  on performance_metrics for insert with check (auth.role() = 'authenticated');
```

### Seed Data

```sql
-- Insert 8 sample channels
insert into channels (
  channel_id, name, description, source_type, destination_type,
  message_format, status, retry_count
) values
('CH-001', 'ADT Feed â€” Epic to Lab',       'Admit/Discharge/Transfer messages from Epic EHR to Lab system',         'MLLP',  'Database', 'HL7v2',   'active',   3),
('CH-002', 'Lab Results â€” Lab to EHR',     'ORU^R01 results from Lab back to Epic EHR',                             'MLLP',  'HTTP',     'HL7v2',   'active',   3),
('CH-003', 'FHIR Patient Sync',            'FHIR R4 Patient resource sync to national HIE',                         'HTTP',  'REST',     'FHIR_R4', 'active',   5),
('CH-004', 'Radiology Orders',             'ORM^O01 radiology orders from EHR to PACS',                             'MLLP',  'MLLP',     'HL7v2',   'active',   3),
('CH-005', 'Insurance Eligibility Check',  'FHIR Coverage resource queries to payer gateway',                       'REST',  'REST',     'FHIR_R4', 'paused',   3),
('CH-006', 'Pharmacy Dispense Feed',       'RDS^O13 pharmacy dispense messages to Pharmacy system',                 'MLLP',  'TCP',      'HL7v2',   'error',    3),
('CH-007', 'Patient Demographics Export',  'Nightly bulk export of demographics to data warehouse',                 'SFTP',  'Database', 'JSON',    'active',   2),
('CH-008', 'Appointment Scheduling Sync',  'SIU^S12 appointment messages between scheduling and billing',           'HTTP',  'HTTP',     'HL7v2',   'inactive', 3);

-- Insert 6 sample connectors
insert into connectors (
  connector_id, name, type, direction, host, port, status, auth_method
) values
('CON-001', 'Epic EHR MLLP Source',        'MLLP',     'source',      '10.0.1.50',  2575, 'connected',    'certificate'),
('CON-002', 'Lab Information System',      'MLLP',     'bidirectional','10.0.1.60', 2576, 'connected',    'certificate'),
('CON-003', 'National HIE REST Endpoint',  'REST',     'destination', 'api.nhie.gov', 443,'connected',    'token'),
('CON-004', 'PACS Imaging System',         'MLLP',     'destination', '10.0.2.10',  2575, 'connected',    'certificate'),
('CON-005', 'Payer Gateway API',           'REST',     'bidirectional','api.payer.com',443,'disconnected','token'),
('CON-006', 'Data Warehouse PostgreSQL',   'Database', 'destination', '10.0.3.20',  5432, 'connected',    'basic');

-- Insert 12 sample messages
insert into messages (
  message_id, channel_id, source_system, destination_system,
  message_type, message_format, status, processing_time_ms, retry_attempts
) values
('MSG-00001', (select id from channels where channel_id='CH-001'), 'Epic EHR',    'Lab System',     'ADT^A01', 'HL7v2',   'processed', 42,  0),
('MSG-00002', (select id from channels where channel_id='CH-001'), 'Epic EHR',    'Lab System',     'ADT^A03', 'HL7v2',   'processed', 38,  0),
('MSG-00003', (select id from channels where channel_id='CH-002'), 'Lab System',  'Epic EHR',       'ORU^R01', 'HL7v2',   'processed', 55,  0),
('MSG-00004', (select id from channels where channel_id='CH-003'), 'Epic EHR',    'National HIE',   'Patient', 'FHIR_R4', 'processed', 120, 0),
('MSG-00005', (select id from channels where channel_id='CH-004'), 'Epic EHR',    'PACS',           'ORM^O01', 'HL7v2',   'processed', 33,  0),
('MSG-00006', (select id from channels where channel_id='CH-006'), 'Epic EHR',    'Pharmacy',       'RDS^O13', 'HL7v2',   'failed',    0,   3),
('MSG-00007', (select id from channels where channel_id='CH-006'), 'Epic EHR',    'Pharmacy',       'RDS^O13', 'HL7v2',   'retrying',  0,   2),
('MSG-00008', (select id from channels where channel_id='CH-001'), 'Epic EHR',    'Lab System',     'ADT^A08', 'HL7v2',   'processed', 47,  0),
('MSG-00009', (select id from channels where channel_id='CH-003'), 'Epic EHR',    'National HIE',   'Observation','FHIR_R4','processed',98, 0),
('MSG-00010', (select id from channels where channel_id='CH-007'), 'Epic EHR',    'Data Warehouse', 'Patient', 'JSON',    'processed', 210, 0),
('MSG-00011', (select id from channels where channel_id='CH-002'), 'Lab System',  'Epic EHR',       'ORU^R01', 'HL7v2',   'queued',    null,0),
('MSG-00012', (select id from channels where channel_id='CH-004'), 'Epic EHR',    'PACS',           'ORM^O01', 'HL7v2',   'processed', 29,  0);

-- Insert 3 sample error logs
insert into error_logs (
  message_id, channel_id, error_code, error_type, error_message, resolved
) values
(
  (select id from messages where message_id='MSG-00006'),
  (select id from channels where channel_id='CH-006'),
  'NET-001', 'network',
  'Connection refused: Pharmacy system at 10.0.2.30:2576 is unreachable after 3 retry attempts.',
  false
),
(
  (select id from messages where message_id='MSG-00007'),
  (select id from channels where channel_id='CH-006'),
  'NET-001', 'network',
  'Connection timeout: Pharmacy system did not respond within 30 seconds.',
  false
),
(
  null,
  (select id from channels where channel_id='CH-005'),
  'AUTH-003', 'auth',
  'Bearer token expired: Payer gateway returned 401 Unauthorized.',
  true
);

-- Insert performance metrics (last 6 hours, simulated)
insert into performance_metrics (
  recorded_at, messages_total, messages_success, messages_failed,
  avg_latency_ms, throughput_per_min, cpu_usage_pct, memory_usage_pct, active_channels
) values
(now() - interval '5 hours', 843, 821, 22, 67.4, 2.8, 34.2, 48.1, 6),
(now() - interval '4 hours', 912, 898, 14, 72.1, 3.0, 38.7, 50.3, 6),
(now() - interval '3 hours', 1045, 1021, 24, 65.8, 3.5, 42.1, 52.6, 7),
(now() - interval '2 hours', 987, 975,  12, 61.3, 3.3, 39.5, 51.0, 7),
(now() - interval '1 hour',  756, 740,  16, 58.9, 2.5, 31.2, 46.8, 5),
(now(),                       324, 316,   8, 54.2, 2.1, 28.4, 44.5, 5);
```

---

## âš¡ STEP 0C â€” PROJECT SETUP

### Scaffold + Install
```bash
# Clone existing repo from GitHub
git clone https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
cd mirth_connect_blueprint

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react clsx tailwind-merge sonner date-fns recharts
npm install @tanstack/react-table

# shadcn UI
npx shadcn@latest init
npx shadcn@latest add button input label form card dialog select textarea badge avatar dropdown-menu sheet separator skeleton toast table tabs progress alert tooltip

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# E2E Testing
npm install -D @playwright/test
npx playwright install chromium

# Page transition loader
npm install nextjs-toploader
```

### Create `.mcp.json` (Next.js DevTools MCP)
```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

### Create `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=paste_from_supabase_mcp
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_from_supabase_mcp
SUPABASE_SERVICE_ROLE_KEY=paste_from_supabase_mcp
```

> âš ï¸ Only manual step: paste the 3 keys Supabase MCP gave you above.

### Initial GitHub commit
```
Using GitHub MCP:
Push to existing repo: https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
Commit message: "init: scaffold Next.js 15 + all dependencies"
Push to main branch.
```

---

## ðŸ“ FOLDER STRUCTURE

```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ (auth)/
â”‚   â”‚   â”œâ”€â”€ login/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”œâ”€â”€ register/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â””â”€â”€ layout.tsx
â”‚   â”œâ”€â”€ (dashboard)/
â”‚   â”‚   â”œâ”€â”€ layout.tsx                   â† sidebar + header
â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx                 â† stats + charts
â”‚   â”‚   â”œâ”€â”€ channels/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx                 â† channels list
â”‚   â”‚   â”‚   â”œâ”€â”€ add/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx             â† add channel
â”‚   â”‚   â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx             â† channel detail
â”‚   â”‚   â”‚       â””â”€â”€ edit/
â”‚   â”‚   â”‚           â””â”€â”€ page.tsx         â† edit channel
â”‚   â”‚   â”œâ”€â”€ messages/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx                 â† messages list
â”‚   â”‚   â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â””â”€â”€ page.tsx             â† message detail
â”‚   â”‚   â”œâ”€â”€ connectors/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx                 â† connectors list
â”‚   â”‚   â”‚   â”œâ”€â”€ add/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚       â””â”€â”€ edit/
â”‚   â”‚   â”‚           â””â”€â”€ page.tsx
â”‚   â”‚   â”œâ”€â”€ monitoring/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx                 â† real-time monitoring
â”‚   â”‚   â”œâ”€â”€ errors/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx                 â† error logs
â”‚   â”‚   â””â”€â”€ audit/
â”‚   â”‚       â””â”€â”€ page.tsx                 â† audit trail
â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â””â”€â”€ callback/
â”‚   â”‚       â””â”€â”€ route.ts
â”‚   â””â”€â”€ layout.tsx
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”œâ”€â”€ LoginForm.tsx
â”‚   â”‚   â””â”€â”€ RegisterForm.tsx
â”‚   â”œâ”€â”€ layout/
â”‚   â”‚   â”œâ”€â”€ Sidebar.tsx
â”‚   â”‚   â”œâ”€â”€ Header.tsx
â”‚   â”‚   â””â”€â”€ MobileDrawer.tsx
â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”œâ”€â”€ StatsCard.tsx
â”‚   â”‚   â”œâ”€â”€ MessageVolumeChart.tsx       â† Recharts line chart
â”‚   â”‚   â”œâ”€â”€ ThroughputChart.tsx
â”‚   â”‚   â””â”€â”€ RecentMessages.tsx
â”‚   â”œâ”€â”€ channels/
â”‚   â”‚   â”œâ”€â”€ ChannelTable.tsx
â”‚   â”‚   â”œâ”€â”€ ChannelCard.tsx              â† mobile card view
â”‚   â”‚   â”œâ”€â”€ ChannelForm.tsx              â† shared add/edit form
â”‚   â”‚   â”œâ”€â”€ ChannelDetail.tsx
â”‚   â”‚   â”œâ”€â”€ ChannelFilters.tsx
â”‚   â”‚   â”œâ”€â”€ ChannelStatusBadge.tsx
â”‚   â”‚   â”œâ”€â”€ DeleteChannelDialog.tsx
â”‚   â”‚   â””â”€â”€ EmptyChannelsState.tsx
â”‚   â”œâ”€â”€ messages/
â”‚   â”‚   â”œâ”€â”€ MessageTable.tsx
â”‚   â”‚   â”œâ”€â”€ MessageCard.tsx
â”‚   â”‚   â”œâ”€â”€ MessageDetail.tsx
â”‚   â”‚   â”œâ”€â”€ MessageStatusBadge.tsx
â”‚   â”‚   â””â”€â”€ MessageFilters.tsx
â”‚   â”œâ”€â”€ connectors/
â”‚   â”‚   â”œâ”€â”€ ConnectorTable.tsx
â”‚   â”‚   â”œâ”€â”€ ConnectorCard.tsx
â”‚   â”‚   â”œâ”€â”€ ConnectorForm.tsx
â”‚   â”‚   â”œâ”€â”€ ConnectorDetail.tsx
â”‚   â”‚   â””â”€â”€ ConnectorStatusBadge.tsx
â”‚   â”œâ”€â”€ monitoring/
â”‚   â”‚   â”œâ”€â”€ MetricCard.tsx
â”‚   â”‚   â”œâ”€â”€ LatencyChart.tsx
â”‚   â”‚   â””â”€â”€ SystemHealthBar.tsx
â”‚   â””â”€â”€ errors/
â”‚       â”œâ”€â”€ ErrorLogTable.tsx
â”‚       â””â”€â”€ ResolveErrorDialog.tsx
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ supabase/
â”‚   â”‚   â”œâ”€â”€ client.ts
â”‚   â”‚   â”œâ”€â”€ server.ts
â”‚   â”‚   â””â”€â”€ middleware.ts
â”‚   â”œâ”€â”€ validations/
â”‚   â”‚   â”œâ”€â”€ auth.ts
â”‚   â”‚   â”œâ”€â”€ channel.ts
â”‚   â”‚   â””â”€â”€ connector.ts
â”‚   â””â”€â”€ utils.ts
â”œâ”€â”€ actions/
â”‚   â”œâ”€â”€ auth.ts
â”‚   â”œâ”€â”€ channels.ts
â”‚   â”œâ”€â”€ messages.ts
â”‚   â”œâ”€â”€ connectors.ts
â”‚   â””â”€â”€ errors.ts
â””â”€â”€ types/
    â””â”€â”€ index.ts
```

---

## ðŸ”· TYPESCRIPT TYPES â€” `src/types/index.ts`

```typescript
export type UserRole = 'admin' | 'engineer' | 'viewer'

export type MessageFormat = 'HL7v2' | 'HL7v3' | 'FHIR_R4' | 'FHIR_R5' | 'JSON' | 'XML'
export type ChannelStatus = 'active' | 'inactive' | 'error' | 'paused'
export type MessageStatus = 'processed' | 'failed' | 'queued' | 'retrying' | 'filtered'
export type ConnectorType = 'MLLP' | 'HTTP' | 'SFTP' | 'TCP' | 'Database' | 'REST' | 'SOAP' | 'File'
export type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'testing'
export type ConnectorDirection = 'source' | 'destination' | 'bidirectional'
export type ErrorType = 'validation' | 'transformation' | 'routing' | 'network' | 'auth' | 'system'

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  channel_id: string
  name: string
  description: string | null
  source_type: string
  destination_type: string
  message_format: MessageFormat
  status: ChannelStatus
  filter_rules: Record<string, unknown> | null
  transformation: string | null
  retry_count: number
  retry_interval: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Connector {
  id: string
  connector_id: string
  name: string
  type: ConnectorType
  direction: ConnectorDirection
  host: string | null
  port: number | null
  path_or_queue: string | null
  auth_method: 'none' | 'basic' | 'token' | 'certificate' | null
  status: ConnectorStatus
  last_ping: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  message_id: string
  channel_id: string | null
  source_system: string
  destination_system: string
  message_type: string
  message_format: MessageFormat
  status: MessageStatus
  raw_payload: string | null
  transformed_payload: string | null
  error_message: string | null
  retry_attempts: number
  processing_time_ms: number | null
  created_at: string
}

export interface ErrorLog {
  id: string
  message_id: string | null
  channel_id: string | null
  error_code: string
  error_type: ErrorType
  error_message: string
  stack_trace: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface PerformanceMetric {
  id: string
  recorded_at: string
  messages_total: number
  messages_success: number
  messages_failed: number
  avg_latency_ms: number | null
  throughput_per_min: number | null
  cpu_usage_pct: number | null
  memory_usage_pct: number | null
  active_channels: number
}

export interface DashboardStats {
  totalMessages: number
  processedMessages: number
  failedMessages: number
  activeChannels: number
  totalChannels: number
  connectedConnectors: number
  avgLatency: number
  successRate: number
}

export interface ChannelFilters {
  search: string
  status: ChannelStatus | 'all'
  message_format: MessageFormat | 'all'
  source_type: string
}

export interface MessageFilters {
  search: string
  status: MessageStatus | 'all'
  message_format: MessageFormat | 'all'
  channel_id: string
}
```

---

## âœ… STEP 1 â€” SUPABASE CLIENTS + MIDDLEWARE

### `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

### `src/middleware.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublicRoute = PUBLIC_ROUTES.some(r =>
    request.nextUrl.pathname.startsWith(r))

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register' ||
    request.nextUrl.pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## ðŸ” STEP 2 â€” VALIDATION SCHEMAS

### `src/lib/validations/auth.ts`
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
```

### `src/lib/validations/channel.ts`
```typescript
import { z } from 'zod'

const MESSAGE_FORMATS = ['HL7v2', 'HL7v3', 'FHIR_R4', 'FHIR_R5', 'JSON', 'XML'] as const
const STATUSES = ['active', 'inactive', 'error', 'paused'] as const
const SOURCE_TYPES = ['MLLP', 'HTTP', 'HTTPS', 'SFTP', 'TCP', 'File', 'REST', 'SOAP'] as const

export const channelSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(300).optional().or(z.literal('')),
  source_type: z.enum(SOURCE_TYPES, { required_error: 'Source type is required' }),
  destination_type: z.enum(SOURCE_TYPES, { required_error: 'Destination type is required' }),
  message_format: z.enum(MESSAGE_FORMATS, { required_error: 'Message format is required' }),
  status: z.enum(STATUSES).default('active'),
  retry_count: z.number().int().min(0).max(10).default(3),
  retry_interval: z.number().int().min(10).max(3600).default(60),
  transformation: z.string().optional().or(z.literal('')),
})

export type ChannelInput = z.infer<typeof channelSchema>
```

### `src/lib/validations/connector.ts`
```typescript
import { z } from 'zod'

const CONNECTOR_TYPES = ['MLLP', 'HTTP', 'SFTP', 'TCP', 'Database', 'REST', 'SOAP', 'File'] as const
const DIRECTIONS = ['source', 'destination', 'bidirectional'] as const
const AUTH_METHODS = ['none', 'basic', 'token', 'certificate'] as const

export const connectorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  type: z.enum(CONNECTOR_TYPES, { required_error: 'Connector type is required' }),
  direction: z.enum(DIRECTIONS, { required_error: 'Direction is required' }),
  host: z.string().max(255).optional().or(z.literal('')),
  port: z.number().int().min(1).max(65535).optional(),
  path_or_queue: z.string().max(255).optional().or(z.literal('')),
  auth_method: z.enum(AUTH_METHODS).default('none'),
})

export type ConnectorInput = z.infer<typeof connectorSchema>
```

---

## ðŸ” STEP 3 â€” AUTH PAGES

### Auth Layout â€” `src/app/(auth)/layout.tsx`
Centered card layout. Background: gradient from `teal-50` to `blue-100`.
MedFlow logo (ðŸ¥) + tagline "Healthcare Integration Engine" centered above card.

### Login Page â€” `src/app/(auth)/login/page.tsx`
Fields:
- Email (type email)
- Password (type password, show/hide toggle)
- Sign In button (full width, loading state)
- Link to /register: "Don't have an account? Register"

Server action (`src/actions/auth.ts â†’ loginAction`):
1. Validate with loginSchema
2. `supabase.auth.signInWithPassword()`
3. On success â†’ redirect('/dashboard')
4. On error â†’ return `{ error: 'Invalid email or password' }`

### Register Page â€” `src/app/(auth)/register/page.tsx`
Fields:
- Full Name
- Email
- Password (with strength indicator)
- Confirm Password
- Create Account button (full width, loading state)
- Link to /login: "Already have an account? Sign In"

Server action (`src/actions/auth.ts â†’ registerAction`):
1. Validate with registerSchema
2. `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`
3. Profile auto-created via DB trigger
4. On success â†’ redirect('/dashboard')
5. On error â†’ return `{ error: 'Email already registered' }`

### Auth Callback â€” `src/app/auth/callback/route.ts`
Standard Supabase callback handler for email confirmation.

---

## ðŸ  STEP 4 â€” APP LAYOUT

### `src/app/(dashboard)/layout.tsx`
- Desktop: fixed sidebar (256px) + main content area
- Mobile: hidden sidebar + hamburger â†’ Sheet drawer

### `src/components/layout/Sidebar.tsx`
```
Logo: ðŸ¥ MedFlow (teal-600)
Subtitle: Integration Engine

Navigation:
  ðŸ“Š Dashboard       â†’ /dashboard
  ðŸ“¡ Channels        â†’ /channels
  ðŸ’¬ Messages        â†’ /messages
  ðŸ”Œ Connectors      â†’ /connectors
  ðŸ“ˆ Monitoring      â†’ /monitoring
  âš ï¸  Error Logs     â†’ /errors
  ðŸ—’ï¸  Audit Trail    â†’ /audit

Bottom:
  User avatar + name + email
  Sign Out button
```

Sidebar colors:
- Background: `white`
- Active item: `bg-teal-50 text-teal-700`
- Hover: `hover:bg-gray-50`
- Border right: `border-r border-gray-200`

### `src/components/layout/Header.tsx`
- Mobile: hamburger menu button + "MedFlow" title
- Desktop: Page title (dynamic) + User avatar dropdown
- Avatar dropdown: Profile info + Sign Out button

---

## ðŸ“Š STEP 5 â€” DASHBOARD PAGE

### `src/app/(dashboard)/dashboard/page.tsx`

#### Stats Cards Row (4 cards)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Total Messages  â”‚ â”‚ Active Channels â”‚ â”‚ Failed Messages â”‚ â”‚ Avg. Latency    â”‚
â”‚ Today           â”‚ â”‚                 â”‚ â”‚ Today           â”‚ â”‚                 â”‚
â”‚    4,867        â”‚ â”‚      5 / 8      â”‚ â”‚       8         â”‚ â”‚    54 ms        â”‚
â”‚ â†‘ 12% vs. prev â”‚ â”‚                 â”‚ â”‚ â†‘ 2 unresolved  â”‚ â”‚ âœ“ within SLA    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Message Volume Chart (Recharts LineChart)
Show hourly message throughput for the last 6 hours.
Two lines: "Processed" (teal) and "Failed" (red).
X-axis: hour labels. Y-axis: message count.
Fetch data from `performance_metrics` table.

#### Recent Messages Table
Last 8 messages with: Message ID, Channel, Type, Status badge, Processing time, Time ago.

Fetch all stats using server-side Supabase calls.
Show skeleton loaders while fetching.

---

## ðŸ“¡ STEP 6 â€” CHANNELS LIST PAGE

### `src/app/(dashboard)/channels/page.tsx`

#### Header Row
```
Channels                                      [+ Add Channel]
```

#### Filters Row
```
[ðŸ” Search by name, ID...]  [Format â–¼]  [Status â–¼]  [Source Type â–¼]
```

#### Desktop â€” Table View (`md+`)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Chan ID â”‚ Name                      â”‚ Format â”‚ Source     â”‚ Status   â”‚ Actions  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ CH-001  â”‚ ADT Feed â€” Epic to Lab    â”‚ HL7v2  â”‚ MLLPâ†’DB    â”‚ Active   â”‚ ðŸ‘ âœ ðŸ—‘  â”‚
â”‚ CH-003  â”‚ FHIR Patient Sync         â”‚ FHIR R4â”‚ HTTPâ†’REST  â”‚ Active   â”‚ ðŸ‘ âœ ðŸ—‘  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Mobile â€” Card View (`< md`)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ADT Feed â€” Epic to Lab    CH-001    â”‚
â”‚ HL7v2  â€¢  MLLP â†’ Database          â”‚
â”‚ Retry: 3x                [Active]  â”‚
â”‚                  [View] [Edit] [Del]â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Status Badge Colors
```
active   â†’ teal/green badge
inactive â†’ gray badge
paused   â†’ yellow badge
error    â†’ red badge
```

#### Search + Filter Logic
- Search: filter by channel_id, name, source_type, destination_type
- Format filter: all / HL7v2 / HL7v3 / FHIR_R4 / FHIR_R5 / JSON / XML
- Status filter: all / active / inactive / paused / error
- Show total count: "Showing 8 of 8 channels"
- Empty state: illustration + "No channels found" + clear filters button

---

## âž• STEP 7 â€” ADD CHANNEL PAGE

### `src/app/(dashboard)/channels/add/page.tsx`

Full page form. Two-column layout on desktop, single column on mobile.

**Section 1: Channel Identity**
```
Name*                Description
```

**Section 2: Integration Configuration**
```
Message Format*      Source Type*
Destination Type*    Status
```

**Section 3: Retry Policy**
```
Max Retry Count      Retry Interval (seconds)
```

**Section 4: Transformation Script (optional)**
```
Transformation (textarea â€” JavaScript or XSLT)
```

**Footer:**
```
[Cancel]                         [Add Channel]
```

Server action (`src/actions/channels.ts â†’ addChannelAction`):
1. Validate with channelSchema (server-side)
2. Auto-generate channel_id: `CH-${String(count + 1).padStart(3, '0')}`
3. Insert into channels table
4. On success â†’ redirect('/channels') + toast "Channel created successfully"
5. On error â†’ return field errors inline

---

## âœï¸ STEP 8 â€” EDIT CHANNEL PAGE

### `src/app/(dashboard)/channels/[id]/edit/page.tsx`

Same form as Add Channel but:
- Pre-populated with existing channel data
- Button text: "Save Changes"
- Server action: `updateChannelAction` â†’ UPDATE channels SET ... WHERE id = ?
- On success â†’ redirect(`/channels/${id}`) + toast "Channel updated"
- Show 404 if channel not found

---

## ðŸ‘ï¸ STEP 9 â€” CHANNEL DETAIL PAGE

### `src/app/(dashboard)/channels/[id]/page.tsx`

#### Header
```
â† Back to Channels
                              [Edit Channel]  [Delete]
ADT Feed â€” Epic to Lab
CH-001  â€¢  HL7v2  â€¢  MLLP â†’ Database  â€¢  Active
```

#### Info Cards (grid)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Integration Config   â”‚  â”‚ Retry Policy          â”‚
â”‚ Format: HL7v2        â”‚  â”‚ Max Retries: 3        â”‚
â”‚ Source: MLLP         â”‚  â”‚ Interval: 60 sec      â”‚
â”‚ Destination: Databaseâ”‚  â”‚                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Recent Messages      â”‚  (last 5 messages through this channel)
â”‚ MSG-00001 processed  â”‚
â”‚ MSG-00002 processed  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ’¬ STEP 10 â€” MESSAGES LIST PAGE

### `src/app/(dashboard)/messages/page.tsx`

#### Header Row
```
Messages
```

#### Filters Row
```
[ðŸ” Search by ID, type, system...]  [Format â–¼]  [Status â–¼]  [Channel â–¼]
```

#### Desktop â€” Table View
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Message ID   â”‚ Channel      â”‚ Type       â”‚ Format    â”‚ Status   â”‚ Latency  â”‚ Time         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ MSG-00001    â”‚ CH-001       â”‚ ADT^A01    â”‚ HL7v2     â”‚ Processedâ”‚ 42 ms    â”‚ 2 min ago    â”‚
â”‚ MSG-00006    â”‚ CH-006       â”‚ RDS^O13    â”‚ HL7v2     â”‚ Failed   â”‚ â€”        â”‚ 5 min ago    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Click any row â†’ `/messages/[id]` for full payload + audit details.

---

## ðŸ‘ï¸ STEP 11 â€” MESSAGE DETAIL PAGE

### `src/app/(dashboard)/messages/[id]/page.tsx`

#### Header
```
â† Back to Messages
MSG-00001  â€¢  ADT^A01  â€¢  HL7v2  â€¢  Processed  â€¢  42ms
Source: Epic EHR â†’ Destination: Lab System
```

#### Tabs: Raw Payload | Transformed Payload | Processing Info

**Raw Payload tab:** monospace text block with original HL7/FHIR content (if stored).
**Transformed Payload tab:** post-transformation content.
**Processing Info tab:** Channel name, retry count, timestamps, error messages (if any).

---

## ðŸ”Œ STEP 12 â€” CONNECTORS

### `src/app/(dashboard)/connectors/page.tsx`

Table showing all connectors with: ID, Name, Type, Direction, Host:Port, Status badge, Last ping, Actions.

Status Badge Colors:
```
connected     â†’ green badge
disconnected  â†’ gray badge
error         â†’ red badge
testing       â†’ yellow badge (animated pulse)
```

Add/Edit form fields:
- Name*, Type*, Direction*, Host, Port, Path/Queue, Auth Method, Status

---

## ðŸ“ˆ STEP 13 â€” MONITORING DASHBOARD

### `src/app/(dashboard)/monitoring/page.tsx`

#### Real-time Metrics Cards (top row)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Throughput     â”‚ â”‚ Success Rate   â”‚ â”‚ Avg. Latency   â”‚ â”‚ Active Channelsâ”‚
â”‚ 2.1 msg/min    â”‚ â”‚    97.5%       â”‚ â”‚    54 ms       â”‚ â”‚       5        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Charts Section
- **Throughput Over Time** (Recharts LineChart): throughput_per_min over last 6 hours
- **Success vs. Failed** (Recharts BarChart): side-by-side bars per hour
- **System Resources** (Recharts AreaChart): CPU % and Memory % over time

#### Channel Health Table
List all channels with their individual message counts and last-active time.

Fetch from `performance_metrics` table. Auto-refresh every 30 seconds using `setInterval`.

---

## âš ï¸ STEP 14 â€” ERROR LOGS PAGE

### `src/app/(dashboard)/errors/page.tsx`

#### Header Row
```
Error Logs                              [2 Unresolved]
```

#### Filters
```
[ðŸ” Search by code, message...]   [Error Type â–¼]   [Resolved â–¼]
```

#### Table
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Code    â”‚ Message                                â”‚ Type      â”‚ Channel  â”‚ Resolved â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ NET-001 â”‚ Connection refused: Pharmacy system... â”‚ Network   â”‚ CH-006   â”‚ âœ—        â”‚
â”‚ AUTH-003â”‚ Bearer token expired...                â”‚ Auth      â”‚ CH-005   â”‚ âœ“        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

"Resolve" button on unresolved rows â†’ opens `ResolveErrorDialog` â†’ marks resolved in DB.

---

## ðŸ—’ï¸ STEP 15 â€” AUDIT TRAIL PAGE

### `src/app/(dashboard)/audit/page.tsx`

Read-only table. No add/edit/delete â€” audit logs are immutable.

Columns: Timestamp, User, Action, Entity Type, Entity ID, Details summary.

Filters: Date range, action type, user.

---

## ðŸŽ¨ DESIGN SYSTEM

### Colors
```
Primary:       teal-600   (#0D9488)
Primary Hover: teal-700
Secondary:     blue-600
Success:       green-600
Warning:       yellow-500
Error:         red-600
Background:    gray-50
Card:          white
Border:        gray-200
Text Primary:  gray-900
Text Muted:    gray-500
```

### Typography
```
App Name:    text-xl font-bold text-teal-700
Page Title:  text-2xl font-bold text-gray-900
Section:     text-lg font-semibold text-gray-800
Label:       text-sm font-medium text-gray-700
Body:        text-sm text-gray-600
Muted:       text-xs text-gray-500
Mono:        font-mono text-xs (for message payloads)
```

### Status Badge Colors
```
Channel:   active=teal | inactive=gray | paused=yellow | error=red
Message:   processed=green | failed=red | queued=blue | retrying=yellow | filtered=gray
Connector: connected=green | disconnected=gray | error=red | testing=yellow
```

---

## â³ LOADING STATES â€” REQUIRED EVERYWHERE

Every single interaction that involves waiting MUST have a visible loading state.

### 1. BUTTON LOADING STATES
```typescript
import { Loader2 } from 'lucide-react'

<Button disabled={isLoading}>
  {isLoading ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loadingText}</>
  ) : buttonText}
</Button>

// Button text mapping:
// Sign In          â†’ "Signing in..."
// Create Account   â†’ "Creating account..."
// Add Channel      â†’ "Creating channel..."
// Save Changes     â†’ "Saving changes..."
// Delete Channel   â†’ "Deleting..."
// Add Connector    â†’ "Adding connector..."
// Resolve Error    â†’ "Resolving..."
// Sign Out         â†’ "Signing out..."
```

### 2. PAGE LOADING â€” `loading.tsx` Files
Create a `loading.tsx` in EVERY route folder.

### 3. TOP PROGRESS BAR
Install and configure `NextTopLoader` in `src/app/layout.tsx`:
```typescript
import NextTopLoader from 'nextjs-toploader'
// color="#0D9488" (teal-600) showSpinner={false}
```

### 4. SKELETON LOADERS
- Dashboard: skeleton stat cards + skeleton chart placeholder
- Channels list: skeleton table rows (8 rows)
- Messages list: skeleton table rows (10 rows)
- Monitoring: skeleton metric cards + chart placeholders

### 5. TABLE OVERLAY SPINNER
Show spinner overlay on table during search/filter operations (same as below â€” use a `isFiltering` state flag).

---

## ðŸ§ª STEP â€” TESTING

### Vitest Unit Tests

**`src/tests/validations/auth.test.ts`** â€” test loginSchema and registerSchema
**`src/tests/validations/channel.test.ts`** â€” test channelSchema validations
**`src/tests/validations/connector.test.ts`** â€” test connectorSchema validations
**`src/tests/components/auth/LoginForm.test.tsx`** â€” renders, validates, submits
**`src/tests/components/auth/RegisterForm.test.tsx`** â€” renders, validates, submits
**`src/tests/components/channels/ChannelStatusBadge.test.tsx`** â€” correct badge per status

### Playwright E2E Tests

**`src/tests/e2e/auth.spec.ts`** â€” login / register / logout / protected routes
**`src/tests/e2e/channels.spec.ts`** â€” list / add / edit / delete channel
**`src/tests/e2e/messages.spec.ts`** â€” list / filter / view message detail
**`src/tests/e2e/monitoring.spec.ts`** â€” dashboard stats + charts render
**`src/tests/e2e/loading.spec.ts`** â€” all loading states visible
**`src/tests/e2e/responsive.spec.ts`** â€” mobile + desktop layout

### `package.json` test scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "type-check": "tsc --noEmit"
  }
}
```

---

## ðŸš€ HOW TO RUN CODEX

```powershell
# Set environment variables
$env:ANTHROPIC_API_KEY = "your_anthropic_api_key"
$env:SUPABASE_ACCESS_TOKEN = "your_supabase_access_token"
$env:GITHUB_TOKEN = "your_github_personal_access_token"
$env:VERCEL_TOKEN = "your_vercel_token"
cd C:\Users\admin\hackathon\mirth_connect_blueprint
codex
```

### Test Commands
```bash
npm run test:run          # Unit tests
npm run test:e2e          # Browser E2E tests
npm run test:e2e:headed   # Watch browser tests run
npm run type-check        # TypeScript check
npm run build             # Production build check
```

### Manual QA Checklist
```
Auth:
[ ] /login loads correctly
[ ] Login with wrong credentials shows error
[ ] Login with correct credentials â†’ /dashboard
[ ] Register with new email â†’ /dashboard
[ ] Register with duplicate email shows error
[ ] Logout button works â†’ /login
[ ] /dashboard without login â†’ redirected to /login
[ ] Session persists after page refresh

Dashboard:
[ ] 4 stats cards show correct values from DB
[ ] Message volume chart renders with 6 data points
[ ] Recent messages table shows last 8 messages

Channels:
[ ] /channels loads all 8 seeded channels
[ ] Search works (filter by name / ID)
[ ] Format filter works
[ ] Status filter works
[ ] Add channel â†’ form validates â†’ saves â†’ appears in list
[ ] View channel â†’ all details shown + recent messages
[ ] Edit channel â†’ pre-populated â†’ saves changes
[ ] Delete channel â†’ confirmation dialog â†’ deletes â†’ removed from list

Messages:
[ ] /messages loads all seeded messages
[ ] Status filter works (processed / failed / queued / retrying)
[ ] Click message row â†’ detail page with payload tabs

Connectors:
[ ] /connectors loads all 6 seeded connectors
[ ] Add connector â†’ saves â†’ appears in list
[ ] Edit connector â†’ saves changes

Monitoring:
[ ] /monitoring loads with metric cards
[ ] Charts render with performance_metrics data
[ ] Channel health table shows all channels

Error Logs:
[ ] /errors shows 3 seeded error logs
[ ] Unresolved errors show Resolve button
[ ] Resolve button marks error as resolved

Responsive:
[ ] Mobile: sidebar hidden, hamburger visible
[ ] Mobile: hamburger opens sidebar drawer
[ ] Mobile: channels/messages show as cards not table
[ ] Mobile: no horizontal scroll anywhere
[ ] Desktop: sidebar always visible
[ ] Desktop: tables visible

Loading States (MUST CHECK ALL):
[ ] Blue/teal top progress bar on every page navigation
[ ] Login button shows "Signing in..." + spinner
[ ] Register button shows "Creating account..." + spinner
[ ] Add Channel button shows "Creating channel..." + spinner
[ ] Save Changes button shows "Saving changes..." + spinner
[ ] Delete button shows "Deleting..." + spinner
[ ] Dashboard shows skeleton cards while loading
[ ] Channels page shows skeleton rows while loading
[ ] Messages page shows skeleton rows while loading
[ ] All loading buttons are DISABLED (no double-click)
[ ] No page ever shows blank white screen while loading
```

---

## ðŸ—‚ï¸ FILES SUMMARY

```
Config:
  .env.local
  .mcp.json
  middleware.ts
  playwright.config.ts
  package.json (test scripts)

Auth (6 files):
  src/app/(auth)/layout.tsx
  src/app/(auth)/login/page.tsx
  src/app/(auth)/register/page.tsx
  src/app/auth/callback/route.ts
  src/components/auth/LoginForm.tsx
  src/components/auth/RegisterForm.tsx

Layout (3 files):
  src/app/(dashboard)/layout.tsx
  src/components/layout/Sidebar.tsx
  src/components/layout/Header.tsx

Dashboard (4 files):
  src/app/(dashboard)/dashboard/page.tsx
  src/components/dashboard/StatsCard.tsx
  src/components/dashboard/MessageVolumeChart.tsx
  src/components/dashboard/RecentMessages.tsx

Channels (10 files):
  src/app/(dashboard)/channels/page.tsx
  src/app/(dashboard)/channels/add/page.tsx
  src/app/(dashboard)/channels/[id]/page.tsx
  src/app/(dashboard)/channels/[id]/edit/page.tsx
  src/components/channels/ChannelTable.tsx
  src/components/channels/ChannelCard.tsx
  src/components/channels/ChannelForm.tsx
  src/components/channels/ChannelDetail.tsx
  src/components/channels/ChannelFilters.tsx
  src/components/channels/ChannelStatusBadge.tsx
  src/components/channels/DeleteChannelDialog.tsx

Messages (6 files):
  src/app/(dashboard)/messages/page.tsx
  src/app/(dashboard)/messages/[id]/page.tsx
  src/components/messages/MessageTable.tsx
  src/components/messages/MessageCard.tsx
  src/components/messages/MessageDetail.tsx
  src/components/messages/MessageStatusBadge.tsx
  src/components/messages/MessageFilters.tsx

Connectors (8 files):
  src/app/(dashboard)/connectors/page.tsx
  src/app/(dashboard)/connectors/add/page.tsx
  src/app/(dashboard)/connectors/[id]/page.tsx
  src/app/(dashboard)/connectors/[id]/edit/page.tsx
  src/components/connectors/ConnectorTable.tsx
  src/components/connectors/ConnectorCard.tsx
  src/components/connectors/ConnectorForm.tsx
  src/components/connectors/ConnectorStatusBadge.tsx

Monitoring (4 files):
  src/app/(dashboard)/monitoring/page.tsx
  src/components/monitoring/MetricCard.tsx
  src/components/monitoring/LatencyChart.tsx
  src/components/monitoring/SystemHealthBar.tsx

Error Logs (3 files):
  src/app/(dashboard)/errors/page.tsx
  src/components/errors/ErrorLogTable.tsx
  src/components/errors/ResolveErrorDialog.tsx

Audit (1 file):
  src/app/(dashboard)/audit/page.tsx

Lib (6 files):
  src/lib/supabase/client.ts
  src/lib/supabase/server.ts
  src/lib/supabase/middleware.ts
  src/lib/validations/auth.ts
  src/lib/validations/channel.ts
  src/lib/validations/connector.ts
  src/lib/utils.ts

Actions (5 files):
  src/actions/auth.ts
  src/actions/channels.ts
  src/actions/messages.ts
  src/actions/connectors.ts
  src/actions/errors.ts

Types (1 file):
  src/types/index.ts

Unit Tests (6 files):
  src/tests/validations/auth.test.ts
  src/tests/validations/channel.test.ts
  src/tests/validations/connector.test.ts
  src/tests/components/auth/LoginForm.test.tsx
  src/tests/components/auth/RegisterForm.test.tsx
  src/tests/components/channels/ChannelStatusBadge.test.tsx

Loading (10 files):
  src/app/(dashboard)/loading.tsx
  src/app/(dashboard)/dashboard/loading.tsx
  src/app/(dashboard)/channels/loading.tsx
  src/app/(dashboard)/channels/add/loading.tsx
  src/app/(dashboard)/channels/[id]/loading.tsx
  src/app/(dashboard)/channels/[id]/edit/loading.tsx
  src/app/(dashboard)/messages/loading.tsx
  src/app/(dashboard)/connectors/loading.tsx
  src/app/(dashboard)/monitoring/loading.tsx
  src/app/(dashboard)/errors/loading.tsx
  src/app/layout.tsx (NextTopLoader added)

E2E Tests (6 files):
  src/tests/e2e/auth.spec.ts
  src/tests/e2e/channels.spec.ts
  src/tests/e2e/messages.spec.ts
  src/tests/e2e/monitoring.spec.ts
  src/tests/e2e/loading.spec.ts
  src/tests/e2e/responsive.spec.ts
```

---

# ðŸš€ PHASE 2 â€” DEPLOY TO VERCEL

> âš ï¸ Only start after Phase 1 is fully working locally.
> Tell Codex: **"Phase 1 done. Execute Phase 2 â€” Deploy."**

---

## PHASE 2 â€” STEP 1: Pre-Deploy Checks
```bash
npm run type-check   # 0 TypeScript errors
npm run build        # must succeed with 0 errors
npm run test:run     # all unit tests pass
npm run test:e2e     # all browser tests pass
```
Fix every error before continuing.

---

## PHASE 2 â€” STEP 2: Final GitHub Push
```
Using GitHub MCP:
1. Commit all remaining files:
   "feat: complete MedFlow â€” channels + messages + connectors + monitoring + tests"
2. Push to main branch of:
   https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
3. Confirm push succeeded
4. Repo URL: https://github.com/AI-Kurukshetra/mirth_connect_blueprint
```

---

## PHASE 2 â€” STEP 3: Deploy to Vercel
```
Using Vercel MCP:
1. Create new Vercel project called "medflow"
2. Connect to GitHub repo:
   https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
3. Set environment variables:
   NEXT_PUBLIC_SUPABASE_URL      = [from .env.local]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [from .env.local]
   SUPABASE_SERVICE_ROLE_KEY     = [from .env.local]
4. Trigger production deployment
5. Wait for completion
6. Give me the live Vercel URL
```

---

## PHASE 2 â€” STEP 4: Fix Supabase Auth URLs âš ï¸ MANUAL

> Without this step, login/register will FAIL in production.

Go to: supabase.com â†’ Your Project â†’ Authentication â†’ URL Configuration

```
Site URL:
https://medflow.vercel.app

Redirect URLs (add all):
https://medflow.vercel.app/**
https://medflow.vercel.app/auth/callback
http://localhost:3000/**
```

Save changes.

---

## PHASE 2 â€” STEP 5: Verify Production
```
[ ] https://medflow.vercel.app loads
[ ] /login works
[ ] Register new user works â†’ /dashboard
[ ] Login works â†’ /dashboard
[ ] Dashboard shows stats cards + chart
[ ] Channels page loads with 8 seeded channels
[ ] Add channel works
[ ] Edit channel works
[ ] Delete channel works
[ ] Messages page loads with seeded data
[ ] Monitoring page renders charts
[ ] Error logs page shows unresolved errors
[ ] Resolve error button works
[ ] Logout works â†’ /login
[ ] /dashboard without login â†’ /login (protected)
[ ] No console errors in browser DevTools
```

---

## PHASE 2 â€” STEP 6: Submit
```
Links to submit:
[ ] Live URL:     https://medflow.vercel.app
[ ] GitHub Repo:  https://github.com/AI-Kurukshetra/mirth_connect_blueprint
[ ] Demo Video:   https://loom.com/share/[id]

Demo video script (3 min):
0:00 - 0:30  Show app name + login page + context (healthcare integration)
0:30 - 1:00  Register â†’ dashboard â†’ show stats cards + message volume chart
1:00 - 1:45  Channels â†’ add new channel â†’ show in list â†’ view detail
1:45 - 2:15  Messages list â†’ filter by failed â†’ view message detail
2:15 - 2:45  Monitoring page â†’ charts + metrics
2:45 - 3:00  Error logs â†’ resolve an error â†’ show mobile responsive
```

---

*Phase 1 done when: `npm run dev` works + all tests pass + manual QA checklist done âœ…*
*Phase 2 done when: live Vercel URL works + all production checks pass âœ…*

