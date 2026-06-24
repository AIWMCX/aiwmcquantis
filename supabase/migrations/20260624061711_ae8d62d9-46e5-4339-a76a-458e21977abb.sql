drop policy if exists qoc_audit_select_admin on public.qoc_audit;
create policy qoc_audit_select_admin
  on public.qoc_audit for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));