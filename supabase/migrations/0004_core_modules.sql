alter table channels
  add column if not exists transformation_id uuid,
  add column if not exists validation_rule_id uuid;

create table if not exists transformations (
  id uuid primary key default gen_random_uuid(),
  transformation_id text not null unique,
  name text not null,
  description text,
  language text not null default 'javascript'
    check (language in ('javascript', 'xslt', 'groovy', 'python')),
  script text not null,
  input_format text
    check (input_format in ('HL7v2', 'HL7v3', 'FHIR_R4', 'FHIR_R5', 'JSON', 'XML', 'CSV')),
  output_format text
    check (output_format in ('HL7v2', 'HL7v3', 'FHIR_R4', 'FHIR_R5', 'JSON', 'XML', 'CSV')),
  version int not null default 1,
  is_active boolean not null default true,
  last_tested_at timestamptz,
  test_result text default 'untested'
    check (test_result in ('pass', 'fail', 'untested')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists validation_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  name text not null,
  description text,
  message_format text not null
    check (message_format in ('HL7v2', 'HL7v3', 'FHIR_R4', 'FHIR_R5', 'JSON', 'XML', 'CSV')),
  rule_type text not null
    check (rule_type in ('schema', 'required_fields', 'format', 'custom')),
  rule_definition jsonb not null,
  is_active boolean not null default true,
  severity text not null default 'error'
    check (severity in ('error', 'warning', 'info')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routing_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  name text not null,
  description text,
  channel_id uuid references channels(id) on delete cascade,
  priority int not null default 1,
  condition_type text not null
    check (condition_type in ('message_type', 'field_value', 'source', 'format', 'custom')),
  condition_field text,
  condition_operator text
    check (condition_operator in ('equals', 'contains', 'starts_with', 'regex', 'exists')),
  condition_value text,
  action text not null
    check (action in ('route_to', 'filter', 'transform', 'duplicate', 'archive')),
  destination_channel_id uuid references channels(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  alert_id text not null unique,
  name text not null,
  description text,
  trigger_type text not null
    check (trigger_type in ('error_rate', 'latency', 'message_failure', 'channel_down', 'queue_depth', 'custom')),
  threshold_value numeric(10,2),
  threshold_operator text
    check (threshold_operator in ('gt', 'lt', 'gte', 'lte', 'eq')),
  notification_channel text not null
    check (notification_channel in ('email', 'webhook', 'slack', 'sms')),
  notification_target text not null,
  cooldown_minutes int not null default 15,
  is_active boolean not null default true,
  last_triggered timestamptz,
  trigger_count int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alert_history (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alerts(id) on delete cascade,
  triggered_at timestamptz not null default now(),
  trigger_value numeric(10,2),
  message text,
  notified boolean not null default false,
  notified_at timestamptz
);

drop trigger if exists transformations_updated_at on transformations;
create trigger transformations_updated_at
  before update on transformations
  for each row execute procedure update_updated_at();

drop trigger if exists validation_rules_updated_at on validation_rules;
create trigger validation_rules_updated_at
  before update on validation_rules
  for each row execute procedure update_updated_at();

drop trigger if exists routing_rules_updated_at on routing_rules;
create trigger routing_rules_updated_at
  before update on routing_rules
  for each row execute procedure update_updated_at();

drop trigger if exists alerts_updated_at on alerts;
create trigger alerts_updated_at
  before update on alerts
  for each row execute procedure update_updated_at();

create index if not exists transformations_active_idx on transformations(is_active, input_format, output_format);
create index if not exists validation_rules_format_idx on validation_rules(message_format, is_active);
create index if not exists routing_rules_channel_priority_idx on routing_rules(channel_id, priority);
create index if not exists alerts_active_idx on alerts(is_active, trigger_type);
create index if not exists alert_history_alert_triggered_idx on alert_history(alert_id, triggered_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'channels_transformation_id_fkey'
  ) then
    alter table channels
      add constraint channels_transformation_id_fkey
      foreign key (transformation_id) references transformations(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'channels_validation_rule_id_fkey'
  ) then
    alter table channels
      add constraint channels_validation_rule_id_fkey
      foreign key (validation_rule_id) references validation_rules(id) on delete set null;
  end if;
end $$;

alter table transformations enable row level security;
alter table validation_rules enable row level security;
alter table routing_rules enable row level security;
alter table alerts enable row level security;
alter table alert_history enable row level security;

drop policy if exists "Authenticated view transformations" on transformations;
drop policy if exists "Engineers or admins insert transformations" on transformations;
drop policy if exists "Engineers or admins update transformations" on transformations;
drop policy if exists "Admin delete transformations" on transformations;
create policy "Authenticated view transformations"
  on transformations for select using (auth.role() = 'authenticated');
create policy "Engineers or admins insert transformations"
  on transformations for insert with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Engineers or admins update transformations"
  on transformations for update using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Admin delete transformations"
  on transformations for delete using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated view validation rules" on validation_rules;
drop policy if exists "Engineers or admins insert validation rules" on validation_rules;
drop policy if exists "Engineers or admins update validation rules" on validation_rules;
drop policy if exists "Admin delete validation rules" on validation_rules;
create policy "Authenticated view validation rules"
  on validation_rules for select using (auth.role() = 'authenticated');
create policy "Engineers or admins insert validation rules"
  on validation_rules for insert with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Engineers or admins update validation rules"
  on validation_rules for update using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Admin delete validation rules"
  on validation_rules for delete using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated view routing rules" on routing_rules;
drop policy if exists "Engineers or admins insert routing rules" on routing_rules;
drop policy if exists "Engineers or admins update routing rules" on routing_rules;
drop policy if exists "Admin delete routing rules" on routing_rules;
create policy "Authenticated view routing rules"
  on routing_rules for select using (auth.role() = 'authenticated');
create policy "Engineers or admins insert routing rules"
  on routing_rules for insert with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Engineers or admins update routing rules"
  on routing_rules for update using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Admin delete routing rules"
  on routing_rules for delete using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated view alerts" on alerts;
drop policy if exists "Engineers or admins insert alerts" on alerts;
drop policy if exists "Engineers or admins update alerts" on alerts;
drop policy if exists "Admin delete alerts" on alerts;
create policy "Authenticated view alerts"
  on alerts for select using (auth.role() = 'authenticated');
create policy "Engineers or admins insert alerts"
  on alerts for insert with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Engineers or admins update alerts"
  on alerts for update using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Admin delete alerts"
  on alerts for delete using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated view alert history" on alert_history;
drop policy if exists "Engineers or admins insert alert history" on alert_history;
drop policy if exists "Engineers or admins update alert history" on alert_history;
drop policy if exists "Admin delete alert history" on alert_history;
create policy "Authenticated view alert history"
  on alert_history for select using (auth.role() = 'authenticated');
create policy "Engineers or admins insert alert history"
  on alert_history for insert with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Engineers or admins update alert history"
  on alert_history for update using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));
create policy "Admin delete alert history"
  on alert_history for delete using (public.get_user_role() = 'admin');

insert into transformations (
  transformation_id,
  name,
  description,
  language,
  script,
  input_format,
  output_format,
  version,
  is_active,
  test_result
)
values
  (
    'TRF-001',
    'HL7v2 ADT to FHIR Patient',
    'Maps inbound ADT demographics into a Patient resource envelope for downstream FHIR subscribers.',
    'javascript',
    'function transform(message, maps) {\n  return { resourceType: "Patient", id: maps.channelMap.patientId || "unknown", active: true };\n}',
    'HL7v2',
    'FHIR_R4',
    1,
    true,
    'pass'
  ),
  (
    'TRF-002',
    'ORU Result Normalizer',
    'Normalizes ORU payloads into a stable Observation contract before persistence.',
    'javascript',
    'function transform(message) {\n  return { resourceType: "Observation", status: "final", payload: message };\n}',
    'HL7v2',
    'FHIR_R4',
    1,
    true,
    'untested'
  ),
  (
    'TRF-003',
    'JSON to HL7v2 Mapper',
    'Converts lightweight JSON intake into an HL7v2-compatible envelope for downstream engines.',
    'javascript',
    'function transform(message) {\n  return "MSH|^~\\&|JSON|MEDFLOW|DOWNSTREAM|TARGET|" + new Date().toISOString();\n}',
    'JSON',
    'HL7v2',
    1,
    true,
    'untested'
  )
on conflict (transformation_id) do update
set
  name = excluded.name,
  description = excluded.description,
  language = excluded.language,
  script = excluded.script,
  input_format = excluded.input_format,
  output_format = excluded.output_format,
  version = excluded.version,
  is_active = excluded.is_active,
  test_result = excluded.test_result;

insert into validation_rules (
  rule_id,
  name,
  description,
  message_format,
  rule_type,
  rule_definition,
  is_active,
  severity
)
values
  (
    'VAL-001',
    'HL7v2 Required Fields',
    'Ensures core MSH and PID segments are present before the message enters routing.',
    'HL7v2',
    'required_fields',
    '{"required":["MSH.3","MSH.4","MSH.9","PID.3"]}'::jsonb,
    true,
    'error'
  ),
  (
    'VAL-002',
    'FHIR Patient Schema',
    'Validates Patient payloads for minimum required identity and demographic fields.',
    'FHIR_R4',
    'schema',
    '{"resourceType":"Patient","required":["id","name"]}'::jsonb,
    true,
    'error'
  ),
  (
    'VAL-003',
    'Message Size Guardrail',
    'Rejects payloads that exceed the current platform size limit.',
    'HL7v2',
    'custom',
    '{"max_size_bytes":102400}'::jsonb,
    true,
    'warning'
  )
on conflict (rule_id) do update
set
  name = excluded.name,
  description = excluded.description,
  message_format = excluded.message_format,
  rule_type = excluded.rule_type,
  rule_definition = excluded.rule_definition,
  is_active = excluded.is_active,
  severity = excluded.severity;

insert into routing_rules (
  rule_id,
  name,
  description,
  channel_id,
  priority,
  condition_type,
  condition_field,
  condition_operator,
  condition_value,
  action,
  destination_channel_id,
  is_active
)
select
  seed.rule_id,
  seed.name,
  seed.description,
  source_channel.id,
  seed.priority,
  seed.condition_type,
  seed.condition_field,
  seed.condition_operator,
  seed.condition_value,
  seed.action,
  destination_channel.id,
  true
from (
  values
    (
      'RR-001',
      'Route ADT Intake to FHIR Sync',
      'Push ADT admissions into the FHIR patient synchronization lane.',
      'CH-001',
      1,
      'message_type',
      'MSH.9',
      'equals',
      'ADT^A01',
      'route_to',
      'CH-003'
    ),
    (
      'RR-002',
      'Filter Test Traffic',
      'Stops test messages from entering production destinations.',
      'CH-001',
      2,
      'field_value',
      'MSH.11',
      'equals',
      'T',
      'filter',
      null
    ),
    (
      'RR-003',
      'Archive Failed Pharmacy Retries',
      'Archives pharmacy retries after the final downstream failure window.',
      'CH-006',
      1,
      'source',
      'destination_system',
      'contains',
      'Pharmacy',
      'archive',
      null
    )
) as seed(rule_id, name, description, source_channel_key, priority, condition_type, condition_field, condition_operator, condition_value, action, destination_channel_key)
join channels as source_channel on source_channel.channel_id = seed.source_channel_key
left join channels as destination_channel on destination_channel.channel_id = seed.destination_channel_key
on conflict (rule_id) do update
set
  name = excluded.name,
  description = excluded.description,
  channel_id = excluded.channel_id,
  priority = excluded.priority,
  condition_type = excluded.condition_type,
  condition_field = excluded.condition_field,
  condition_operator = excluded.condition_operator,
  condition_value = excluded.condition_value,
  action = excluded.action,
  destination_channel_id = excluded.destination_channel_id,
  is_active = excluded.is_active;

insert into alerts (
  alert_id,
  name,
  description,
  trigger_type,
  threshold_value,
  threshold_operator,
  notification_channel,
  notification_target,
  cooldown_minutes,
  is_active,
  trigger_count
)
values
  (
    'ALT-001',
    'High Error Rate Alert',
    'Warn the operations team when runtime message failures cross the agreed threshold.',
    'error_rate',
    5.00,
    'gt',
    'email',
    'admin@medflow.local',
    15,
    true,
    0
  ),
  (
    'ALT-002',
    'High Latency Alert',
    'Notify the team when sustained processing latency exceeds the response budget.',
    'latency',
    500.00,
    'gt',
    'webhook',
    'https://hooks.medflow.local/ops',
    10,
    true,
    0
  )
on conflict (alert_id) do update
set
  name = excluded.name,
  description = excluded.description,
  trigger_type = excluded.trigger_type,
  threshold_value = excluded.threshold_value,
  threshold_operator = excluded.threshold_operator,
  notification_channel = excluded.notification_channel,
  notification_target = excluded.notification_target,
  cooldown_minutes = excluded.cooldown_minutes,
  is_active = excluded.is_active;

update channels
set transformation_id = (select id from transformations where transformation_id = 'TRF-001')
where channel_id = 'CH-001';

update channels
set transformation_id = (select id from transformations where transformation_id = 'TRF-002')
where channel_id = 'CH-003';

update channels
set validation_rule_id = (select id from validation_rules where rule_id = 'VAL-001')
where channel_id = 'CH-001';

update channels
set validation_rule_id = (select id from validation_rules where rule_id = 'VAL-002')
where channel_id = 'CH-003';

insert into alert_history (alert_id, triggered_at, trigger_value, message, notified, notified_at)
select
  alerts.id,
  now() - interval '90 minutes',
  7.20,
  'Seeded historical trigger for dashboard and alerts testing.',
  true,
  now() - interval '89 minutes'
from alerts
where alerts.alert_id = 'ALT-001'
  and not exists (
    select 1 from alert_history history where history.alert_id = alerts.id
  );
