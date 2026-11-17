# Guion de la demo (7 minutos)

**Antes de empezar**

- Ejecuta `pnpm demo:reset`.
- En el teléfono, deja la sesión iniciada con `viajero.demo`. Tiene 2 sellos DEMO: Café Volcán y Hostal Horizonte.
- En la laptop, abre el panel web con `personal.flores` en `/panel`.
- En otra pestaña, deja abierta `/admin/qr` con `admin.demo`, o lleva los QR impresos.

| Tiempo | Acción | Qué se ve | Mensaje |
|---|---|---|---|
| 0:00–0:45 | Landing en la laptop | Propuesta, cómo funciona y planes | Conectamos recorridos turísticos con beneficios medibles |
| 0:45–1:30 | App → **Explorar** → *Ruta de las Flores* | 6 paradas, 2 de ellas selladas | La experiencia funciona en un teléfono real |
| 1:30–2:30 | **Escanear** el QR de *Taller Añil* → **Solicitar sello** → en el panel, **Aprobar sello** | La app pasa de "Esperando al comercio" a "¡Sello aprobado!" | El sello requiere validación del personal; una foto del QR no basta |
| 2:30–3:30 | En la app: "Desbloqueaste el nivel «Explorador»" → **Ver mi beneficio** | Cupón *Café de altura gratis* | La visita completa un reto, y el inventario limita el costo |
| 3:30–4:30 | **Generar código de canje** → en el panel, escribe el código → **Confirmar canje** | La app muestra "Canje confirmado ✓". Si se repite el código, el panel lo rechaza | El beneficio queda registrado y no puede usarse dos veces |
| 4:30–5:30 | Bajar en el panel hasta **Métricas · Café Volcán**. Opcional: `/admin` → Auditoría | Contadores de solicitudes, sellos, cupones y canjes, más el inventario | Se distingue entre solicitud, sello aprobado y canje |
| 5:30–7:00 | Landing → Planes | Aliado $100, Impulso $300, Red $900 y patrocinios | La siguiente inversión valida pago, repetición y operación en un piloto |

## Demostraciones opcionales de control

- **Aislamiento entre comercios:** entra en el panel con `personal.lago`. Solo ve Kayak Caldera, y su bandeja no muestra la solicitud de Taller Añil.
- **Estados de los cupones:** en **Beneficios**, `viajero.demo` tiene además un cupón válido, uno usado y uno vencido de la temporada piloto 0.
- **Sello repetido:** escanea otra vez Café Volcán. La app indica "Ya tienes el sello de este lugar".

## Si algo falla

- **Sin internet:** usa el hotspot. Si sigue sin funcionar, pon el video **y di que es una grabación**. No simules transacciones en vivo.
- **Render tarda:** abre `/ready` en la laptop y espera unos 30 a 60 segundos.
- **Después de la presentación:** ejecuta `pnpm demo:reset`.
