# HealthBridge — Healthcare Integration Engine

> A full-featured Mirth Connect clone built for a hackathon. Routes, transforms, and monitors clinical HL7/FHIR messages between healthcare systems.

---

## Quick Start

```bash
cd /Users/apple/Desktop/hackathon/auth-app
npm run dev
# Open http://localhost:3000
```

**Demo Login:** `demo@healthbridge.io` / `demo1234`

**Re-seed data:** `curl -X POST http://localhost:3000/api/seed`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| React | React 19 |
| Styling | Tailwind CSS v4 + CSS Custom Properties (`var(--hb-*)`) |
| Database | Supabase (PostgreSQL + Auth) |
| Fonts | IBM Plex Sans (body) + JetBrains Mono (code/labels) |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Flow Designer | React Flow (`@xyflow/react`) |
| Charts | Recharts |
| State | Zustand + React hooks |
| Validation | Zod |

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://przkhrwfxrelcdxnidox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_gWMlFBpdFem-fvLx5P9x-g_-1vYoTHh
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByemtocndmeHJlbGNkeG5pZG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxNzg2MCwiZXhwIjoyMDg4OTkzODYwfQ.41Y568YCxspgrGgcQq3yTPTCWdRc6t8fULyN8rMox0Y
```

---

## Database Schema (Supabase PostgreSQL)

### `channels`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| name | text | Channel name |
| description | text | |
| group_id | UUID | Optional group |
| revision | integer | Version counter |
| status | text | `started` / `stopped` / `paused` / `error` |
| deployed | boolean | Whether channel is deployed |
| enabled | boolean | |
| initial_state | text | `started` / `stopped` / `paused` |
| inbound_data_type | text | `hl7v2` / `fhir` / `json` / `xml` / `raw` / `x12` / `dicom` |
| outbound_data_type | text | Same options |
| source_connector_type | text | `tcp_listener` / `http_listener` / `file_reader` / `database_reader` / `channel_reader` / `javascript_reader` / `ws_listener` / `dicom_listener` |
| source_connector_properties | jsonb | Connector-specific config |
| source_queue_enabled | boolean | |
| source_response | text | `auto` / `none` / `destination_1` etc. |
| source_filter | jsonb | `{ script: "..." }` |
| source_transformer | jsonb | `{ script: "..." }` |
| preprocessor_script | text | JavaScript |
| postprocessor_script | text | JavaScript |
| deploy_script | text | JavaScript |
| undeploy_script | text | JavaScript |
| message_storage_mode | text | `development` / `production` / `raw` / `metadata` / `disabled` |
| content_encryption | boolean | |
| prune_content_days | integer | |
| prune_metadata_days | integer | |
| tags | text[] | Array of tags |
| created_by | UUID | User who created |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| last_deployed_at | timestamptz | |

### `destinations`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| channel_id | UUID FK → channels | |
| name | text | Destination name |
| sort_order | integer | Display order |
| enabled | boolean | |
| connector_type | text | `tcp_sender` / `http_sender` / `file_writer` / `database_writer` / `channel_writer` / `javascript_writer` / `smtp_sender` / `document_writer` / `ws_sender` / `dicom_sender` |
| connector_properties | jsonb | |
| filter | jsonb | TransformerStep[] |
| transformer | jsonb | TransformerStep[] |
| response_transformer | jsonb | TransformerStep[] |
| queue_enabled | boolean | |
| retry_count | integer | |
| retry_interval_ms | integer | |
| rotate_queue | boolean | |
| queue_thread_count | integer | |
| inbound_data_type | text | |
| outbound_data_type | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `messages`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| channel_id | UUID FK → channels | |
| connector_name | text | Source or destination name |
| message_id | bigint | Sequential message number |
| status | text | `received` / `transformed` / `filtered` / `sent` / `queued` / `error` / `pending` |
| raw_content | text | Original message |
| transformed_content | text | After transformer |
| encoded_content | text | Ready to send |
| sent_content | text | What was transmitted |
| response_content | text | Response from destination |
| error_content | text | Error details |
| connector_map | jsonb | |
| channel_map | jsonb | |
| response_map | jsonb | |
| message_type | text | e.g. `ADT^A01`, `ORU^R01`, `FHIR:Patient` |
| data_type | text | `HL7V2` / `FHIR` / `JSON` / `XML` / `RAW` |
| direction | text | `inbound` / `outbound` |
| processing_time_ms | integer | |
| custom_metadata | jsonb | Logs, filter status, destination count |
| created_at | timestamptz | |

### `fhir_resources`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| resource_type | text | `Patient` / `Encounter` / `Observation` / `DiagnosticReport` / `Condition` / `AllergyIntolerance` / `ServiceRequest` / `MedicationRequest` / `Procedure` |
| resource_id | text | FHIR resource ID |
| version | integer | Version number |
| resource | jsonb | Full FHIR R4 JSON (**column name is `resource`, NOT `resource_data`**) |
| source_message_id | UUID FK → messages | (**NOT `source_message_type`**) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `channel_stats`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| channel_id | UUID FK → channels | |
| destination_id | UUID FK → destinations | |
| received | integer | |
| filtered | integer | |
| queued | integer | |
| sent | integer | |
| errored | integer | |
| period_start | timestamptz | |
| period_end | timestamptz | |
| created_at | timestamptz | |

### `events` (Audit Log)
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| level | text | `INFO` / `WARNING` / `ERROR` |
| event_name | text | e.g. `channel.start`, `connector.send_error`, `system.startup` |
| user_id | UUID | |
| ip_address | text | |
| description | text | |
| attributes | jsonb | |
| created_at | timestamptz | |

### `queue_entries`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| message_id | UUID FK → messages | |
| channel_id | UUID FK → channels | |
| destination_id | UUID FK → destinations | |
| status | text | `pending` / `failed` / `completed` |
| attempts | integer | |
| max_attempts | integer | |
| next_retry_at | timestamptz | |
| error_log | jsonb | Array of `{ message, timestamp }` |
| created_at | timestamptz | |
| completed_at | timestamptz | |

**Note:** All tables have Row Level Security (RLS) enabled. The seed script uses the service_role key to bypass RLS.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout (IBM Plex Sans + JetBrains Mono fonts)
│   ├── globals.css                         # Design system — ALL CSS variables (white/light theme)
│   ├── page.tsx                            # Home/landing page (→ login/signup)
│   ├── login/page.tsx                      # Login (email/password + Google OAuth)
│   ├── signup/page.tsx                     # Signup (email/password + Google OAuth)
│   ├── auth/
│   │   ├── callback/route.ts              # OAuth callback handler
│   │   └── signout/route.ts               # POST — signs out, redirects to /login
│   ├── (platform)/                         # Protected layout group (requires auth)
│   │   ├── layout.tsx                     # Sidebar + topbar + auth check
│   │   ├── dashboard/page.tsx             # Main dashboard with stats, channel table, recent messages
│   │   ├── channels/
│   │   │   ├── page.tsx                   # Channel list with status, stats, start/stop
│   │   │   ├── new/page.tsx               # Create new channel (4 tabs)
│   │   │   └── [id]/
│   │   │       ├── edit/page.tsx          # Edit channel (4 tabs: Summary, Source, Destinations, Scripts)
│   │   │       ├── designer/page.tsx      # Visual flow designer (React Flow drag-and-drop)
│   │   │       └── messages/page.tsx      # Messages filtered by this channel
│   │   ├── messages/
│   │   │   ├── page.tsx                   # All messages list with filters + pagination
│   │   │   └── [id]/page.tsx             # Message detail (raw/transformed/sent/response/error tabs)
│   │   ├── fhir/page.tsx                  # FHIR resource browser (grouped by type, expandable JSON)
│   │   ├── transformations/page.tsx       # HL7 workbench (parse, validate, transform to FHIR)
│   │   ├── queue/page.tsx                 # Queue management (pending/failed/completed, retry, purge)
│   │   ├── audit/page.tsx                 # Audit/event log (INFO/WARNING/ERROR)
│   │   ├── alerts/page.tsx                # Alert rules CRUD with triggers and email notifications
│   │   ├── code-templates/page.tsx        # Reusable code snippets with Monaco editor
│   │   └── settings/page.tsx              # Server settings, config map, global scripts, pruner, RBAC
│   └── api/
│       ├── seed/route.ts                  # POST — seeds entire database with demo data
│       ├── channels/[id]/
│       │   ├── process/route.ts           # POST — send message to channel for processing
│       │   └── stats/route.ts             # GET — channel statistics
│       ├── messages/
│       │   ├── route.ts                   # GET — list messages with filters
│       │   └── [id]/
│       │       ├── route.ts               # GET — single message detail
│       │       └── reprocess/route.ts     # POST — reprocess a message
│       ├── fhir/
│       │   └── [resourceType]/
│       │       ├── route.ts               # GET (list) / POST (create)
│       │       └── [id]/route.ts          # GET / PUT / DELETE
│       └── hl7/
│           ├── parse/route.ts             # POST — parse HL7 to JSON
│           ├── validate/route.ts          # POST — validate HL7 message
│           └── transform/route.ts         # POST — transform HL7 to FHIR R4
├── components/
│   ├── channel-editor/
│   │   ├── SummaryTab.tsx                 # Channel metadata, data types, storage config
│   │   ├── SourceTab.tsx                  # Source connector config + filter + transformer (sub-tabs)
│   │   ├── DestinationsTab.tsx            # Multiple destinations with connector/filter/transformer/response
│   │   ├── ScriptsTab.tsx                 # Deploy/undeploy/preprocessor/postprocessor scripts
│   │   ├── ConnectorForm.tsx              # Dynamic form for all connector types + properties
│   │   └── TransformerEditor.tsx          # Visual filter/transformer step editor
│   └── designer/nodes/
│       ├── SourceNode.tsx                 # React Flow node (blue accent)
│       ├── TransformNode.tsx              # React Flow node (purple accent)
│       └── DestinationNode.tsx            # React Flow node (green accent)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      # Browser Supabase client (createBrowserClient)
│   │   └── server.ts                      # Server Supabase client (createServerClient with cookies)
│   ├── engine/
│   │   ├── pipeline.ts                    # Message processing pipeline (core engine)
│   │   └── executor.ts                    # Sandboxed JavaScript script executor
│   └── hl7/
│       └── samples.ts                     # Sample HL7 messages (ADT^A01, ORU^R01, ORM^O01)
└── middleware.ts                           # Auth middleware — protects /dashboard, /channels, etc.
```

---

## Design System (White/Light Theme)

All styling uses CSS custom properties defined in `src/app/globals.css`. To change theme, just update the `:root` variables.

### CSS Variables
```css
/* Core palette */
--hb-white: #ffffff;
--hb-snow: #f8fafc;          /* Page backgrounds */
--hb-cloud: #f1f5f9;
--hb-mist: #e2e8f0;
--hb-surface: #ffffff;        /* Card/panel backgrounds */
--hb-elevated: #f8fafc;
--hb-deep: #f1f5f9;
--hb-border: #e2e8f0;
--hb-border-subtle: #f1f5f9;
--hb-border-bright: #cbd5e1;

/* Accent — teal */
--hb-teal: #0d9488;           /* Primary accent */
--hb-teal-dim: #0f766e;       /* Darker teal */
--hb-teal-light: #14b8a6;
--hb-blue: #3b82f6;
--hb-cyan: #06b6d4;

/* Status */
--hb-green: #059669;
--hb-amber: #d97706;
--hb-red: #dc2626;

/* Text hierarchy */
--hb-text-primary: #0f172a;
--hb-text-secondary: #475569;
--hb-text-tertiary: #64748b;
--hb-text-ghost: #94a3b8;
```

### Utility CSS Classes
| Class | Purpose |
|---|---|
| `hb-panel` | White card with border + subtle shadow |
| `hb-panel-elevated` | White card with stronger shadow |
| `hb-panel-glass` | Frosted glass effect |
| `hb-input` | Styled input with teal focus ring |
| `hb-btn-primary` | Teal gradient button |
| `hb-btn-ghost` | White bordered button |
| `hb-grid-bg` | Subtle grid texture background |
| `hb-glow-teal` | Teal box-shadow glow |
| `hb-animate-in` | Fade-in-up animation |
| `hb-animate-in-scale` | Scale + fade animation |
| `hb-stagger-1` to `hb-stagger-8` | Animation delay classes |
| `hb-ekg-line` | Decorative EKG heartbeat line |
| `hb-skeleton` | Shimmer loading skeleton |
| `hb-status-pulse` | Pulsing status dot |

### Font Usage
- **Body text:** `font-[family-name:var(--font-ibm-plex)]` (IBM Plex Sans)
- **Code/labels/numbers:** `font-[family-name:var(--font-jetbrains)]` (JetBrains Mono)
- **Section headers pattern:** `text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]`

---

## Message Processing Pipeline

**File:** `src/lib/engine/pipeline.ts`

```
RAW MESSAGE
    ↓
[1] Preprocessor Script (optional JS)
    ↓
[2] Source Filter (boolean JS — accept/reject)
    ↓
[3] Source Transformer (JS — modify message)
    ↓
FOR EACH DESTINATION:
  [4] Destination Filter (boolean JS)
  [5] Destination Transformer (JS)
  [6] Send via Connector (TCP/HTTP/File/DB/etc.)
  [7] Capture Response
    ↓
[8] Postprocessor Script (optional JS)
    ↓
SAVED TO DATABASE (messages table)
```

### Variable Maps (Available in Scripts)
| Map | Scope | Purpose |
|---|---|---|
| `connectorMap` | Per-destination | Current connector data |
| `channelMap` | Per-message | Shared across all destinations |
| `sourceMap` | Per-message | Raw/received data |
| `responseMap` | Per-destination | Connector response |
| `globalChannelMap` | Per-channel (persistent) | Survives across messages |
| `globalMap` | System-wide (persistent) | Global state |
| `configurationMap` | Read-only | Configuration data |

### Script Utilities
- `DateUtil` — date formatting, HL7 timestamps
- `StringUtil` — string manipulation, padding
- `XMLUtil` — XML tag extraction
- `logger` — debug/info/warn/error logging

### Connector Types
**Sources:** tcp_listener, http_listener, file_reader, database_reader, channel_reader, javascript_reader, ws_listener, dicom_listener

**Destinations:** tcp_sender, http_sender, file_writer, database_writer, channel_writer, javascript_writer, smtp_sender, document_writer, ws_sender, dicom_sender

---

## API Endpoints

### Messages
- `GET /api/messages` — List with filters: `channel_id`, `status`, `direction`, `date_from`, `date_to`, `search`, `page`, `limit`
- `GET /api/messages/[id]` — Single message with all content fields
- `POST /api/messages/[id]/reprocess` — Reprocess through original channel

### Channels
- `POST /api/channels/[id]/process` — Send message for processing. Body: `{ "content": "MSH|..." }`
- `GET /api/channels/[id]/stats` — Stats: status counts, avg processing time, error rate

### HL7
- `POST /api/hl7/parse` — Parse HL7 → structured JSON. Body: `{ "message": "MSH|..." }`
- `POST /api/hl7/validate` — Validate HL7 compliance. Body: `{ "message": "MSH|..." }`
- `POST /api/hl7/transform` — Transform HL7 → FHIR R4 bundle. Body: `{ "message": "MSH|..." }`

### FHIR
- `GET /api/fhir/[resourceType]` — Search resources with pagination
- `POST /api/fhir/[resourceType]` — Create resource
- `GET /api/fhir/[resourceType]/[id]` — Get specific resource
- `PUT /api/fhir/[resourceType]/[id]` — Update resource
- `DELETE /api/fhir/[resourceType]/[id]` — Delete resource

### Auth
- `GET /auth/callback` — OAuth callback (Google login redirect)
- `POST /auth/signout` — Sign out and redirect to /login

### Seed
- `POST /api/seed` — Seeds entire database with demo data (requires service_role key in env)

---

## Seed Data Summary

The seed script (`POST /api/seed`) creates:

| Data | Count | Details |
|---|---|---|
| Demo User | 1 | `demo@healthbridge.io` / `demo1234` |
| Channels | 5 | ADT Inbound Processor, Lab Results Router, Order Dispatch, FHIR R4 Gateway, Pharmacy Integration |
| Destinations | 8 | Clinical Database, FHIR Repository, Results Database, Provider Portal Webhook, Lab Information System, FHIR Data Store, HIE FHIR Endpoint, Pharmacy System |
| Channel Stats | 7 | Per-destination stats with realistic numbers (1000s received/sent) |
| Messages | 50 | Mix of HL7 (ADT, ORU, ORM) and FHIR, various statuses |
| FHIR Resources | 12 | 3 Patients, 2 Encounters, 3 Observations, 1 DiagnosticReport, 1 Condition, 1 AllergyIntolerance, 1 ServiceRequest |
| Audit Events | 20 | System startup, channel deploys, errors, recoveries, warnings |
| Queue Entries | 8 | 2 pending, 2 failed, 4 completed |

### Seed Channel Details
1. **ADT Inbound Processor** — TCP/MLLP on port 2575, filters ADT^A01/A08, has preprocessor/postprocessor scripts, 2 destinations (DB + FHIR HTTP), status: started
2. **Lab Results Router** — TCP/MLLP on port 2576, filters ORU messages, 2 destinations (DB + Portal Webhook with abnormal-only filter), status: started
3. **Order Dispatch** — HTTP listener on /api/orders, 1 destination (LIS via MLLP), status: started
4. **FHIR R4 Gateway** — HTTPS listener on /fhir/r4, filters valid FHIR bundles, 2 destinations (DB + HIE endpoint), encryption enabled, status: started
5. **Pharmacy Integration** — TCP/MLLP on port 2577, not deployed, status: stopped

---

## Sidebar Navigation Structure

```
OPERATIONS
  ├── Dashboard      /dashboard
  ├── Channels       /channels
  ├── Messages       /messages
  └── Queue          /queue

DATA
  ├── FHIR Resources    /fhir
  ├── Transformations   /transformations
  └── Code Templates    /code-templates

SYSTEM
  ├── Alerts         /alerts
  ├── Audit Log      /audit
  └── Settings       /settings
```

---

## Authentication Flow

1. User signs up at `/signup` (email/password or Google OAuth)
2. Supabase Auth creates user + session cookie
3. `middleware.ts` protects all `(platform)` routes — redirects to `/login` if no session
4. `(platform)/layout.tsx` server-side checks `supabase.auth.getUser()` — redirects if no user
5. Sign out: `POST /auth/signout` → calls `supabase.auth.signOut()` → redirects to `/login`
6. OAuth callback: `GET /auth/callback` → exchanges code for session → redirects to `/dashboard`

---

## Key Components

### Channel Editor (4 Tabs)
- **SummaryTab** — `src/components/channel-editor/SummaryTab.tsx` — Name, description, data types, storage mode, encryption, pruning, tags
- **SourceTab** — `src/components/channel-editor/SourceTab.tsx` — Connector type + properties form, sub-tabs for Connector/Filter/Transformer
- **DestinationsTab** — `src/components/channel-editor/DestinationsTab.tsx` — Add/remove destinations, each with sub-tabs for Connector/Filter/Transformer/Response
- **ScriptsTab** — `src/components/channel-editor/ScriptsTab.tsx` — Deploy, Undeploy, Preprocessor, Postprocessor scripts with Monaco editor

### ConnectorForm
`src/components/channel-editor/ConnectorForm.tsx` — Dynamic form that renders different fields based on connector type. Supports all source and destination connector types with their specific properties.

### TransformerEditor
`src/components/channel-editor/TransformerEditor.tsx` — Visual editor for filter/transformer steps. Each step has a name, type, and script. Used in both SourceTab and DestinationsTab.

### Visual Designer
`src/app/(platform)/channels/[id]/designer/page.tsx` — React Flow canvas with:
- Left sidebar: draggable node palette (Sources, Transforms, Destinations)
- Center: flow canvas with animated edges (teal colored)
- Right sidebar: node config panel (appears on node click)
- Toolbar: back button, channel name input, status badge, save/start/stop buttons

### Designer Nodes
- `SourceNode.tsx` — Blue accent, right handle
- `TransformNode.tsx` — Purple accent, left + right handles
- `DestinationNode.tsx` — Green accent, left handle

---

## Sample HL7 Messages

Located in `src/lib/hl7/samples.ts`:

1. **ADT^A01** — Patient admission with PID, PV1, NK1 (next of kin), IN1 (insurance), AL1 (allergy), DG1 (diagnosis)
2. **ORU^R01** — Lab results with CBC (WBC, RBC, HGB, HCT, PLT) and BMP (Glucose, BUN, Creatinine, Sodium, Potassium)
3. **ORM^O01** — Lab orders for CBC, BMP, Blood Culture with STAT priority

---

## Build & Deploy

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npx next build

# All 30 routes compile successfully
```

### Routes (30 total)
```
○ /                          (Static)
○ /login                     (Static)
○ /signup                    (Static)
○ /_not-found                (Static)
ƒ /alerts                    (Dynamic)
ƒ /audit                     (Dynamic)
ƒ /channels                  (Dynamic)
ƒ /channels/[id]/designer    (Dynamic)
ƒ /channels/[id]/edit        (Dynamic)
ƒ /channels/[id]/messages    (Dynamic)
ƒ /channels/new              (Dynamic)
ƒ /code-templates            (Dynamic)
ƒ /dashboard                 (Dynamic)
ƒ /fhir                      (Dynamic)
ƒ /messages                  (Dynamic)
ƒ /messages/[id]             (Dynamic)
ƒ /queue                     (Dynamic)
ƒ /settings                  (Dynamic)
ƒ /transformations           (Dynamic)
ƒ /api/channels/[id]/process (Dynamic)
ƒ /api/channels/[id]/stats   (Dynamic)
ƒ /api/fhir/[resourceType]   (Dynamic)
ƒ /api/fhir/[resourceType]/[id] (Dynamic)
ƒ /api/hl7/parse             (Dynamic)
ƒ /api/hl7/transform         (Dynamic)
ƒ /api/hl7/validate          (Dynamic)
ƒ /api/messages              (Dynamic)
ƒ /api/messages/[id]         (Dynamic)
ƒ /api/messages/[id]/reprocess (Dynamic)
ƒ /api/seed                  (Dynamic)
ƒ /auth/callback             (Dynamic)
ƒ /auth/signout              (Dynamic)
```

---

## Known Issues / Notes

1. **RLS is enabled** on all Supabase tables — the seed script requires `SUPABASE_SERVICE_ROLE_KEY` to bypass it
2. **No real RBAC enforcement** — the Settings page has a Users & RBAC UI section but it's frontend-only, not wired to actual role checks
3. **Pharmacy Integration channel** is seeded as stopped/not deployed (intentional — shows a "development" channel)
4. **Monaco Editor** is used for code editing in Scripts tab, Code Templates, and Transformations workbench
5. **The pipeline engine** (`pipeline.ts`) executes JavaScript in a sandboxed `Function()` constructor — not a true VM, suitable for demo purposes
6. **Google OAuth** is configured in the login/signup pages — requires Google provider to be enabled in Supabase Dashboard → Authentication → Providers
7. **All pages use CSS variables** (`var(--hb-*)`) — switching theme is just changing the `:root` values in `globals.css`
8. **The visual designer** saves workflow as `workflow_definition` JSON on the channel record (separate from the form-based editor)

---

## What Was Built (Phases)

### Phase 1-4 (Previous Session)
- Supabase setup, auth (login/signup/OAuth/middleware)
- Database schema creation
- Channel CRUD (list, create, edit with 4 tabs)
- Message processing pipeline engine
- HL7 parser, validator, transformer APIs
- FHIR CRUD API
- Dashboard, Messages, FHIR, Transformations pages
- Visual channel designer with React Flow

### Phase 5
- Integrated TransformerEditor into SourceTab (sub-tabs: Connector/Filter/Transformer)
- Integrated TransformerEditor into DestinationsTab (sub-tabs: Connector/Filter/Transformer/Response)

### Phase 6
- Built Settings page (6 sections: Server, Config Map, Global Scripts, Data Pruner, Notifications, Users & RBAC)
- Built Alerts page (alert rules CRUD with type-specific triggers)
- Built Code Templates page (library sidebar + Monaco editor)
- Fixed Audit page to use `events` table (was `audit_logs`)
- Fixed Queue page to match `queue_entries` schema

### UI Redesign
- Applied "Clinical Precision" white/light theme across ALL pages
- Custom design system with CSS variables, animations, EKG decorations
- IBM Plex Sans + JetBrains Mono font pairing
- Restyled all 30+ components/pages using 7 parallel agents
- Fixed designer page and flow nodes for white theme

### Seeding
- Created `POST /api/seed` route
- Seeds demo user, 5 channels, 8 destinations, 50 messages, 12 FHIR resources, 20 audit events, 8 queue entries
- Idempotent — safe to re-run (deletes old seed data first)
