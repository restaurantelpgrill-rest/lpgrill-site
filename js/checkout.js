/* js/checkout.js — LP GRILL Checkout Overlay (FIXED / PIX + WhatsApp + GPS) */
(() => {
  "use strict";

  // evita inicializar duas vezes
  if (window.__LPGRILL_CHECKOUT_INIT__) return;
  window.__LPGRILL_CHECKOUT_INIT__ = true;

  const CONFIG = {
    whatsapp: "5531998064556",

    // PIX (chave aleatória)
    pixKey: "e02484b0-c924-4d38-9af9-79af9ad97c3e",
    merchantName: "LP GRILL",
    merchantCity: "BELO HORIZONTE",
    txid: "LPGRILL01",

    // entrega
    baseLat: -19.8850878,
    baseLon: -43.9877612,
    feeUpTo5km: 5,
    fee5to10km: 8,
    maxKm: 10,

    // persistência
    storageKey: "lpgrill.checkout.v1",
    feeKey: "LPGRILL_FEE_V1"
  };

  const $ = (s, r = document) => r.querySelector(s);
  const money = (v) =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  // ===== CRC16 / EMV (PIX copia e cola) =====
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
      emv("54", Number(amount || 0).toFixed(2)) +
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

  function cartIsEmpty(cart) {
    try {
      if (typeof cart.count === "function") return cart.count() <= 0;
      if (typeof cart.totalItems === "function") return cart.totalItems() <= 0;
      const items =
        (typeof cart.items === "function" && cart.items()) ||
        cart.items || cart.state?.items || cart.data?.items || cart.cart?.items || [];
      return !Array.isArray(items) || items.length === 0;
    } catch {
      return false;
    }
  }

  // subtotal: tenta usar o que existir, senão soma itens
  function subtotal(cart) {
    try {
      if (typeof cart.subtotal === "function") return Number(cart.subtotal() || 0);
      if (typeof cart.total === "function") return Number(cart.total() || 0); // alguns carts chamam de total sem taxa
      if (typeof cart.getSubtotal === "function") return Number(cart.getSubtotal() || 0);

      const items =
        (typeof cart.items === "function" && cart.items()) ||
        cart.items || cart.state?.items || cart.data?.items || cart.cart?.items || [];
      if (!Array.isArray(items)) return 0;

      return items.reduce((acc, it) => {
        const qty = Number(it.qty ?? it.qtd ?? it.quantity ?? 1) || 1;
        const price = Number(it.price ?? it.valor ?? it.unitPrice ?? 0) || 0;
        const lineTotal = Number(it.total ?? it.lineTotal ?? 0) || (qty * price);
        return acc + (Number(lineTotal) || 0);
      }, 0);
    } catch {
      return 0;
    }
  }

  // linhas itens
  function getCartLines(cart) {
    try {
      if (typeof cart.toWhatsApp === "function") {
        const s = cart.toWhatsApp();
        if (s && typeof s === "string") return s.trim();
      }

      const items =
        (typeof cart.items === "function" && cart.items()) ||
        cart.items || cart.state?.items || cart.data?.items || cart.cart?.items || null;

      if (Array.isArray(items) && items.length) {
        return items.map((it) => {
          const qty = Number(it.qty ?? it.qtd ?? it.quantity ?? 1) || 1;
          const name = String(it.name ?? it.title ?? it.produto ?? "Item").trim();
          const price = Number(it.price ?? it.valor ?? it.unitPrice ?? 0) || 0;
          const lineTotal = Number(it.total ?? it.lineTotal ?? 0) || (qty * price);
          return `• ${qty}x ${name}${lineTotal ? ` — ${money(lineTotal)}` : (price ? ` — ${money(qty * price)}` : "")}`;
        }).join("\n");
      }
    } catch { /* ignore */ }
    return "";
  }

  function setBusy(btn, on, label = "Aguarde...") {
    if (!btn) return;
    if (on) {
      btn.dataset._label = btn.textContent;
      btn.textContent = label;
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset._label || btn.textContent;
      btn.disabled = false;
    }
  }

  function init() {
    const overlay = $("#checkoutOverlay");
    if (!overlay) return;

    const cart = getCart();
    if (!cart) {
      console.warn("checkout.js: window.Cart não existe (cart.js não carregou).");
      return;
    }

    // ===== scroll lock =====
    let prevOverflowHtml = "";
    let prevOverflowBody = "";
    let lastFocusEl = null;

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

    // steps
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

    const elQrBox =
      $("#ckQrBox", overlay) ||
      overlay.querySelector(".ck-qrbox") ||
      $("#ckQr", overlay); // fallback

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
    const btnGps     = $("#ckGetLocation", overlay);
    const btnConfirm = $("#ckConfirmOrder", overlay);
    const btnCopyPix = $("#ckCopyPix", overlay);
    const btnPaidPix = $("#ckPaidPix", overlay);

    // pagamentos
    const payButtons = Array.from(overlay.querySelectorAll("[data-pay]"));

    let payMethod = ""; // "pix" | "credit" | "debit"
    let lastKm = null;
    let lastFee = 0;

    function normPay(p) {
      p = String(p || "").toLowerCase().trim();
      if (p === "pix") return "pix";
      if (p === "credit" || p === "credito" || p === "crédito") return "credit";
      if (p === "debit" || p === "debito" || p === "débito") return "debit";
      return "";
    }

    function isEntregaMode() {
      // se você tiver algum toggle no seu HTML, implemente aqui.
      // fallback: assume entrega (pode ajustar depois).
      const el = $("#ckModeEntrega", overlay);
      if (el && (el.type === "checkbox")) return !!el.checked;
      const sel = $("#ckMode", overlay);
      if (sel && sel.value) return String(sel.value).toLowerCase().includes("entrega");
      return true;
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

    function hydrateFromStorage() {
      const s = loadSaved();
      if (inName && s.name) inName.value = s.name;
      if (inPhone && s.phone) inPhone.value = onlyDigits(s.phone).slice(0, 11);
      if (inBairro && s.bairro) inBairro.value = s.bairro;
      if (inAddr && s.address) inAddr.value = s.address;
      if (inCompl && s.compl) inCompl.value = s.compl;
      if (inObs && s.obs) inObs.value = s.obs;
    }

    function goStep(step) {
      Object.keys(steps).forEach((k) => {
        if (!steps[k]) return;
        steps[k].hidden = (k !== step);
      });
    }

    function clearPayActive() {
      payMethod = "";
      payButtons.forEach((b) => b.classList.remove("is-active"));
    }
    function setPayActive(method) {
      payMethod = method;
      payButtons.forEach((b) => {
        const m = normPay(b.getAttribute("data-pay"));
        if (m === method) b.classList.add("is-active");
        else b.classList.remove("is-active");
      });
    }

    function renderQr(code) {
      if (!elQrBox) return;

      const pix = String(code || "").trim();
      elQrBox.innerHTML = "";

      if (!pix) {
        elQrBox.textContent = "Código PIX vazio.";
        return;
      }

      if (!window.QRCode) {
        // sem lib, só mostra aviso (copia e cola continua ok)
        elQrBox.textContent = "QR indisponível (biblioteca não carregou).";
        return;
      }

      // qrcodejs
      try {
        // eslint-disable-next-line no-new
        new QRCode(elQrBox, {
          text: pix,
          width: 240,
          height: 240,
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) {
        console.warn("Falha ao gerar QR:", e);
        elQrBox.textContent = "Não consegui gerar o QR.";
      }
    }

    async function copyPix() {
      if (!elPixCode) return;
      const val = String(elPixCode.value || elPixCode.textContent || "").trim();
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
          // fallback antigo
          if (elPixCode.select) elPixCode.select();
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
    }

    function openOverlay() {
      if (cartIsEmpty(cart)) {
        alert("Seu carrinho está vazio. Adicione um item antes de finalizar.");
        return;
      }

      lastFocusEl = document.activeElement;

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      overlay.setAttribute("role", "dialog");

      lockScroll();

      clearPayActive();
      lastKm = null;
      lastFee = 0;

      if (elFeeLine) elFeeLine.hidden = true;
      if (elBlocked) elBlocked.hidden = true;
      if (elKmHint) {
        elKmHint.textContent = isEntregaMode()
          ? "Toque em “Usar minha localização (GPS)” para calcular a taxa de entrega."
          : "Modo Retirar: sem taxa de entrega.";
      }

      hydrateFromStorage();
      goStep("pay");
    }

    function closeOverlay() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      unlockScroll();
      setTimeout(() => lastFocusEl?.focus?.(), 10);
    }

    // ===== fechar =====
    $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
    $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeOverlay();
    });

    // ===== ABRIR CHECKOUT: delegação (pega páginas novas sem registrar tudo) =====
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const a = t.closest('a[href$="checkout.html"],a[href*="checkout.html"]');
      const btn = t.closest("#ctaCheckout,[data-open-checkout],.lp-finalize,#btnFinalizar,#finalizar,.cta.primary");
      if (!a && !btn) return;

      e.preventDefault();
      openOverlay();
    });

    // ===== salva enquanto digita =====
    [inName, inPhone, inBairro, inAddr, inCompl, inObs].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", persistInputs);
      el.addEventListener("blur", persistInputs);
    });

    // telefone: só números
    if (inPhone) {
      inPhone.addEventListener("input", () => {
        inPhone.value = onlyDigits(inPhone.value).slice(0, 11);
      });
    }

    // ===== escolher pagamento =====
    payButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const clicked = normPay(btn.getAttribute("data-pay"));
        if (!clicked) return;

        // toggle: clicou no mesmo -> desmarca
        if (payMethod === clicked) {
          clearPayActive();
          goStep("pay");
          return;
        }

        setPayActive(clicked);

        if (clicked === "pix") {
          // vai pro endereço primeiro, igual cartão (pra preencher nome/telefone/endereço)
          goStep("addr");
          if (elKmHint) {
            elKmHint.textContent = isEntregaMode()
              ? "Para entrega: calcule a taxa pelo GPS."
              : "Modo Retirar: você pode confirmar o pedido.";
          }
          return;
        }

        // cartão -> endereço
        goStep("addr");
        if (elKmHint) {
          elKmHint.textContent = isEntregaMode()
            ? "Para entrega: calcule a taxa pelo GPS."
            : "Modo Retirar: você pode confirmar o pedido.";
        }
      });
    });

    $("#ckBackFromAddr", overlay)?.addEventListener("click", () => goStep("pay"));
    $("#ckBackFromPix", overlay)?.addEventListener("click", () => goStep("addr"));

    // ===== GPS =====
    btnGps?.addEventListener("click", async () => {
      // modo retirar: zera
      if (!isEntregaMode()) {
        lastKm = 0;
        lastFee = 0;
        localStorage.setItem(CONFIG.feeKey, "0");
        document.dispatchEvent(new CustomEvent("lp:cart-change"));
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

        localStorage.setItem(CONFIG.feeKey, String(lastFee));
        document.dispatchEvent(new CustomEvent("lp:cart-change"));

        if (elKm) elKm.textContent = `${clamp(res.km, 0, 999).toFixed(1)} km`;
        if (elFee) elFee.textContent = money(res.fee);
        if (elFeeLine) elFeeLine.hidden = false;

        if (elBlocked) elBlocked.hidden = !res.blocked;
        if (elKmHint) elKmHint.textContent = res.blocked
          ? "Fora da área de entrega. Escolha Retirar."
          : "Taxa calculada. Pode confirmar o pedido.";
      } catch (e) {
        console.error(e);
        alert("Não consegui calcular a distância pelo GPS.");
        if (elKmHint) elKmHint.textContent = "Não consegui calcular. Tente novamente ou use Retirar.";
      } finally {
        setBusy(btnGps, false);
      }
    });

    // ===== Copiar PIX =====
    btnCopyPix?.addEventListener("click", copyPix);

    // ===== Já paguei (WhatsApp) =====
    btnPaidPix?.addEventListener("click", () => {
      const name = (inName?.value || "").trim();
      const phone = onlyDigits(inPhone?.value || "");
      const msg =
        `✅ *PIX PAGO* — vou enviar o comprovante agora.\n` +
        `Por favor, libere meu pedido assim que confirmar.\n\n` +
        `Nome: ${name}\nTelefone: ${phone}`;
      openWhatsApp(msg);
    });

    // ===== Confirmar / Finalizar =====
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
        lastKm = 0;
        lastFee = 0;
        localStorage.setItem(CONFIG.feeKey, "0");
      }

      const sub = subtotal(cart);
      const total = sub + Number(lastFee || 0);

      // ===== PIX =====
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

        // coloca código no textarea/input (se for input)
        if (elPixCode) {
          if ("value" in elPixCode) elPixCode.value = code;
          else elPixCode.textContent = code;
        }

        // gera QR (se lib existir)
        renderQr(code);

        return; // não cai no fluxo do cartão
      }

      // ===== Cartão -> WhatsApp =====
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
  }

  // boot robusto
  function boot() {
    try { init(); }
    catch (e) { console.error("checkout init error:", e); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
