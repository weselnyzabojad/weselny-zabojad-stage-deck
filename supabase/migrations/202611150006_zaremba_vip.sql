-- Issue #1056: register DJ Zaremba as the third VIP partner.
-- Package default stays null; no VIP package is granted implicitly.

insert into public.vip_djs (id, display_name, phone, instagram, logo_url, package_default, sort_order, active)
values
  ('dj_zaremba', 'DJ Zaremba', null, null, '/assets/img/dj-vip/logo_zaremba.png', null, 3, true)
on conflict (id) do update set
  display_name = excluded.display_name,
  logo_url = excluded.logo_url,
  sort_order = excluded.sort_order,
  active = true;
