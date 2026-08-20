# NINE'S — Panel de administración estilo Shopify/GoDaddy (/admin)

Esto te da un panel real: entras a **tudominio.com/admin** con tu correo y
clave, y desde ahí editas productos, precios, fotos, ofertas, zonas de
envío y datos de la tienda — con formularios, no código. Al guardar, el
sitio se publica solo en unos segundos.

**Diferencia con lo que tenías:** hasta ahora subías el sitio arrastrando
la carpeta a Netlify. Para que el panel funcione, el sitio tiene que vivir
en un repositorio de GitHub conectado a Netlify — así el panel puede
"guardar cambios" (hace un commit) y Netlify publica automáticamente. Es
un cambio de una sola vez; después nunca más vuelves a arrastrar carpetas.

Toma unos 20 minutos, una sola vez.

---

## Paso 1 — Sube el sitio a GitHub

1. Entra a **github.com**, crea una cuenta si no tienes, y pulsa **New
   repository**. Nómbralo `nines-web` (o el nombre que prefieras) y
   déjalo **Public** o **Private** (ambos funcionan). Crea el repositorio.
2. En la página del repositorio nuevo, pulsa **uploading an existing
   file** (o el botón de subir archivos).
3. Arrastra **todo el contenido** de la carpeta que te di (todos los
   `.html`, `.js`, `.css`, la carpeta `data/`, la carpeta `admin/`, la
   carpeta `uploads/`, `netlify.toml` — todo, no una carpeta contenedora,
   los archivos sueltos) y confirma el commit ("Commit changes").

## Paso 2 — Conecta ese repositorio a Netlify

1. Entra a **app.netlify.com** con tu cuenta.
2. Si el sitio de Nine's ya existe ahí (el que subiste arrastrando):
   entra a ese sitio → **Site configuration → Build & deploy → Link
   repository**, y conecta el repositorio `nines-web` que acabas de
   crear. Si prefieres uno nuevo: **Add new site → Import an existing
   project → GitHub**, elige `nines-web`.
3. Configuración de build: **Build command** vacío, **Publish directory**
   `.` (un punto). Pulsa **Deploy**.

Desde ahora, cada vez que el panel (o tú) cambien algo en GitHub, Netlify
republica solo en 1-2 minutos.

## Paso 3 — Activa Netlify Identity (el login del panel)

1. En el sitio dentro de Netlify: **Site configuration → Identity →
   Enable Identity**.
2. Baja a **Registration** y elige **Invite only** (para que nadie más
   pueda crear su propia cuenta y entrar a tu panel).
3. Baja a **Services → Git Gateway** y pulsa **Enable Git Gateway**. Esto
   es lo que le da permiso al panel para guardar cambios en GitHub sin
   que tengas que darle tu clave de GitHub a nadie.

## Paso 4 — Invítate a ti mismo como usuario

1. En el mismo sitio: pestaña **Identity** (arriba) → **Invite users** →
   pon tu correo → **Send**.
2. Revisa tu correo, vas a recibir una invitación de Netlify. Al abrirla
   te lleva a tu sitio y te pide poner una contraseña — esa es la clave
   con la que vas a entrar al panel.

## Paso 5 — Entra al panel

Ve a **tudominio.netlify.app/admin** (o tu dominio propio + `/admin`),
entra con tu correo y la contraseña que pusiste. Ya puedes editar:

- **Productos** → precio, foto (se sube directo, no hace falta enlace),
  variantes, y la **oferta**: si le pones un "Precio de oferta" menor al
  normal, ese producto aparece automáticamente en la página de Ofertas y
  en el Bazaar del home. Puedes ponerle fecha de vencimiento opcional.
- **Configuración de la tienda** → WhatsApp, dirección, zonas de envío y
  sus costos, categorías del menú, marca destacada del home.

Cada vez que guardas algo en el panel, el sitio se actualiza solo en
1-2 minutos — no necesitas subir nada a mano nunca más.

## Notas importantes

- El panel de **Pedidos** (`panel.html`, el que ya tenías, con la clave
  de `configurarClaveAdmin`) sigue funcionando exactamente igual —
  es independiente de esto, usa el Google Sheet, no Git.
- Antes de este cambio subías arrastrando la carpeta a Netlify — **ya no
  hagas eso** una vez conectado el repositorio, o vas a sobrescribir lo
  que edites desde el panel. De ahora en adelante, todo cambio de código
  que quieras que yo (Claude) te ayude a hacer, lo subes a GitHub (o me
  pides el zip y tú lo subes ahí) en vez de a Netlify directo.
- Los productos existentes no cambian de ID — si necesitas borrar un
  producto, es más seguro ponerle precio 0 y dejarlo, o pedirme ayuda
  para quitarlo del todo.
- Puedes seguir usando `panel.html` (pestaña Catálogo) como respaldo
  rápido sin necesitar Git, pero los cambios ahí no se sincronizan solos
  — hay que descargar y volver a subir el archivo.
