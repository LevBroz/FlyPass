-- =====================================================================
-- Pasaporte Guanaco · datos de DEMOSTRACIÓN
-- Todos los comercios son ficticios. Sin usuarios ni credenciales:
-- las cuentas se crean con `pnpm demo:users` (script administrativo).
-- Prefijos de UUID:  a=merchant  b=branch  c=route  d=campaign  e=tier  f=offer
-- =====================================================================

insert into public.merchants (id, name, plan, status, is_demo) values
  ('a0000000-0000-4000-a000-000000000001', 'Café Volcán Demo',         'impulso', 'active', true),
  ('a0000000-0000-4000-a000-000000000002', 'Pupusería La Ceiba Demo',  'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000003', 'Comedor Lago Azul Demo',   'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000004', 'Cevichería Marea Demo',    'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000005', 'Hostal Horizonte Demo',    'impulso', 'active', true),
  ('a0000000-0000-4000-a000-000000000006', 'Cabañas Mirador Demo',     'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000007', 'Posada Ola Demo',          'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000008', 'Taller Añil Demo',         'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000009', 'Kayak Caldera Demo',       'red',     'active', true),
  ('a0000000-0000-4000-a000-000000000010', 'Escuela Surf Punta Demo',  'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000011', 'Artesanías Tule Demo',     'aliado',  'active', true),
  ('a0000000-0000-4000-a000-000000000012', 'Tostaduría Cumbre Demo',   'aliado',  'active', true)
on conflict (id) do nothing;

insert into public.branches (id, merchant_id, name, category, city, description, lat, lng, hours, qr_code, is_demo) values
  ('b0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Café Volcán Demo', 'food', 'Juayúa',
   'Café de altura tostado en casa y repostería artesanal frente al parque.', 13.8436, -89.7456, 'Mié-Dom 8:00-18:00', 'cafe-volcan-7k2q', true),
  ('b0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000002', 'Pupusería La Ceiba Demo', 'food', 'Apaneca',
   'Pupusas de arroz y maíz con recetas familiares.', 13.8592, -89.8053, 'Todos los días 16:00-21:00', 'pupuseria-ceiba-3m8x', true),
  ('b0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000003', 'Comedor Lago Azul Demo', 'food', 'Lago de Coatepeque',
   'Comida típica con vista al lago.', 13.8667, -89.5500, 'Vie-Dom 9:00-17:00', 'comedor-lago-9p4w', true),
  ('b0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000004', 'Cevichería Marea Demo', 'food', 'El Tunco',
   'Ceviches y mariscos frescos a pasos de la playa.', 13.4936, -89.3822, 'Mar-Dom 11:00-20:00', 'ceviche-marea-2h6r', true),
  ('b0000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000005', 'Hostal Horizonte Demo', 'lodging', 'Concepción de Ataco',
   'Hostal familiar entre murales, con terraza y desayuno incluido.', 13.8706, -89.8483, 'Recepción 24 h', 'hostal-horizonte-5t1n', true),
  ('b0000000-0000-4000-a000-000000000006', 'a0000000-0000-4000-a000-000000000006', 'Cabañas Mirador Demo', 'lodging', 'Lago de Coatepeque',
   'Cabañas en la ladera con mirador al cráter.', 13.8700, -89.5450, 'Recepción 7:00-21:00', 'cabanas-mirador-8c3v', true),
  ('b0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000007', 'Posada Ola Demo', 'lodging', 'El Tunco',
   'Habitaciones sencillas para surfistas y viajeros.', 13.4940, -89.3830, 'Recepción 24 h', 'posada-ola-4j7d', true),
  ('b0000000-0000-4000-a000-000000000008', 'a0000000-0000-4000-a000-000000000008', 'Taller Añil Demo', 'experience', 'Concepción de Ataco',
   'Taller práctico de teñido con añil. Llévate tu pañuelo.', 13.8712, -89.8475, 'Jue-Dom 9:00-16:00', 'taller-anil-6r9k', true),
  ('b0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000009', 'Kayak Caldera Demo', 'experience', 'Lago de Coatepeque',
   'Recorridos guiados en kayak al amanecer.', 13.8650, -89.5520, 'Sáb-Dom 6:00-12:00', 'kayak-caldera-1q5z', true),
  ('b0000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000010', 'Escuela Surf Punta Demo', 'experience', 'El Tunco',
   'Clases de surf para principiantes con equipo incluido.', 13.4930, -89.3815, 'Todos los días 7:00-15:00', 'surf-punta-0w8e', true),
  ('b0000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000011', 'Artesanías Tule Demo', 'shop', 'Nahuizalco',
   'Muebles y canastos de tule y mimbre hechos a mano.', 13.7781, -89.7372, 'Todos los días 8:00-17:00', 'artesanias-tule-3b2m', true),
  ('b0000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000012', 'Tostaduría Cumbre Demo', 'shop', 'Apaneca',
   'Café en grano de fincas cercanas, tostado al momento.', 13.8600, -89.8040, 'Mar-Dom 9:00-17:00', 'tostaduria-cumbre-7n4g', true)
on conflict (id) do nothing;

insert into public.routes (id, name, region, description, published, is_demo, sort_order) values
  ('c0000000-0000-4000-a000-000000000001', 'Ruta de las Flores (DEMO)', 'Sonsonate · Ahuachapán',
   'Pueblos de montaña, café, murales y artesanía. Completa 3 paradas y desbloquea tu primer beneficio.', true, true, 1),
  ('c0000000-0000-4000-a000-000000000002', 'Ruta del Lago (DEMO)', 'Santa Ana',
   'Un día alrededor del Lago de Coatepeque: comida, kayak y miradores.', true, true, 2),
  ('c0000000-0000-4000-a000-000000000003', 'Ruta Costera (DEMO)', 'La Libertad',
   'Playa, surf y mariscos en la costa del bálsamo.', true, true, 3)
on conflict (id) do nothing;

insert into public.route_stops (route_id, branch_id, position) values
  ('c0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000001', 1),
  ('c0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000012', 2),
  ('c0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000002', 3),
  ('c0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000008', 4),
  ('c0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000005', 5),
  ('c0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-a000-000000000011', 6),
  ('c0000000-0000-4000-a000-000000000002', 'b0000000-0000-4000-a000-000000000003', 1),
  ('c0000000-0000-4000-a000-000000000002', 'b0000000-0000-4000-a000-000000000009', 2),
  ('c0000000-0000-4000-a000-000000000002', 'b0000000-0000-4000-a000-000000000006', 3),
  ('c0000000-0000-4000-a000-000000000003', 'b0000000-0000-4000-a000-000000000004', 1),
  ('c0000000-0000-4000-a000-000000000003', 'b0000000-0000-4000-a000-000000000010', 2),
  ('c0000000-0000-4000-a000-000000000003', 'b0000000-0000-4000-a000-000000000007', 3)
on conflict do nothing;

-- Campaña activa de 90 días (demo_reset re-centra las fechas) y campaña pasada para historial
insert into public.campaigns (id, name, starts_at, ends_at, is_demo) values
  ('d0000000-0000-4000-a000-000000000001', 'Reto Pasaporte 90 días (DEMO)', now() - interval '10 days', now() + interval '80 days', true),
  ('d0000000-0000-4000-a000-000000000002', 'Temporada piloto 0 (DEMO)',    now() - interval '120 days', now() - interval '30 days', true)
on conflict (id) do nothing;

insert into public.reward_tiers (id, campaign_id, name, stamps_required, description) values
  ('e0000000-0000-4000-a000-000000000001', 'd0000000-0000-4000-a000-000000000001', 'Explorador', 3, 'Beneficio pequeño al visitar 3 lugares distintos'),
  ('e0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000001', 'Guanaco de Ruta', 5, 'Descuento con tope al visitar 5 lugares distintos'),
  ('e0000000-0000-4000-a000-000000000091', 'd0000000-0000-4000-a000-000000000002', 'Piloto I', 1, 'Nivel histórico'),
  ('e0000000-0000-4000-a000-000000000092', 'd0000000-0000-4000-a000-000000000002', 'Piloto II', 2, 'Nivel histórico'),
  ('e0000000-0000-4000-a000-000000000093', 'd0000000-0000-4000-a000-000000000002', 'Piloto III', 3, 'Nivel histórico')
on conflict (id) do nothing;

insert into public.offers (id, merchant_id, tier_id, title, conditions, valid_days, priority, is_demo) values
  -- Nivel 3 sellos
  ('f0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000001',
   'Café de altura gratis', 'Con cualquier consumo. Un café americano o capuchino.', 7, 30, true),
  ('f0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000001',
   'Horchata gratis', 'Con la compra de 3 pupusas.', 7, 20, true),
  ('f0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000012', 'e0000000-0000-4000-a000-000000000001',
   'Degustación de 3 cafés', 'Sin compra mínima. Sujeto a horario.', 7, 10, true),
  -- Nivel 5 sellos
  ('f0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000005', 'e0000000-0000-4000-a000-000000000002',
   '15% en tu noche', 'Tope de USD 10. Sujeto a disponibilidad.', 14, 30, true),
  ('f0000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000008', 'e0000000-0000-4000-a000-000000000002',
   '20% en taller de añil', 'Tope de USD 8. Reserva previa.', 14, 20, true),
  ('f0000000-0000-4000-a000-000000000006', 'a0000000-0000-4000-a000-000000000009', 'e0000000-0000-4000-a000-000000000002',
   'Tour de kayak 2x1', 'Sábados y domingos, salida 6:30.', 14, 10, true),
  -- Históricas (campaña pasada)
  ('f0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000091',
   'Postre de la casa', 'Con cualquier bebida.', 7, 0, true),
  ('f0000000-0000-4000-a000-000000000008', 'a0000000-0000-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000092',
   '2 pupusas gratis', 'Con la compra de 4.', 7, 0, true),
  ('f0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000093',
   'Bolsa de café 250 g al 50%', 'Una por persona.', 7, 0, true)
on conflict (id) do nothing;

insert into public.reward_inventory (offer_id, total) values
  ('f0000000-0000-4000-a000-000000000001', 20),
  ('f0000000-0000-4000-a000-000000000002', 15),
  ('f0000000-0000-4000-a000-000000000003', 10),
  ('f0000000-0000-4000-a000-000000000004', 10),
  ('f0000000-0000-4000-a000-000000000005', 8),
  ('f0000000-0000-4000-a000-000000000006', 5),
  ('f0000000-0000-4000-a000-000000000007', 5),
  ('f0000000-0000-4000-a000-000000000008', 5),
  ('f0000000-0000-4000-a000-000000000009', 5)
on conflict (offer_id) do nothing;
