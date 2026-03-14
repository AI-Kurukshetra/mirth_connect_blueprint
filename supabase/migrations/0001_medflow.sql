create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists update_updated_at() cascade;

drop table if exists audit_logs cascade;
drop table if exists error_logs cascade;
drop table if exists performance_metrics cascade;
drop table if exists messages cascade;
drop table if exists connectors cascade;
drop table if exists channels cascade;
drop table if exists profiles cascade;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  role text not null default 'admin' check (role in ('admin', 'engineer', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create table channels (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null unique,
  name text not null,
  description text,
  source_type text not null,
  destination_type text not null,
  message_format text not null default 'HL7v2' check (message_format in ('HL7v2', 'HL7v3', 'FHIR_R4', 'FHIR_R5', 'JSON', 'XML')),
  status text not null default 'active' check (status in ('active', 'inactive', 'error', 'paused')),
  filter_rules jsonb,
  transformation text,
  retry_count int not null default 3,
  retry_interval int not null default 60,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger channels_updated_at before update on channels for each row execute procedure update_updated_at();

create table connectors (
  id uuid primary key default gen_random_uuid(),
  connector_id text not null unique,
  name text not null,
  type text not null check (type in ('MLLP', 'HTTP', 'SFTP', 'TCP', 'Database', 'REST', 'SOAP', 'File')),
  direction text not null check (direction in ('source', 'destination', 'bidirectional')),
  host text,
  port int,
  path_or_queue text,
  auth_method text check (auth_method in ('none', 'basic', 'token', 'certificate')),
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error', 'testing')),
  last_ping timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger connectors_updated_at before update on connectors for each row execute procedure update_updated_at();

create table messages (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  channel_id uuid references channels(id),
  source_system text not null,
  destination_system text not null,
  message_type text not null,
  message_format text not null,
  status text not null default 'processed' check (status in ('processed', 'failed', 'queued', 'retrying', 'filtered')),
  raw_payload text,
  transformed_payload text,
  error_message text,
  retry_attempts int not null default 0,
  processing_time_ms int,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create table error_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id),
  channel_id uuid references channels(id),
  error_code text not null,
  error_type text not null check (error_type in ('validation', 'transformation', 'routing', 'network', 'auth', 'system')),
  error_message text not null,
  stack_trace text,
  resolved boolean not null default false,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table performance_metrics (
  id uuid primary key default gen_random_uuid(),
  recorded_at timestamptz not null default now(),
  messages_total int not null default 0,
  messages_success int not null default 0,
  messages_failed int not null default 0,
  avg_latency_ms numeric(10,2),
  throughput_per_min numeric(10,2),
  cpu_usage_pct numeric(5,2),
  memory_usage_pct numeric(5,2),
  active_channels int not null default 0
);

alter table profiles enable row level security;
alter table channels enable row level security;
alter table connectors enable row level security;
alter table messages enable row level security;
alter table audit_logs enable row level security;
alter table error_logs enable row level security;
alter table performance_metrics enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Authenticated users can view channels" on channels for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert channels" on channels for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update channels" on channels for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete channels" on channels for delete using (auth.role() = 'authenticated');
create policy "Authenticated users can view connectors" on connectors for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert connectors" on connectors for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update connectors" on connectors for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete connectors" on connectors for delete using (auth.role() = 'authenticated');
create policy "Authenticated users can view messages" on messages for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert messages" on messages for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can view audit logs" on audit_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert audit logs" on audit_logs for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can view error logs" on error_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert error logs" on error_logs for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update error logs" on error_logs for update using (auth.role() = 'authenticated');
create policy "Authenticated users can view metrics" on performance_metrics for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert metrics" on performance_metrics for insert with check (auth.role() = 'authenticated');

insert into channels (channel_id, name, description, source_type, destination_type, message_format, status, retry_count) values
('CH-001', 'ADT Feed - Epic to Lab', 'Admit/Discharge/Transfer messages from Epic EHR to Lab system', 'MLLP', 'Database', 'HL7v2', 'active', 3),
('CH-002', 'Lab Results - Lab to EHR', 'ORU^R01 results from Lab back to Epic EHR', 'MLLP', 'HTTP', 'HL7v2', 'active', 3),
('CH-003', 'FHIR Patient Sync', 'FHIR R4 Patient resource sync to national HIE', 'HTTP', 'REST', 'FHIR_R4', 'active', 5),
('CH-004', 'Radiology Orders', 'ORM^O01 radiology orders from EHR to PACS', 'MLLP', 'MLLP', 'HL7v2', 'active', 3),
('CH-005', 'Insurance Eligibility Check', 'FHIR Coverage resource queries to payer gateway', 'REST', 'REST', 'FHIR_R4', 'paused', 3),
('CH-006', 'Pharmacy Dispense Feed', 'RDS^O13 pharmacy dispense messages to Pharmacy system', 'MLLP', 'TCP', 'HL7v2', 'error', 3),
('CH-007', 'Patient Demographics Export', 'Nightly bulk export of demographics to data warehouse', 'SFTP', 'Database', 'JSON', 'active', 2),
('CH-008', 'Appointment Scheduling Sync', 'SIU^S12 appointment messages between scheduling and billing', 'HTTP', 'HTTP', 'HL7v2', 'inactive', 3);

insert into connectors (connector_id, name, type, direction, host, port, status, auth_method) values
('CON-001', 'Epic EHR MLLP Source', 'MLLP', 'source', '10.0.1.50', 2575, 'connected', 'certificate'),
('CON-002', 'Lab Information System', 'MLLP', 'bidirectional', '10.0.1.60', 2576, 'connected', 'certificate'),
('CON-003', 'National HIE REST Endpoint', 'REST', 'destination', 'api.nhie.gov', 443, 'connected', 'token'),
('CON-004', 'PACS Imaging System', 'MLLP', 'destination', '10.0.2.10', 2575, 'connected', 'certificate'),
('CON-005', 'Payer Gateway API', 'REST', 'bidirectional', 'api.payer.com', 443, 'disconnected', 'token'),
('CON-006', 'Data Warehouse PostgreSQL', 'Database', 'destination', '10.0.3.20', 5432, 'connected', 'basic');

insert into messages (message_id, channel_id, source_system, destination_system, message_type, message_format, status, processing_time_ms, retry_attempts, raw_payload, transformed_payload, error_message) values
('MSG-00001', (select id from channels where channel_id='CH-001'), 'Epic EHR', 'Lab System', 'ADT^A01', 'HL7v2', 'processed', 42, 0, 'MSH|^~\\&|Epic|Hospital|Lab|System|...', '{"patient":"123"}', null),
('MSG-00002', (select id from channels where channel_id='CH-001'), 'Epic EHR', 'Lab System', 'ADT^A03', 'HL7v2', 'processed', 38, 0, 'MSH|^~\\&|Epic|Hospital|Lab|System|...', '{"patient":"124"}', null),
('MSG-00003', (select id from channels where channel_id='CH-002'), 'Lab System', 'Epic EHR', 'ORU^R01', 'HL7v2', 'processed', 55, 0, 'MSH|^~\\&|Lab|System|Epic|Hospital|...', '{"observation":"A1C"}', null),
('MSG-00004', (select id from channels where channel_id='CH-003'), 'Epic EHR', 'National HIE', 'Patient', 'FHIR_R4', 'processed', 120, 0, '{"resourceType":"Patient"}', '{"resourceType":"Patient","active":true}', null),
('MSG-00005', (select id from channels where channel_id='CH-004'), 'Epic EHR', 'PACS', 'ORM^O01', 'HL7v2', 'processed', 33, 0, 'MSH|^~\\&|Epic|Hospital|PACS|System|...', '{"order":"RAD-55"}', null),
('MSG-00006', (select id from channels where channel_id='CH-006'), 'Epic EHR', 'Pharmacy', 'RDS^O13', 'HL7v2', 'failed', null, 3, 'MSH|^~\\&|Epic|Hospital|Pharmacy|System|...', null, 'Connection refused after 3 retry attempts.'),
('MSG-00007', (select id from channels where channel_id='CH-006'), 'Epic EHR', 'Pharmacy', 'RDS^O13', 'HL7v2', 'retrying', null, 2, 'MSH|^~\\&|Epic|Hospital|Pharmacy|System|...', null, 'Connection timeout after 30 seconds.'),
('MSG-00008', (select id from channels where channel_id='CH-001'), 'Epic EHR', 'Lab System', 'ADT^A08', 'HL7v2', 'processed', 47, 0, 'MSH|^~\\&|Epic|Hospital|Lab|System|...', '{"patient":"128"}', null),
('MSG-00009', (select id from channels where channel_id='CH-003'), 'Epic EHR', 'National HIE', 'Observation', 'FHIR_R4', 'processed', 98, 0, '{"resourceType":"Observation"}', '{"resourceType":"Observation","status":"final"}', null),
('MSG-00010', (select id from channels where channel_id='CH-007'), 'Epic EHR', 'Data Warehouse', 'Patient', 'JSON', 'processed', 210, 0, '{"patients":1200}', '{"patients":1200,"synced":true}', null),
('MSG-00011', (select id from channels where channel_id='CH-002'), 'Lab System', 'Epic EHR', 'ORU^R01', 'HL7v2', 'queued', null, 0, 'MSH|^~\\&|Lab|System|Epic|Hospital|...', null, null),
('MSG-00012', (select id from channels where channel_id='CH-004'), 'Epic EHR', 'PACS', 'ORM^O01', 'HL7v2', 'processed', 29, 0, 'MSH|^~\\&|Epic|Hospital|PACS|System|...', '{"order":"RAD-88"}', null);

insert into error_logs (message_id, channel_id, error_code, error_type, error_message, resolved) values
((select id from messages where message_id='MSG-00006'), (select id from channels where channel_id='CH-006'), 'NET-001', 'network', 'Connection refused: Pharmacy system at 10.0.2.30:2576 is unreachable after 3 retry attempts.', false),
((select id from messages where message_id='MSG-00007'), (select id from channels where channel_id='CH-006'), 'NET-001', 'network', 'Connection timeout: Pharmacy system did not respond within 30 seconds.', false),
(null, (select id from channels where channel_id='CH-005'), 'AUTH-003', 'auth', 'Bearer token expired: Payer gateway returned 401 Unauthorized.', true);

insert into performance_metrics (recorded_at, messages_total, messages_success, messages_failed, avg_latency_ms, throughput_per_min, cpu_usage_pct, memory_usage_pct, active_channels) values
(now() - interval '5 hours', 843, 821, 22, 67.4, 2.8, 34.2, 48.1, 6),
(now() - interval '4 hours', 912, 898, 14, 72.1, 3.0, 38.7, 50.3, 6),
(now() - interval '3 hours', 1045, 1021, 24, 65.8, 3.5, 42.1, 52.6, 7),
(now() - interval '2 hours', 987, 975, 12, 61.3, 3.3, 39.5, 51.0, 7),
(now() - interval '1 hour', 756, 740, 16, 58.9, 2.5, 31.2, 46.8, 5),
(now(), 324, 316, 8, 54.2, 2.1, 28.4, 44.5, 5);

insert into audit_logs (action, entity_type, entity_id, details) values
('channel.updated', 'channel', 'CH-003', '{"field":"destination_type","value":"REST"}'),
('message.retried', 'message', 'MSG-00006', '{"attempt":3}'),
('connector.tested', 'connector', 'CON-003', '{"latency_ms":121}');
