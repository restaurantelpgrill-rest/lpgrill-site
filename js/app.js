(function(){
  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531999999999", // TROQUE AQUI
    deliveryFee: 5.00,
    eta: "30–60 min"
  };

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const $ = (s)=> document.querySelector(s);

  const CART_KEY = "LPGRILL_CART_V3";
  const MODE_KEY = "LPGRILL_MODE_V3"; // entrega|retirar

  const readCart = ()=> { try{return JSON.parse(localStorage.getItem(CART_KEY)||"{}")}catch{return {}}; };
  const writeCart = (m)=> localStorage.setItem(CART_KEY, JSON.stringify(m));
  const readMode = ()=> (localStorage.getItem(MODE_KEY) || "entrega");
  const writeMode = (v)=> localStorage.setItem(MODE_KEY, v);

  function allProducts(){
    const list = [];
    if(window.DATA){
      for(const k in window.DATA){
        if(Array.isArray(window.DATA[k])) list.push(...window.DATA[k]);
      }
    }
    return list;
  }
  function findProduct(id){ return allProducts().find(p=>p.id===id); }

  function qty(id){ const m=readCart(); return Number(m[id]||0); }
  function count(){ const m=readCart(); return Object.values(m).reduce((a,b)=>a+(b||0),0); }
  function subtotal(){
    const m=readCart(); let sum=0;
    for(const [id,q] of Object.entries(m)){ const p=findProduct(id); if(p) sum += p.price*q; }
    return sum;
  }
  function fee(){ return readMode()==="entrega" ? Number(CFG.deliveryFee||0) : 0; }
  function total(){ return subtotal()+fee(); }

  function add(id){ const m=readCart(); m[id]=Number(m[id]||0)+1; writeCart(m); syncUI(); }
  function dec(id){ const m=readCart(); m[id]=Number(m[id]||0)-1; if(m[id]<=0) delete m[id]; writeCart(m); syncUI(); }
  function remove(id){ const m=readCart(); delete m[id]; writeCart(m); syncUI(); }
  function clear(){ writeCart({}); syncUI(); }

  function openDrawer(){
    const d=$("#cartDrawer"); if(!d) return;
    d.classList.add("open"); d.setAttribute("aria-hidden","false");
    renderDrawer();
  }
  function closeDrawer(){
    const d=$("#cartDrawer"); if(!d) return;
    d.classList.remove("open"); d.setAttribute("aria-hidden","true");
  }

  function productCard(p){
    return `
      <article class="product" data-tap="${p.id}">
        <img class="pimg" src="${p.img}" alt="${p.title}" onerror="this.style.display='none'">
        <div class="pbody">
          <div class="ptitle">
            <strong>${p.title}</strong>
            <span class="price">${money(p.price)}</span>
          </div>
          <div class="pdesc">${p.desc||""}</div>
          <div class="pmeta">
            <span class="badge">${p.tag||"LP Grill"}</span>
            <div class="qty">
              <button class="qbtn" data-dec="${p.id}" type="button">-</button>
              <strong data-qty-for="${p.id}">0</strong>
              <button class="qbtn" data-add="${p.id}" type="button">+</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  window.renderCategory = function(key, listId){
    const list=document.getElementById(listId);
    if(!list) return;
    const items=(window.DATA && window.DATA[key]) ? window.DATA[key] : [];
    list.innerHTML = items.map(productCard).join("");

    list.querySelectorAll("[data-add]").forEach(b=>{
      b.addEventListener("click",(e)=>{ e.stopPropagation(); add(b.getAttribute("data-add")); });
    });
    list.querySelectorAll("[data-dec]").forEach(b=>{
      b.addEventListener("click",(e)=>{ e.stopPropagation(); dec(b.getAttribute("data-dec")); });
    });
    list.querySelectorAll("[data-tap]").forEach(card=>{
      card.addEventListener("click",(e)=>{
        if(e.target.closest("button")) return;
        add(card.getAttribute("data-tap"));
      });
    });

    syncUI();
  };

  function renderDrawer(){
    const wrap=$("#cartItems"); if(!wrap) return;
    const m=readCart();
    const entries=Object.entries(m).filter(([,q])=>q>0);

    if(!entries.length){
      wrap.innerHTML = `<div class="muted">Seu carrinho está vazio.</div>`;
    }else{
      wrap.innerHTML = entries.map(([id,q])=>{
        const p=findProduct(id); if(!p) return "";
        return `
          <div class="citem">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${money(p.price)} cada</div>
              </div>
              <button class="qbtn remove" data-rm="${id}" type="button">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" data-d="${id}" type="button">-</button>
                <strong data-qty-for="${id}">${q}</strong>
                <button class="qbtn" data-a="${id}" type="button">+</button>
              </div>
              <strong>${money(p.price*q)}</strong>
            </div>
          </div>
        `;
      }).join("");

      wrap.querySelectorAll("[data-a]").forEach(b=> b.addEventListener("click",()=>{ add(b.getAttribute("data-a")); renderDrawer(); }));
      wrap.querySelectorAll("[data-d]").forEach(b=> b.addEventListener("click",()=>{ dec(b.getAttribute("data-d")); renderDrawer(); }));
      wrap.querySelectorAll("[data-rm]").forEach(b=> b.addEventListener("click",()=>{ remove(b.getAttribute("data-rm")); renderDrawer(); }));
    }

    $("#subTotal") && ($("#subTotal").textContent = money(subtotal()));
    $("#deliveryFee") && ($("#deliveryFee").textContent = money(fee()));
    $("#grandTotal") && ($("#grandTotal").textContent = money(total()));
    $("#etaText") && ($("#etaText").textContent = CFG.eta);
  }

  function syncUI(){
    document.querySelectorAll("[data-qty-for]").forEach(el=>{
      const id=el.getAttribute("data-qty-for");
      el.textContent = String(qty(id));
    });

    $("#cartCount") && ($("#cartCount").textContent = String(count()));

    const sticky=$("#stickyCTA");
    $("#ctaTotal") && ($("#ctaTotal").textContent = money(total()));
    sticky && (sticky.hidden = count()===0);

    if($("#cartDrawer")?.classList.contains("open")) renderDrawer();
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    $("#waFloat") && ($("#waFloat").href =
      `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent("Olá! Quero fazer um pedido no "+CFG.brand+" 🍽️")}`
    );

    $("#openCart")?.addEventListener("click", openDrawer);
    $("#ctaOpenCart")?.addEventListener("click", openDrawer);
    $("#closeCart")?.addEventListener("click", closeDrawer);
    $("#closeCartBackdrop")?.addEventListener("click", closeDrawer);

    const btnE=$("#modeEntrega");
    const btnR=$("#modeRetirar");
    const applyMode=()=>{
      const mode=readMode();
      btnE?.classList.toggle("active", mode==="entrega");
      btnR?.classList.toggle("active", mode==="retirar");
      syncUI();
    };
    btnE?.addEventListener("click", ()=>{ writeMode("entrega"); applyMode(); });
    btnR?.addEventListener("click", ()=>{ writeMode("retirar"); applyMode(); });
    applyMode();

    $("#clearCart")?.addEventListener("click", ()=>{ clear(); renderDrawer(); });

    const info=$("#infoBar");
    if(info){
      info.classList.add("subinfo");
      info.innerHTML = `
        <div class="pill">🚚 <strong>Taxa:</strong> ${money(CFG.deliveryFee)}</div>
        <div class="pill">⏱️ <strong>Tempo:</strong> ${CFG.eta}</div>
      `;
    }

    syncUI();
  });

})();
/* ===== Checkout/Pagamento (plugin) — não altera sua home ===== */
(() => {
  const CONFIG = {
    // 1) Ajuste AQUI: botão do seu site que abre o checkout (ex: "#btnFinalizar" ou ".finalizar")
    openCheckoutSelector: "#btnFinalizarPedido",  // <-- TROQUE

    // WhatsApp
    whatsapp: "5531998064556",

    // PIX (chave copia e cola) — TROQUE para sua chave real:
    pixKey: "SEU_PIX_COPIA_E_COLA_OU_CHAVE_AQUI",

    // Dados PIX (usado no payload)
    merchantName: "SUA LOJA",
    merchantCity: "BELO HORIZONTE",
    txid: "PEDIDO",

    // Base Maria Teresa - BH
    baseLat: -19.8850878,
    baseLon: -43.9877612,

    // Regras taxa
    feeUpTo5km: 5,
    fee5to10km: 8,
    maxKm: 10
  };

  const money = (v) => (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const $ = (s, root=document) => root.querySelector(s);

  // ======= INTEGRAÇÃO com seu carrinho =======
  // Ajuste estas duas funções para ler o carrinho do SEU site sem mudar layout.
  function getCartTotal() {
    // Tenta achar um elemento comum de total (troque se precisar)
    const el = $("#total, #cartTotal, .cart-total, [data-cart-total]");
    if (el) {
      const txt = (el.textContent || "").replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",",".");
      const val = Number(txt);
      if (!isNaN(val)) return val;
    }

    // Fallback: você pode manter um total global no seu projeto:
    if (typeof window.CART_TOTAL === "number") return window.CART_TOTAL;

    // Se não achar, não quebra:
    return 0;
  }

  function getCartTextForWhatsApp(extraLines = []) {
    // Se você já monta o pedido em texto em algum lugar, retorne aqui.
    // Fallback: pega um resumo simples do DOM do carrinho (se existir).
    const lines = [];
    const items = document.querySelectorAll(".cart-item, .item-carrinho, [data-cart-item]");
    if (items.length) {
      items.forEach((it) => {
        const t = (it.textContent || "").trim().replace(/\s+/g," ");
        if (t) lines.push("• " + t);
      });
    } else {
      lines.push("• Pedido pelo site");
    }
    extraLines.forEach(l => lines.push(l));
    lines.push(`Total: ${money(getCartTotal())}`);
    return lines.join("\n");
  }

  // ======= Overlay / Steps =======
  const overlay = $("#checkoutOverlay");
  if (!overlay) return;

  const steps = {
    pay: overlay.querySelector('[data-step="pay"]'),
    pix: overlay.querySelector('[data-step="pix"]'),
    addr: overlay.querySelector('[data-step="addr"]')
  };

  const elTotalPix = $("#ckTotalPix", overlay);
  const elFeePix   = $("#ckFeePix", overlay);
  const elPixCode  = $("#ckPixCode", overlay);
  const elQr       = $("#ckQr", overlay);

  const elKmHint   = $("#ckKmHint", overlay);
  const elFeeLine  = $("#ckFeeLine", overlay);
  const elKm       = $("#ckKm", overlay);
  const elFee      = $("#ckFee", overlay);
  const elBlocked  = $("#ckBlocked", overlay);

  let paymentMethod = null;
  let lastKm = null;
  let lastFee = 0;

  function openOverlay() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    goStep("pay");
    paymentMethod = null;
    lastKm = null;
    lastFee = 0;
    elFeeLine.hidden = true;
    elBlocked.hidden = true;
  }

  function closeOverlay() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function goStep(name) {
    Object.values(steps).forEach(s => s.hidden = true);
    steps[name].hidden = false;
  }

  // ======= PIX payload (EMV) com CRC16 =======
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
    // Merchant Account Information (GUI + chave)
    const mai = emv("00", "BR.GOV.BCB.PIX") + emv("01", key) + (txid ? emv("02", txid) : "");
    const payload =
      emv("00", "01") +                 // Payload Format Indicator
      emv("01", "12") +                 // Point of Initiation Method (12 = dynamic-ish; ok p/ uso)
      emv("26", mai) +                  // Merchant Account Info
      emv("52", "0000") +               // MCC
      emv("53", "986") +                // Currency BRL
      emv("54", amount.toFixed(2)) +    // Amount
      emv("58", "BR") +                 // Country
      emv("59", name.slice(0,25)) +     // Merchant Name
      emv("60", city.slice(0,15)) +     // Merchant City
      emv("62", emv("05", txid || "PEDIDO")); // Additional Data Field Template (TXID)
    const toCrc = payload + "6304";
    return toCrc + crc16(toCrc);
  }

  function renderPix(total, fee) {
    const grandTotal = total + fee;

    elTotalPix.textContent = money(total);
    elFeePix.textContent = money(fee);

    // Se você quiser usar chave PIX simples em vez de payload EMV, dá pra colocar direto.
    // Aqui eu gero o "copia e cola" EMV (padrão de QR).
    const code = buildPixPayload({
      key: CONFIG.pixKey,
      name: CONFIG.merchantName,
      city: CONFIG.merchantCity,
      amount: grandTotal,
      txid: CONFIG.txid
    });

    elPixCode.value = code;

    // QR dentro do quadrado
    elQr.innerHTML = "";
    if (window.QRCode) {
      QRCode.toCanvas(code, { width: 220, margin: 1 }, (err, canvas) => {
        if (!err && canvas) elQr.appendChild(canvas);
        else elQr.textContent = "Não foi possível gerar o QR.";
      });
    } else {
      elQr.textContent = "Carregando QR...";
    }
  }

  // ======= Distância (GPS) =======
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a =
      Math.sin(dLat/2)**2 +
      Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function feeByKm(km) {
    if (km > CONFIG.maxKm) return { blocked: true, fee: 0 };
    if (km <= 5) return { blocked: false, fee: CONFIG.feeUpTo5km };
    return { blocked: false, fee: CONFIG.fee5to10km };
  }

  async function calcFeeWithGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS não suportado."));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const km = haversineKm(CONFIG.baseLat, CONFIG.baseLon, latitude, longitude);
          const rule = feeByKm(km);
          resolve({ km, ...rule });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  // ======= WhatsApp =======
  function openWhatsApp(message) {
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  // ======= Botão do seu site que abre checkout =======
  function bindOpenButton() {
    const btn = document.querySelector(CONFIG.openCheckoutSelector);
    if (!btn) {
      // Se não achou, não quebra; você só troca o selector no CONFIG.
      console.warn("Checkout: botão abrir não encontrado. Ajuste CONFIG.openCheckoutSelector");
      return;
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openOverlay();
    });
  }

  // ======= Eventos internos =======
  $("#ckClose", overlay).addEventListener("click", closeOverlay);
  $("#ckCancel", overlay).addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  // Escolher pagamento
  overlay.querySelectorAll("[data-pay]").forEach((b) => {
    b.addEventListener("click", async () => {
      paymentMethod = b.getAttribute("data-pay");

      if (paymentMethod === "pix") {
        goStep("pix");

        // No PIX, você pediu “trava”: não segue endereço.
        // Antes de gerar, tenta calcular taxa por GPS (se o cliente negar, fica taxa 0 e você pode pedir manualmente depois)
        let fee = 0;
        try {
          const res = await calcFeeWithGPS();
          lastKm = res.km;
          lastFee = res.blocked ? 0 : res.fee;
          if (res.blocked) {
            // bloqueia
            elQr.innerHTML = "";
            elPixCode.value = "";
            elTotalPix.textContent = money(getCartTotal());
            elFeePix.textContent = money(0);
            overlay.querySelector(".ck-warn").innerHTML =
              "<strong>Entrega indisponível:</strong> você está fora do raio de 10 km do bairro Maria Teresa (BH).";
            return;
          }
          fee = lastFee;
        } catch (_) {
          // Se negar GPS: gera PIX sem taxa (ou você pode decidir cobrar 8 como padrão)
          fee = 0;
          lastFee = 0;
        }

        renderPix(getCartTotal(), fee);
      }

      if (paymentMethod === "credit" || paymentMethod === "debit") {
        goStep("addr");
      }
    });
  });

  // PIX: copiar
  $("#ckCopyPix", overlay).addEventListener("click", async () => {
    const val = elPixCode.value.trim();
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      $("#ckCopyPix", overlay).textContent = "Copiado ✅";
      setTimeout(() => ($("#ckCopyPix", overlay).textContent = "Copiar código PIX"), 1400);
    } catch {
      elPixCode.select();
      document.execCommand("copy");
    }
  });

  $("#ckBackFromPix", overlay).addEventListener("click", () => goStep("pay"));

  // PIX: já paguei → abre WhatsApp com pedido + aviso de comprovante
  $("#ckPaidPix", overlay).addEventListener("click", () => {
    const total = getCartTotal();
    const fee = Number(lastFee || 0);
    const grand = total + fee;

    const msg =
      "✅ *PAGAMENTO PIX REALIZADO*\n" +
      "Vou enviar o comprovante agora para liberar o pedido.\n\n" +
      getCartTextForWhatsApp([
        `Forma de pagamento: PIX`,
        `Taxa de entrega: ${money(fee)}`,
        `Total com taxa: ${money(grand)}`
      ]);

    openWhatsApp(msg);
  });

  // Endereço: GPS taxa
  $("#ckGetLocation", overlay).addEventListener("click", async () => {
    elKmHint.textContent = "Calculando distância...";
    elFeeLine.hidden = true;
    elBlocked.hidden = true;

    try {
      const { km, fee, blocked } = await calcFeeWithGPS();
      lastKm = km;
      lastFee = fee;

      elKm.textContent = `${km.toFixed(1)} km`;
      elFee.textContent = money(fee);
      elFeeLine.hidden = false;

      if (blocked) {
        elBlocked.hidden = false;
      } else {
        elBlocked.hidden = true;
      }
      elKmHint.textContent = "Taxa calculada pela distância (GPS).";
    } catch {
      elKmHint.textContent = "Não consegui acessar o GPS. Ative a localização do navegador para calcular a taxa.";
    }
  });

  $("#ckBackFromAddr", overlay).addEventListener("click", () => goStep("pay"));

  // Confirmar (crédito/débito) → valida raio e manda WhatsApp
  $("#ckConfirmOrder", overlay).addEventListener("click", () => {
    const name = $("#ckName", overlay).value.trim();
    const phone = $("#ckPhone", overlay).value.trim();
    const addr = $("#ckAddress", overlay).value.trim();
    const compl = $("#ckCompl", overlay).value.trim();
    const obs = $("#ckObs", overlay).value.trim();

    if (!name || !phone || !addr) {
      alert("Preencha Nome, Telefone e Endereço.");
      return;
    }

    // Se não calculou taxa ainda, tenta bloquear “por segurança”
    if (lastKm == null) {
      alert("Toque em “Usar minha localização (GPS)” para calcular a taxa de entrega.");
      return;
    }
    if (lastKm > CONFIG.maxKm) {
      alert("Fora do raio de 10 km do bairro Maria Teresa (BH). Entrega indisponível.");
      return;
    }

    const methodLabel = paymentMethod === "credit" ? "Crédito" : "Débito";
    const total = getCartTotal();
    const fee = Number(lastFee || 0);
    const grand = total + fee;

    const msg =
      "🛒 *NOVO PEDIDO*\n\n" +
      getCartTextForWhatsApp([
        `Forma de pagamento: ${methodLabel}`,
        `Distância: ${lastKm.toFixed(1)} km`,
        `Taxa de entrega: ${money(fee)}`,
        `Total com taxa: ${money(grand)}`,
        "",
        "*DADOS DO CLIENTE*",
        `Nome: ${name}`,
        `Telefone: ${phone}`,
        `Endereço: ${addr}`,
        compl ? `Complemento: ${compl}` : null,
        obs ? `Obs: ${obs}` : null
      ].filter(Boolean));

    openWhatsApp(msg);
  });

  // Start
  bindOpenButton();
})();
