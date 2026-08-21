/* NINE'S — carrito, variantes, checkout y ofertas. Compartido por todas las páginas.
   Espera a que catalog.js termine de cargar los datos (evento "nines:data-ready")
   antes de hacer nada que dependa de PRODUCTS/SHOP/ZONES. */
(function () {
  const KEY = "nines_cart_v3";
  const money = n => SHOP.currency + " " + Number(n).toLocaleString("es-DO");
  const find = id => PRODUCTS.find(p => p.id === id);

  // precio a usar: si el producto tiene oferta activa, ese; si no, el normal
  function onSale(p) {
    if (!p || !p.salePrice || p.salePrice <= 0) return false;
    if (!p.price || p.price <= 0) return false;
    if (p.salePrice >= p.price) return false;
    if (p.saleEndsAt) {
      const ends = new Date(p.saleEndsAt).getTime();
      if (!isNaN(ends) && ends < Date.now()) return false; // ya venció
    }
    return true;
  }
  const effectivePrice = p => onSale(p) ? p.salePrice : p.price;
  const priceLabel = p => p.price > 0 ? money(effectivePrice(p)) : "Precio próximamente";

  let cart = load();
  let ship = "delivery";
  let zone = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} paintCount(); }

  function add(id, variant, qty = 1) {
    const row = cart.find(l => l.id === id && l.variant === variant);
    if (row) row.qty += qty; else cart.push({ id, variant, qty });
    save(); paintCart();
  }
  function setQty(idx, qty) {
    if (!cart[idx]) return;
    cart[idx].qty = qty;
    if (cart[idx].qty < 1) cart.splice(idx, 1);
    save(); paintCart();
  }
  function drop(idx) { cart.splice(idx, 1); save(); paintCart(); }

  const count = () => cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = () => cart.reduce((s, l) => { const p = find(l.id); return p ? s + effectivePrice(p) * l.qty : s; }, 0);
  const hasPending = () => cart.some(l => { const p = find(l.id); return p && p.price === 0; });

  function fee() {
    if (ship === "pickup") return 0;
    const z = ZONES.find(z => z.id === zone);
    return z && z.fee !== null ? z.fee : null;
  }

  function paintCount() {
    document.querySelectorAll("[data-count]").forEach(el => {
      const n = count(); el.textContent = n; el.classList.toggle("is-on", n > 0);
    });
  }

  function paintCart() {
    const body = document.querySelector("[data-cart-body]");
    const foot = document.querySelector("[data-cart-foot]");
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<p class="drawer-empty">Tu carrito está vacío.</p>';
      if (foot) foot.innerHTML = '<a class="drawer-btn is-disabled" data-empty-cart>Finalizar compra</a>';
      return;
    }
    body.innerHTML = cart.map((l, i) => {
      const p = find(l.id); if (!p) return "";
      const sale = onSale(p);
      return `<div class="line">
        <div class="line-frame" data-swatch>${p.img ? `<img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : p.brand.charAt(0)}</div>
        <div class="line-mid">
          <div class="line-brand">${p.brand}</div>
          <div class="line-name">${p.name}</div>
          ${l.variant ? `<div class="line-var">${l.variant}</div>` : ""}
          <div class="line-price">${p.price > 0 ? money(effectivePrice(p) * l.qty) : "Precio próximamente"}${sale ? ' <span class="sale-tag">Oferta</span>' : ""}</div>
          <div class="qty">
            <button data-dec="${i}" aria-label="Quitar uno">−</button>
            <span>${l.qty}</span>
            <button data-inc="${i}" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <button class="line-x" data-rm="${i}" aria-label="Eliminar">×</button>
      </div>`;
    }).join("");
    if (!foot) return;
    const sub = subtotal();
    foot.innerHTML =
      `<div class="sum sum-total"><span>Subtotal</span><span>${sub > 0 ? money(sub) : "A confirmar"}</span></div>
       ${hasPending() ? '<p class="sum-note">Algunos precios se confirman por WhatsApp.</p>' : ""}
       <a class="drawer-btn" href="checkout.html">Finalizar compra</a>`;
  }

  function paintTotals() {
    const box = document.querySelector("[data-totals]");
    if (!box) return;
    const f = fee(), sub = subtotal();
    const shipLabel = f === null ? "A cotizar" : (f === 0 ? "Sin costo" : money(f));
    const total = f === null ? sub : sub + f;
    box.innerHTML =
      `<div class="sum"><span>Subtotal</span><span>${sub > 0 ? money(sub) : "A confirmar"}</span></div>
       <div class="sum"><span>${ship === "pickup" ? "Pickup" : "Envío"}</span><span>${shipLabel}</span></div>
       <div class="sum sum-total"><span>Total${(f === null || hasPending()) ? " estimado" : ""}</span><span>${sub > 0 ? money(total) : "A confirmar"}</span></div>`;
  }

  // valida el formulario y guarda los datos del cliente para el paso de pago
  let checkoutData = null;
  function validateCheckout() {
    const name = document.querySelector("[data-f-name]").value.trim();
    const phone = document.querySelector("[data-f-phone]").value.trim();
    const addr = document.querySelector("[data-f-addr]");
    const note = document.querySelector("[data-f-note]").value.trim();
    const emailField = document.querySelector("[data-f-email]");
    const email = emailField ? emailField.value.trim() : "";
    if (!name || !phone) { toast("Falta nombre o teléfono"); return false; }
    if (ship === "delivery" && !addr.value.trim()) { toast("Falta la dirección"); return false; }
    checkoutData = { name, phone, email, addr: addr.value.trim(), note };
    return true;
  }

  // codigo de orden generado en el cliente (para que WhatsApp y el
  // registro en el Sheet muestren el mismo numero, sin esperar al servidor)
  function makeOrderCode() {
    const d = new Date();
    const ymd = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()]
      .map(n => String(n).padStart(2, "0")).join("");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `NN-${ymd}-${rand}`;
  }

  // arma el mensaje de pedido; method: "whatsapp" | "transferencia"
  function buildMessage(method, orderCode) {
    const d = checkoutData;
    const f = fee(), sub = subtotal();
    const zn = ZONES.find(z => z.id === zone);
    const lines = cart.map(l => {
      const p = find(l.id);
      const v = l.variant ? ` (${l.variant})` : "";
      const pr = p.price > 0 ? money(effectivePrice(p) * l.qty) + (onSale(p) ? " (oferta)" : "") : "precio a confirmar";
      return `• ${l.qty}x ${p.brand} — ${p.name}${v} — ${pr}`;
    }).join("\n");

    let msg = `*NUEVO PEDIDO — NINE'S*\n*Código:* ${orderCode}\n\n*Cliente:* ${d.name}\n*Teléfono:* ${d.phone}\n\n*Productos*\n${lines}\n\n`;
    if (sub > 0) msg += `Subtotal: ${money(sub)}\n\n`;
    if (ship === "pickup") msg += `*Entrega:* Pickup en tienda\n${SHOP.address}\n`;
    else {
      msg += `*Entrega:* Delivery\n*Zona:* ${zn.name}\n*Dirección:* ${d.addr}\n`;
      msg += `*Envío:* ${f === null ? "a cotizar" : money(f)}\n`;
    }
    if (sub > 0) msg += `\n*Total${(f === null || hasPending()) ? " estimado" : ""}: ${money(f === null ? sub : sub + f)}*\n`;
    if (hasPending()) msg += `\n_Algunos precios pendientes de confirmar._\n`;
    if (d.note) msg += `\n*Nota:* ${d.note}\n`;
    msg += method === "transferencia"
      ? `\n*Método de pago:* Transferencia — coordinar datos y enviar comprobante.`
      : `\n*Método de pago:* Pago por WhatsApp — enviar enlace de pago o coordinar.`;
    return msg;
  }

  // registra el pedido en el backend (Google Sheet + correos), sin bloquear
  // la apertura de WhatsApp. Si APPS_SCRIPT_URL no está configurada en
  // backend-config.js, esto se omite silenciosamente y el sitio sigue
  // funcionando solo con WhatsApp, como antes.
  function logOrder(orderCode, method) {
    const url = window.SHOP_BACKEND && window.SHOP_BACKEND.APPS_SCRIPT_URL;
    if (!url) return;
    const d = checkoutData;
    const f = fee(), sub = subtotal();
    const zn = ZONES.find(z => z.id === zone);
    const items = cart.map(l => {
      const p = find(l.id);
      return { brand: p.brand, name: p.name, variant: l.variant || "", qty: l.qty, price: effectivePrice(p), onSale: onSale(p) };
    });
    const payload = {
      orderCode,
      customer: { name: d.name, phone: d.phone, email: d.email || "" },
      items,
      subtotal: sub,
      shippingFee: f,
      total: f === null ? sub : sub + f,
      delivery: ship === "pickup" ? "Pickup en tienda" : `Delivery — ${zn ? zn.name : ""}`,
      address: d.addr || "",
      paymentMethod: method === "transferencia" ? "Transferencia" : "WhatsApp",
      notes: d.note || "",
      pending: hasPending()
    };
    try {
      fetch(url, {
        method: "POST",
        mode: "no-cors", // Apps Script no responde con headers CORS; no necesitamos leer la respuesta aquí
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  }

  function send(method) {
    const orderCode = makeOrderCode();
    const msg = buildMessage(method, orderCode);
    logOrder(orderCode, method);
    window.open(`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  let tid;
  function toast(text) {
    let el = document.querySelector("[data-toast]");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("data-toast", ""); document.body.appendChild(el); }
    el.textContent = text; el.classList.add("is-on");
    clearTimeout(tid); tid = setTimeout(() => el.classList.remove("is-on"), 2200);
  }

  function openCart() {
    document.querySelector("[data-drawer]").classList.add("is-open");
    document.querySelector("[data-scrim]").classList.add("is-open");
    document.body.style.overflow = "hidden";
    paintCart();
  }
  function closeCart() {
    const d = document.querySelector("[data-drawer]"); if (!d) return;
    d.classList.remove("is-open");
    document.querySelector("[data-scrim]").classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function zoneOptions() {
    const sel = document.querySelector("[data-f-zone]"); if (!sel) return;
    sel.innerHTML = ZONES.map(z => `<option value="${z.id}">${z.name}${z.fee !== null ? " — " + money(z.fee) : ""}</option>`).join("");
  }

  // ---------- página checkout.html: pinta el pedido completo y los totales ----------
  function paintCheckoutPage() {
    const empty = document.querySelector("[data-checkout-empty]");
    const content = document.querySelector("[data-checkout-content]");
    if (!empty || !content) return;
    if (!cart.length) {
      empty.style.display = "block";
      content.style.display = "none";
      return;
    }
    empty.style.display = "none";
    content.style.display = "";
    paintCart();
    paintTotals();
  }

  // ---------- sincroniza precio/foto de las tarjetas de producto ya dibujadas
  // en cada página de categoría con los datos reales (para que un cambio de
  // precio o foto en el admin se vea sin tener que reescribir el HTML) ----------
  function frameImg(card, p, variantName) {
    const frame = card.querySelector(".pcard-frame");
    if (!frame) return;
    let img = p.img;
    if (variantName) {
      const v = (p.variants || []).find(v => v.name === variantName);
      if (v && v.img) img = v.img;
    }
    if (img) {
      frame.innerHTML = `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">`;
      frame.classList.add("has-photo");
    } else {
      frame.innerHTML = `<div class="pcard-swatch">${p.brand.charAt(0)}</div>`;
      frame.classList.remove("has-photo");
    }
  }
  function syncProductCards() {
    document.querySelectorAll("[data-id]").forEach(card => {
      if (!card.classList.contains("pcard")) return;
      const p = find(card.dataset.id);
      if (!p) return;
      const priceEl = card.querySelector(".pcard-price");
      if (priceEl) {
        if (p.price > 0) {
          priceEl.classList.remove("pending");
          if (onSale(p)) {
            priceEl.innerHTML = `<span class="price-strike">${money(p.price)}</span> <span class="price-sale">${money(p.salePrice)}</span>`;
          } else {
            priceEl.textContent = money(p.price);
          }
        } else {
          priceEl.classList.add("pending");
          priceEl.textContent = "Precio próximamente";
        }
      }
      frameImg(card, p);
      if (onSale(p) && !card.querySelector(".pcard-sale-badge")) {
        const badge = document.createElement("div");
        badge.className = "pcard-sale-badge";
        badge.textContent = "Oferta";
        card.prepend(badge);
      }
    });
  }

  // ---------- Ofertas / Bazaar: arma tarjetas de producto al vuelo para
  // cualquier contenedor [data-sale-grid], a partir de PRODUCTS ----------
  function saleProducts() {
    return PRODUCTS.filter(onSale);
  }
  function cardHTML(p) {
    const sw = p.img ? `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : `<div class="pcard-swatch">${p.brand.charAt(0)}</div>`;
    const variantsOpts = (p.variants || []).map(v => `<option>${v.name}</option>`).join("");
    const priceHTML = p.price > 0
      ? `<span class="price-strike">${money(p.price)}</span> <span class="price-sale">${money(p.salePrice)}</span>`
      : `Precio próximamente`;
    let countdown = "";
    if (p.saleEndsAt) countdown = `<div class="pcard-countdown" data-ends="${p.saleEndsAt}">Calculando…</div>`;
    return `<article class="pcard" data-id="${p.id}">
      <div class="pcard-sale-badge">Oferta</div>
      <div class="pcard-frame${p.img ? " has-photo" : ""}">${sw}</div>
      <div class="pcard-brand">${p.brand}</div>
      <h3 class="pcard-name">${p.name}</h3>
      <div class="pcard-spec">${p.spec || ""}</div>
      <div class="pcard-price">${priceHTML}</div>
      ${countdown}
      ${variantsOpts ? `<div class="pcard-variants"><select data-variant="${p.id}">${variantsOpts}</select></div>` : ""}
      <div class="pcard-acts">
        <button class="p-add" data-act="add" data-id="${p.id}">Agregar</button>
        <button class="p-buy" data-act="buy" data-id="${p.id}">Comprar</button>
      </div>
    </article>`;
  }
  function renderSaleGrids() {
    document.querySelectorAll("[data-sale-grid]").forEach(grid => {
      const limit = grid.dataset.saleLimit ? Number(grid.dataset.saleLimit) : Infinity;
      const items = saleProducts().slice(0, limit);
      const empty = document.querySelector(grid.dataset.saleEmptyTarget || "[data-sale-empty]");
      if (!items.length) {
        grid.innerHTML = "";
        grid.style.display = "none";
        if (empty) empty.style.display = "block";
        return;
      }
      if (empty) empty.style.display = "none";
      grid.style.display = "";
      grid.innerHTML = items.map(cardHTML).join("");
      grid.addEventListener("click", e => {
        const btn = e.target.closest("[data-act]"); if (!btn) return;
        const id = btn.dataset.id;
        const sel = grid.querySelector(`[data-variant="${id}"]`);
        const variant = sel ? sel.value : null;
        add(id, variant);
        if (btn.dataset.act === "buy") openCart();
        else { btn.textContent = "Agregado"; btn.classList.add("done"); setTimeout(() => { btn.textContent = "Agregar"; btn.classList.remove("done"); }, 1400); }
      });
      tickCountdowns();
    });
  }
  let countdownTimer;
  function tickCountdowns() {
    clearInterval(countdownTimer);
    const paint = () => {
      document.querySelectorAll("[data-ends]").forEach(el => {
        const end = new Date(el.dataset.ends).getTime();
        const diff = end - Date.now();
        if (isNaN(end) || diff <= 0) { el.textContent = "Oferta finalizada"; return; }
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        const d = Math.floor(h / 24);
        el.textContent = d > 0 ? `Termina en ${d}d ${h % 24}h` : `Termina en ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      });
    };
    paint();
    countdownTimer = setInterval(paint, 1000);
  }

  // expose for product cards
  window.NINES = { add, openCart, money, priceLabel, find, onSale, effectivePrice };

  // ---------- arranque: espera datos (catalog.js) Y el DOM ----------
  let domReady = false, dataReady = false;
  function tryInit() { if (domReady && dataReady) init(); }
  document.addEventListener("DOMContentLoaded", () => { domReady = true; tryInit(); });
  document.addEventListener("nines:data-ready", () => { dataReady = true; tryInit(); });

  // ---------- música de fondo opcional: nunca suena sola, el navegador no
  // ---------- música de fondo opcional: nunca suena sola, el navegador no
  // lo permite (y tampoco es lo que queremos). El cliente la activa con un
  // botón flotante. Dos modos, según lo que hayas puesto en el panel:
  //  - youtubePlaylist: abre un mini-reproductor de YouTube Music (prioridad
  //    más alta — reproduce canciones completas, sin cortes).
  //  - spotifyPlaylist: igual pero con Spotify (corta a 30 seg si el
  //    cliente no tiene sesión de Spotify iniciada — restricción de ellos).
  //  - music (MP3): reproduce el archivo directo, para pistas libres de
  //    derechos como las de Pixabay.
  // Prioridad: YouTube > Spotify > MP3. ----------
  const MUSIC_KEY = "nines_music_on";

  function youtubeEmbedURL(link) {
    const m = String(link || "").match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (!m) return null;
    return { url: `https://www.youtube.com/embed/videoseries?list=${m[1]}&autoplay=1`, height: 250 };
  }
  function spotifyEmbedURL(link) {
    const m = String(link || "").match(/open\.spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/);
    if (!m) return null;
    return { url: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0&autoplay=1`, height: 152 };
  }

  function initMusic() {
    const yt = youtubeEmbedURL(SHOP.youtubePlaylist);
    const sp = !yt && spotifyEmbedURL(SHOP.spotifyPlaylist);
    const hasMusic = !!(yt || sp || SHOP.music);
    if (yt) initEmbedPlayer(yt);
    else if (sp) initEmbedPlayer(sp);
    else if (SHOP.music) initMp3(SHOP.music);
    if (hasMusic) musicInviteModal();
  }

  // aviso grande y centrado (como una bienvenida), que aparece una sola vez
  // por sesión, justo cuando termina de deslizarse la intro del home, antes
  // de que el cliente vea el home completo. El botón "Sí" es un clic real
  // del cliente, así que el navegador SÍ deja reproducir con sonido de
  // inmediato (a diferencia de intentarlo solo, que siempre se bloquea).
  const INVITE_KEY = "nines_music_invite_seen";
  function musicInviteModal() {
    const loader = document.getElementById("loader");
    if (!loader) return; // no estamos en el home, no hay intro que esperar
    if (sessionStorage.getItem(INVITE_KEY)) return; // ya lo vio esta sesión

    const show = () => {
      sessionStorage.setItem(INVITE_KEY, "1");
      const overlay = document.createElement("div");
      overlay.className = "music-modal-overlay";
      overlay.innerHTML = `
        <div class="music-modal">
          <div class="music-modal-icon">🎶</div>
          <h3>Bienvenida a NINE'S</h3>
          <p>Dale play a la música, relájate y disfruta tu compra.</p>
          <div class="music-modal-actions">
            <button class="btn btn-dark hoverable" data-music-yes>Sí, dale play</button>
            <button class="music-modal-skip hoverable" data-music-no>Ahora no</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("is-in"));
      const close = () => { overlay.classList.remove("is-in"); setTimeout(() => overlay.remove(), 400); };
      overlay.querySelector("[data-music-yes]").addEventListener("click", () => {
        if (window.__ninesOpenMusic) window.__ninesOpenMusic();
        close();
      });
      overlay.querySelector("[data-music-no]").addEventListener("click", close);
      overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    };

    // se sincroniza con el mismo instante en que la intro del home termina
    // de desaparecer (ver el "loader.classList.add('done')" del home, 900ms
    // después de que la página termina de cargar)
    if (document.readyState === "complete") setTimeout(show, 950);
    else window.addEventListener("load", () => setTimeout(show, 950));
  }

  function initEmbedPlayer({ url, height }) {
    const btn = document.createElement("button");
    btn.className = "music-toggle";
    btn.setAttribute("aria-label", "Playlist de Nine's");
    btn.innerHTML = "🎵";
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "music-panel";
    document.body.appendChild(panel);

    let loaded = false;
    const setOpen = open => {
      panel.classList.toggle("is-open", open);
      btn.classList.toggle("is-on", open);
      localStorage.setItem(MUSIC_KEY, open ? "1" : "0");
      if (open && !loaded) {
        // el iframe solo se carga la primera vez que se abre, para no
        // gastar datos del cliente si nunca le da clic a la música
        panel.innerHTML = `<iframe src="${url}" width="100%" height="${height}" frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
        loaded = true;
      }
    };
    btn.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    window.__ninesOpenMusic = () => setOpen(true);
    // si ya la había activado en una página anterior, la reabrimos sola al
    // llegar aquí — con autoplay=1 en la URL, casi siempre retoma el sonido
    // sin que el cliente tenga que darle clic otra vez (el navegador ya
    // "confía" en este sitio porque el cliente interactuó con música antes)
    if (localStorage.getItem(MUSIC_KEY) === "1") setOpen(true);
  }

  function initMp3(url) {
    const audio = document.createElement("audio");
    audio.src = url; audio.loop = true; audio.preload = "none";

    const btn = document.createElement("button");
    btn.className = "music-toggle";
    btn.setAttribute("aria-label", "Música de fondo");
    btn.innerHTML = "🔇";
    document.body.appendChild(audio);
    document.body.appendChild(btn);

    const setOn = on => {
      btn.innerHTML = on ? "🔊" : "🔇";
      btn.classList.toggle("is-on", on);
      localStorage.setItem(MUSIC_KEY, on ? "1" : "0");
    };
    btn.addEventListener("click", () => {
      if (audio.paused) {
        audio.play().then(() => setOn(true)).catch(() => toast("Tu navegador bloqueó el sonido — dale clic de nuevo"));
      } else {
        audio.pause(); setOn(false);
      }
    });
    window.__ninesOpenMusic = () => audio.play().then(() => setOn(true)).catch(() => setOn(false));

    // si ya la había activado antes, lo intentamos de nuevo en silencio;
    // si el navegador lo bloquea no pasa nada, el botón queda listo
    if (localStorage.getItem(MUSIC_KEY) === "1") {
      audio.play().then(() => setOn(true)).catch(() => setOn(false));
    }
  }

  // ---------- cuando alguien llega desde un link de "favoritos" con
  // ?highlight=ID-DEL-PRODUCTO, hace scroll directo a esa tarjeta en el
  // catálogo y la resalta un momento, para llevarlo directo a comprar ----------
  function highlightFromURL() {
    const id = new URLSearchParams(location.search).get("highlight");
    if (!id) return;
    const card = document.querySelector(`.pcard[data-id="${id}"]`);
    if (!card) return;
    setTimeout(() => {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("pcard-highlight");
      setTimeout(() => card.classList.remove("pcard-highlight"), 2600);
    }, 300);
  }

  function init() {
    zone = ZONES[0] ? ZONES[0].id : null;
    paintCount(); paintCart(); zoneOptions(); paintCheckoutPage();
    syncProductCards(); renderSaleGrids(); initMusic(); highlightFromURL();

    document.addEventListener("click", e => {
      const t = e.target;
      if (t.closest("[data-open-cart]")) { e.preventDefault(); openCart(); }
      if (t.closest("[data-close-cart]") || t.closest("[data-scrim]")) closeCart();
      if (t.closest("[data-empty-cart]")) { e.preventDefault(); toast("Tu carrito está vacío"); }
      const pm = t.closest("[data-pay-method]");
      if (pm) { if (validateCheckout()) send(pm.dataset.payMethod); }
      if (t.closest("[data-card-soon]")) toast("Pago con tarjeta — próximamente");
      const inc = t.closest("[data-inc]"); if (inc) setQty(+inc.dataset.inc, cart[+inc.dataset.inc].qty + 1);
      const dec = t.closest("[data-dec]"); if (dec) setQty(+dec.dataset.dec, cart[+dec.dataset.dec].qty - 1);
      const rm = t.closest("[data-rm]"); if (rm) drop(+rm.dataset.rm);
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });

    const pick = document.querySelector("[data-pick]");
    if (pick) pick.addEventListener("click", e => {
      const b = e.target.closest("button[data-mode]"); if (!b) return;
      ship = b.dataset.mode;
      pick.querySelectorAll("button").forEach(x => x.classList.toggle("is-on", x === b));
      document.querySelector("[data-delivery-fields]").style.display = ship === "delivery" ? "block" : "none";
      document.querySelector("[data-pickup-note]").style.display = ship === "pickup" ? "block" : "none";
      paintTotals();
    });
    const zsel = document.querySelector("[data-f-zone]");
    if (zsel) zsel.addEventListener("change", e => { zone = e.target.value; paintTotals(); });

    // cuando el cliente elige un tono distinto en una tarjeta de producto,
    // si ese tono tiene su propia foto, la mostramos en vez de la genérica
    document.addEventListener("change", e => {
      const sel = e.target.closest("[data-variant]");
      if (!sel) return;
      const card = sel.closest(".pcard");
      if (!card) return;
      const p = find(sel.dataset.variant);
      if (p) frameImg(card, p, sel.value);
    });
  }
})();
