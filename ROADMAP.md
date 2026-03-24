# ZapiEat Roadmap (MVP estable + valor)

Objetivo: MVP super estable y lista para 20 primeros restaurantes, con foco en operativa (pedidos), conversion (storefront/checkout) y confianza (seguridad/observabilidad).

## Principios

- Estabilidad > features: cada feature nueva debe traer acceptance criteria y test manual reproducible.
- "Operativa" primero: el restaurante paga si no pierde pedidos y ahorra tiempo.
- Conversion sin friccion: menos campos, mensajes claros, estados y reintentos.
- Cash-only hasta tener flujo de pagos con idempotencia + conciliacion.

## Estado actual (ya implementado)

- Tenancy/seguridad base y pedidos server-trust (recalculo de totales, validaciones, orderNumber atomico).
- Cash-only (pedido marcado como PAID para flujo limpio).
- Onboarding superadmin (crear restaurante + admin) + email (best-effort con Resend).
- Notificacion email al restaurante por nuevo pedido (best-effort).
- Rate limiting basico (checkout publico + login).
- Docker (app+postgres+redis) + healthcheck `/api/health`.

## Roadmap por semanas

### Semana 1 (impacto inmediato: operativa pedidos + conversion)

1) Realtime en dashboard de pedidos
- Implementacion: polling cada 3-5s (o SSE) en `/dashboard/orders`.
- UX: sonido opcional, badge en pestaña, highlight del pedido nuevo.
- Acceptance:
  - Un pedido creado en `/{slug}` aparece en el tablero en <= 5s sin refrescar.
  - Al entrar pedido nuevo suena (si el usuario lo habilita) y se resalta la tarjeta.

2) Acciones rapidas en OrderCard (ahorro de tiempo)
- Botones: copiar telefono, copiar direccion, abrir WhatsApp (tel:+ / wa.me), imprimir comanda.
- Mostrar: notas, alergias/modificadores destacados.
- Acceptance:
  - Desde el tablero el restaurante puede copiar telefono/direccion en 1 click.
  - "Imprimir" abre una vista imprimible consistente (A4/80mm).

3) Checkout con menos friccion (sube conversion)
- Email opcional, validacion inline, estados de carga claros, reintentar.
- Guardar datos basicos del cliente en localStorage (nombre/telefono/direccion).
- Acceptance:
  - El usuario puede completar un pedido con solo nombre+telefono.
  - Si falla el POST, aparece mensaje claro y se puede reintentar sin perder el carrito.

4) Storefront sin placeholders falsos
- Reemplazar rating/tiempos/envio hardcodeados por datos reales o esconder.
- Acceptance:
  - No se muestran ratings/tiempos ficticios.

### Semana 2 (horarios + control disponibilidad)

5) Horarios y estado abierto/cerrado real
- Dashboard: CRUD simple de `OpeningHour` + toggle "cerrar temporalmente".
- Storefront: mostrar abierto/cerrado + proxima apertura; deshabilitar checkout si cerrado.
- Acceptance:
  - Si el restaurante esta cerrado, el boton de "Tramitar pedido" se deshabilita y se explica por que.
  - Se puede activar cierre temporal (30/60/120 min) sin tocar horarios semanales.

6) Disponibilidad operativa de menu
- Acciones: "Agotado hoy" (sold out) + pausar producto/categoria.
- Storefront: ocultar/deshabilitar productos agotados; en carrito, si se agota, mostrar mensaje y sugerir reemplazo.
- Acceptance:
  - Un producto marcado como agotado no se puede pedir.
  - Si el producto se agota mientras esta en el carrito, el servidor rechaza y la UI informa.

### Semana 3 (tracking cliente + notificaciones utiles)

7) Pagina de tracking de pedido (sin cuentas)
- Ruta publica con `orderId` (y token si se quiere endurecer) que muestra estado + ETA.
- Acceptance:
  - El cliente abre un enlace y ve el estado actual (PENDING/PAID/PREPARING/READY/DELIVERING/DELIVERED).

8) Notificaciones al cliente (opcional, incremental)
- Email de confirmacion y cambios de estado.
- (Si aplica) SMS/WhatsApp via proveedor.
- Acceptance:
  - Cliente recibe email de confirmacion si aporto email.
  - Al pasar a READY/DELIVERING se envia notificacion.

### Semana 4 (QR + analitica "accionable")

9) QR para pedidos (muy vendible)
- Generar QR a `/{slug}` y opcional por mesa.
- Pantalla en dashboard: descargar PNG/PDF.
- Acceptance:
  - Restaurante puede descargar un QR listo para imprimir.

10) Analitica que sirva
- Top productos/modificadores, horas pico, tiempos por estado.
- Acceptance:
  - Vista muestra top 10 productos y "peak hours" por dia.
  - Mide tiempo medio desde PAID -> READY.

## "Nice-to-have" (post 20 clientes)

- Pagos con tarjeta (Redsys) con idempotencia, conciliacion, reintentos, refunds.
- Dominios custom + verificacion DNS.
- Delivery zones (poligonos) + fees dinamicas.
- Cuentas de cliente, fidelizacion, cupones.
- Integraciones: impresoras, TPV, kitchen screen.

## Criterios de salida MVP (Go/No-Go)

- Un restaurante puede operar 1 dia completo sin intervencion tecnica.
- Ningun pedido se pierde: tablero actualiza, notifica y permite actuar rapido.
- Storefront respeta horarios y disponibilidad.
- Backups Postgres diarios y restore probado.
- Healthcheck operativo y logs suficientes para diagnosticar.
