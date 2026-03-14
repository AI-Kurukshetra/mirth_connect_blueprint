alter table channels
  add column if not exists enabled boolean not null default true,
  add column if not exists source_connector_type text,
  add column if not exists source_connector_properties jsonb,
  add column if not exists source_filter jsonb,
  add column if not exists source_transformer jsonb,
  add column if not exists preprocessor_script text,
  add column if not exists postprocessor_script text;

alter table messages
  add column if not exists connector_name text,
  add column if not exists data_type text,
  add column if not exists direction text,
  add column if not exists raw_content text,
  add column if not exists transformed_content text,
  add column if not exists encoded_content text,
  add column if not exists sent_content text,
  add column if not exists response_content text,
  add column if not exists error_content text,
  add column if not exists connector_map jsonb not null default '{}'::jsonb,
  add column if not exists channel_map jsonb not null default '{}'::jsonb,
  add column if not exists response_map jsonb not null default '{}'::jsonb,
  add column if not exists custom_metadata jsonb not null default '{}'::jsonb;

update messages
set
  raw_content = coalesce(raw_content, raw_payload),
  transformed_content = coalesce(transformed_content, transformed_payload),
  error_content = coalesce(error_content, error_message),
  direction = coalesce(direction, 'inbound'),
  data_type = coalesce(data_type, case
    when message_format in ('FHIR_R4', 'FHIR_R5') then 'FHIR'
    when message_format in ('JSON', 'XML') then message_format
    else 'HL7V2'
  end),
  connector_name = coalesce(connector_name, source_system);

alter table messages drop constraint if exists messages_status_check;
alter table messages
  add constraint messages_status_check
  check (
    status in (
      'processed',
      'failed',
      'queued',
      'retrying',
      'filtered',
      'archived',
      'received',
      'transformed',
      'sent',
      'error',
      'pending'
    )
  );

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  enabled boolean not null default true,
  connector_type text not null,
  connector_properties jsonb,
  filter jsonb,
  transformer jsonb,
  response_transformer jsonb,
  queue_enabled boolean not null default false,
  retry_count int not null default 0,
  retry_interval_ms int not null default 0,
  rotate_queue boolean not null default false,
  queue_thread_count int not null default 1,
  inbound_data_type text,
  outbound_data_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists destinations_updated_at on destinations;
create trigger destinations_updated_at
  before update on destinations
  for each row execute procedure update_updated_at();

alter table destinations enable row level security;
drop policy if exists "Authenticated users can view destinations" on destinations;
drop policy if exists "Authenticated users can insert destinations" on destinations;
drop policy if exists "Authenticated users can update destinations" on destinations;
drop policy if exists "Authenticated users can delete destinations" on destinations;
create policy "Authenticated users can view destinations"
  on destinations for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert destinations"
  on destinations for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update destinations"
  on destinations for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete destinations"
  on destinations for delete using (auth.role() = 'authenticated');

create table if not exists fhir_resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  version int not null default 1,
  resource_data jsonb not null,
  source_message_id uuid references messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_type, resource_id)
);

drop trigger if exists fhir_resources_updated_at on fhir_resources;
create trigger fhir_resources_updated_at
  before update on fhir_resources
  for each row execute procedure update_updated_at();

create index if not exists destinations_channel_id_idx on destinations(channel_id, sort_order);
create index if not exists fhir_resources_type_id_idx on fhir_resources(resource_type, resource_id);
create index if not exists messages_message_id_idx on messages(message_id);

alter table fhir_resources enable row level security;
drop policy if exists "Authenticated users can view fhir resources" on fhir_resources;
drop policy if exists "Authenticated users can insert fhir resources" on fhir_resources;
drop policy if exists "Authenticated users can update fhir resources" on fhir_resources;
drop policy if exists "Authenticated users can delete fhir resources" on fhir_resources;
create policy "Authenticated users can view fhir resources"
  on fhir_resources for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert fhir resources"
  on fhir_resources for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update fhir resources"
  on fhir_resources for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete fhir resources"
  on fhir_resources for delete using (auth.role() = 'authenticated');
