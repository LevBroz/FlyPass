# Despliegue y APK

Haz los pasos en este orden. Cada servicio necesita la URL del anterior.

```
Supabase (datos + Auth)  →  Render (API)  →  Netlify (web)  →  EAS (APK)
```

> El repositorio tiene que estar en GitHub, GitLab o Bitbucket para que Render y Netlify puedan conectarse.

---

## 1. Supabase: proyecto exclusivo de demo

1. Crea un proyecto nuevo en <https://supabase.com/dashboard>, por ejemplo `pasaporte-guanaco-demo`, en la región más cercana. Anota:
   - **Project ref**: el subdominio de `https://<ref>.supabase.co`.
   - **Publishable key** (`sb_publishable_…`) o, en proyectos antiguos, la `anon` key. Es pública.
   - **Secret key** (`sb_secret_…`) o la `service_role`. Es secreta y solo se usa en el servidor y en los scripts.
2. Aplica las migraciones y el seed. Elige una de las dos opciones:
   - **CLI**, desde la raíz del repo:
     ```bash
     npx supabase login
     npx supabase link --project-ref <ref>
     npx supabase db push --include-seed
     ```
   - **SQL Editor**: pega y ejecuta en orden `supabase/migrations/20261116000001_init.sql`, `supabase/migrations/20261116000002_demo.sql` y `supabase/seed.sql`.
3. En **Authentication → Sign In / Providers**:
   - Activa Email/Password.
   - Desactiva **Allow new users to sign up**. La demo solo usa cuentas precreadas.
4. Crea las cuentas demo desde tu máquina:
   ```bash
   cp .env.example .env
   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret key) y DEMO_PROJECT_REF=<ref>
   pnpm demo:users
   ```
   Las contraseñas quedan en `demo-credentials.local.txt`. Compártelas por un canal privado y nunca las subas al repositorio.

| Cuenta | Para qué sirve |
|---|---|
| `viajero.demo@…` | Viajera con 2 sellos precargados y 3 cupones históricos: usado, vencido y válido |
| `viajera.nueva@…` | Viajera sin progreso |
| `personal.flores@…` | Personal de Café Volcán, Taller Añil, Pupusería La Ceiba y Tostaduría Cumbre |
| `dueno.horizonte@…` | Dueña de Hostal Horizonte, con acceso a todas sus sucursales |
| `personal.lago@…` | Personal de Kayak Caldera. Sirve para mostrar que no ve otros comercios |
| `admin.demo@…` | Administración de plataforma |

---

## 2. Render: API

1. **New → Blueprint** y selecciona el repositorio. Render lee `render.yaml`.
   Si prefieres hacerlo a mano, crea un **Web Service** con esta configuración:
   - Build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:api`
   - Start: `node apps/api/dist/index.js`
   - Health check: `/health`
2. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | La secret key. **Solo aquí** |
   | `CORS_ORIGINS` | `https://<tu-sitio>.netlify.app` (ajústala después del paso 3) |
   | `APP_ENV` | `demo` |

3. Comprueba que responde:
   - `https://<servicio>.onrender.com/health` devuelve `{"ok":true}`.
   - `/ready` comprueba la conexión con Supabase.

> **Plan gratuito:** el servicio se suspende tras unos 15 minutos sin tráfico y la primera petición tarda en responder. Abre `/ready` unos minutos antes de presentar. No uses pings constantes para mantenerlo activo. Si necesitas disponibilidad garantizada, valora una instancia de pago durante ese periodo.

---

## 3. Netlify: landing y panel

1. **Add new site → Import from Git**. Netlify lee `netlify.toml`, que publica `apps/web/dist` con fallback SPA.
2. Variables de entorno, que son públicas:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://<servicio>.onrender.com` |
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | La publishable key |

3. Despliega. Luego actualiza `CORS_ORIGINS` en Render con la URL final de Netlify.
4. Comprueba:
   - `/panel` y `/admin` cargan aunque recargues el navegador directamente en esas rutas.
   - Con `personal.lago`, el panel solo muestra Kayak Caldera.

---

## 4. APK con EAS Build

Ejecuta todo desde `apps/mobile`:

```bash
cd apps/mobile
npx expo-doctor                    # debe pasar 20/20
npx eas-cli@latest login
npx eas-cli@latest init            # vincula el proyecto (escribe projectId en app.json)

# Variables públicas del entorno "preview": quedan dentro del APK
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://<servicio>.onrender.com --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <publishable-key> --visibility plaintext

npx eas-cli@latest build --platform android --profile preview
```

- Cuando EAS pregunte por el keystore, deja que lo genere. EAS lo guarda y lo reutiliza en las siguientes compilaciones. Mantén siempre la misma firma y el mismo `com.pasaporteguanaco.demo`, o las actualizaciones no se podrán instalar encima.
- Al terminar, descarga el `.apk` desde el enlace y guarda:
  - el nombre `pasaporte-guanaco-demo-v0.1.0.apk`;
  - el commit;
  - el ID del build de EAS;
  - el checksum: `certutil -hashfile pasaporte-guanaco-demo-v0.1.0.apk SHA256` en Windows o `shasum -a 256` en macOS/Linux.
- **No uses `localhost`** en estas variables. Cambiar un `.env` local no modifica un APK ya compilado: hay que volver a compilar.
- Antes de cada build nuevo, sube `android.versionCode` en `app.json`.

### Instalar en el teléfono

1. Abre el enlace del build en el Android y descarga el APK.
2. Si Android lo pide, permite instalar desde esa fuente concreta (el navegador o Archivos).
3. Instala, abre la app y concede el permiso de cámara.
4. Inicia sesión con `viajero.demo`. Prueba el flujo con Wi-Fi y también con datos móviles.
5. Cierra y vuelve a abrir la app: la sesión debe mantenerse.
6. Cuando termines, retira el permiso de instalación de esa fuente.

Alternativa por cable: `adb install -r pasaporte-guanaco-demo-v0.1.0.apk`.

### Desarrollo con cámara (opcional)

Expo Go incluye `expo-camera`, pero lo más fiable es un development build:

```bash
npx eas-cli@latest build --platform android --profile development   # requiere añadir el perfil, o:
npx expo run:android                                                  # con Android Studio instalado
```

### iPhone

Un APK no se instala en iOS. Con el mismo código se puede compilar para iOS, pero hace falta una cuenta de Apple Developer y distribuir con TestFlight o de forma interna. Queda para una fase posterior.

---

## 5. Antes de presentar (24 h antes)

- [ ] Supabase activo. En el plan gratuito se pausa tras un tiempo sin actividad: revisa el panel.
- [ ] `/ready` de Render devuelve `ok`.
- [ ] El APK candidato está instalado en el teléfono de la presentación.
- [ ] Ensayaste dos veces con este mismo build. Después del ensayo, ejecutaste `pnpm demo:reset`.
- [ ] Tienes los QR en la laptop (`/admin/qr`) e impresos (`pnpm demo:qr`).
- [ ] Tienes a mano el hotspot, el APK, las credenciales privadas y un video local de respaldo.
