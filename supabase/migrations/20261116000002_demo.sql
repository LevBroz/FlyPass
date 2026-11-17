-- =====================================================================
-- Utilidades de DEMOSTRACIÓN. Solo operan sobre filas/usuarios is_demo.
-- Ejecutables únicamente por service_role (scripts administrativos).
-- =====================================================================

-- IDs fijos del seed (ver supabase/seed.sql)
--   campaña activa  d0000000-0000-4000-a000-000000000001
--   campaña pasada  d0000000-0000-4000-a000-000000000002
--   b01 Café Volcán, b05 Hostal Horizonte, b02 Pupusería, b03 Comedor Lago

create or replace function public.demo_reset(p_traveler_a uuid, p_staff uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_active constant uuid := 'd0000000-0000-4000-a000-000000000001';
  v_past   constant uuid := 'd0000000-0000-4000-a000-000000000002';
  v_demo_users uuid[];
  e1 uuid; e2 uuid; e3 uuid; c1 uuid;
begin
  if not exists (select 1 from public.profiles where id = p_traveler_a and is_demo) then
    perform public._err('forbidden', 'traveler_a no es usuario demo');
  end if;
  if not exists (select 1 from public.profiles where id = p_staff and is_demo) then
    perform public._err('forbidden', 'staff no es usuario demo');
  end if;

  select array_agg(id) into v_demo_users from public.profiles where is_demo;

  -- 1. Limpiar transacciones de usuarios demo
  delete from public.redemptions where coupon_id in (select id from public.coupons where user_id = any (v_demo_users));
  delete from public.coupons where user_id = any (v_demo_users);
  delete from public.reward_entitlements where user_id = any (v_demo_users);
  delete from public.stamps where user_id = any (v_demo_users);
  delete from public.visit_requests where user_id = any (v_demo_users);
  delete from public.redeem_attempts where staff_user_id = any (v_demo_users);
  delete from public.idempotency_keys where user_id = any (v_demo_users);

  -- 2. Reiniciar inventario de ofertas demo
  update public.reward_inventory ri set reserved = 0, redeemed = 0
  from public.offers o where o.id = ri.offer_id and o.is_demo;

  -- 3. Campaña activa: re-centrar fechas para que siempre esté vigente (90 días)
  update public.campaigns set starts_at = now() - interval '10 days', ends_at = now() + interval '80 days'
  where id = v_active and is_demo;
  update public.campaigns set starts_at = now() - interval '120 days', ends_at = now() - interval '30 days'
  where id = v_past and is_demo;

  -- 4. Viajero A: dos sellos precargados (identificados como demo)
  insert into public.stamps (user_id, campaign_id, branch_id, is_demo_preload, created_at) values
    (p_traveler_a, v_active, 'b0000000-0000-4000-a000-000000000001', true, now() - interval '3 days'),
    (p_traveler_a, v_active, 'b0000000-0000-4000-a000-000000000005', true, now() - interval '2 days');

  -- 5. Historial de campaña pasada: un cupón usado, uno vencido y uno válido
  insert into public.stamps (user_id, campaign_id, branch_id, is_demo_preload, created_at) values
    (p_traveler_a, v_past, 'b0000000-0000-4000-a000-000000000001', true, now() - interval '60 days'),
    (p_traveler_a, v_past, 'b0000000-0000-4000-a000-000000000002', true, now() - interval '50 days'),
    (p_traveler_a, v_past, 'b0000000-0000-4000-a000-000000000003', true, now() - interval '40 days');

  insert into public.reward_entitlements (user_id, campaign_id, tier_id, created_at)
  values (p_traveler_a, v_past, 'e0000000-0000-4000-a000-000000000091', now() - interval '60 days') returning id into e1;
  insert into public.reward_entitlements (user_id, campaign_id, tier_id, created_at)
  values (p_traveler_a, v_past, 'e0000000-0000-4000-a000-000000000092', now() - interval '50 days') returning id into e2;
  insert into public.reward_entitlements (user_id, campaign_id, tier_id, created_at)
  values (p_traveler_a, v_past, 'e0000000-0000-4000-a000-000000000093', now() - interval '35 days') returning id into e3;

  -- usado
  insert into public.coupons (user_id, offer_id, entitlement_id, status, issued_at, expires_at, redeemed_at)
  values (p_traveler_a, 'f0000000-0000-4000-a000-000000000007', e1, 'redeemed',
          now() - interval '60 days', now() - interval '53 days', now() - interval '58 days')
  returning id into c1;
  insert into public.redemptions (coupon_id, branch_id, staff_user_id, created_at)
  values (c1, 'b0000000-0000-4000-a000-000000000001', p_staff, now() - interval '58 days');
  update public.reward_inventory set redeemed = 1 where offer_id = 'f0000000-0000-4000-a000-000000000007';

  -- vencido (reserva ya liberada)
  insert into public.coupons (user_id, offer_id, entitlement_id, status, issued_at, expires_at)
  values (p_traveler_a, 'f0000000-0000-4000-a000-000000000008', e2, 'expired',
          now() - interval '50 days', now() - interval '43 days');

  -- válido (vence en 5 días)
  insert into public.coupons (user_id, offer_id, entitlement_id, status, issued_at, expires_at)
  values (p_traveler_a, 'f0000000-0000-4000-a000-000000000009', e3, 'issued',
          now() - interval '2 days', now() + interval '5 days');
  update public.reward_inventory set reserved = 1 where offer_id = 'f0000000-0000-4000-a000-000000000009';

  perform public._audit(null, 'demo.reset', 'system', null, jsonb_build_object('traveler_a', p_traveler_a));
  return jsonb_build_object('ok', true, 'demoUsers', coalesce(array_length(v_demo_users, 1), 0));
end $$;

revoke all on function public.demo_reset(uuid, uuid) from public, anon, authenticated;
grant execute on function public.demo_reset(uuid, uuid) to service_role;
