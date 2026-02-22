/* js/checkout.js — LP GRILL Checkout Overlay (sem mexer no render/produtos) */
(() => {
  // evita inicializar duas vezes
  if (window.__LPGRILL_CHECKOUT_INIT__) return;
  window.__LPGRILL_CHECKOUT_INIT__ = true;

  const CONFIG = {
    whatsapp: "5531998064556",

    pixKey: "e02484b0-c924-4d38-9af9-79af9ad97c3e",
    merchantName: "LP GRILL",
    merchantCity: "BELO HORIZONTE",
    txid: "LPGRILL01",

    baseLat: -19.8850878,
    baseLon: -43.9877612,
    feeUpTo5km: 5,
    fee5to10km: 8,
    maxKm: 10,

    storageKey: "lpgrill.checkout.v1"
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function getCart() {
    return window.Cart || null;
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function loadSaved() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    const data = safeJsonParse(raw);
    return (data && typeof data === "object") ? data : {};
  }
  function saveSaved(patch) {
    const cur = loadSaved();
    const next = { ...cur, ...patch };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(next));
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function feeByKm(km) {
    if (km > CONFIG.maxKm) return { blocked: true, fee: 0 };
    if (km <= 5) return { blocked: false, fee: CONFIG.feeUpTo5km };
    return { blocked: false, fee: CONFIG.fee5to10km };
  }

  function calcFeeByCoords(lat, lon) {
    const km = haversineKm(CONFIG.baseLat, CONFIG.baseLon, lat, lon);
    const rule = feeByKm(km);
    return { km, ...rule };
  }

  function calcFeeWithGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS não suportado."));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(calcFeeByCoords(pos.coords.latitude, pos.coords.longitude)),
        reject,
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  // CRC16 / EMV
  function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  function emv(id, value) {
    const len = String(value.length).padStart(2, "0");
    return `${id}${len}${value}`;
  }
  function buildPixPayload({ key, name, city, amount, txid }) {
    const mai = emv("00", "BR.GOV.BCB.PIX") + emv("01", key) + (txid ? emv("02", txid) : "");
    const payload =
      emv("00", "01") +
      emv("01", "12") +
      emv("26", mai) +
      emv("52", "0000") +
      emv("53", "986") +
      emv("54", amount.toFixed(2)) +
      emv("58", "BR") +
      emv("59", String(name || "").slice(0, 25)) +
      emv("60", String(city || "").slice(0, 15)) +
      emv("62", emv("05", txid || "PEDIDO"));

    const toCrc = payload + "6304";
    return toCrc + crc16(toCrc);
  }

  function openWhatsApp(msg) {
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // tenta pegar linhas de itens do carrinho SEM depender do formato
  function getCartLines(cart) {
    try {
      if (typeof cart.toWhatsApp === "function") {
        const s = cart.toWhatsApp();
        if (s && typeof s === "string") return s.trim();
      }
      const items =
        (typeof cart.items === "function" && cart.items()) ||
        cart.items ||
        cart.state?.items ||
        cart.data?.items ||
        cart.cart?.items ||
        null;

      if (Array.isArray(items) && items.length) {
        const lines = items.map((it) => {
          const qty = Number(it.qty ?? it.qtd ?? it.quantity ?? 1) || 1;
          const name = String(it.name ?? it.title ?? it.produto ?? "Item").trim();
          const price = Number(it.price ?? it.valor ?? it.unitPrice ?? 0) || 0;
          const lineTotal = (Number(it.total ?? it.lineTotal ?? 0) || 0) || (qty * price);
          return `• ${qty}x ${name}${lineTotal ? ` — ${money(lineTotal)}` : ""}`;
        });
        return lines.join("\n");
      }
    } catch { /* ignore */ }
    return "";
  }

  function init() {
    const overlay = $("#checkoutOverlay"); // deve ser o backdrop (.ck-overlay)
    if (!overlay) return;

    const cart = getCart();
    if (!cart) {
      console.warn("checkout.js: window.Cart não existe (cart.js não carregou).");
      return;
    }

    // ====== trava/destrava scroll do fundo (FIX corte/bug de toque) ======
    let prevOverflowHtml = "";
    let prevOverflowBody = "";
    function lockScroll() {
      prevOverflowHtml = document.documentElement.style.overflow || "";
      prevOverflowBody = document.body.style.overflow || "";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    function unlockScroll() {
      document.documentElement.style.overflow = prevOverflowHtml;
      document.body.style.overflow = prevOverflowBody;
    }

    const steps = {
      pay: overlay.querySelector('[data-step="pay"]'),
      addr: overlay.querySelector('[data-step="addr"]'),
      pix: overlay.querySelector('[data-step="pix"]')
    };

    // PIX UI
    const elPixSub   = $("#ckTotalPix", overlay);
    const elFeePix   = $("#ckFeePix", overlay);
    const elPixTotal = $("#ckPixTotal", overlay);
    const elPixCode  = $("#ckPixCode", overlay);
    const elQr       = $("#ckQr", overlay);

    // taxa UI
    const elKmHint   = $("#ckKmHint", overlay);
    const elFeeLine  = $("#ckFeeLine", overlay);
    const elKm       = $("#ckKm", overlay);
    const elFee      = $("#ckFee", overlay);
    const elBlocked  = $("#ckBlocked", overlay);

    // inputs
    const inName   = $("#ckName", overlay);
    const inPhone  = $("#ckPhone", overlay);
    const inAddr   = $("#ckAddress", overlay);
    const inCompl  = $("#ckCompl", overlay);
    const inObs    = $("#ckObs", overlay);
    const inBairro = $("#ckBairro", overlay);

    // botões
    const btnGps = $("#ckGetLocation", overlay);
    const btnConfirm = $("#ckConfirmOrder", overlay);
    const btnCopyPix = $("#ckCopyPix", overlay);

    // botões de pagamento (os seus têm data-pay="pix|credit|debit")
    const payButtons = $$("[data-pay]", overlay);

    let payMethod = null;
    let lastKm = null;
    let lastFee = 0;
    let lastFocusEl = null;

    function normPay(v){
      const x = String(v||"").toLowerCase().trim();
      if (x === "pix") return "pix";
      if (x === "credit" || x === "credito") return "credit";
      if (x === "debit" || x === "debito") return "debit";
      return x;
    }

    function setPayActive(method){
      payMethod = normPay(method);
      // CSS: .ck-pay.is-active / .ck-paybtn.is-active
      payButtons.forEach(b => b.classList.toggle("is-active", normPay(b.getAttribute("data-pay")) === payMethod));
    }

    function clearPayActive(){
      payMethod = null;
      payButtons.forEach(b => b.classList.remove("is-active"));
    }

    function getMode() {
      const mode = (cart.getMode && cart.getMode()) || cart.mode || "entrega";
      return String(mode || "entrega").toLowerCase();
    }
    function isEntregaMode() {
      const mode = getMode();
      return !(mode === "retirar" || mode === "retirada");
    }
    function subtotal() {
      const s = (typeof cart.subtotal === "function") ? cart.subtotal() : (cart.subtotal ?? 0);
      return Number(s || 0) || 0;
    }
    function cartIsEmpty() {
      try {
        if (typeof cart.count === "function") return (cart.count() || 0) <= 0;
        const items = (typeof cart.items === "function" ? cart.items() : cart.items) || cart.state?.items;
        if (Array.isArray(items)) return items.length === 0;
      } catch { /* ignore */ }
      return subtotal() <= 0;
    }

    function setBusy(btn, busy, labelBusy = "Aguarde...") {
      if (!btn) return;
      btn.disabled = !!busy;
      btn.dataset._label = btn.dataset._label || btn.textContent;
      btn.textContent = busy ? labelBusy : btn.dataset._label;
    }

    function goStep(name) {
      Object.values(steps).forEach(s => { if (s) s.hidden = true; });
      if (steps[name]) steps[name].hidden = false;

      const focusTarget =
        (name === "pay" && overlay.querySelector("[data-pay]")) ||
        (name === "addr" && inName) ||
        (name === "pix" && btnCopyPix) ||
        null;

      setTimeout(() => focusTarget?.focus?.(), 30);
    }

    function hydrateFromStorage() {
      const saved = loadSaved();
      if (inName && !inName.value) inName.value = saved.name || "";
      if (inPhone && !inPhone.value) inPhone.value = saved.phone || "";
      if (inBairro && !inBairro.value) inBairro.value = saved.bairro || "";
      if (inAddr && !inAddr.value) inAddr.value = saved.address || "";
      if (inCompl && !inCompl.value) inCompl.value = saved.compl || "";
      if (inObs && !inObs.value) inObs.value = saved.obs || "";
    }

    function persistInputs() {
      saveSaved({
        name: (inName?.value || "").trim(),
        phone: (inPhone?.value || "").trim(),
        bairro: (inBairro?.value || "").trim(),
        address: (inAddr?.value || "").trim(),
        compl: (inCompl?.value || "").trim(),
        obs: (inObs?.value || "").trim()
      });
    }

    function openOverlay() {
      if (cartIsEmpty()) {
        alert("Seu carrinho está vazio. Adicione um item antes de finalizar.");
        return;
      }

      lastFocusEl = document.activeElement;

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      overlay.setAttribute("role", "dialog");

      lockScroll(); // ✅ FIX

      clearPayActive();
      lastKm = null;
      lastFee = 0;

      if (elFeeLine) elFeeLine.hidden = true;
      if (elBlocked) elBlocked.hidden = true;
      if (elKmHint) elKmHint.textContent = isEntregaMode()
        ? "Toque em “Usar minha localização (GPS)” para calcular a taxa de entrega."
        : "Modo Retirar: sem taxa de entrega.";

      hydrateFromStorage();
      goStep("pay");
    }

    function closeOverlay() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");

      unlockScroll(); // ✅ FIX

      // devolve foco
      setTimeout(() => lastFocusEl?.focus?.(), 10);
    }

    // ===== fechar: botões + clique fora + ESC =====
    $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
    $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);

    // clique fora fecha (importante: só fecha se clicou no backdrop)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeOverlay();
    });

    // ===== ABRIR CHECKOUT: mais robusto (link OU botão) =====
    const openSelectors = [
      // seus links antigos
      'a.tile.highlight[href="checkout.html"]',
      '.drawer-actions a.btn.primary[href="checkout.html"]',
      '.sticky-cta a.cta.primary[href="checkout.html"]',
      // variações comuns
      'a[href$="checkout.html"]',
      'a[href*="checkout.html"]',
      // caso seja botão/div no layout
      '.lp-finalize',
      '.cta.primary',
      '#btnFinalizar',
      '#finalizar',
      '[data-open-checkout]'
    ];

    document.querySelectorAll(openSelectors.join(",")).forEach(el => {
      el.addEventListener("click", (e) => { e.preventDefault(); openOverlay(); });
    });

    // ===== salva enquanto digita =====
    [inName, inPhone, inBairro, inAddr, inCompl, inObs].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => persistInputs());
      el.addEventListener("blur", () => persistInputs());
    });

    // telefone: só números (DDD+9)
    if (inPhone) {
      inPhone.addEventListener("input", () => {
        const d = onlyDigits(inPhone.value);
        inPhone.value = d.slice(0, 11);
      });
    }

    // ===== Escolha pagamento: agora fica bonito + toggle =====
    payButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const clicked = normPay(btn.getAttribute("data-pay"));

        // toggle: se clicar no mesmo, desmarca e fica no step pay
        if (payMethod === clicked) {
          clearPayActive();
          goStep("pay");
          return;
        }

        setPayActive(clicked);
        goStep("addr");

        if (isEntregaMode()) {
          if (elKmHint) elKmHint.textContent = "Para entrega: calcule a taxa pelo GPS.";
        } else {
          if (elKmHint) elKmHint.textContent = "Modo Retirar: você pode confirmar o pedido.";
        }
      });
    });

    $("#ckBackFromAddr", overlay)?.addEventListener("click", () => goStep("pay"));
    $("#ckBackFromPix", overlay)?.addEventListener("click", () => goStep("addr"));

    // ===== GPS =====
    btnGps?.addEventListener("click", async () => {
      if (!isEntregaMode()) {
        lastKm = 0; lastFee = 0;
        if (elKmHint) elKmHint.textContent = "Modo Retirar: sem taxa de entrega.";
        if (elFeeLine) elFeeLine.hidden = true;
        if (elBlocked) elBlocked.hidden = true;
        return;
      }

      if (elKmHint) elKmHint.textContent = "Calculando distância pelo GPS...";
      if (elFeeLine) elFeeLine.hidden = true;
      if (elBlocked) elBlocked.hidden = true;

      setBusy(btnGps, true, "Calculando...");
      try {
        const res = await calcFeeWithGPS();
        lastKm = res.km;
        lastFee = res.fee;

        if (elKm) elKm.textContent = `${clamp(res.km, 0, 999).toFixed(1)} km`;
        if (elFee) elFee.textContent = money(res.fee);
        if (elFeeLine) elFeeLine.hidden = false;
        if (elBlocked) elBlocked.hidden = !res.blocked;

        if (elKmHint) {
          elKmHint.textContent = res.blocked
            ? `Fora do raio de ${CONFIG.maxKm} km. Entrega indisponível.`
            : "Taxa calculada com base na sua localização.";
        }
      } catch {
        if (elKmHint) elKmHint.textContent = "Não consegui acessar o GPS. Autorize a localização e tente novamente.";
      } finally {
        setBusy(btnGps, false);
      }
    });

    // ===== Confirmar endereço / finalizar =====
    btnConfirm?.addEventListener("click", () => {
      if (!payMethod) {
        alert("Escolha uma forma de pagamento (PIX, Crédito ou Débito).");
        goStep("pay");
        return;
      }

      const name = (inName?.value || "").trim();
      const phoneDigits = onlyDigits(inPhone?.value || "");
      const phone = phoneDigits;
      const bairro = (inBairro?.value || "").trim();
      const address = (inAddr?.value || "").trim();
      const compl = (inCompl?.value || "").trim();
      const obs = (inObs?.value || "").trim();

      persistInputs();

      if (!name || phoneDigits.length < 10) {
        alert("Preencha Nome e Telefone (com DDD).");
        if (!name) inName?.focus?.();
        else inPhone?.focus?.();
        return;
      }

      const isEntrega = isEntregaMode();

      if (isEntrega) {
        if (!bairro) { alert("Informe o bairro."); inBairro?.focus?.(); return; }
        if (!address) { alert("Preencha o endereço completo."); inAddr?.focus?.(); return; }
        if (lastKm == null) { alert("Toque em “Usar minha localização (GPS)” para calcular a taxa."); return; }
        if (lastKm > CONFIG.maxKm) { alert(`Fora do raio de ${CONFIG.maxKm} km. Entrega indisponível.`); return; }
      } else {
        lastKm = 0; lastFee = 0;
      }

      const sub = subtotal();
      const total = sub + Number(lastFee || 0);

      // PIX -> gera e mostra
      if (payMethod === "pix") {
        goStep("pix");

        if (elPixSub) elPixSub.textContent = money(sub);
        if (elFeePix) elFeePix.textContent = money(lastFee);
        if (elPixTotal) elPixTotal.textContent = money(total);

        const code = buildPixPayload({
          key: CONFIG.pixKey,
          name: CONFIG.merchantName,
          city: CONFIG.merchantCity,
          amount: total,
          txid: CONFIG.txid
        });

        if (elPixCode) elPixCode.value = code;

        if (elQr) {
          elQr.innerHTML = "";
          if (typeof QRCode === "undefined") {
            elQr.textContent = "QR Code não carregou.";
          } else {
            const canvas = document.createElement("canvas");
            canvas.width = 220; canvas.height = 220;
            elQr.appendChild(canvas);
            QRCode.toCanvas(canvas, code, { margin: 1, scale: 6 }, (err) => {
              if (err) elQr.textContent = "Erro ao gerar QR.";
            });
          }
        }
        return;
      }

      // Crédito / Débito -> WhatsApp
      const label = (payMethod === "credit") ? "Crédito" : "Débito";
      const itemsLines = getCartLines(cart);

      const msg =
        `🛒 *NOVO PEDIDO — LP GRILL*\n` +
        `Pagamento: *${label}*\n` +
        (itemsLines ? `\n*Itens:*\n${itemsLines}\n` : "") +
        `\nSubtotal: ${money(sub)}\n` +
        (isEntrega ? `Distância: ${Number(lastKm || 0).toFixed(1)} km\nTaxa: ${money(lastFee)}\n` : "") +
        `Total: *${money(total)}*\n` +
        `\nNome: ${name}\nTelefone: ${phone}\n` +
        (isEntrega ? `Bairro: ${bairro}\nEndereço: ${address}\n` : `Modo: Retirar\n`) +
        (compl ? `Compl: ${compl}\n` : "") +
        (obs ? `Obs: ${obs}\n` : "");

      openWhatsApp(msg);
    });

    // Copiar PIX
    btnCopyPix?.addEventListener("click", async () => {
      const val = (elPixCode?.value || "").trim();
      if (!val) return;

      setBusy(btnCopyPix, true, "Copiando...");
      try {
        await navigator.clipboard.writeText(val);
        btnCopyPix.textContent = "Copiado ✅";
        setTimeout(() => {
          btnCopyPix.textContent = btnCopyPix.dataset._label || "Copiar código PIX";
          btnCopyPix.disabled = false;
        }, 1200);
      } catch {
        try {
          elPixCode?.focus?.();
          elPixCode?.select?.();
          document.execCommand("copy");
          btnCopyPix.textContent = "Copiado ✅";
          setTimeout(() => {
            btnCopyPix.textContent = btnCopyPix.dataset._label || "Copiar código PIX";
            btnCopyPix.disabled = false;
          }, 1200);
        } catch {
          alert("Não consegui copiar automaticamente. Selecione o código e copie manualmente.");
          btnCopyPix.disabled = false;
          btnCopyPix.textContent = btnCopyPix.dataset._label || "Copiar código PIX";
        }
      }
    });

    // Já paguei -> WhatsApp comprovante
    $("#ckPaidPix", overlay)?.addEventListener("click", () => {
      const name = (inName?.value || "").trim();
      const phone = onlyDigits(inPhone?.value || "");

      const msg =
        `✅ *PIX PAGO* — vou enviar o comprovante agora.\n` +
        `Por favor, libere meu pedido assim que confirmar.\n\n` +
        `Nome: ${name}\nTelefone: ${phone}`;

      openWhatsApp(msg);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
