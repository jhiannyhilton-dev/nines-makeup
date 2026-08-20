// Catalogo NINE'S — ahora carga los datos desde data/products.json y
// data/site.json en vez de tenerlos escritos aquí. Esto permite editar
// productos, precios, fotos y ofertas desde el panel de administración
// (panel.html o el CMS en /admin) sin tocar código.
//
// Mientras los datos cargan, PRODUCTS/SHOP/ZONES/etc. están vacíos; todo
// el sitio espera al evento "nines:data-ready" antes de pintar nada que
// los necesite (ver shop.js).

let PRODUCTS = [];
let SHOP = { whatsapp: "", address: "", currency: "RD$" };
let ZONES = [];
let CATEGORIES = [];
let FEATURED = null;
let BRANDS = [];

(function () {
  Promise.all([
    fetch("data/products.json").then(r => r.json()),
    fetch("data/site.json").then(r => r.json())
  ]).then(([productsFile, site]) => {
    PRODUCTS = productsFile.productos || [];
    SHOP = site.SHOP;
    ZONES = site.ZONES;
    CATEGORIES = site.CATEGORIES;
    FEATURED = site.FEATURED;
    BRANDS = site.BRANDS;
    document.dispatchEvent(new Event("nines:data-ready"));
  }).catch(err => {
    console.error("NINE'S — no se pudieron cargar los datos de la tienda:", err);
  });
})();
