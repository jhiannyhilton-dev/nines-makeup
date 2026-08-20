// ============================================================
// CONFIGURACIÓN DEL BACKEND DE PEDIDOS — NINE'S
// Solo falta pegar UNA URL siguiendo GUIA_CONFIGURACION_PEDIDOS.md
// Este archivo NO contiene claves ni secretos.
// ============================================================

window.SHOP_BACKEND = {
  // URL de tu Google Apps Script (termina en /exec).
  // La obtienes en el PASO ÚNICO de GUIA_CONFIGURACION_PEDIDOS.md.
  // Mientras esté vacía, el sitio sigue funcionando 100% normal:
  // el pedido se manda por WhatsApp igual que siempre, solo que no
  // queda registrado en el Sheet ni se manda el correo de confirmación.
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyHz55UUEs0AbHxOPmCrJWvzCIu2Uc6wRebp2LEJtFCL6QclMZDOOBf2PFCDtDD5xbIhg/exec'
};
