-- =====================================================================
-- Pasaporte Guanaco · esquema inicial
-- Principio: los clientes (app/web) solo LEEN datos propios o catálogo
-- publicado. Toda mutación con valor (sellos, inventario, cupones,
-- canjes, roles) pasa por la API, que invoca funciones de este archivo
-- con la clave service_role. Las funciones vuelven a comprobar actor,
-- rol y sucursal: no confían en que la API lo haya hecho.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.platform_role as enum ('traveler', 'admin');
create type public.membership_role as enum ('staff', 'owner');
create type public.branch_category as enum ('food', 'lodging', 'experience', 'shop');
create type public.visit_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.coupon_status as enum ('issued', 'redeemed', 'expired');
create type public.merchant_plan as enum ('aliado', 'impulso', 'red');
create type public.merchant_status as enum ('prospect', 'active', 'paused');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Viajero',
  platform_role public.platform_role not null default 'traveler',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan public.merchant_plan not null default 'aliado',
  status public.merchant_status not null default 'active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  category public.branch_category not null,
  city text not null,
  description text not null default '',
  image_url text,
  lat double precision,
  lng double precision,
  hours text,
  timezone text not null default 'America/El_Salvador',
  qr_code text not null unique check (qr_code ~ '^[A-Za-z0-9_-]{4,64}$'),
  published boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.branches (merchant_id);

create table public.merchant_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  -- null = todas las sucursales del comercio
  branch_id uuid references public.branches (id) on delete cascade,
  role public.membership_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, merchant_id, branch_id)
);
create index on public.merchant_memberships (user_id);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  description text not null default '',
  cover_url text,
  published boolean not null default true,
  is_demo boolean not null default false,
  sort_order int not null default 0
);

create table public.route_stops (
  route_id uuid not null references public.routes (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  position int not null,
  primary key (route_id, branch_id),
  unique (route_id, position)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_demo boolean not null default false,
  check (ends_at > starts_at)
);

-- Niveles configurables (no fijos en frontend)
create table public.reward_tiers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  stamps_required int not null check (stamps_required > 0),
  description text not null default '',
  unique (campaign_id, stamps_required)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  tier_id uuid references public.reward_tiers (id) on delete set null,
  title text not null,
  conditions text not null default '',
  valid_days int not null default 7 check (valid_days between 1 and 90),
  priority int not null default 0,
  active boolean not null default true,
  is_demo boolean not null default false
);
create index on public.offers (tier_id);

create table public.reward_inventory (
  offer_id uuid primary key references public.offers (id) on delete cascade,
  total int not null check (total >= 0),
  reserved int not null default 0 check (reserved >= 0),
  redeemed int not null default 0 check (redeemed >= 0),
  check (reserved + redeemed <= total)
);

create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  status public.visit_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  reject_reason text
);
-- Una sola solicitud pendiente por usuario/sucursal/campaña
create unique index visit_requests_one_pending
  on public.visit_requests (user_id, branch_id, campaign_id) where status = 'pending';
create index on public.visit_requests (branch_id, status, created_at desc);

create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  -- una solicitud aprobada solo emite un sello
  visit_request_id uuid unique references public.visit_requests (id) on delete set null,
  is_demo_preload boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, campaign_id, branch_id)
);

create table public.reward_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  tier_id uuid not null references public.reward_tiers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, campaign_id, tier_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  entitlement_id uuid not null references public.reward_entitlements (id) on delete cascade,
  status public.coupon_status not null default 'issued',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  code_hash text,
  code_expires_at timestamptz
);
-- Un cupón vigente o canjeado por derecho (los expirados permiten reemisión futura si se decide)
create unique index coupons_one_live_per_entitlement
  on public.coupons (entitlement_id) where status in ('issued', 'redeemed');
create index on public.coupons (user_id);
create index on public.coupons (code_hash) where code_hash is not null;

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null unique references public.coupons (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  staff_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.redeem_attempts (
  id bigint generated always as identity primary key,
  staff_user_id uuid not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index on public.redeem_attempts (staff_user_id, created_at desc);

create table public.idempotency_keys (
  user_id uuid not null,
  key text not null check (length(key) between 8 and 128),
  endpoint text not null,
  status_code int not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  object_type text not null,
  object_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_events (created_at desc);

-- Secreto interno (pepper para hash de códigos). Nadie lo lee vía Data API.
create table public.app_secrets (
  name text primary key,
  value text not null
);
insert into public.app_secrets (name, value)
values ('redeem_pepper', encode(extensions.gen_random_bytes(32), 'hex'));

-- ---------------------------------------------------------------------
-- Perfil automático al crear usuario. El rol SIEMPRE es traveler;
-- nunca se toma de metadatos editables por el usuario.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 60), ''), 'Viajero'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','merchants','branches','merchant_memberships','routes','route_stops',
    'campaigns','reward_tiers','offers','reward_inventory','visit_requests','stamps',
    'reward_entitlements','coupons','redemptions','redeem_attempts','idempotency_keys',
    'audit_events','app_secrets'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- Defensa en profundidad: ningún cliente escribe directamente
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Tablas internas: ni siquiera lectura
revoke select on public.app_secrets, public.idempotency_keys, public.redeem_attempts,
  public.audit_events, public.reward_inventory, public.merchant_memberships
  from anon, authenticated;

-- Catálogo publicado (lectura pública)
create policy branches_public_read on public.branches for select to anon, authenticated
  using (published and exists (select 1 from public.merchants m where m.id = merchant_id and m.status = 'active'));
create policy routes_public_read on public.routes for select to anon, authenticated using (published);
create policy route_stops_public_read on public.route_stops for select to anon, authenticated using (true);
create policy campaigns_public_read on public.campaigns for select to anon, authenticated using (true);
create policy tiers_public_read on public.reward_tiers for select to anon, authenticated using (true);
create policy offers_public_read on public.offers for select to anon, authenticated using (active);
-- merchants: el plan es información comercial → solo columnas públicas
revoke select on public.merchants from anon, authenticated;
grant select (id, name, status) on public.merchants to anon, authenticated;
create policy merchants_public_read on public.merchants for select to anon, authenticated using (status = 'active');

-- Datos propios del viajero
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy visits_self_read on public.visit_requests for select to authenticated using (user_id = (select auth.uid()));
create policy stamps_self_read on public.stamps for select to authenticated using (user_id = (select auth.uid()));
create policy entitlements_self_read on public.reward_entitlements for select to authenticated using (user_id = (select auth.uid()));
create policy redemptions_none on public.redemptions for select to authenticated using (false);
-- coupons: no exponemos code_hash; lectura solo vía API
revoke select on public.coupons from anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers internos
-- ---------------------------------------------------------------------
create or replace function public._err(code text, msg text default null)
returns void language plpgsql as $$
begin
  raise exception using errcode = 'P0001', message = code, detail = coalesce(msg, code);
end $$;

create or replace function public._audit(p_actor uuid, p_action text, p_type text, p_id text, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_events (actor_id, action, object_type, object_id, data)
  values (p_actor, p_action, p_type, p_id, coalesce(p_data, '{}'::jsonb));
$$;

create or replace function public._is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user and platform_role = 'admin');
$$;

-- ¿Puede el usuario operar en esta sucursal?
create or replace function public._can_operate_branch(p_user uuid, p_branch uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.merchant_memberships mm
    join public.branches b on b.merchant_id = mm.merchant_id
    where mm.user_id = p_user and b.id = p_branch
      and (mm.branch_id is null or mm.branch_id = p_branch)
  );
$$;

create or replace function public._hash_code(p_code text)
returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest((select value from public.app_secrets where name = 'redeem_pepper') || ':' || p_code, 'sha256'), 'hex');
$$;

create or replace function public._active_campaign()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.campaigns
  where now() >= starts_at and now() < ends_at
  order by starts_at desc limit 1;
$$;

-- Libera reservas de cupones vencidos. Idempotente: cada cupón cambia
-- de 'issued' a 'expired' una sola vez y solo entonces se descuenta.
create or replace function public.expire_coupons()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with exp as (
    update public.coupons set status = 'expired', code_hash = null, code_expires_at = null
    where status = 'issued' and expires_at <= now()
    returning id, offer_id
  ), agg as (
    select offer_id, count(*)::int c from exp group by offer_id
  ), upd as (
    update public.reward_inventory ri set reserved = greatest(ri.reserved - agg.c, 0)
    from agg where ri.offer_id = agg.offer_id
    returning 1
  )
  select count(*) into n from exp;
  return n;
end $$;

-- Intenta emitir cupón para un derecho sin cupón vigente. Reserva
-- inventario en la misma transacción. Devuelve coupon id o null.
create or replace function public._try_issue_coupon(p_entitlement uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e record; o record; v_coupon uuid;
begin
  select * into e from public.reward_entitlements where id = p_entitlement for update;
  if not found then return null; end if;
  if exists (select 1 from public.coupons where entitlement_id = e.id and status in ('issued','redeemed')) then
    return (select id from public.coupons where entitlement_id = e.id and status in ('issued','redeemed') limit 1);
  end if;

  select o2.id, o2.valid_days into o
  from public.offers o2
  join public.reward_inventory ri on ri.offer_id = o2.id
  join public.merchants m on m.id = o2.merchant_id
  where o2.tier_id = e.tier_id and o2.active and m.status = 'active'
    and ri.total - ri.reserved - ri.redeemed > 0
  order by o2.priority desc, o2.id
  limit 1
  for update of ri;

  if not found then return null; end if;

  update public.reward_inventory set reserved = reserved + 1 where offer_id = o.id;
  insert into public.coupons (user_id, offer_id, entitlement_id, expires_at)
  values (e.user_id, o.id, e.id, now() + make_interval(days => o.valid_days))
  returning id into v_coupon;

  perform public._audit(e.user_id, 'coupon.issued', 'coupon', v_coupon::text, jsonb_build_object('offer_id', o.id));
  return v_coupon;
end $$;

-- Evalúa niveles alcanzados y crea derechos/cupones faltantes.
create or replace function public._evaluate_rewards(p_user uuid, p_campaign uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_count int; t record; v_ent uuid;
begin
  select count(*) into v_count from public.stamps where user_id = p_user and campaign_id = p_campaign;
  for t in
    select * from public.reward_tiers where campaign_id = p_campaign and stamps_required <= v_count
    order by stamps_required
  loop
    insert into public.reward_entitlements (user_id, campaign_id, tier_id)
    values (p_user, p_campaign, t.id)
    on conflict (user_id, campaign_id, tier_id) do nothing
    returning id into v_ent;
    if v_ent is null then
      select id into v_ent from public.reward_entitlements
      where user_id = p_user and campaign_id = p_campaign and tier_id = t.id;
    else
      perform public._audit(p_user, 'entitlement.created', 'reward_entitlement', v_ent::text, jsonb_build_object('tier', t.name));
    end if;
    perform public._try_issue_coupon(v_ent);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Operaciones de negocio (solo service_role)
-- ---------------------------------------------------------------------

-- Viajero escanea QR → solicitud pendiente (idempotente).
create or replace function public.create_visit_request(p_user uuid, p_qr_code text, p_campaign uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b record; v_campaign uuid; v_req uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user) then perform public._err('forbidden'); end if;

  select br.id, br.name into b from public.branches br
  join public.merchants m on m.id = br.merchant_id
  where br.qr_code = p_qr_code and br.published and m.status = 'active';
  if not found then perform public._err('not_found', 'QR no reconocido'); end if;

  v_campaign := coalesce(p_campaign, public._active_campaign());
  if v_campaign is null or not exists (
    select 1 from public.campaigns where id = v_campaign and now() >= starts_at and now() < ends_at
  ) then perform public._err('no_active_campaign', 'No hay campaña activa'); end if;

  if exists (select 1 from public.stamps where user_id = p_user and campaign_id = v_campaign and branch_id = b.id) then
    perform public._err('already_stamped', 'Ya tienes el sello de este lugar');
  end if;

  select id into v_req from public.visit_requests
  where user_id = p_user and branch_id = b.id and campaign_id = v_campaign and status = 'pending';

  if v_req is null then
    insert into public.visit_requests (user_id, branch_id, campaign_id)
    values (p_user, b.id, v_campaign)
    on conflict do nothing
    returning id into v_req;
    if v_req is null then -- carrera: otra petición la creó
      select id into v_req from public.visit_requests
      where user_id = p_user and branch_id = b.id and campaign_id = v_campaign and status = 'pending';
    else
      perform public._audit(p_user, 'visit.requested', 'visit_request', v_req::text, jsonb_build_object('branch_id', b.id));
    end if;
  end if;

  return jsonb_build_object('id', v_req, 'branchId', b.id, 'branchName', b.name, 'status', 'pending');
end $$;

-- Personal autorizado aprueba → sello único + evaluación de recompensas.
create or replace function public.approve_visit(p_actor uuid, p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r record; v_stamp uuid;
begin
  select * into r from public.visit_requests where id = p_request for update;
  if not found then perform public._err('not_found'); end if;
  if not public._can_operate_branch(p_actor, r.branch_id) then perform public._err('forbidden'); end if;

  if r.status = 'approved' then
    select id into v_stamp from public.stamps where visit_request_id = r.id;
    return jsonb_build_object('id', r.id, 'status', 'approved', 'stampId', v_stamp, 'replayed', true);
  end if;
  if r.status <> 'pending' then perform public._err('invalid_state', 'La solicitud ya fue resuelta'); end if;

  update public.visit_requests set status = 'approved', decided_at = now(), decided_by = p_actor where id = r.id;

  insert into public.stamps (user_id, campaign_id, branch_id, visit_request_id)
  values (r.user_id, r.campaign_id, r.branch_id, r.id)
  on conflict (user_id, campaign_id, branch_id) do nothing
  returning id into v_stamp;

  perform public._audit(p_actor, 'visit.approved', 'visit_request', r.id::text,
    jsonb_build_object('stamp_id', v_stamp, 'traveler', r.user_id, 'branch_id', r.branch_id));
  perform public._evaluate_rewards(r.user_id, r.campaign_id);

  return jsonb_build_object('id', r.id, 'status', 'approved', 'stampId', v_stamp, 'replayed', false);
end $$;

create or replace function public.reject_visit(p_actor uuid, p_request uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select * into r from public.visit_requests where id = p_request for update;
  if not found then perform public._err('not_found'); end if;
  if not public._can_operate_branch(p_actor, r.branch_id) then perform public._err('forbidden'); end if;
  if r.status = 'rejected' then return jsonb_build_object('id', r.id, 'status', 'rejected', 'replayed', true); end if;
  if r.status <> 'pending' then perform public._err('invalid_state', 'La solicitud ya fue resuelta'); end if;

  update public.visit_requests
  set status = 'rejected', decided_at = now(), decided_by = p_actor, reject_reason = left(p_reason, 200)
  where id = r.id;
  perform public._audit(p_actor, 'visit.rejected', 'visit_request', r.id::text, jsonb_build_object('reason', p_reason));
  return jsonb_build_object('id', r.id, 'status', 'rejected', 'replayed', false);
end $$;

-- Reintenta derechos sin cupón (p. ej. inventario repuesto) y expira vencidos.
create or replace function public.refresh_user_rewards(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  perform public.expire_coupons();
  for e in
    select re.id from public.reward_entitlements re
    join public.campaigns c on c.id = re.campaign_id
    where re.user_id = p_user and now() < c.ends_at
      and not exists (select 1 from public.coupons cp where cp.entitlement_id = re.id)
  loop
    perform public._try_issue_coupon(e.id);
  end loop;
end $$;

-- Viajero pide código temporal de 6 dígitos (10 min). Se guarda solo el hash.
create or replace function public.issue_redemption_token(p_user uuid, p_coupon uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c record; v_code text; v_hash text; v_exp timestamptz := now() + interval '10 minutes'; i int := 0;
begin
  perform public.expire_coupons();
  select * into c from public.coupons where id = p_coupon for update;
  if not found or c.user_id <> p_user then perform public._err('not_found'); end if;
  if c.status = 'redeemed' then perform public._err('invalid_state', 'Este cupón ya fue canjeado'); end if;
  if c.status = 'expired' or c.expires_at <= now() then perform public._err('expired', 'El cupón venció'); end if;

  loop
    i := i + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    v_hash := public._hash_code(v_code);
    exit when not exists (
      select 1 from public.coupons where code_hash = v_hash and code_expires_at > now() and id <> c.id
    );
    if i > 20 then perform public._err('retry', 'Intenta de nuevo'); end if;
  end loop;

  update public.coupons set code_hash = v_hash, code_expires_at = least(v_exp, c.expires_at) where id = c.id;
  perform public._audit(p_user, 'coupon.token_issued', 'coupon', c.id::text);
  return jsonb_build_object('code', v_code, 'expiresAt', least(v_exp, c.expires_at));
end $$;

-- Personal confirma canje. Atómico, único, con límite de intentos fallidos.
create or replace function public.redeem_coupon(p_actor uuid, p_code text, p_branch uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_fails int; c record; v_branch_merchant uuid; v_red uuid; v_title text;
begin
  if not public._can_operate_branch(p_actor, p_branch) then perform public._err('forbidden'); end if;

  select count(*) into v_fails from public.redeem_attempts
  where staff_user_id = p_actor and not success and created_at > now() - interval '10 minutes';
  if v_fails >= 8 then perform public._err('rate_limited', 'Demasiados intentos. Espera unos minutos'); end if;

  perform public.expire_coupons();
  select merchant_id into v_branch_merchant from public.branches where id = p_branch;

  select cp.*, o.merchant_id as offer_merchant, o.title into c
  from public.coupons cp join public.offers o on o.id = cp.offer_id
  where cp.code_hash = public._hash_code(p_code) and cp.code_expires_at > now()
  for update of cp;

  if not found or c.offer_merchant <> v_branch_merchant then
    insert into public.redeem_attempts (staff_user_id, success) values (p_actor, false);
    perform public._audit(p_actor, 'redemption.failed', 'branch', p_branch::text);
    -- No lanzamos excepción: el intento fallido debe persistir para el límite.
    return jsonb_build_object('error', 'invalid_code', 'message', 'Código inválido o vencido');
  end if;

  if c.status = 'redeemed' then perform public._err('already_redeemed', 'Este cupón ya fue canjeado'); end if;
  if c.status <> 'issued' or c.expires_at <= now() then perform public._err('expired', 'El cupón venció'); end if;

  insert into public.redemptions (coupon_id, branch_id, staff_user_id)
  values (c.id, p_branch, p_actor)
  returning id into v_red;  -- unique(coupon_id) impide doble canje

  update public.coupons set status = 'redeemed', redeemed_at = now(), code_hash = null, code_expires_at = null
  where id = c.id;
  update public.reward_inventory set reserved = reserved - 1, redeemed = redeemed + 1 where offer_id = c.offer_id;
  insert into public.redeem_attempts (staff_user_id, success) values (p_actor, true);
  perform public._audit(p_actor, 'coupon.redeemed', 'coupon', c.id::text, jsonb_build_object('branch_id', p_branch));

  return jsonb_build_object('redemptionId', v_red, 'couponId', c.id, 'offerTitle', c.title, 'redeemedAt', now());
end $$;

-- Métricas limitadas al comercio autorizado.
create or replace function public.merchant_metrics(p_actor uuid, p_merchant uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if not (public._is_admin(p_actor) or exists (
    select 1 from public.merchant_memberships where user_id = p_actor and merchant_id = p_merchant
  )) then perform public._err('forbidden'); end if;
  perform public.expire_coupons();

  select jsonb_build_object(
    'merchantId', m.id,
    'merchantName', m.name,
    'visitRequests', (select count(*) from public.visit_requests vr join public.branches b on b.id = vr.branch_id where b.merchant_id = m.id),
    'approved', (select count(*) from public.visit_requests vr join public.branches b on b.id = vr.branch_id where b.merchant_id = m.id and vr.status = 'approved'),
    'rejected', (select count(*) from public.visit_requests vr join public.branches b on b.id = vr.branch_id where b.merchant_id = m.id and vr.status = 'rejected'),
    'pending', (select count(*) from public.visit_requests vr join public.branches b on b.id = vr.branch_id where b.merchant_id = m.id and vr.status = 'pending'),
    'couponsIssued', (select count(*) from public.coupons cp join public.offers o on o.id = cp.offer_id where o.merchant_id = m.id),
    'redemptions', (select count(*) from public.redemptions rd join public.branches b on b.id = rd.branch_id where b.merchant_id = m.id),
    'inventory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'offerTitle', o.title, 'total', ri.total, 'reserved', ri.reserved, 'redeemed', ri.redeemed,
        'available', ri.total - ri.reserved - ri.redeemed) order by o.title)
      from public.offers o join public.reward_inventory ri on ri.offer_id = o.id
      where o.merchant_id = m.id), '[]'::jsonb)
  ) into v
  from public.merchants m where m.id = p_merchant;

  if v is null then perform public._err('not_found'); end if;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- Permisos de funciones: solo service_role
-- ---------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      '_err','_audit','_is_admin','_can_operate_branch','_hash_code','_active_campaign',
      'expire_coupons','_try_issue_coupon','_evaluate_rewards','create_visit_request',
      'approve_visit','reject_visit','refresh_user_rewards','issue_redemption_token',
      'redeem_coupon','merchant_metrics','handle_new_user'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
