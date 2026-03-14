# 🏥 MedFlow — Healthcare Integration Engine & Interoperability Platform
> **Stack:** Next.js 15 + Supabase + Vercel + TypeScript
> **Domain:** Healthcare | Category: Interoperability & HIE
> **Inspired by:** Mirth Connect — Open-source HL7 Integration
> **GitHub Repo:** https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
> **MCPs Connected:** Supabase MCP + Vercel MCP + GitHub MCP
> **Goal:** Build locally → test → deploy to Vercel

---

## 🎨 DESIGN PROMPT FOR CODEX

> **Give this prompt to Codex before building any UI:**

```
Design MedFlow with a premium, dark-mode-first healthcare SaaS aesthetic.
Think: Datadog meets Epic Systems — clinical precision with modern engineering style.

VISUAL IDENTITY:
- Primary color: Teal (#0D9488) — trust, clinical, modern
- Accent color: Cyan (#06B6D4) — data flow, live indicators
- Background: Deep slate (#0F172A) — dark mode default
- Surface cards: (#1E293B) with subtle border (#334155)
- Success: Emerald (#10B981) | Warning: Amber (#F59E0B) | Error: Rose (#F43F5E)
- Text: White (#F8FAFC) primary, Slate-400 (#94A3B8) muted

TYPOGRAPHY:
- Font: Inter for UI, JetBrains Mono for message payloads/code
- Page titles: text-2xl font-bold tracking-tight
- Stats: text-4xl font-black tabular-nums (for live counters)
- Monospace blocks: font-mono text-xs for HL7/FHIR raw messages

LAYOUT:
- Sidebar: 260px, dark (#0F172A), with glowing teal active indicator (left border)
- Header: 64px, frosted glass effect (backdrop-blur), shows live status pill
- Content area: max-w-7xl mx-auto, generous padding
- Cards: rounded-xl, subtle shadow, hover:scale-[1.01] transition

UNIQUE DESIGN ELEMENTS:
1. Live pulse dot — animated green/red dot next to active channels (CSS animation)
2. Message flow visualizer — animated arrow between source→destination on channel cards
3. Gradient stat cards — each card has a subtle teal-to-cyan gradient top border
4. HL7 message viewer — syntax-highlighted payload with segment labels (MSH, PID, OBR)
5. Channel health ring — circular progress ring showing success rate % on each channel
6. Real-time counter — dashboard stats count up with animation on page load
7. Status timeline — horizontal scrollable mini-timeline of recent message events
8. Heatmap calendar — message volume heatmap (GitHub-style) on monitoring page
9. Role badges — colored pill badges for admin/engineer/viewer in user table
10. Transformation editor — Monaco-style code editor for JS transformation scripts

SHADCN + TAILWIND ONLY — no external component libraries beyond what is listed.
Dark mode is DEFAULT. No light mode toggle needed.
Every page must feel like a professional enterprise tool, not a student project.
```

---

## 📋 COMPLETE BUILD ORDER FOR CODEX

```
PHASE 1 — LOCAL DEV:
0A. GitHub MCP: connect to existing repo (AI-Kurukshetra/mirth_connect_blueprint)
0B. Supabase MCP: create project "medflow" + ALL 20 tables + RLS + seed data
0C. Scaffold Next.js 15 app + install all dependencies
0D. Create .mcp.json for Next.js DevTools MCP

CORE INFRASTRUCTURE:
1.  Supabase clients (browser + server) + middleware + TypeScript types
2.  Auth pages (login + register) + server actions + RBAC middleware
3.  App layout — dark sidebar + header + mobile drawer

MODULE 1 — DASHBOARD:
4.  Dashboard home (live stats + charts + message timeline)

MODULE 2 — HL7 & FHIR MESSAGE PROCESSING:
5.  Messages list (table + filters + search)
6.  Message detail (HL7 syntax-highlighted viewer + FHIR JSON viewer)
7.  Message Archival page (search + date range + export)

MODULE 3 — VISUAL CHANNEL DESIGNER:
8.  Channels list (table + health rings + live status)
9.  Add Channel (full form with transformation script editor)
10. Edit Channel
11. Channel detail (flow diagram + recent messages + stats)

MODULE 4 — MESSAGE TRANSFORMATION ENGINE:
12. Transformations list (reusable transformation scripts)
13. Add/Edit Transformation (Monaco-style code editor + test runner)

MODULE 5 — DATA VALIDATION ENGINE:
14. Validation Rules list
15. Add/Edit Validation Rule (schema builder — HL7/FHIR/custom)

MODULE 6 — ROUTING RULES:
16. Routing Rules list
17. Add/Edit Routing Rule (condition builder)

MODULE 7 — CONNECTORS:
18. Connectors list (ping status + last active)
19. Add/Edit Connector

MODULE 8 — MONITORING & PERFORMANCE:
20. Real-time Monitoring dashboard (throughput + latency + heatmap)
21. Alerts list + Add/Edit Alert (email/webhook notification rules)

MODULE 9 — SECURITY & COMPLIANCE:
22. Audit Trail (immutable log viewer)
23. Error Logs (with resolve workflow)
24. Security Policies page

MODULE 10 — ADMIN:
25. User Management (RBAC — admin only)
26. Organizations page (multi-tenant)
27. Configurations page (version-controlled settings)

MODULE 11 — TESTING TOOLS:
28. Message Simulator (send test HL7/FHIR messages through a channel)

FINALIZATION:
29. Write all Vitest unit tests + Playwright E2E tests
30. GitHub MCP: commit all features

PHASE 2 — DEPLOY:
31. npm run build — fix ALL errors
32. All tests must pass
33. GitHub MCP: final push to main
34. Vercel MCP: create project + env vars + deploy
35. Supabase: add Vercel URL to Auth redirect (manual)
36. Verify production + record demo
```

---

## 🗄️ STEP 0A — GITHUB REPO

```
Using GitHub MCP:
1. Use existing repo: https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
2. Clone: git clone https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
          cd mirth_connect_blueprint
3. Confirm on main branch
4. ALL commits/pushes go to: AI-Kurukshetra/mirth_connect_blueprint

⚠️ Do NOT create a new repo.
```

---

## 🗄️ STEP 0B — SUPABASE PROJECT

```
Using Supabase MCP:
1. Create project "medflow"
2. Wait for provisioning
3. Run ALL SQL below (tables + RLS + triggers + seed data)
4. Return 3 env keys:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
```

---

## 🗃️ COMPLETE DATABASE SCHEMA (20 Tables)

---

### Table 1: `profiles`
```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null unique,
  avatar_url   text,
  role         text not null default 'viewer'
               check (role in ('admin', 'engineer', 'viewer')),
  organization_id uuid,                          -- FK added after organizations table
  is_active    boolean not null default true,
  last_login   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
```

---

### Table 2: `organizations`
```sql
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  org_id        text not null unique,             -- e.g. "ORG-001"
  name          text not null,
  description   text,
  domain        text,                             -- e.g. "citygeneral.org"
  plan          text not null default 'free'
                check (plan in ('free', 'pro', 'enterprise')),
  is_active     boolean not null default true,
  max_channels  int not null default 10,
  max_messages_per_day int not null default 10000,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on organizations
  for each row execute procedure update_updated_at();

-- Now add FK from profiles to organizations
alter table profiles
  add constraint profiles_organization_id_fkey
  foreign key (organization_id) references organizations(id);
```

---

### Table 3: `channels`
```sql
create table channels (
  id               uuid primary key default gen_random_uuid(),
  channel_id       text not null unique,           -- e.g. "CH-001"
  name             text not null,
  description      text,
  organization_id  uuid references organizations(id),
  source_type      text not null
                   check (source_type in ('MLLP','HTTP','HTTPS','SFTP','FTP','TCP','File','REST','SOAP','Database')),
  destination_type text not null
                   check (destination_type in ('MLLP','HTTP','HTTPS','SFTP','FTP','TCP','File','REST','SOAP','Database')),
  message_format   text not null default 'HL7v2'
                   check (message_format in ('HL7v2','HL7v3','FHIR_R4','FHIR_R5','JSON','XML','CSV','EDI')),
  status           text not null default 'active'
                   check (status in ('active','inactive','error','paused','testing')),
  filter_rules     jsonb,
  transformation_id uuid,                          -- FK to transformations
  validation_rule_id uuid,                         -- FK to validation_rules
  retry_count      int not null default 3,
  retry_interval   int not null default 60,
  timeout_seconds  int not null default 30,
  is_encrypted     boolean not null default false,
  tags             text[],
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger channels_updated_at
  before update on channels
  for each row execute procedure update_updated_at();
```

---

### Table 4: `connectors`
```sql
create table connectors (
  id              uuid primary key default gen_random_uuid(),
  connector_id    text not null unique,             -- e.g. "CON-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  type            text not null
                  check (type in ('MLLP','HTTP','SFTP','FTP','TCP','Database','REST','SOAP','File')),
  direction       text not null
                  check (direction in ('source','destination','bidirectional')),
  host            text,
  port            int,
  path_or_queue   text,
  auth_method     text not null default 'none'
                  check (auth_method in ('none','basic','token','certificate','oauth2')),
  tls_enabled     boolean not null default false,
  certificate_id  uuid,                             -- FK to certificates
  status          text not null default 'disconnected'
                  check (status in ('connected','disconnected','error','testing')),
  last_ping       timestamptz,
  ping_latency_ms int,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger connectors_updated_at
  before update on connectors
  for each row execute procedure update_updated_at();
```

---

### Table 5: `transformations`
```sql
create table transformations (
  id              uuid primary key default gen_random_uuid(),
  transformation_id text not null unique,           -- e.g. "TRF-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  language        text not null default 'javascript'
                  check (language in ('javascript','xslt','groovy','python')),
  script          text not null,                    -- actual transformation code
  input_format    text check (input_format in ('HL7v2','HL7v3','FHIR_R4','FHIR_R5','JSON','XML','CSV')),
  output_format   text check (output_format in ('HL7v2','HL7v3','FHIR_R4','FHIR_R5','JSON','XML','CSV')),
  version         int not null default 1,
  is_active       boolean not null default true,
  last_tested_at  timestamptz,
  test_result     text check (test_result in ('pass','fail','untested')),
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger transformations_updated_at
  before update on transformations
  for each row execute procedure update_updated_at();

-- Add FK from channels to transformations
alter table channels
  add constraint channels_transformation_id_fkey
  foreign key (transformation_id) references transformations(id);
```

---

### Table 6: `validation_rules`
```sql
create table validation_rules (
  id              uuid primary key default gen_random_uuid(),
  rule_id         text not null unique,             -- e.g. "VAL-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  message_format  text not null
                  check (message_format in ('HL7v2','HL7v3','FHIR_R4','FHIR_R5','JSON','XML','CSV')),
  rule_type       text not null
                  check (rule_type in ('schema','required_fields','format','custom')),
  rule_definition jsonb not null,                   -- JSON schema or field rules
  is_active       boolean not null default true,
  severity        text not null default 'error'
                  check (severity in ('error','warning','info')),
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger validation_rules_updated_at
  before update on validation_rules
  for each row execute procedure update_updated_at();

-- Add FK from channels to validation_rules
alter table channels
  add constraint channels_validation_rule_id_fkey
  foreign key (validation_rule_id) references validation_rules(id);
```

---

### Table 7: `routing_rules`
```sql
create table routing_rules (
  id              uuid primary key default gen_random_uuid(),
  rule_id         text not null unique,             -- e.g. "RR-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  channel_id      uuid references channels(id),
  priority        int not null default 1,           -- lower = higher priority
  condition_type  text not null
                  check (condition_type in ('message_type','field_value','source','format','custom')),
  condition_field text,                             -- e.g. "MSH.9", "PID.3"
  condition_operator text
                  check (condition_operator in ('equals','contains','starts_with','regex','exists')),
  condition_value text,
  action          text not null
                  check (action in ('route_to','filter','transform','duplicate','archive')),
  destination_channel_id uuid references channels(id),
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger routing_rules_updated_at
  before update on routing_rules
  for each row execute procedure update_updated_at();
```

---

### Table 8: `messages`
```sql
create table messages (
  id                  uuid primary key default gen_random_uuid(),
  message_id          text not null unique,          -- e.g. "MSG-00001"
  channel_id          uuid references channels(id),
  organization_id     uuid references organizations(id),
  source_system       text not null,
  destination_system  text not null,
  message_type        text not null,                 -- e.g. "ADT^A01", "Patient"
  message_format      text not null,
  status              text not null default 'queued'
                      check (status in ('processed','failed','queued','retrying','filtered','archived')),
  priority            text not null default 'normal'
                      check (priority in ('low','normal','high','critical')),
  raw_payload         text,
  transformed_payload text,
  validation_status   text check (validation_status in ('valid','invalid','skipped')),
  validation_errors   jsonb,
  error_message       text,
  retry_attempts      int not null default 0,
  processing_time_ms  int,
  size_bytes          int,
  is_archived         boolean not null default false,
  archived_at         timestamptz,
  created_at          timestamptz not null default now()
);

-- Index for fast filtering
create index messages_channel_id_idx on messages(channel_id);
create index messages_status_idx on messages(status);
create index messages_created_at_idx on messages(created_at desc);
create index messages_organization_id_idx on messages(organization_id);
```

---

### Table 9: `audit_logs`
```sql
create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  organization_id uuid references organizations(id),
  action          text not null,
                  -- e.g. "channel.created", "user.role_changed", "message.archived"
  entity_type     text not null
                  check (entity_type in ('channel','message','connector','user','organization',
                                         'transformation','validation_rule','routing_rule',
                                         'alert','configuration','security_policy')),
  entity_id       text,
  entity_name     text,
  old_value       jsonb,                            -- before state (for updates)
  new_value       jsonb,                            -- after state
  ip_address      text,
  user_agent      text,
  created_at      timestamptz not null default now()
  -- NOTE: No update/delete allowed — audit logs are IMMUTABLE
);

create index audit_logs_user_id_idx on audit_logs(user_id);
create index audit_logs_created_at_idx on audit_logs(created_at desc);
create index audit_logs_entity_type_idx on audit_logs(entity_type);
```

---

### Table 10: `error_logs`
```sql
create table error_logs (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid references messages(id),
  channel_id      uuid references channels(id),
  organization_id uuid references organizations(id),
  error_code      text not null,                    -- e.g. "NET-001", "VAL-003"
  error_type      text not null
                  check (error_type in ('validation','transformation','routing','network',
                                        'auth','system','timeout','schema')),
  severity        text not null default 'error'
                  check (severity in ('critical','error','warning','info')),
  error_message   text not null,
  stack_trace     text,
  context         jsonb,                            -- extra debug info
  resolved        boolean not null default false,
  resolved_by     uuid references profiles(id),
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);

create index error_logs_resolved_idx on error_logs(resolved);
create index error_logs_created_at_idx on error_logs(created_at desc);
```

---

### Table 11: `performance_metrics`
```sql
create table performance_metrics (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references organizations(id),
  recorded_at       timestamptz not null default now(),
  interval_minutes  int not null default 60,
  messages_total    int not null default 0,
  messages_success  int not null default 0,
  messages_failed   int not null default 0,
  messages_queued   int not null default 0,
  avg_latency_ms    numeric(10,2),
  p95_latency_ms    numeric(10,2),
  p99_latency_ms    numeric(10,2),
  throughput_per_min numeric(10,2),
  cpu_usage_pct     numeric(5,2),
  memory_usage_pct  numeric(5,2),
  active_channels   int not null default 0,
  active_connectors int not null default 0,
  error_rate_pct    numeric(5,2)
);

create index performance_metrics_recorded_at_idx on performance_metrics(recorded_at desc);
```

---

### Table 12: `alerts`
```sql
create table alerts (
  id              uuid primary key default gen_random_uuid(),
  alert_id        text not null unique,             -- e.g. "ALT-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  trigger_type    text not null
                  check (trigger_type in ('error_rate','latency','message_failure',
                                          'channel_down','queue_depth','custom')),
  threshold_value numeric(10,2),
  threshold_operator text check (threshold_operator in ('gt','lt','gte','lte','eq')),
  notification_channel text not null
                  check (notification_channel in ('email','webhook','slack','sms')),
  notification_target text not null,                -- email address or webhook URL
  cooldown_minutes int not null default 15,
  is_active       boolean not null default true,
  last_triggered  timestamptz,
  trigger_count   int not null default 0,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger alerts_updated_at
  before update on alerts
  for each row execute procedure update_updated_at();
```

---

### Table 13: `alert_history`
```sql
create table alert_history (
  id          uuid primary key default gen_random_uuid(),
  alert_id    uuid references alerts(id),
  triggered_at timestamptz not null default now(),
  trigger_value numeric(10,2),
  message     text,
  notified    boolean not null default false,
  notified_at timestamptz
);
```

---

### Table 14: `configurations`
```sql
create table configurations (
  id              uuid primary key default gen_random_uuid(),
  config_id       text not null,                    -- e.g. "CFG-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  config_type     text not null
                  check (config_type in ('global','channel','connector','security','notification')),
  config_data     jsonb not null,
  version         int not null default 1,
  is_active       boolean not null default true,
  deployed_at     timestamptz,
  deployed_by     uuid references profiles(id),
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(config_id, version)
);

create trigger configurations_updated_at
  before update on configurations
  for each row execute procedure update_updated_at();
```

---

### Table 15: `schemas`
```sql
create table schemas (
  id              uuid primary key default gen_random_uuid(),
  schema_id       text not null unique,             -- e.g. "SCH-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  message_format  text not null
                  check (message_format in ('HL7v2','HL7v3','FHIR_R4','FHIR_R5','JSON','XML')),
  message_type    text,                             -- e.g. "ADT^A01"
  schema_definition jsonb not null,
  version         text not null default '1.0',
  is_standard     boolean not null default false,   -- true = HL7/FHIR standard schema
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger schemas_updated_at
  before update on schemas
  for each row execute procedure update_updated_at();
```

---

### Table 16: `security_policies`
```sql
create table security_policies (
  id              uuid primary key default gen_random_uuid(),
  policy_id       text not null unique,             -- e.g. "SEC-001"
  name            text not null,
  organization_id uuid references organizations(id),
  policy_type     text not null
                  check (policy_type in ('encryption','access_control','data_masking',
                                         'ip_whitelist','rate_limiting','tls')),
  policy_config   jsonb not null,
  is_active       boolean not null default true,
  applies_to      text[],                           -- channel IDs or 'all'
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger security_policies_updated_at
  before update on security_policies
  for each row execute procedure update_updated_at();
```

---

### Table 17: `certificates`
```sql
create table certificates (
  id              uuid primary key default gen_random_uuid(),
  cert_id         text not null unique,             -- e.g. "CERT-001"
  name            text not null,
  organization_id uuid references organizations(id),
  cert_type       text not null
                  check (cert_type in ('tls','client','ca','signing')),
  subject         text,
  issuer          text,
  fingerprint     text,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- Add FK from connectors to certificates
alter table connectors
  add constraint connectors_certificate_id_fkey
  foreign key (certificate_id) references certificates(id);
```

---

### Table 18: `message_templates`
```sql
create table message_templates (
  id              uuid primary key default gen_random_uuid(),
  template_id     text not null unique,             -- e.g. "TPL-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  message_format  text not null
                  check (message_format in ('HL7v2','HL7v3','FHIR_R4','FHIR_R5','JSON','XML')),
  message_type    text not null,
  template_body   text not null,                    -- template with placeholders
  variables       jsonb,                            -- list of placeholder variables
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger message_templates_updated_at
  before update on message_templates
  for each row execute procedure update_updated_at();
```

---

### Table 19: `schedules`
```sql
create table schedules (
  id              uuid primary key default gen_random_uuid(),
  schedule_id     text not null unique,             -- e.g. "SCH-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  channel_id      uuid references channels(id),
  cron_expression text not null,                    -- e.g. "0 2 * * *" (2am daily)
  timezone        text not null default 'UTC',
  action          text not null
                  check (action in ('trigger_channel','send_template','run_validation',
                                    'archive_messages','generate_report')),
  action_config   jsonb,
  is_active       boolean not null default true,
  last_run        timestamptz,
  next_run        timestamptz,
  run_count       int not null default 0,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger schedules_updated_at
  before update on schedules
  for each row execute procedure update_updated_at();
```

---

### Table 20: `simulation_tests`
```sql
create table simulation_tests (
  id              uuid primary key default gen_random_uuid(),
  test_id         text not null unique,             -- e.g. "SIM-001"
  name            text not null,
  description     text,
  organization_id uuid references organizations(id),
  channel_id      uuid references channels(id),
  test_payload    text not null,                    -- HL7/FHIR test message
  expected_output text,
  message_format  text not null,
  status          text not null default 'pending'
                  check (status in ('pending','running','passed','failed')),
  result_payload  text,
  result_errors   jsonb,
  execution_time_ms int,
  run_by          uuid references profiles(id),
  last_run_at     timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);
```

---

## 🔐 ROLE-BASED ACCESS CONTROL (RBAC)

### 3 Roles Defined

```
ADMIN    — Full access to everything: users, orgs, all CRUD, settings, security
ENGINEER — Can create/edit channels, connectors, transformations, view all data
VIEWER   — Read-only: can view messages, monitoring, audit logs — no create/edit/delete
```

### Role Permission Matrix

| Feature | Admin | Engineer | Viewer |
|---|:---:|:---:|:---:|
| View Dashboard | ✅ | ✅ | ✅ |
| View Messages | ✅ | ✅ | ✅ |
| Archive Messages | ✅ | ✅ | ❌ |
| Create/Edit Channels | ✅ | ✅ | ❌ |
| Delete Channels | ✅ | ❌ | ❌ |
| Create/Edit Connectors | ✅ | ✅ | ❌ |
| Create/Edit Transformations | ✅ | ✅ | ❌ |
| Run Simulation Tests | ✅ | ✅ | ❌ |
| Create/Edit Validation Rules | ✅ | ✅ | ❌ |
| Create/Edit Routing Rules | ✅ | ✅ | ❌ |
| View Audit Logs | ✅ | ✅ | ✅ |
| Resolve Errors | ✅ | ✅ | ❌ |
| Manage Alerts | ✅ | ✅ | ❌ |
| View Monitoring | ✅ | ✅ | ✅ |
| Manage Security Policies | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Organizations | ✅ | ❌ | ❌ |
| Manage Configurations | ✅ | ❌ | ❌ |
| Manage Certificates | ✅ | ❌ | ❌ |
| Manage Schedules | ✅ | ✅ | ❌ |

### RBAC Supabase RLS Policies

```sql
-- Helper function to get current user role
create or replace function get_user_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer;

-- profiles RLS
alter table profiles enable row level security;
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins view all profiles" on profiles for select using (get_user_role() = 'admin');
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins update any profile" on profiles for update using (get_user_role() = 'admin');
create policy "Admins insert profiles" on profiles for insert with check (get_user_role() = 'admin');

-- organizations RLS (admin only write)
alter table organizations enable row level security;
create policy "Authenticated view orgs" on organizations for select using (auth.role() = 'authenticated');
create policy "Admins manage orgs" on organizations for all using (get_user_role() = 'admin');

-- channels RLS
alter table channels enable row level security;
create policy "Authenticated view channels" on channels for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer insert channels" on channels for insert
  with check (get_user_role() in ('admin','engineer'));
create policy "Admin or Engineer update channels" on channels for update
  using (get_user_role() in ('admin','engineer'));
create policy "Admin delete channels" on channels for delete using (get_user_role() = 'admin');

-- connectors RLS
alter table connectors enable row level security;
create policy "Authenticated view connectors" on connectors for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage connectors" on connectors for insert
  with check (get_user_role() in ('admin','engineer'));
create policy "Admin or Engineer update connectors" on connectors for update
  using (get_user_role() in ('admin','engineer'));
create policy "Admin delete connectors" on connectors for delete using (get_user_role() = 'admin');

-- transformations RLS
alter table transformations enable row level security;
create policy "Authenticated view transformations" on transformations for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage transformations" on transformations for insert
  with check (get_user_role() in ('admin','engineer'));
create policy "Admin or Engineer update transformations" on transformations for update
  using (get_user_role() in ('admin','engineer'));
create policy "Admin delete transformations" on transformations for delete using (get_user_role() = 'admin');

-- validation_rules RLS
alter table validation_rules enable row level security;
create policy "Authenticated view validation rules" on validation_rules for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage validation rules" on validation_rules for all
  using (get_user_role() in ('admin','engineer'));

-- routing_rules RLS
alter table routing_rules enable row level security;
create policy "Authenticated view routing rules" on routing_rules for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage routing rules" on routing_rules for all
  using (get_user_role() in ('admin','engineer'));

-- messages RLS
alter table messages enable row level security;
create policy "Authenticated view messages" on messages for select using (auth.role() = 'authenticated');
create policy "Authenticated insert messages" on messages for insert with check (auth.role() = 'authenticated');
create policy "Admin or Engineer archive messages" on messages for update
  using (get_user_role() in ('admin','engineer'));

-- audit_logs RLS (immutable — no update/delete)
alter table audit_logs enable row level security;
create policy "Authenticated view audit logs" on audit_logs for select using (auth.role() = 'authenticated');
create policy "System insert audit logs" on audit_logs for insert with check (auth.role() = 'authenticated');

-- error_logs RLS
alter table error_logs enable row level security;
create policy "Authenticated view error logs" on error_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated insert error logs" on error_logs for insert with check (auth.role() = 'authenticated');
create policy "Admin or Engineer resolve errors" on error_logs for update
  using (get_user_role() in ('admin','engineer'));

-- performance_metrics RLS
alter table performance_metrics enable row level security;
create policy "Authenticated view metrics" on performance_metrics for select using (auth.role() = 'authenticated');
create policy "System insert metrics" on performance_metrics for insert with check (auth.role() = 'authenticated');

-- alerts RLS
alter table alerts enable row level security;
create policy "Authenticated view alerts" on alerts for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage alerts" on alerts for all
  using (get_user_role() in ('admin','engineer'));

-- security_policies RLS (admin only)
alter table security_policies enable row level security;
create policy "Authenticated view security policies" on security_policies for select using (auth.role() = 'authenticated');
create policy "Admin manage security policies" on security_policies for all using (get_user_role() = 'admin');

-- configurations RLS (admin only)
alter table configurations enable row level security;
create policy "Authenticated view configurations" on configurations for select using (auth.role() = 'authenticated');
create policy "Admin manage configurations" on configurations for all using (get_user_role() = 'admin');

-- certificates RLS (admin only)
alter table certificates enable row level security;
create policy "Authenticated view certificates" on certificates for select using (auth.role() = 'authenticated');
create policy "Admin manage certificates" on certificates for all using (get_user_role() = 'admin');

-- message_templates RLS
alter table message_templates enable row level security;
create policy "Authenticated view templates" on message_templates for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage templates" on message_templates for all
  using (get_user_role() in ('admin','engineer'));

-- schedules RLS
alter table schedules enable row level security;
create policy "Authenticated view schedules" on schedules for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage schedules" on schedules for all
  using (get_user_role() in ('admin','engineer'));

-- simulation_tests RLS
alter table simulation_tests enable row level security;
create policy "Authenticated view simulations" on simulation_tests for select using (auth.role() = 'authenticated');
create policy "Admin or Engineer manage simulations" on simulation_tests for all
  using (get_user_role() in ('admin','engineer'));
```

---

### RBAC Middleware — `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback']

// Routes that require ADMIN role
const ADMIN_ONLY_ROUTES = [
  '/users', '/organizations', '/configurations',
  '/security', '/certificates'
]

// Routes that require ADMIN or ENGINEER role (not viewer)
const ENGINEER_ROUTES = [
  '/channels/add', '/channels/.*/edit',
  '/connectors/add', '/connectors/.*/edit',
  '/transformations/add', '/transformations/.*/edit',
  '/validation/add', '/routing/add',
  '/simulator', '/schedules/add'
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Not logged in → redirect to login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in but on auth page → redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // RBAC checks for logged-in users
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'viewer'

    // Admin-only routes
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r))
    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
    }

    // Engineer+ routes
    const isEngineerRoute = ENGINEER_ROUTES.some(r => new RegExp(r).test(pathname))
    if (isEngineerRoute && role === 'viewer') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 📦 SEED DATA

```sql
-- Organization
insert into organizations (org_id, name, description, plan, max_channels)
values ('ORG-001', 'City General Hospital', 'Primary demo organization', 'enterprise', 50);

-- Channels (8)
insert into channels (channel_id, name, description, source_type, destination_type,
  message_format, status, retry_count, organization_id)
select
  ch.channel_id, ch.name, ch.description, ch.source_type, ch.destination_type,
  ch.message_format, ch.status, ch.retry_count, o.id
from (values
  ('CH-001','ADT Feed — Epic to Lab',      'ADT messages from Epic EHR to Lab',           'MLLP',  'Database','HL7v2',  'active',  3),
  ('CH-002','Lab Results — Lab to EHR',    'ORU^R01 results from Lab back to Epic',        'MLLP',  'HTTP',    'HL7v2',  'active',  3),
  ('CH-003','FHIR Patient Sync',           'FHIR R4 Patient sync to national HIE',         'HTTP',  'REST',    'FHIR_R4','active',  5),
  ('CH-004','Radiology Orders',            'ORM^O01 orders from EHR to PACS',             'MLLP',  'MLLP',    'HL7v2',  'active',  3),
  ('CH-005','Insurance Eligibility',       'FHIR Coverage queries to payer gateway',       'REST',  'REST',    'FHIR_R4','paused',  3),
  ('CH-006','Pharmacy Dispense Feed',      'RDS^O13 messages to Pharmacy system',          'MLLP',  'TCP',     'HL7v2',  'error',   3),
  ('CH-007','Demographics Export',         'Nightly bulk demographics to data warehouse',  'SFTP',  'Database','JSON',   'active',  2),
  ('CH-008','Appointment Scheduling Sync', 'SIU^S12 messages scheduling to billing',       'HTTP',  'HTTP',    'HL7v2',  'inactive',3)
) as ch(channel_id, name, description, source_type, destination_type, message_format, status, retry_count)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Connectors (6)
insert into connectors (connector_id, name, type, direction, host, port, status, auth_method, organization_id)
select
  c.connector_id, c.name, c.type, c.direction, c.host, c.port, c.status, c.auth_method, o.id
from (values
  ('CON-001','Epic EHR MLLP Source',      'MLLP',    'source',       '10.0.1.50',  2575,'connected',   'certificate'),
  ('CON-002','Lab Information System',    'MLLP',    'bidirectional','10.0.1.60',  2576,'connected',   'certificate'),
  ('CON-003','National HIE REST Endpoint','REST',    'destination',  'api.nhie.gov', 443,'connected',  'token'),
  ('CON-004','PACS Imaging System',       'MLLP',    'destination',  '10.0.2.10',  2575,'connected',   'certificate'),
  ('CON-005','Payer Gateway API',         'REST',    'bidirectional','api.payer.com',443,'disconnected','token'),
  ('CON-006','Data Warehouse PostgreSQL', 'Database','destination',  '10.0.3.20',  5432,'connected',   'basic')
) as c(connector_id, name, type, direction, host, port, status, auth_method)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Transformations (3)
insert into transformations (transformation_id, name, language, script, input_format, output_format, organization_id)
select t.transformation_id, t.name, t.language, t.script, t.input_format, t.output_format, o.id
from (values
  ('TRF-001','HL7v2 ADT to FHIR Patient',  'javascript',
   'function transform(msg) { return { resourceType: "Patient", id: msg.PID[3] }; }',
   'HL7v2','FHIR_R4'),
  ('TRF-002','ORU Result Normalizer',       'javascript',
   'function transform(msg) { return { resourceType: "Observation", status: "final" }; }',
   'HL7v2','FHIR_R4'),
  ('TRF-003','JSON to HL7v2 ADT Mapper',    'javascript',
   'function transform(msg) { return "MSH|^~\\&|SOURCE|DEST|" + new Date().toISOString(); }',
   'JSON','HL7v2')
) as t(transformation_id, name, language, script, input_format, output_format)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Validation Rules (3)
insert into validation_rules (rule_id, name, message_format, rule_type, rule_definition, organization_id)
select v.rule_id, v.name, v.message_format, v.rule_type, v.rule_definition::jsonb, o.id
from (values
  ('VAL-001','HL7v2 Required Fields',  'HL7v2',   'required_fields','{"required": ["MSH.3","MSH.4","MSH.9","PID.3"]}'),
  ('VAL-002','FHIR Patient Schema',    'FHIR_R4', 'schema',         '{"resourceType": "Patient","required": ["id","name"]}'),
  ('VAL-003','Message Size Limit',     'HL7v2',   'custom',         '{"max_size_bytes": 102400}')
) as v(rule_id, name, message_format, rule_type, rule_definition)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Routing Rules (3)
insert into routing_rules (rule_id, name, condition_type, condition_field, condition_operator,
  condition_value, action, channel_id, priority, organization_id)
select r.rule_id, r.name, r.condition_type, r.condition_field, r.condition_operator,
  r.condition_value, r.action,
  (select id from channels where channel_id = r.channel_id),
  r.priority, o.id
from (values
  ('RR-001','Route ADT to Lab',       'message_type','MSH.9','equals',    'ADT^A01','route_to','CH-001',1),
  ('RR-002','Filter Test Messages',   'field_value', 'MSH.11','equals',   'T',      'filter',  'CH-001',2),
  ('RR-003','Route Lab Results',      'message_type','MSH.9','starts_with','ORU',   'route_to','CH-002',1)
) as r(rule_id, name, condition_type, condition_field, condition_operator,
       condition_value, action, channel_id, priority)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Messages (12)
insert into messages (message_id, channel_id, source_system, destination_system,
  message_type, message_format, status, processing_time_ms, retry_attempts,
  raw_payload, organization_id)
select m.message_id,
  (select id from channels where channel_id = m.channel_id),
  m.source_system, m.destination_system, m.message_type, m.message_format,
  m.status, m.processing_time_ms, m.retry_attempts, m.raw_payload, o.id
from (values
  ('MSG-00001','CH-001','Epic EHR','Lab System',    'ADT^A01','HL7v2',  'processed',42, 0,'MSH|^~\&|EPIC|HOSP|LAB|LAB|20260309120000||ADT^A01|123456|P|2.3'),
  ('MSG-00002','CH-001','Epic EHR','Lab System',    'ADT^A03','HL7v2',  'processed',38, 0,'MSH|^~\&|EPIC|HOSP|LAB|LAB|20260309120100||ADT^A03|123457|P|2.3'),
  ('MSG-00003','CH-002','Lab System','Epic EHR',    'ORU^R01','HL7v2',  'processed',55, 0,'MSH|^~\&|LAB|LAB|EPIC|HOSP|20260309120200||ORU^R01|123458|P|2.3'),
  ('MSG-00004','CH-003','Epic EHR','National HIE',  'Patient','FHIR_R4','processed',120,0,'{"resourceType":"Patient","id":"12345"}'),
  ('MSG-00005','CH-004','Epic EHR','PACS',          'ORM^O01','HL7v2',  'processed',33, 0,'MSH|^~\&|EPIC|HOSP|PACS|PACS|20260309120400||ORM^O01|123460|P|2.3'),
  ('MSG-00006','CH-006','Epic EHR','Pharmacy',      'RDS^O13','HL7v2',  'failed',   0,  3,null),
  ('MSG-00007','CH-006','Epic EHR','Pharmacy',      'RDS^O13','HL7v2',  'retrying', 0,  2,null),
  ('MSG-00008','CH-001','Epic EHR','Lab System',    'ADT^A08','HL7v2',  'processed',47, 0,'MSH|^~\&|EPIC|HOSP|LAB|LAB|20260309121000||ADT^A08|123463|P|2.3'),
  ('MSG-00009','CH-003','Epic EHR','National HIE',  'Observation','FHIR_R4','processed',98,0,'{"resourceType":"Observation","status":"final"}'),
  ('MSG-00010','CH-007','Epic EHR','Data Warehouse','Patient','JSON',   'processed',210,0,'{"id":"P001","name":"John Doe","dob":"1980-05-10"}'),
  ('MSG-00011','CH-002','Lab System','Epic EHR',    'ORU^R01','HL7v2',  'queued',   null,0,null),
  ('MSG-00012','CH-004','Epic EHR','PACS',          'ORM^O01','HL7v2',  'processed',29, 0,'MSH|^~\&|EPIC|HOSP|PACS|PACS|20260309122000||ORM^O01|123467|P|2.3')
) as m(message_id, channel_id, source_system, destination_system, message_type,
       message_format, status, processing_time_ms, retry_attempts, raw_payload)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Error Logs (3)
insert into error_logs (message_id, channel_id, error_code, error_type, severity, error_message, resolved, organization_id)
select
  (select id from messages where message_id = e.message_id),
  (select id from channels where channel_id = e.channel_id),
  e.error_code, e.error_type, e.severity, e.error_message, e.resolved, o.id
from (values
  ('MSG-00006','CH-006','NET-001','network','error',
   'Connection refused: Pharmacy system at 10.0.2.30:2576 unreachable after 3 retries.', false),
  ('MSG-00007','CH-006','NET-001','network','error',
   'Connection timeout: Pharmacy system did not respond within 30 seconds.', false),
  (null,       'CH-005','AUTH-003','auth','warning',
   'Bearer token expired: Payer gateway returned 401 Unauthorized.', true)
) as e(message_id, channel_id, error_code, error_type, severity, error_message, resolved)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Alerts (2)
insert into alerts (alert_id, name, trigger_type, threshold_value, threshold_operator,
  notification_channel, notification_target, is_active, organization_id)
select a.alert_id, a.name, a.trigger_type, a.threshold_value, a.threshold_operator,
  a.notification_channel, a.notification_target, true, o.id
from (values
  ('ALT-001','High Error Rate Alert','error_rate',   5.0, 'gt','email','admin@citygeneral.org'),
  ('ALT-002','High Latency Alert',   'latency',    500.0, 'gt','webhook','https://hooks.slack.com/xxx')
) as a(alert_id, name, trigger_type, threshold_value, threshold_operator,
       notification_channel, notification_target)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Performance Metrics (6 hours)
insert into performance_metrics (recorded_at, messages_total, messages_success, messages_failed,
  avg_latency_ms, p95_latency_ms, throughput_per_min, cpu_usage_pct, memory_usage_pct,
  active_channels, error_rate_pct, organization_id)
select p.recorded_at, p.messages_total, p.messages_success, p.messages_failed,
  p.avg_latency_ms, p.p95_latency_ms, p.throughput_per_min,
  p.cpu_usage_pct, p.memory_usage_pct, p.active_channels, p.error_rate_pct, o.id
from (values
  (now()-interval'5 hours',843, 821,22,67.4,120.0,2.8,34.2,48.1,6,2.6),
  (now()-interval'4 hours',912, 898,14,72.1,135.0,3.0,38.7,50.3,6,1.5),
  (now()-interval'3 hours',1045,1021,24,65.8,118.0,3.5,42.1,52.6,7,2.3),
  (now()-interval'2 hours',987, 975, 12,61.3,110.0,3.3,39.5,51.0,7,1.2),
  (now()-interval'1 hour', 756, 740, 16,58.9,108.0,2.5,31.2,46.8,5,2.1),
  (now(),                   324, 316,  8,54.2, 98.0,2.1,28.4,44.5,5,2.5)
) as p(recorded_at,messages_total,messages_success,messages_failed,avg_latency_ms,
       p95_latency_ms,throughput_per_min,cpu_usage_pct,memory_usage_pct,active_channels,error_rate_pct)
cross join (select id from organizations where org_id = 'ORG-001') as o;

-- Simulation Tests (2)
insert into simulation_tests (test_id, name, channel_id, test_payload, message_format, status, organization_id)
select t.test_id, t.name,
  (select id from channels where channel_id = t.channel_id),
  t.test_payload, t.message_format, t.status, o.id
from (values
  ('SIM-001','ADT A01 Admit Test','CH-001',
   'MSH|^~\&|TEST|HOSP|LAB|LAB|20260309|TEST|ADT^A01|T001|T|2.3','HL7v2','passed'),
  ('SIM-002','FHIR Patient Create Test','CH-003',
   '{"resourceType":"Patient","name":[{"family":"Test","given":["User"]}]}','FHIR_R4','pending')
) as t(test_id, name, channel_id, test_payload, message_format, status)
cross join (select id from organizations where org_id = 'ORG-001') as o;
```

---

## ⚡ PROJECT SETUP

### Install Dependencies
```bash
git clone https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
cd mirth_connect_blueprint

# Core
npm install @supabase/supabase-js @supabase/ssr
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react clsx tailwind-merge sonner date-fns recharts
npm install @tanstack/react-table
npm install nextjs-toploader

# shadcn UI (dark mode)
npx shadcn@latest init
# when prompted: choose "Default" style, use CSS variables, dark mode = "class"
npx shadcn@latest add button input label form card dialog select textarea badge \
  avatar dropdown-menu sheet separator skeleton toast table tabs progress alert \
  tooltip popover command scroll-area switch slider resizable collapsible

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test
npx playwright install chromium
```

### `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=paste_from_supabase_mcp
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_from_supabase_mcp
SUPABASE_SERVICE_ROLE_KEY=paste_from_supabase_mcp
NEXT_PUBLIC_APP_NAME=MedFlow
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### `tailwind.config.ts` — Dark Mode
```typescript
const config = {
  darkMode: ['class'],
  // ... rest of config
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0D9488',   // teal-600
          light:   '#14B8A6',   // teal-500
          dark:    '#0F766E',   // teal-700
        },
        surface: {
          DEFAULT: '#1E293B',   // slate-800
          dark:    '#0F172A',   // slate-900
          border:  '#334155',   // slate-700
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    }
  }
}
```

---

## 📁 COMPLETE FOLDER STRUCTURE

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                        ← dark sidebar + header
│   │   ├── dashboard/page.tsx                ← live stats + charts
│   │   ├── messages/
│   │   │   ├── page.tsx                      ← messages list
│   │   │   ├── archive/page.tsx              ← archived messages
│   │   │   └── [id]/page.tsx                 ← HL7/FHIR payload viewer
│   │   ├── channels/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── connectors/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── transformations/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── validation/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── routing/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── monitoring/page.tsx               ← throughput + latency + heatmap
│   │   ├── alerts/
│   │   │   ├── page.tsx
│   │   │   └── add/page.tsx
│   │   ├── errors/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── simulator/page.tsx                ← message simulation tool
│   │   ├── schedules/
│   │   │   ├── page.tsx
│   │   │   └── add/page.tsx
│   │   ├── security/page.tsx                 ← admin only
│   │   ├── configurations/page.tsx           ← admin only
│   │   ├── users/page.tsx                    ← admin only
│   │   └── organizations/page.tsx            ← admin only
│   ├── auth/callback/route.ts
│   └── layout.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx                       ← dark sidebar with glow indicator
│   │   ├── Header.tsx                        ← frosted glass + live status pill
│   │   ├── MobileDrawer.tsx
│   │   └── RoleBadge.tsx                     ← admin/engineer/viewer colored pill
│   ├── dashboard/
│   │   ├── StatsCard.tsx                     ← gradient top border + count-up animation
│   │   ├── MessageVolumeChart.tsx            ← Recharts LineChart
│   │   ├── ThroughputChart.tsx
│   │   ├── StatusTimeline.tsx                ← horizontal scrollable mini-timeline
│   │   └── RecentMessages.tsx
│   ├── channels/
│   │   ├── ChannelTable.tsx
│   │   ├── ChannelCard.tsx                   ← with health ring + flow arrow animation
│   │   ├── ChannelForm.tsx                   ← includes transformation script editor
│   │   ├── ChannelDetail.tsx
│   │   ├── ChannelFilters.tsx
│   │   ├── ChannelStatusBadge.tsx            ← with live pulse dot
│   │   ├── ChannelHealthRing.tsx             ← circular progress ring
│   │   ├── FlowDiagram.tsx                   ← source→destination visual
│   │   └── DeleteChannelDialog.tsx
│   ├── messages/
│   │   ├── MessageTable.tsx
│   │   ├── MessageCard.tsx
│   │   ├── MessageDetail.tsx
│   │   ├── HL7Viewer.tsx                     ← syntax-highlighted HL7 segments
│   │   ├── FHIRViewer.tsx                    ← JSON-formatted FHIR resource
│   │   ├── MessageStatusBadge.tsx
│   │   └── MessageFilters.tsx
│   ├── connectors/
│   │   ├── ConnectorTable.tsx
│   │   ├── ConnectorCard.tsx                 ← with ping status + last active
│   │   ├── ConnectorForm.tsx
│   │   └── ConnectorStatusBadge.tsx
│   ├── transformations/
│   │   ├── TransformationTable.tsx
│   │   ├── TransformationForm.tsx            ← Monaco-style code editor
│   │   ├── TransformationDetail.tsx
│   │   └── TestRunner.tsx                    ← inline test with sample payload
│   ├── validation/
│   │   ├── ValidationRuleTable.tsx
│   │   └── ValidationRuleForm.tsx
│   ├── routing/
│   │   ├── RoutingRuleTable.tsx
│   │   ├── RoutingRuleForm.tsx               ← condition builder UI
│   │   └── ConditionBuilder.tsx
│   ├── monitoring/
│   │   ├── MetricCard.tsx
│   │   ├── LatencyChart.tsx
│   │   ├── ThroughputChart.tsx
│   │   ├── VolumeHeatmap.tsx                 ← GitHub-style heatmap calendar
│   │   └── SystemHealthBar.tsx
│   ├── alerts/
│   │   ├── AlertTable.tsx
│   │   └── AlertForm.tsx
│   ├── errors/
│   │   ├── ErrorLogTable.tsx
│   │   └── ResolveErrorDialog.tsx
│   ├── simulator/
│   │   ├── SimulatorForm.tsx                 ← send test HL7/FHIR message
│   │   └── SimulationResult.tsx
│   ├── security/
│   │   └── SecurityPolicyTable.tsx
│   ├── users/
│   │   ├── UserTable.tsx                     ← admin only
│   │   └── EditUserRoleDialog.tsx
│   └── ui/
│       ├── LivePulseDot.tsx                  ← animated green/red CSS dot
│       ├── CountUpNumber.tsx                 ← animated stat counter
│       ├── CodeEditor.tsx                    ← Monaco-style editor wrapper
│       └── EmptyState.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── validations/
│   │   ├── auth.ts
│   │   ├── channel.ts
│   │   ├── connector.ts
│   │   ├── transformation.ts
│   │   ├── validation-rule.ts
│   │   └── routing-rule.ts
│   ├── rbac.ts                               ← role check helper functions
│   └── utils.ts
├── actions/
│   ├── auth.ts
│   ├── channels.ts
│   ├── messages.ts
│   ├── connectors.ts
│   ├── transformations.ts
│   ├── validation-rules.ts
│   ├── routing-rules.ts
│   ├── errors.ts
│   ├── alerts.ts
│   ├── users.ts
│   └── audit.ts                              ← helper to insert audit log entries
├── hooks/
│   ├── useRole.ts                            ← get current user role
│   ├── usePermission.ts                      ← check if user can do action
│   └── useRealtimeMessages.ts               ← Supabase realtime subscription
└── types/
    └── index.ts
```

---

## 🔷 COMPLETE TYPESCRIPT TYPES

```typescript
// src/types/index.ts

export type UserRole = 'admin' | 'engineer' | 'viewer'
export type OrgPlan = 'free' | 'pro' | 'enterprise'
export type MessageFormat = 'HL7v2' | 'HL7v3' | 'FHIR_R4' | 'FHIR_R5' | 'JSON' | 'XML' | 'CSV' | 'EDI'
export type ChannelStatus = 'active' | 'inactive' | 'error' | 'paused' | 'testing'
export type MessageStatus = 'processed' | 'failed' | 'queued' | 'retrying' | 'filtered' | 'archived'
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical'
export type ConnectorType = 'MLLP' | 'HTTP' | 'SFTP' | 'FTP' | 'TCP' | 'Database' | 'REST' | 'SOAP' | 'File'
export type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'testing'
export type ConnectorDirection = 'source' | 'destination' | 'bidirectional'
export type ErrorType = 'validation' | 'transformation' | 'routing' | 'network' | 'auth' | 'system' | 'timeout' | 'schema'
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info'
export type AlertTriggerType = 'error_rate' | 'latency' | 'message_failure' | 'channel_down' | 'queue_depth' | 'custom'
export type TransformationLanguage = 'javascript' | 'xslt' | 'groovy' | 'python'
export type RoutingAction = 'route_to' | 'filter' | 'transform' | 'duplicate' | 'archive'
export type PolicyType = 'encryption' | 'access_control' | 'data_masking' | 'ip_whitelist' | 'rate_limiting' | 'tls'

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: UserRole
  organization_id: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  org_id: string
  name: string
  description: string | null
  domain: string | null
  plan: OrgPlan
  is_active: boolean
  max_channels: number
  max_messages_per_day: number
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  channel_id: string
  name: string
  description: string | null
  organization_id: string | null
  source_type: string
  destination_type: string
  message_format: MessageFormat
  status: ChannelStatus
  filter_rules: Record<string, unknown> | null
  transformation_id: string | null
  validation_rule_id: string | null
  retry_count: number
  retry_interval: number
  timeout_seconds: number
  is_encrypted: boolean
  tags: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Connector {
  id: string
  connector_id: string
  name: string
  description: string | null
  type: ConnectorType
  direction: ConnectorDirection
  host: string | null
  port: number | null
  path_or_queue: string | null
  auth_method: string
  tls_enabled: boolean
  certificate_id: string | null
  status: ConnectorStatus
  last_ping: string | null
  ping_latency_ms: number | null
  created_at: string
  updated_at: string
}

export interface Transformation {
  id: string
  transformation_id: string
  name: string
  description: string | null
  language: TransformationLanguage
  script: string
  input_format: MessageFormat | null
  output_format: MessageFormat | null
  version: number
  is_active: boolean
  last_tested_at: string | null
  test_result: 'pass' | 'fail' | 'untested' | null
  created_at: string
  updated_at: string
}

export interface ValidationRule {
  id: string
  rule_id: string
  name: string
  description: string | null
  message_format: MessageFormat
  rule_type: 'schema' | 'required_fields' | 'format' | 'custom'
  rule_definition: Record<string, unknown>
  is_active: boolean
  severity: 'error' | 'warning' | 'info'
  created_at: string
}

export interface RoutingRule {
  id: string
  rule_id: string
  name: string
  description: string | null
  channel_id: string | null
  priority: number
  condition_type: string
  condition_field: string | null
  condition_operator: string | null
  condition_value: string | null
  action: RoutingAction
  destination_channel_id: string | null
  is_active: boolean
  created_at: string
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
  priority: MessagePriority
  raw_payload: string | null
  transformed_payload: string | null
  validation_status: 'valid' | 'invalid' | 'skipped' | null
  validation_errors: Record<string, unknown>[] | null
  error_message: string | null
  retry_attempts: number
  processing_time_ms: number | null
  size_bytes: number | null
  is_archived: boolean
  archived_at: string | null
  created_at: string
}

export interface ErrorLog {
  id: string
  message_id: string | null
  channel_id: string | null
  error_code: string
  error_type: ErrorType
  severity: ErrorSeverity
  error_message: string
  stack_trace: string | null
  context: Record<string, unknown> | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
}

export interface PerformanceMetric {
  id: string
  recorded_at: string
  messages_total: number
  messages_success: number
  messages_failed: number
  messages_queued: number
  avg_latency_ms: number | null
  p95_latency_ms: number | null
  p99_latency_ms: number | null
  throughput_per_min: number | null
  cpu_usage_pct: number | null
  memory_usage_pct: number | null
  active_channels: number
  active_connectors: number
  error_rate_pct: number | null
}

export interface Alert {
  id: string
  alert_id: string
  name: string
  description: string | null
  trigger_type: AlertTriggerType
  threshold_value: number | null
  threshold_operator: string | null
  notification_channel: string
  notification_target: string
  cooldown_minutes: number
  is_active: boolean
  last_triggered: string | null
  trigger_count: number
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface SimulationTest {
  id: string
  test_id: string
  name: string
  channel_id: string | null
  test_payload: string
  expected_output: string | null
  message_format: MessageFormat
  status: 'pending' | 'running' | 'passed' | 'failed'
  result_payload: string | null
  result_errors: Record<string, unknown>[] | null
  execution_time_ms: number | null
  last_run_at: string | null
  created_at: string
}

export interface DashboardStats {
  totalMessagesToday: number
  processedMessages: number
  failedMessages: number
  queuedMessages: number
  activeChannels: number
  totalChannels: number
  connectedConnectors: number
  avgLatencyMs: number
  successRatePct: number
  unresolvedErrors: number
}

// Permission helper
export interface Permission {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canView: boolean
}
```

---

## 🔑 RBAC HELPER — `src/lib/rbac.ts`

```typescript
import { UserRole } from '@/types'

export function canCreate(role: UserRole): boolean {
  return role === 'admin' || role === 'engineer'
}

export function canEdit(role: UserRole): boolean {
  return role === 'admin' || role === 'engineer'
}

export function canDelete(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageSecurity(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewOnly(role: UserRole): boolean {
  return role === 'viewer'
}

export function getPermissions(role: UserRole) {
  return {
    canCreate: canCreate(role),
    canEdit: canEdit(role),
    canDelete: canDelete(role),
    canManageUsers: canManageUsers(role),
    canManageSecurity: canManageSecurity(role),
  }
}
```

---

## 🖥️ ALL PAGES — DETAILED SPEC

---

### SIDEBAR NAVIGATION (Dark, all roles see items — greyed out if no access)

```
🏥 MedFlow
   (teal glow on active)

📊  Dashboard           → /dashboard
💬  Messages            → /messages
📡  Channels            → /channels
🔌  Connectors          → /connectors
⚙️   Transformations    → /transformations
✅  Validation Rules    → /validation
🔀  Routing Rules       → /routing
📈  Monitoring          → /monitoring
🔔  Alerts              → /alerts
🧪  Simulator           → /simulator
🗓️   Schedules          → /schedules
──────────────────────────
⚠️   Error Logs         → /errors
🗒️   Audit Trail        → /audit
──────────────────────────
ADMIN ONLY:
🔒  Security            → /security
⚙️   Configurations     → /configurations
👥  Users               → /users
🏢  Organizations       → /organizations
──────────────────────────
   [Avatar] Name
   Role Badge (admin/engineer/viewer)
   [Sign Out]
```

---

### PAGE 1 — DASHBOARD `/dashboard`

**Stats Row (6 cards with count-up animation + gradient top border):**
```
Total Messages Today | Active Channels | Failed Today | Avg Latency | Success Rate | Unresolved Errors
     4,867               5 / 8             8             54ms          97.5%           2
```

**Charts Row:**
- Left (60%): Message Volume LineChart — processed vs failed, last 6 hours
- Right (40%): Channel Status donut chart — active/paused/error/inactive

**Status Timeline:** Horizontal scrollable strip of last 10 message events with icon + type + time

**Recent Messages Table:** Last 8 messages — ID, type, channel, status badge, latency, time ago

---

### PAGE 2 — MESSAGES `/messages`

Filters: Search | Format | Status | Channel | Priority | Date range

Table columns: Message ID | Channel | Type | Format | Status | Priority | Latency | Size | Time

Click row → `/messages/[id]`

**Message Detail Page `/messages/[id]`:**
- Header: Message ID, type, status, source → destination, latency
- Tabs:
  - **Raw Payload** — HL7 viewer with color-coded segments (MSH=blue, PID=green, OBR=yellow) OR FHIR JSON syntax-highlighted
  - **Transformed Payload** — post-transformation output
  - **Validation** — validation status, any errors listed
  - **Processing Info** — channel, retry history, timestamps, error message

**Message Archive `/messages/archive`:**
- Archived messages with date range filter + search
- Engineer/Admin can archive messages from this page

---

### PAGE 3 — CHANNELS `/channels`

Table: ID | Name | Format | Source→Dest | Status (with live pulse dot) | Health Ring | Actions

Channel Card (mobile): shows animated flow arrow (Source → → → Destination) + health ring %

**Channel Detail `/channels/[id]`:**
- Flow diagram: [Source Connector] ──▶ [Transform] ──▶ [Validate] ──▶ [Destination Connector]
- Stats: messages today, success rate, avg latency, last message time
- Recent messages through this channel (last 5)
- Active transformation + validation rule shown

**Channel Form (Add/Edit):**
- Section 1: Name, Description, Tags
- Section 2: Source Type, Destination Type, Message Format, Status
- Section 3: Transformation (dropdown — select from transformations table)
- Section 4: Validation Rule (dropdown — select from validation_rules)
- Section 5: Retry Policy (count + interval + timeout)
- Section 6: Script Editor — if no transformation selected, write inline JS script
- Section 7: Encryption toggle, Tags

---

### PAGE 4 — TRANSFORMATIONS `/transformations`

Table: ID | Name | Language | Input→Output Format | Version | Test Result | Status | Actions

**Transformation Detail + Editor `/transformations/[id]/edit`:**
```
┌────────────────────────────────────────────────────────┐
│ Monaco-style code editor (dark theme, JetBrains Mono)  │
│                                                        │
│  function transform(message) {                         │
│    // message = parsed HL7/FHIR input                  │
│    return {                                            │
│      resourceType: "Patient",                          │
│      id: message.PID[3]                                │
│    }                                                   │
│  }                                                     │
└────────────────────────────────────────────────────────┘

Test Input Payload:  [textarea — paste HL7/FHIR sample]
                     [▶ Run Test]

Test Output:         [result appears here]
Execution time:      12ms    Status: ✅ Pass
```

---

### PAGE 5 — VALIDATION RULES `/validation`

Table: ID | Name | Format | Rule Type | Severity | Active | Actions

**Validation Rule Form:**
- Name, Format (HL7v2/FHIR_R4/etc), Rule Type (schema/required_fields/format/custom)
- Rule Definition: JSON editor for defining required fields or schema
- Severity: error / warning / info
- Active toggle

---

### PAGE 6 — ROUTING RULES `/routing`

Table: ID | Name | Channel | Priority | Condition | Action | Active | Actions

**Routing Rule Form — Condition Builder UI:**
```
If:  [Message Type ▼]  [equals ▼]  [ADT^A01        ]
Then: [Route To ▼]  →  [Channel: CH-001 ▼]
Priority: [1]   Active: [toggle]
```

---

### PAGE 7 — CONNECTORS `/connectors`

Table: ID | Name | Type | Direction | Host:Port | TLS | Auth | Status (+ ping badge) | Last Ping | Actions

Status shows live dot + last ping latency.

**Connector Form:**
- Name, Type, Direction, Host, Port, Path/Queue
- Auth Method (none/basic/token/certificate/oauth2)
- TLS Enabled toggle
- Certificate (dropdown if TLS enabled)
- Test Connection button → shows ping result inline

---

### PAGE 8 — MONITORING `/monitoring`

**Top Row — 4 Live Metric Cards (auto-refresh every 30s):**
```
Throughput/min | Success Rate | Avg Latency | p95 Latency
    2.1             97.5%          54ms          98ms
```

**Charts (3):**
- Throughput Over Time (LineChart — last 6 hours)
- Success vs Failed (BarChart — side by side per hour)
- CPU + Memory (AreaChart — system resources)

**Volume Heatmap:** GitHub-style calendar heatmap showing message volume by day/hour

**Channel Health Table:** All channels with message count, error count, avg latency, last active

---

### PAGE 9 — ALERTS `/alerts`

Table: ID | Name | Trigger | Threshold | Notification | Last Triggered | Count | Active | Actions

**Alert Form:**
- Name, Trigger Type (error_rate/latency/message_failure/channel_down/queue_depth)
- Threshold Value + Operator (> / < / = etc)
- Notification Channel (email/webhook/slack/sms)
- Notification Target (email address or URL)
- Cooldown Minutes
- Active toggle

---

### PAGE 10 — SIMULATOR `/simulator`

```
┌────────────────────────────────────────────────┐
│  🧪 Message Simulator                          │
│                                                │
│  Target Channel:  [CH-001 — ADT Feed ▼]       │
│  Message Format:  [HL7v2 ▼]                   │
│  Message Type:    [ADT^A01]                    │
│                                                │
│  Test Payload:                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ MSH|^~\&|TEST|HOSP|LAB|LAB|20260309...  │  │
│  │ PID|1||12345^^^HOSP^MR||Doe^John||...   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  [Load Template ▼]           [▶ Send Test]    │
│                                                │
│  Result:                                       │
│  Status: ✅ Processed in 42ms                  │
│  Output: [transformed payload]                 │
│  Validation: ✅ Valid (3 rules passed)          │
└────────────────────────────────────────────────┘
```

---

### PAGE 11 — ERROR LOGS `/errors`

Filters: Search | Error Type | Severity | Resolved | Channel | Date Range

Table: Code | Message | Type | Severity | Channel | Resolved | Time | Actions

Unresolved rows highlighted with rose left border.
**Resolve Dialog:** confirms resolution + adds resolution note.

---

### PAGE 12 — AUDIT TRAIL `/audit`

Read-only. Immutable log. No delete button.

Filters: Date range | User | Action | Entity Type

Table: Timestamp | User | Action | Entity | Entity ID | Details (expandable JSON diff)

---

### PAGE 13 — SCHEDULES `/schedules`

Table: ID | Name | Channel | Cron | Next Run | Last Run | Run Count | Active | Actions

**Schedule Form:** Name, Channel, Cron Expression, Timezone, Action, Active

---

### PAGE 14 — SECURITY `/security` *(Admin Only)*

Tabs:
- **Policies** — list of security_policies with type, applies_to, active status
- **Certificates** — list of certificates with expiry dates + status (expired/valid/expiring-soon)
- **IP Whitelist** — managed via policy config

---

### PAGE 15 — CONFIGURATIONS `/configurations` *(Admin Only)*

Table: ID | Name | Type | Version | Deployed At | Active | Actions

Version history per config — show all versions, ability to rollback.

---

### PAGE 16 — USERS `/users` *(Admin Only)*

Table: Avatar | Name | Email | Role (badge) | Org | Active | Last Login | Actions

**Edit Role Dialog:** Change role dropdown (admin/engineer/viewer) — logs to audit trail.

---

### PAGE 17 — ORGANIZATIONS `/organizations` *(Admin Only)*

Table: Org ID | Name | Plan | Channels | Messages/Day Limit | Active | Actions

---

## 🎨 DESIGN SYSTEM (DARK MODE)

### Colors
```
Background:     #0F172A  (slate-900)
Surface Card:   #1E293B  (slate-800)
Border:         #334155  (slate-700)
Primary:        #0D9488  (teal-600)
Primary Light:  #14B8A6  (teal-500)
Accent:         #06B6D4  (cyan-500)
Success:        #10B981  (emerald-500)
Warning:        #F59E0B  (amber-500)
Error:          #F43F5E  (rose-500)
Info:           #3B82F6  (blue-500)
Text:           #F8FAFC  (slate-50)
Text Muted:     #94A3B8  (slate-400)
Text Dim:       #64748B  (slate-500)
```

### Special UI Components
```
LivePulseDot:
  active   = @keyframes pulse: bg-emerald-500 with scale + opacity animation
  error    = bg-rose-500 pulse animation
  paused   = bg-amber-500 static (no pulse)

ChannelHealthRing:
  SVG circle with stroke-dasharray for % fill
  Color: emerald (>90%) / amber (70-90%) / rose (<70%)

FlowArrow (Channel Card):
  Source [pill] ──animated dots──▶ Destination [pill]
  CSS: animation moving dots left to right

GradientStatCard:
  border-top: 3px solid linear-gradient(teal → cyan)
  Counter: CountUp from 0 to value on mount

HL7 Viewer (MessageDetail):
  MSH segment: text-blue-400
  PID segment: text-emerald-400
  OBR segment: text-yellow-400
  OBX segment: text-purple-400
  Other:       text-slate-300
  Separators:  text-slate-500

FrostedHeader:
  background: rgba(15,23,42,0.8)
  backdrop-filter: blur(12px)
  border-bottom: 1px solid #334155
```

### Role Badge Colors
```
admin    = bg-rose-500/20 text-rose-400 border-rose-500/30
engineer = bg-blue-500/20 text-blue-400 border-blue-500/30
viewer   = bg-slate-500/20 text-slate-400 border-slate-500/30
```

---

## ⏳ LOADING STATES

Every async action needs a visible loading state.

```typescript
// All button loading text:
// Sign In           → "Signing in..."
// Create Account    → "Creating account..."
// Add Channel       → "Creating channel..."
// Save Changes      → "Saving changes..."
// Delete            → "Deleting..."
// Run Test          → "Running test..."
// Send Test Message → "Sending..."
// Resolve Error     → "Resolving..."
// Ping Connector    → "Pinging..."
// Sign Out          → "Signing out..."
```

Create `loading.tsx` in EVERY route folder.
All tables show skeleton rows (8 rows × column widths) while loading.
Dashboard shows skeleton cards + skeleton chart blocks while loading.

---

## 🧪 TESTING

### Vitest Unit Tests
```
src/tests/validations/auth.test.ts
src/tests/validations/channel.test.ts
src/tests/validations/connector.test.ts
src/tests/validations/transformation.test.ts
src/tests/components/auth/LoginForm.test.tsx
src/tests/components/auth/RegisterForm.test.tsx
src/tests/components/channels/ChannelStatusBadge.test.tsx
src/tests/components/channels/ChannelHealthRing.test.tsx
src/tests/lib/rbac.test.ts                              ← test all role permission checks
```

### Playwright E2E Tests
```
src/tests/e2e/auth.spec.ts              ← login/register/logout/RBAC redirect
src/tests/e2e/channels.spec.ts          ← full CRUD as engineer
src/tests/e2e/messages.spec.ts          ← list/filter/archive/detail
src/tests/e2e/transformations.spec.ts   ← create/test transformation
src/tests/e2e/simulator.spec.ts         ← send test message
src/tests/e2e/monitoring.spec.ts        ← charts render
src/tests/e2e/errors.spec.ts            ← resolve error
src/tests/e2e/rbac.spec.ts              ← viewer cannot create, viewer redirect on admin page
src/tests/e2e/loading.spec.ts           ← all loading states visible
src/tests/e2e/responsive.spec.ts        ← mobile + desktop
```

---

## 🚀 HOW TO RUN CODEX

```powershell
$env:ANTHROPIC_API_KEY     = "sk-ant-..."
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
$env:GITHUB_TOKEN          = "ghp_..."
$env:VERCEL_TOKEN          = "..."

cd C:\Users\admin\hackathon\mirth_connect_blueprint
codex
```

**Opening prompt to give Codex:**
```
Read MEDFLOW_COMPLETE_SPEC.md carefully — this is the full specification.

First apply the DESIGN PROMPT at the top of the file for all UI.
Then execute Phase 1 step by step:

0A. GitHub MCP: connect to https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
0B. Supabase MCP: create project "medflow" + run ALL 20 tables SQL + RLS + seed data
    Then give me the 3 env keys so I can paste into .env.local
0C. Scaffold Next.js 15 with dark mode Tailwind config + all dependencies

Wait for my confirmation after I paste Supabase keys before continuing to Step 1.
```

---

## 🚀 PHASE 2 — DEPLOY

### Step 1: Pre-Deploy Checks
```bash
npm run type-check    # 0 TypeScript errors
npm run build         # must succeed
npm run test:run      # all unit tests pass
npm run test:e2e      # all E2E tests pass
```

### Step 2: Final GitHub Push
```
Using GitHub MCP:
Commit: "feat: complete MedFlow — all 17 modules + RBAC + tests"
Push to: https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
Branch: main
```

### Step 3: Deploy to Vercel
```
Using Vercel MCP:
1. Create project "medflow"
2. Connect repo: https://github.com/AI-Kurukshetra/mirth_connect_blueprint.git
3. Set env vars:
   NEXT_PUBLIC_SUPABASE_URL      = [from .env.local]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [from .env.local]
   SUPABASE_SERVICE_ROLE_KEY     = [from .env.local]
   NEXT_PUBLIC_APP_NAME          = MedFlow
4. Deploy → give me live URL
```

### Step 4: Supabase Auth URLs ⚠️ MANUAL
```
supabase.com → Project → Authentication → URL Configuration

Site URL: https://medflow.vercel.app

Redirect URLs:
  https://medflow.vercel.app/**
  https://medflow.vercel.app/auth/callback
  http://localhost:3000/**
```

### Step 5: Production QA Checklist
```
Auth & RBAC:
[ ] Login as admin → see Users/Security/Org menu items
[ ] Login as engineer → no Users/Security/Org items, can create channels
[ ] Login as viewer → no create/edit/delete buttons anywhere
[ ] Viewer accessing /users → redirected to /dashboard?error=unauthorized

Dashboard:
[ ] 6 stat cards load with count-up animation
[ ] Line chart renders with 6 data points
[ ] Status timeline shows recent events

Messages:
[ ] List loads with 12 seeded messages
[ ] HL7 viewer shows color-coded segments
[ ] FHIR viewer shows formatted JSON
[ ] Archive button visible for engineer/admin, hidden for viewer

Channels:
[ ] 8 channels load with health rings
[ ] Live pulse dot on active channels
[ ] Flow diagram on channel detail page
[ ] Transformation script editor works

Transformations:
[ ] Code editor renders with syntax highlighting
[ ] Test runner executes and shows result

Validation Rules:
[ ] 3 rules load, add new rule works

Routing Rules:
[ ] Condition builder UI works

Connectors:
[ ] Ping status shows last ping time
[ ] 6 connectors load with correct status badges

Monitoring:
[ ] All 3 charts render
[ ] Volume heatmap renders
[ ] Auto-refresh every 30s

Alerts:
[ ] 2 alerts load, add alert works

Simulator:
[ ] Can send test HL7 message through CH-001
[ ] Result shows processed status + output

Error Logs:
[ ] 2 unresolved errors highlighted
[ ] Resolve dialog works (engineer/admin only)

Audit Trail:
[ ] Read-only, no edit/delete buttons

Security: (admin only)
[ ] Accessible for admin, redirects for engineer/viewer

Loading States:
[ ] Top progress bar on all navigation
[ ] Skeleton loaders on all pages
[ ] All async buttons show spinner + disabled state

Responsive:
[ ] Sidebar collapses on mobile
[ ] Tables switch to card view on mobile
[ ] No horizontal scroll
```

### Step 6: Submit
```
[ ] Live URL:    https://medflow.vercel.app
[ ] GitHub:      https://github.com/AI-Kurukshetra/mirth_connect_blueprint
[ ] Demo Video:  https://loom.com/share/[id]

Demo Script (4 min):
0:00-0:30  Login as admin → dark UI, animated dashboard
0:30-1:00  Show channels list with health rings + live pulse dots
1:00-1:30  Open channel detail → flow diagram → view HL7 message with syntax highlighting
1:30-2:00  Transformations page → code editor + run test
2:00-2:30  Monitoring → charts + heatmap
2:30-3:00  Simulator → send test HL7 message → see result
3:00-3:30  Login as viewer → show restricted UI (no create buttons)
3:30-4:00  Error logs → resolve error → show audit trail entry created
```

---

## 📋 COMPLETE FEATURES CHECKLIST

### Core Features (from PDF)
```
[✅] HL7 Message Processing — messages table + HL7Viewer component + segment highlighting
[✅] FHIR R4/R5 Support — message_format field + FHIRViewer component
[✅] Visual Channel Designer — channel form with flow diagram + transformation editor
[✅] Database Connectivity — Supabase (PostgreSQL) + connector type 'Database'
[✅] Message Transformation Engine — transformations table + code editor + test runner
[✅] Protocol Support — source_type/destination_type: MLLP/HTTP/SFTP/TCP/REST/SOAP/File
[✅] Message Queue Management — message status: queued/retrying + retry_count/interval
[✅] Real-time Monitoring Dashboard — /monitoring with charts + auto-refresh
[✅] Audit Logging — audit_logs table (immutable) + /audit page
[✅] Role-Based Access Control — 3 roles + RBAC middleware + RLS policies
[✅] Message Filtering & Routing — routing_rules table + ConditionBuilder UI
[✅] Data Validation Engine — validation_rules table + ValidationRuleForm
[✅] Configuration Management — configurations table + version history
[✅] Error Handling & Alerting — alerts table + alert_history + notification config
[✅] Message Archival — message archive page + is_archived flag
[✅] Testing & Simulation Tools — simulator page + simulation_tests table
[✅] Performance Monitoring — performance_metrics + p95/p99 latency + heatmap
[✅] Encryption & Security — security_policies table + is_encrypted on channels + TLS
[✅] Multi-tenant Support — organizations table + org_id on all entities
[✅] Backup & Recovery — configurations versioning + Supabase managed backups
[✅] API Gateway — Next.js API routes + Supabase RLS as security layer
```

### Advanced Features (from PDF)
```
[✅] Automated Testing Suite — Vitest + Playwright + simulator
[⬜] AI-Powered Data Quality Assessment — post-MVP
[⬜] Smart Message Routing (AI) — post-MVP
[⬜] Clinical Decision Support — post-MVP
[⬜] Blockchain Audit Trail — post-MVP
[⬜] Natural Language Processing — post-MVP
[⬜] Patient Journey Mapping — post-MVP
[⬜] Predictive Analytics — post-MVP
```

---

*Phase 1 done when: `npm run dev` works + all tests pass + QA checklist ✅*
*Phase 2 done when: live Vercel URL + all production checks pass ✅*
*Built with: Next.js 15 + Supabase + Vercel + GitHub | Repo: AI-Kurukshetra/mirth_connect_blueprint*
