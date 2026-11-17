# Pasaporte Guanaco · Demo v0.1.0

Pasaporte turístico digital para El Salvador. Los viajeros escanean el QR de un comercio, el personal aprueba la visita y se emite un sello. Al completar niveles, el viajero desbloquea cupones que tienen cupo limitado y se canjean una sola vez.

> **Entorno de demostración.** Los comercios, rutas y datos son ficticios y están marcados **DEMO**.

## Estructura

| Ruta | Contenido |
|---|---|
| `apps/mobile/` | App del viajero: Expo SDK 58, React Native 0.88, Expo Router y TypeScript. Genera el APK con EAS |
| `apps/web/` | Landing, panel del comercio y administración (React 19 + Vite). Se publica en Netlify |
| `apps/api/` | API de negocio (Fastify 5 + TypeScript). Se publica en Render |
| `packages/contracts/` | Tipos y esquemas Zod que comparten app, web y API |
| `supabase/migrations/` | Esquema, RLS y funciones transaccionales |
| `supabase/seed.sql` | 12 comercios ficticios, 3 rutas, campaña de 90 días y 6 beneficios. No contiene credenciales |
| `scripts/` | Cuentas demo, reinicio controlado, QR imprimibles e iconos |
| `docs/` | [Despliegue y APK](docs/DEPLOY.md), [guion de la demo](docs/DEMO-SCRIPT.md) y [pruebas y limitaciones](docs/TESTING.md) |

## Arquitectura de seguridad (resumen)

- **Supabase Auth** gestiona la identidad. La API valida firma, emisor, audiencia y expiración del token: usa JWKS o, en proyectos con HS256, consulta Auth.
- **Ninguna mutación con valor pasa por el cliente.** Sellos, inventario, cupones, canjes y roles se modifican solo con funciones SQL `security definer`, y solo `service_role` puede ejecutarlas. Esas funciones vuelven a verificar actor, rol y sucursal.
- **RLS** está activo y forzado en todas las tablas. Los clientes no tienen permisos de `INSERT`, `UPDATE` ni `DELETE`, y no pueden leer `code_hash`, membresías, auditoría ni secretos.
- Reglas en la base de datos:
  - un sello por usuario, campaña y sucursal;
  - un derecho por usuario, campaña y nivel;
  - un canje por cupón;
  - inventario siempre ≥ 0, con `reserved + redeemed ≤ total`.
- **Códigos de canje** de 6 dígitos y 10 minutos de validez. Solo se guarda un hash con pepper, y hay un límite de intentos fallidos por empleado.
- **Idempotency-Key** en las operaciones POST con valor, para que un reintento no repita la operación.

## Desarrollo local

Requisitos: Node 22 o superior y pnpm 11.

```bash
pnpm install
pnpm build:contracts
pnpm test            # 27 pruebas: API + integración SQL/RLS sobre Postgres 17 (PGlite)
pnpm typecheck

cp apps/api/.env.example apps/api/.env       # completar con el proyecto Supabase demo
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:api        # http://localhost:3000
pnpm dev:web        # http://localhost:5173
pnpm dev:mobile     # requiere un development build (la app usa cámara)
```

## Comandos de la demo

| Comando | Acción |
|---|---|
| `pnpm demo:users` | Crea o rota las cuentas demo, asigna el personal y restablece el escenario. Escribe las contraseñas en `demo-credentials.local.txt`, que git ignora |
| `pnpm demo:reset` | Restablece el escenario de presentación. Se niega a correr si el project ID no es `DEMO_PROJECT_REF` o figura en la lista de protegidos |
| `pnpm demo:qr` | Genera los PNG y una hoja HTML imprimible en `qr-out/` |

Los pasos completos están en **[docs/DEPLOY.md](docs/DEPLOY.md)**.
