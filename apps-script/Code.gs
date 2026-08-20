/**
 * NINE'S — Backend de pedidos sin servidor (Google Apps Script)
 *
 * Qué hace al recibir un pedido desde la web:
 *  1. Registra el pedido en un Google Sheet ("Nine's - Pedidos"), con el
 *     mismo código que el cliente ve en WhatsApp.
 *  2. Te envía un correo con el resumen del pedido.
 *  3. Envía confirmación automática al cliente (si dejó su correo).
 *
 * El panel admin.html usa este mismo script (protegido con una clave)
 * para listar los pedidos y cambiar su estado.
 *
 * IMPORTANTE: esto es un complemento del flujo de WhatsApp, no lo
 * reemplaza. Si esta URL no está configurada en backend-config.js, el
 * sitio sigue funcionando 100% normal solo con WhatsApp.
 */

var NOTIFY_EMAIL = 'PON_AQUI_TU_CORREO@gmail.com'; // <-- cámbialo por tu correo
var SHEET_NAME = 'Pedidos';

var ESTADOS_ORDEN = [
  'Pendiente de verificación',
  'Pago verificado',
  'En preparación',
  'Listo para entrega/pickup',
  'Entregado',
  'Cancelado'
];

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.tipo === 'admin') {
      if (!adminAutorizado_(p.clave)) {
        return jsonResponse_({ ok: false, error: 'Clave incorrecta.' });
      }
      if (p.accion === 'login')          return jsonResponse_({ ok: true });
      if (p.accion === 'listarOrdenes')  return adminListarOrdenes_();
      if (p.accion === 'cambiarEstado')  return adminCambiarEstado_(p);
      return jsonResponse_({ ok: false, error: 'Acción no reconocida.' });
    }
    // Seguimiento de pedido para el cliente (opcional, con su código)
    if (p.accion === 'seguimiento') {
      return seguimientoPedido_(p.codigo);
    }
    return jsonResponse_({ ok: true, mensaje: "Nine's API activa." });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ===== ACCIONES DEL PANEL DE ADMINISTRACIÓN =====
    if (data.tipo === 'admin') {
      if (!adminAutorizado_(data.clave)) {
        return jsonResponse_({ ok: false, error: 'Clave incorrecta.' });
      }
      if (data.accion === 'login')           return jsonResponse_({ ok: true });
      if (data.accion === 'listarOrdenes')   return adminListarOrdenes_();
      if (data.accion === 'cambiarEstado')   return adminCambiarEstado_(data);
      return jsonResponse_({ ok: false, error: 'Acción no reconocida.' });
    }

    // ===== NUEVO PEDIDO (el código ya viene armado desde la web) =====
    var orderCode = data.orderCode || ('NN-' + Utilities.formatDate(new Date(), 'America/Santo_Domingo', 'yyMMdd') +
      '-' + Math.floor(1000 + Math.random() * 9000));

    logToSheet_(orderCode, data);
    sendBusinessEmail_(orderCode, data);
    if (data.customer && data.customer.email) sendCustomerEmail_(orderCode, data);

    return jsonResponse_({ ok: true, orderCode: orderCode });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ---------- Registro en Google Sheets ---------- */
function logToSheet_(orderCode, data) {
  var ss = abrirLibro_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    var hojas = ss.getSheets();
    sheet = (hojas && hojas.length === 1 && hojas[0].getLastRow() === 0) ? hojas[0] : ss.insertSheet(SHEET_NAME);
    sheet.setName(SHEET_NAME);
    sheet.appendRow([
      'Fecha', 'Orden', 'Estado', 'Cliente', 'Teléfono', 'Correo',
      'Productos', 'Subtotal (RD$)', 'Envío (RD$)', 'Total (RD$)',
      'Entrega', 'Dirección', 'Método de pago', 'Notas', 'Precios pendientes'
    ]);
    sheet.setFrozenRows(1);
  }

  var itemsTxt = (data.items || []).map(function (it) {
    var v = it.variant ? ' (' + it.variant + ')' : '';
    return it.qty + 'x ' + it.brand + ' - ' + it.name + v;
  }).join(' | ');

  sheet.appendRow([
    new Date(),
    orderCode,
    'Pendiente de verificación',
    (data.customer && data.customer.name) || '',
    (data.customer && data.customer.phone) || '',
    (data.customer && data.customer.email) || '',
    itemsTxt,
    data.subtotal || 0,
    data.shippingFee == null ? 'A cotizar' : data.shippingFee,
    data.total || 0,
    data.delivery || '',
    data.address || '',
    data.paymentMethod || '',
    data.notes || '',
    data.pending ? 'Sí' : 'No'
  ]);
}

/* ---------- Correo al negocio ---------- */
function sendBusinessEmail_(orderCode, data) {
  var itemsTxt = (data.items || []).map(function (it) {
    var v = it.variant ? ' (' + it.variant + ')' : '';
    var pr = it.price > 0 ? ('RD$' + it.price * it.qty) : 'precio a confirmar';
    return '- ' + it.qty + 'x ' + it.brand + ' - ' + it.name + v + ' - ' + pr;
  }).join('\n');

  var lines = [
    'NUEVO PEDIDO: ' + orderCode,
    '',
    'Cliente: ' + ((data.customer && data.customer.name) || ''),
    'Teléfono: ' + ((data.customer && data.customer.phone) || ''),
    'Correo: ' + ((data.customer && data.customer.email) || '(no dejó correo)'),
    '',
    'Productos:',
    itemsTxt,
    '',
    'Subtotal: RD$' + (data.subtotal || 0),
    'Envío: ' + (data.shippingFee == null ? 'A cotizar' : 'RD$' + data.shippingFee),
    'Total: RD$' + (data.total || 0),
    '',
    'Entrega: ' + (data.delivery || ''),
    data.address ? 'Dirección: ' + data.address : null,
    'Método de pago: ' + (data.paymentMethod || ''),
    data.notes ? 'Notas: ' + data.notes : null,
    data.pending ? '\n⚠️ Este pedido tiene precios pendientes de confirmar.' : null,
    '',
    'Este pedido también se envió por WhatsApp — revisa el chat para coordinar el cobro.'
  ];

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: (data.customer && data.customer.email) || NOTIFY_EMAIL,
    subject: 'Nuevo pedido ' + orderCode + ' - ' + ((data.customer && data.customer.name) || ''),
    body: lines.filter(function (l) { return l !== null && l !== undefined; }).join('\n')
  });
}

/* ---------- Confirmación automática al cliente ---------- */
function sendCustomerEmail_(orderCode, data) {
  var body = [
    'Hola ' + ((data.customer && data.customer.name) || '') + ',',
    '',
    'Recibimos tu pedido en NINE\'S. ¡Gracias por tu compra!',
    '',
    'Código de pedido: ' + orderCode,
    'Total: RD$' + (data.total || 0) + (data.pending ? ' (estimado, algunos precios se confirman por WhatsApp)' : ''),
    'Entrega: ' + (data.delivery || ''),
    'Método de pago: ' + (data.paymentMethod || ''),
    '',
    'En breve te contactamos por WhatsApp para coordinar el pago y la entrega.',
    '',
    'NINE\'S · Santo Domingo'
  ].join('\n');

  MailApp.sendEmail({
    to: data.customer.email,
    replyTo: NOTIFY_EMAIL,
    subject: 'Recibimos tu pedido ' + orderCode + " - NINE'S",
    body: body
  });
}

/* ---------- Panel admin: listar y cambiar estado ---------- */
function adminListarOrdenes_() {
  var ss = abrirLibro_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse_({ ok: true, ordenes: [], estados: ESTADOS_ORDEN });

  var filas = sheet.getDataRange().getValues();
  var ordenes = [];
  for (var i = filas.length - 1; i >= 1; i--) {
    var f = filas[i];
    if (!f[1]) continue;
    ordenes.push({
      fila: i + 1,
      fecha: f[0] ? Utilities.formatDate(new Date(f[0]), 'America/Santo_Domingo', 'dd/MM/yyyy HH:mm') : '',
      orden: f[1],
      estado: f[2] || '',
      cliente: f[3] || '',
      telefono: f[4] != null ? String(f[4]) : '',
      correo: f[5] || '',
      productos: f[6] || '',
      subtotal: f[7] || 0,
      envio: f[8] || '',
      total: f[9] || 0,
      entrega: f[10] || '',
      direccion: f[11] || '',
      metodoPago: f[12] || '',
      notas: f[13] || '',
      pendiente: f[14] || ''
    });
  }
  return jsonResponse_({ ok: true, ordenes: ordenes, estados: ESTADOS_ORDEN });
}

function adminCambiarEstado_(data) {
  var ss = abrirLibro_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse_({ ok: false, error: 'No hay hoja de pedidos.' });

  var fila = Number(data.fila);
  var nuevoEstado = String(data.estado || '');
  if (!fila || fila < 2) return jsonResponse_({ ok: false, error: 'Fila inválida.' });
  if (ESTADOS_ORDEN.indexOf(nuevoEstado) === -1) {
    return jsonResponse_({ ok: false, error: 'Estado no válido.' });
  }
  var maxRow = sheet.getLastRow();
  if (fila > maxRow) return jsonResponse_({ ok: false, error: 'La orden no existe.' });

  sheet.getRange(fila, 3).setValue(nuevoEstado);
  return jsonResponse_({ ok: true, estado: nuevoEstado });
}

/* ---------- Seguimiento público (opcional, con código de orden) ---------- */
function seguimientoPedido_(codigo) {
  if (!codigo) return jsonResponse_({ ok: false, error: 'Falta el código.' });
  var ss = abrirLibro_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse_({ ok: false, error: 'Pedido no encontrado.' });
  var filas = sheet.getDataRange().getValues();
  for (var i = 1; i < filas.length; i++) {
    if (String(filas[i][1]).trim().toUpperCase() === String(codigo).trim().toUpperCase()) {
      return jsonResponse_({
        ok: true,
        orden: filas[i][1],
        estado: filas[i][2],
        fecha: Utilities.formatDate(new Date(filas[i][0]), 'America/Santo_Domingo', 'dd/MM/yyyy HH:mm'),
        total: filas[i][9]
      });
    }
  }
  return jsonResponse_({ ok: false, error: 'Pedido no encontrado.' });
}

/* ---------- Utilidades ---------- */
function adminAutorizado_(clave) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!real) return false;
  return String(clave || '') === String(real);
}

function abrirLibro_() {
  var props = PropertiesService.getScriptProperties();
  var ss, id = props.getProperty('SHEET_ID');
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e2) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create("Nine's - Pedidos");
    props.setProperty('SHEET_ID', ss.getId());
  }
  return ss;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============ PRUEBA (ejecuta esto desde el editor) ============
 * Selecciona "testOrder" arriba y pulsa Ejecutar. Autoriza los permisos.
 * Debe: crear/actualizar el Sheet, agregar una fila, y mandarte un correo.
 */
function testOrder() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        orderCode: 'NN-TEST-0001',
        customer: { name: 'Cliente de prueba', phone: '8090000000', email: '' },
        items: [{ brand: 'Huda Beauty', name: 'Easy Bake setting powder', variant: 'Pound Cake', qty: 1, price: 850 }],
        subtotal: 850,
        shippingFee: 150,
        total: 1000,
        delivery: 'Delivery — Ensanche Isabelita / Alma Rosa',
        address: 'Calle de prueba #1',
        paymentMethod: 'WhatsApp',
        notes: '',
        pending: false
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}

/**
 * Ejecuta esto UNA VEZ desde el editor para guardar tu clave de admin.
 * Cambia 'mi-clave-secreta' por la clave que quieras usar en admin.html,
 * luego pulsa Ejecutar. Después puedes borrar la clave de aquí si quieres.
 */
function configurarClaveAdmin() {
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', 'mi-clave-secreta');
}
