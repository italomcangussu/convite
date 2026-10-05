revoke all on public.admins, public.site_settings, public.rsvps from anon, authenticated;
grant select on public.admins to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update (content, updated_at) on public.site_settings to authenticated;
grant insert (id, family_name) on public.rsvps to anon, authenticated;
grant select, delete on public.rsvps to authenticated;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
