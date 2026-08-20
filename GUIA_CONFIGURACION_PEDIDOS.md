# NINE'S — Configuración del registro de pedidos (paso único)

Esto es un COMPLEMENTO. Tu botón de WhatsApp sigue funcionando exactamente
igual que ahora, aunque no hagas nada de esto. Lo que ganas al configurarlo:

- Cada pedido queda guardado en un Google Sheet (historial, para sacar
  números, ver qué se vende más, etc.)
- Te llega un correo con cada pedido nuevo
- El cliente recibe un correo de confirmación (si dejó su correo)
- Puedes ver y cambiar el estado de cada pedido desde `panel.html`

Todo esto corre gratis en tu propia cuenta de Google. Toma unos 10 minutos.

---

## Paso 1 — Crear el script

1. Entra a **script.google.com** con tu Gmail (el que ya nos dijiste que
   vas a usar) y pulsa **Nuevo proyecto**.
2. Borra el contenido de ejemplo y pega TODO el contenido del archivo
   `apps-script/Code.gs` de esta carpeta.
3. Arriba del todo, cambia esta línea por tu correo real:
   ```
   var NOTIFY_EMAIL = 'PON_AQUI_TU_CORREO@gmail.com';
   ```
4. Guarda (Ctrl+S) y nómbralo "Nine's Pedidos".

## Paso 2 — Poner tu clave de administrador

1. En la lista de funciones (arriba, junto a "Ejecutar"), busca y
   selecciona **configurarClaveAdmin**.
2. Antes de ejecutar, edita esa función en el código y cambia
   `'mi-clave-secreta'` por la clave que tú quieras usar para entrar a
   `panel.html`. Guarda.
3. Pulsa **Ejecutar**. La primera vez te va a pedir autorizar permisos
   (Gmail y Sheets — es tu propia cuenta autorizándose a sí misma). Dale
   "Avanzado" → "Ir a Nine's Pedidos (no seguro)" si Google muestra esa
   advertencia — es normal en scripts personales, es tu propio código.

## Paso 3 — Probar

1. Selecciona la función **testOrder** y pulsa **Ejecutar**.
2. Revisa: debe haberte llegado un correo de "Nuevo pedido NN-TEST-0001",
   y en tu Google Drive debe aparecer un archivo llamado
   "Nine's - Pedidos" (es el Sheet).

## Paso 4 — Publicar el script como aplicación web

1. Pulsa **Implementar → Nueva implementación**.
2. En el ícono de engranaje, elige tipo **Aplicación web**.
3. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**.
4. Pulsa **Implementar** y copia la URL que termina en **/exec**.

## Paso 5 — Conectar la web

Abre `backend-config.js` y pega esa URL:

```js
window.SHOP_BACKEND = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb.../exec'
};
```

Sube ese archivo actualizado a Netlify junto con el resto. Listo — desde
ese momento, cada pedido se registra automáticamente además de mandarse
por WhatsApp.

> Si algún día editas `Code.gs`, recuerda: **Implementar → Administrar
> implementaciones → lápiz → Nueva versión**, para que el cambio aplique
> en la misma URL sin tener que reconfigurar `backend-config.js`.

---

## Usar el panel de pedidos

Abre `panel.html` (subido a tu sitio, o localmente en tu compu), entra
con la clave que configuraste en el Paso 2, pestaña **Pedidos**. Ahí ves
cada pedido con sus datos y puedes cambiar su estado (Pendiente → Pago
verificado → En preparación → Listo → Entregado).

La pestaña **Catálogo** del mismo panel no necesita nada de esto — es
local y sirve para editar precios/fotos y descargar tu `catalog.js`
actualizado, con o sin el backend de pedidos configurado.

## Notas

- Mientras `APPS_SCRIPT_URL` esté vacía, el sitio funciona 100% normal,
  solo con WhatsApp — nada se rompe.
- Gmail vía Apps Script permite ~100 correos/día (cada pedido usa hasta
  2: uno para ti, uno para el cliente si dejó correo). De sobra para el
  volumen de una tienda como Nine's.
- Todo esto vive en TU cuenta de Google. Nadie de Nine's ni de Claude
  tiene acceso al Sheet ni a los correos — es tuyo.
