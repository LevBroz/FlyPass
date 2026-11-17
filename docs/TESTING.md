# Pruebas y limitaciones conocidas

## Pruebas automatizadas (`pnpm test`)

Hay 27 pruebas en `apps/api/test/`.

**`sql.test.ts`** aplica las migraciones y el seed reales sobre Postgres 17 (PGlite/WASM), con los esquemas de Supabase simulados (`auth.users`, `auth.uid()` y roles). Verifica:

- El rol nunca se toma de los metadatos del usuario: nadie puede asignarse admin al registrarse.
- `demo_reset` precarga 2 sellos y 3 cupones históricos.
- La solicitud de visita es idempotente y un QR desconocido falla.
- El personal de otro comercio, o el propio viajero, no pueden aprobar visitas.
- Aprobar dos veces la misma visita produce un solo sello y emite el cupón de mayor prioridad que tenga inventario.
- No se puede volver a sellar el mismo lugar.
- El código de 6 dígitos se guarda solo como hash.
- El canje:
  - se rechaza si lo intenta otro comercio o si se hace desde una sucursal de otro comercio;
  - se acepta una sola vez;
  - descuenta el inventario correctamente.
- Las métricas solo son visibles para el comercio autorizado o para un administrador.
- Sin inventario se conserva el derecho, y el cupón se emite cuando hay cupo.
- Al vencer un cupón, su reserva se libera una sola vez.
- Hay límite de intentos fallidos de canje.
- RLS:
  - un viajero no puede insertar sellos, editar inventario ni cambiar su rol;
  - no puede ejecutar funciones de negocio;
  - no puede leer `code_hash`, secretos ni membresías;
  - un usuario anónimo puede leer el catálogo publicado.

**`app.test.ts`** cubre la API:

- `/health` no expone secretos.
- Responde 401 sin token.
- Valida el cuerpo antes de tocar la base de datos.
- Usa el usuario del token aunque el cliente envíe otro `userId`.
- Traduce los errores de la base de datos a códigos HTTP.
- CORS solo acepta orígenes configurados.

## Verificaciones manuales hechas

- `pnpm typecheck`: contracts, API, web, mobile y scripts sin errores.
- `vite build` de la web: correcto.
- `npx expo-doctor`: 20/20.
- `npx expo export --platform android`: bundle Hermes correcto.
- La API compilada arranca con `node`:
  - `/health` devuelve 200;
  - un POST sin token devuelve 401;
  - una ruta inexistente devuelve 404.
- `demo:reset` se niega con un project ID distinto o protegido.

## Checklist de aceptación (sección 18 del plan)

Lo marcado con 🔲 necesita los servicios desplegados y un teléfono físico.

| Requisito | Estado |
|---|---|
| El APK se instala y abre sin Expo Go ni Metro | 🔲 tras el build de EAS |
| Login y catálogo con la API publicada | 🔲 tras el despliegue |
| El QR correcto abre su comercio | ✅ lógica (`parseBranchQr` y `by-qr`); 🔲 con la cámara |
| Aprobar una visita genera un solo sello | ✅ prueba SQL |
| El progreso persiste tras cerrar la app | ✅ diseño (SecureStore + servidor); 🔲 en el dispositivo |
| El tercer sello desbloquea la recompensa si hay inventario | ✅ prueba SQL |
| Un cupón válido se canjea una sola vez | ✅ prueba SQL |
| Las métricas salen de operaciones reales | ✅ prueba SQL |
| El comercio A no ve datos de B | ✅ prueba SQL |
| Un viajero no puede emitir sellos con el Data API | ✅ prueba RLS |
| Dos aprobaciones simultáneas dan un solo sello | ✅ por diseño: `FOR UPDATE` + `UNIQUE`. 🔲 Falta prueba concurrente real (PGlite usa una sola conexión) |
| Dos canjes simultáneos dan un éxito y un rechazo | ✅ por diseño: `FOR UPDATE` + `UNIQUE(coupon_id)`. 🔲 Igual que el anterior |
| Inventario agotado o cupón vencido no permiten canje | ✅ prueba SQL |
| No hay secretos en el APK, la web ni el repo | ✅ solo variables `EXPO_PUBLIC_`/`VITE_` con la clave publicable |
| Los reintentos no duplican | ✅ `Idempotency-Key` + funciones idempotentes |
| El reset rechaza un project ID de producción | ✅ verificado |

## Limitaciones conocidas

- **Concurrencia:** falta una prueba con dos conexiones reales a Postgres. Conviene hacerla contra el proyecto demo con dos clientes en paralelo antes del piloto.
- **Límites de la API (rate limit):** se guardan en memoria del proceso y se reinician si Render reinicia. El límite crítico, los intentos fallidos de canje, sí vive en Postgres.
- **Vencimiento de cupones:** se calcula al consultar, no con un job programado. Para el piloto hay que programarlo, por ejemplo con `pg_cron`.
- **MFA de administración:** no está activado. Es obligatorio antes del piloto real.
- **Funciones que no incluye la demo:** pagos, push, modo offline y registro público. Está previsto así.
- **Iconos de pestañas:** son glifos Unicode. Si se ven mal en algún dispositivo, se pueden cambiar por `expo-symbols` o SVG.
