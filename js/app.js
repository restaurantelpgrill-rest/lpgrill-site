// js/app.js — LP Grill (Carrinho + Drawer + Checkout Overlay PIX/Cartão)
// Ajustado para o HTML do seu index (IDs: cartDrawer/modeEntrega/modeRetirar/checkoutOverlay/ck...)
(function () {
  // ===================== CONFIG =====================
  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531998064556",

    // Base Maria Teresa BH
    baseLat: -19.8850878,
    baseLon: -43.9877612,

    feeUpTo5km: 5.0,
    fee5to10km: 8.0,
    maxKm: 10,
  };

  const PIX = {
    // sua chave já estava aqui — mantive
    key: "e02484b0-c924-4d38-9af9-79af9ad97c3e",
    merchantName: "LP GRILL",
    merchantCity: "BELO HORIZONTE",
    txid: "LPGRILL01",
  };

  // ===================== UTILS =====================
  const $ = (s, r = document) => r.querySelector(s);

  const money = (v) =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.style.display = "none"), 2200);
  }

  function allProducts() {
    const list = [];
    if (window.DATA) {
      for (const k in window.DATA) if (Array.isArray(window.DATA[k])) list.push(...window.DATA[k]);
    }
    return list;
  }
  function findProduct(id) {
    return allProducts().find((p) => p.id === id);
  }

  // ===================== CART =====================
  const Cart = window.Cart || {};
  window.Cart = Cart;

  Cart.key = "LPGRILL_CART";
  Cart.stateKey = "LPGRILL_CHECKOUT";

  Cart.read = function () {
    try { return JSON.parse(localStorage.getItem(Cart.key) || "[]"); }
    catch { return []; }
  };

  Cart.write = function (items) {
    localStorage.setItem(Cart.key, JSON.stringify(items));
    Cart.syncUI();
  };

  Cart.add = function (id) {
    const items = Cart.read();
    const found = items.find((x) => x.id === id);
    if (found) found.qty += 1;
    else items.push({ id, qty: 1 });
    Cart.write(items);
    renderDrawer();
  };

  Cart.dec = function (id) {
    const items = Cart.read();
    const found = items.find((x) => x.id === id);
    if (!found) return;
    found.qty -= 1;
    Cart.write(items.filter((x) => x.qty > 0));
    renderDrawer();
  };

  Cart.remove = function (id) {
    Cart.write(Cart.read().filter((x) => x.id !== id));
    renderDrawer();
  };

  Cart.count = function () {
    return Cart.read().reduce((a, b) => a + (b.qty || 0), 0);
  };

  Cart.subtotal = function () {
    return Cart.read().reduce((sum, it) => {
      const p = findProduct(it.id);
      return sum + (p ? p.price * it.qty : 0);
    }, 0);
  };

  Cart.checkoutState = function () {
    try { return JSON.parse(localStorage.getItem(Cart.stateKey) || "{}"); }
    catch { return {}; }
  };

  Cart.setCheckoutState = function (patch) {
    const cur = Cart.checkoutState();
    const next = { ...cur, ...patch };
    localStorage.setItem(Cart.stateKey, JSON.stringify(next));
    return next;
  };

  Cart.fee = function () {
    const st = Cart.checkoutState();
    if ((st.tipo || "entrega") !== "entrega") return 0;
    return Number(st.fee || 0);
  };

  Cart.total = function () {
    return Cart.subtotal() + Cart.fee();
  };

  Cart.syncUI = function () {
    const countEl = $("#cartCount") || $("#cartBadge");
    if (countEl) countEl.textContent = String(Cart.count());

    const totalEl = $("#ctaTotal");
    if (totalEl) totalEl.textContent = money(Cart.total());

    const sticky = $("#stickyCTA");
    if (sticky) sticky.hidden = Cart.count() === 0;

    const wa = $("#waFloat");
    if (wa) {
      // WhatsApp flutuante vira “abrir carrinho” se tiver itens
      wa.href = "#";
      wa.addEventListener("click", (e) => {
        e.preventDefault();
        if (Cart.count() > 0) openCart();
        else toast("Seu carrinho está vazio.");
      }, { once: true });
    }
  };

  // ===================== DISTÂNCIA / TAXA =====================
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
    if (km > CFG.maxKm) return { blocked: true, fee: 0 };
    if (km <= 5) return { blocked: false, fee: CFG.feeUpTo5km };
    return { blocked: false, fee: CFG.fee5to10km };
  }

  function calcFeeByCoords(lat, lon) {
    const km = haversineKm(CFG.baseLat, CFG.baseLon, lat, lon);
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

  // ===================== DRAWER =====================
  const drawer = $("#cartDrawer");
  const backdrop = $("#closeCartBackdrop");
  const closeBtn = $("#closeCart");
  const openBtn = $("#openCart"); // pode não existir no index
  const ctaOpenCart = $("#ctaOpenCart");

  function openCart() {
    if (!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    renderDrawer();
  }

  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function setTipo(tipo) {
    Cart.setCheckoutState({ tipo });

    const bEnt = $("#modeEntrega");
    const bRet = $("#modeRetirar");
    if (bEnt && bRet) {
      bEnt.classList.toggle("active", tipo === "entrega");
      bRet.classList.toggle("active", tipo === "retirar");
    }

    if (tipo !== "entrega") {
      Cart.setCheckoutState({ km: 0, fee: 0, blocked: false });
    }

    renderDrawer();
    Cart.syncUI();
  }

  function renderDrawer() {
    const items = Cart.read();
    const $items = $("#cartItems");
    if (!$items) return;

    if (!items.length) {
      $items.innerHTML = `<div class="muted" style="padding:10px 2px">Seu carrinho está vazio.</div>`;
    } else {
      $items.innerHTML = items.map((it) => {
        const p = findProduct(it.id) || { title: "Item", price: 0 };
        return `
          <div class="citem">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${money(p.price)} • x${it.qty}</div>
              </div>
              <button class="qbtn remove" type="button" onclick="Cart.remove('${it.id}')">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" type="button" onclick="Cart.dec('${it.id}')">-</button>
                <strong>${it.qty}</strong>
                <button class="qbtn" type="button" onclick="Cart.add('${it.id}')">+</button>
              </div>
              <strong>${money(p.price * it.qty)}</strong>
            </div>
          </div>
        `;
      }).join("");
    }

    const sub = Cart.subtotal();
    const fee = Cart.fee();
    const total = sub + fee;

    const subEl = $("#subTotal");
    const feeEl = $("#deliveryFee");
    const totEl = $("#grandTotal");

    if (subEl) subEl.textContent = money(sub);
    if (feeEl) feeEl.textContent = money(fee);
    if (totEl) totEl.textContent = money(total);
  }

  // Limpar carrinho
  $("#clearCart")?.addEventListener("click", () => {
    Cart.write([]);
    Cart.setCheckoutState({ km: 0, fee: 0, blocked: false });
    renderDrawer();
    Cart.syncUI();
    toast("Carrinho limpo.");
  });

  openBtn?.addEventListener("click", openCart);
  ctaOpenCart?.addEventListener("click", openCart);
  backdrop?.addEventListener("click", closeCart);
  closeBtn?.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  $("#modeEntrega")?.addEventListener("click", () => setTipo("entrega"));
  $("#modeRetirar")?.addEventListener("click", () => setTipo("retirar"));

  // ===================== WHATSAPP =====================
  function buildWhatsMessage(extraLines = []) {
    const items = Cart.read();
    const st = Cart.checkoutState();
    const lines = [];

    lines.push(`*Pedido — ${CFG.brand}*`);
    lines.push("");

    if (!items.length) {
      lines.push("(Carrinho vazio)");
      return lines.join("\n");
    }

    lines.push("*Itens:*");
    items.forEach((it) => {
      const p = findProduct(it.id);
      if (!p) return;
      lines.push(`- ${it.qty}x ${p.title} — ${money(p.price * it.qty)}`);
    });

    const sub = Cart.subtotal();
    const fee = Cart.fee();
    const total = sub + fee;

    lines.push("");
    lines.push(`Subtotal: *${money(sub)}*`);
    lines.push(`Taxa: *${money(fee)}*`);
    lines.push(`Total: *${money(total)}*`);
    lines.push("");

    const tipo = st.tipo || "entrega";
    lines.push(`*${tipo === "entrega" ? "Entrega" : "Retirar"}*`);

    extraLines.filter(Boolean).forEach((l) => lines.push(l));

    const obs = (st.obs || "").trim();
    if (obs) {
      lines.push("");
      lines.push(`Obs: ${obs}`);
    }

    return lines.join("\n");
  }

  function openWhats(text) {
    const url = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  // ===================== PIX (EMV + CRC16) =====================
  function crc16(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
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
      emv("00","01") +
      emv("01","12") +
      emv("26", mai) +
      emv("52","0000") +
      emv("53","986") +
      emv("54", amount.toFixed(2)) +
      emv("58","BR") +
      emv("59", name.slice(0,25)) +
      emv("60", city.slice(0,15)) +
      emv("62", emv("05", txid || "PEDIDO"));
    const toCrc = payload + "6304";
    return toCrc + crc16(toCrc);
  }

  // ===================== CHECKOUT OVERLAY =====================
  const overlay = $("#checkoutOverlay");
  function initOverlay() {
    if (!overlay) return;

    const steps = {
      pay: overlay.querySelector('[data-step="pay"]'),
      pix: overlay.querySelector('[data-step="pix"]'),
      addr: overlay.querySelector('[data-step="addr"]'),
    };

    const elTotalPix = $("#ckTotalPix", overlay);
    const elFeePix = $("#ckFeePix", overlay);
    const elPixCode = $("#ckPixCode", overlay);
    const elQr = $("#ckQr", overlay);

    const elKmHint = $("#ckKmHint", overlay);
    const elFeeLine = $("#ckFeeLine", overlay);
    const elKm = $("#ckKm", overlay);
    const elFee = $("#ckFee", overlay);
    const elBlocked = $("#ckBlocked", overlay);

    const inName = $("#ckName", overlay);
    const inPhone = $("#ckPhone", overlay);
    const inAddr = $("#ckAddress", overlay);
    const inCompl = $("#ckCompl", overlay);
    const inObs = $("#ckObs", overlay);

    const inBairro = $("#ckBairro", overlay);
    const dlBairro = $("#ckBairroList", overlay);
    const bairroHint = $("#ckBairroHint", overlay);

    let paymentMethod = null;
    let selectedPlace = null;
    let lastResults = [];
    let tDebounce = null;

    function goStep(name) {
      Object.values(steps).forEach((s) => s && (s.hidden = true));
      if (steps[name]) steps[name].hidden = false;
    }

    function openOverlay() {
      if (Cart.count() === 0) {
        toast("Adicione itens no carrinho antes de finalizar.");
        return;
      }
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      goStep("pay");
      paymentMethod = null;
      selectedPlace = null;

      if (elFeeLine) elFeeLine.hidden = true;
      if (elBlocked) elBlocked.hidden = true;
      if (elKmHint) elKmHint.textContent = "A taxa depende da distância até Maria Teresa (BH).";

      if (inBairro) inBairro.value = "";
      if (bairroHint) bairroHint.textContent = "Digite para ver opções próximas (até 10 km).";
    }

    function closeOverlay() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }

    $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
    $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); });

    // Intercepta TODOS os Finalizar (cards, sticky, drawer)
    const bindFinalizers = () => {
      const nodes = [
        $("#btnFinalizarCards"),
        $("#btnFinalizarSticky"),
        $("#btnFinalizarDrawer"),
      ].filter(Boolean);

      // também pega qualquer link para checkout.html
      document.querySelectorAll('a[href="checkout.html"], a[href="./checkout.html"]').forEach(a => nodes.push(a));

      [...new Set(nodes)].forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          closeCart();
          openOverlay();
        });
      });
    };
    bindFinalizers();

    // ===== Bairros (autocomplete até 10 km) =====
    async function searchBairros(q) {
      const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=jsonv2&addressdetails=1&limit=12&q=${encodeURIComponent(q + " bairro, Belo Horizonte, MG")}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Falha na busca");
      const data = await res.json();

      const list = data
        .map((it) => ({
          label: it.display_name,
          lat: Number(it.lat),
          lon: Number(it.lon),
        }))
        .filter((it) => Number.isFinite(it.lat) && Number.isFinite(it.lon))
        .map((it) => ({ ...it, ...calcFeeByCoords(it.lat, it.lon) }))
        .filter((it) => it.km <= CFG.maxKm)
        .sort((a, b) => a.km - b.km)
        .slice(0, 10);

      return list;
    }

    function fillDatalist(list) {
      if (!dlBairro) return;
      dlBairro.innerHTML = "";
      list.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.label.split(",").slice(0, 3).join(",").trim();
        dlBairro.appendChild(opt);
      });
    }

    function applyFeeUI(res) {
      Cart.setCheckoutState({ km: res.km, fee: res.fee, blocked: !!res.blocked });

      if (elKm) elKm.textContent = `${res.km.toFixed(1)} km`;
      if (elFee) elFee.textContent = money(res.fee);
      if (elFeeLine) elFeeLine.hidden = false;
      if (elBlocked) elBlocked.hidden = !res.blocked;

      if (elKmHint) {
        elKmHint.textContent = res.blocked
          ? "Fora do raio de 10 km. Entrega indisponível."
          : "Taxa calculada pela distância.";
      }

      renderDrawer();
      Cart.syncUI();
    }

    function pickFromInput() {
      if (!inBairro) return;
      const val = inBairro.value.trim().toLowerCase();
      selectedPlace = null;
      if (!val) return;

      const hit = lastResults.find((r) =>
        r.label.toLowerCase().includes(val) ||
        val.includes(r.label.split(",")[0].toLowerCase())
      );

      if (hit) {
        selectedPlace = hit;
        if (bairroHint) bairroHint.textContent = `OK • ${hit.km.toFixed(1)} km • taxa ${money(hit.fee)}`;
        applyFeeUI(hit);
      }
    }

    if (inBairro) {
      inBairro.addEventListener("input", () => {
        const q = inBairro.value.trim();
        selectedPlace = null;
        if (tDebounce) clearTimeout(tDebounce);

        tDebounce = setTimeout(async () => {
          if (q.length < 3) {
            if (bairroHint) bairroHint.textContent = "Digite ao menos 3 letras para sugerir bairros (até 10 km).";
            return;
          }
          try {
            if (bairroHint) bairroHint.textContent = "Buscando bairros próximos...";
            const list = await searchBairros(q);
            lastResults = list;
            fillDatalist(list);
            if (bairroHint) bairroHint.textContent = list.length ? "Escolha um bairro da lista." : "Nenhum bairro (até 10 km).";
            pickFromInput();
          } catch {
            if (bairroHint) bairroHint.textContent = "Não consegui buscar bairros agora. Use GPS.";
          }
        }, 350);
      });

      inBairro.addEventListener("change", pickFromInput);
    }

    $("#ckGetLocation", overlay)?.addEventListener("click", async () => {
      if (elKmHint) elKmHint.textContent = "Calculando distância...";
      if (elFeeLine) elFeeLine.hidden = true;
      if (elBlocked) elBlocked.hidden = true;

      try {
        const res = await calcFeeWithGPS();
        selectedPlace = null;
        applyFeeUI(res);
        if (bairroHint) bairroHint.textContent = "Usando GPS para calcular taxa.";
      } catch {
        if (elKmHint) elKmHint.textContent = "Não consegui acessar o GPS. Escolha um bairro da lista.";
      }
    });

    // ===== PIX =====
    function renderPix() {
      const totalPedido = Cart.subtotal() + Cart.fee();

      if (elTotalPix) elTotalPix.textContent = money(Cart.subtotal());
      if (elFeePix) elFeePix.textContent = money(Cart.fee());

      const code = buildPixPayload({
        key: PIX.key,
        name: PIX.merchantName,
        city: PIX.merchantCity,
        amount: totalPedido,
        txid: PIX.txid,
      });

      if (elPixCode) elPixCode.value = code;

      if (elQr) {
        elQr.innerHTML = "";
        if (typeof window.QRCode === "undefined") {
          elQr.textContent = "QR Code não carregou.";
        } else {
          const canvas = document.createElement("canvas");
          elQr.appendChild(canvas);
          QRCode.toCanvas(canvas, code, { margin: 1, scale: 6 }, (err) => {
            if (err) elQr.textContent = "Erro ao gerar QR.";
          });
        }
      }
    }

    // ===== Escolha pagamento =====
    overlay.querySelectorAll("[data-pay]").forEach((b) => {
      b.addEventListener("click", () => {
        paymentMethod = b.getAttribute("data-pay"); // pix|credit|debit
        Cart.setCheckoutState({ payMethod: paymentMethod });

        // PIX: vai direto pro PIX (sem endereço)
        if (paymentMethod === "pix") {
          goStep("pix");
          renderPix();
          return;
        }

        // Crédito/Débito: endereço
        goStep("addr");
      });
    });

    $("#ckBackFromPix", overlay)?.addEventListener("click", () => goStep("pay"));
    $("#ckBackFromAddr", overlay)?.addEventListener("click", () => goStep("pay"));

    $("#ckCopyPix", overlay)?.addEventListener("click", async () => {
      const val = (elPixCode?.value || "").trim();
      if (!val) return;
      try {
        await navigator.clipboard.writeText(val);
        const btn = $("#ckCopyPix", overlay);
        if (btn) {
          btn.textContent = "Copiado ✅";
          setTimeout(() => (btn.textContent = "Copiar código PIX"), 1200);
        }
      } catch {
        elPixCode?.select?.();
        document.execCommand("copy");
      }
    });

    // PIX: confirmou pagamento -> libera WhatsApp
    $("#ckPaidPix", overlay)?.addEventListener("click", () => {
      Cart.setCheckoutState({ tipo: Cart.checkoutState().tipo || "entrega" });
      const msg = buildWhatsMessage([`Pagamento: *PIX*`, `✅ PIX confirmado pelo cliente.`]);
      closeOverlay();
      openWhats(msg);
    });

    // Crédito/Débito: confirmar -> valida e manda WhatsApp
    $("#ckConfirmOrder", overlay)?.addEventListener("click", () => {
      const stTipo = Cart.checkoutState().tipo || "entrega";

      const name = (inName?.value || "").trim();
      const phone = (inPhone?.value || "").trim();
      const bairro = (inBairro?.value || "").trim();
      const address = (inAddr?.value || "").trim();
      const compl = (inCompl?.value || "").trim();
      const obs = (inObs?.value || "").trim();

      if (!name || !phone) {
        toast("Preencha Nome e Telefone.");
        return;
      }

      // Para entrega: exige bairro + endereço + taxa calculada
      if (stTipo === "entrega") {
        if (!bairro || bairro.length < 3) {
          toast("Digite e selecione um bairro (até 10 km).");
          return;
        }
        if (!address || address.length < 6) {
          toast("Preencha o endereço completo.");
          return;
        }

        // se selecionou um bairro sugerido, aplica taxa
        if (selectedPlace?.lat && selectedPlace?.lon) applyFeeUI(selectedPlace);

        const st2 = Cart.checkoutState();
        if (st2.km == null) {
          toast("Selecione um bairro da lista ou use o GPS para calcular a taxa.");
          return;
        }
        if (Number(st2.km) > CFG.maxKm || st2.blocked) {
          toast("Fora do raio de 10 km. Entrega indisponível.");
          return;
        }
      } else {
        // retirar: zera taxa
        Cart.setCheckoutState({ km: 0, fee: 0, blocked: false });
      }

      Cart.setCheckoutState({
        nome: name,
        telefone: phone,
        bairro,
        endereco: address,
        compl,
        obs,
      });

      const methodLabel = paymentMethod === "credit" ? "Crédito" : "Débito";

      const extra = [
        `Pagamento: *${methodLabel}*`,
        `Nome: ${name}`,
        `Telefone: ${phone}`,
        stTipo === "entrega" ? `Bairro: ${bairro}` : "Retirar no local",
        stTipo === "entrega" ? `Endereço: ${address}` : null,
        compl ? `Compl: ${compl}` : null,
      ];

      closeOverlay();
      openWhats(buildWhatsMessage(extra));
    });

    // expõe para outros binds se precisar
    window.__LP_OPEN_CHECKOUT__ = openOverlay;
  }

  // ===================== INIT =====================
  document.addEventListener("DOMContentLoaded", () => {
    // tipo inicial (entrega)
    const st = Cart.checkoutState();
    setTipo(st.tipo || "entrega");

    Cart.syncUI();
    renderDrawer();
    initOverlay();
  });
})();
