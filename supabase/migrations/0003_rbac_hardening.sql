alter table profiles alter column role set default 'viewer';

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'viewer');
$$;

grant execute on function public.get_user_role() to anon, authenticated, service_role;

create policy "Admins view all profiles"
  on profiles for select
  using (public.get_user_role() = 'admin');

create policy "Admins update any profile"
  on profiles for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "Authenticated users can insert channels" on channels;
drop policy if exists "Authenticated users can update channels" on channels;
drop policy if exists "Authenticated users can delete channels" on channels;

create policy "Engineers or admins insert channels"
  on channels for insert
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Engineers or admins update channels"
  on channels for update
  using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Admin delete channels"
  on channels for delete
  using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated users can insert connectors" on connectors;
drop policy if exists "Authenticated users can update connectors" on connectors;
drop policy if exists "Authenticated users can delete connectors" on connectors;

create policy "Engineers or admins insert connectors"
  on connectors for insert
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Engineers or admins update connectors"
  on connectors for update
  using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Admin delete connectors"
  on connectors for delete
  using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated users can insert messages" on messages;
drop policy if exists "Engineers or admins update messages" on messages;

create policy "Authenticated insert messages"
  on messages for insert
  with check (auth.role() = 'authenticated');

create policy "Engineers or admins update messages"
  on messages for update
  using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));

drop policy if exists "Authenticated users can update error logs" on error_logs;

create policy "Engineers or admins update error logs"
  on error_logs for update
  using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));

drop policy if exists "Authenticated users can insert destinations" on destinations;
drop policy if exists "Authenticated users can update destinations" on destinations;
drop policy if exists "Authenticated users can delete destinations" on destinations;

create policy "Engineers or admins insert destinations"
  on destinations for insert
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Engineers or admins update destinations"
  on destinations for update
  using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Admin delete destinations"
  on destinations for delete
  using (public.get_user_role() = 'admin');

drop policy if exists "Authenticated users can insert fhir resources" on fhir_resources;
drop policy if exists "Authenticated users can update fhir resources" on fhir_resources;
drop policy if exists "Authenticated users can delete fhir resources" on fhir_resources;

create policy "Engineers or admins insert fhir resources"
  on fhir_resources for insert
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Engineers or admins update fhir resources"
  on fhir_resources for update
  using (public.get_user_role() in ('admin', 'engineer'))
  with check (public.get_user_role() in ('admin', 'engineer'));

create policy "Engineers or admins delete fhir resources"
  on fhir_resources for delete
  using (public.get_user_role() in ('admin', 'engineer'));
