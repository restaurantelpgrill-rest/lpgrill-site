(function(){
  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531998064556", // ✅ WhatsApp real
    deliveryFee: 5.00,        // (infoBar apenas — a taxa real por km é calculada no checkout)
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

/* ===== LP GRILL — Checkout Overlay (único, sem duplicar) ===== */
(() => {
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
    maxKm: 10
  };

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const $ = (s, r=document)=> r.querySelector(s);

  function parseBRL(text){
    if(!text) return 0;
    const n = String(text)
      .replace(/\s/g,"")
      .replace("R$","")
      .replace(/\./g,"")
      .replace(",",".")
      .replace(/[^\d.]/g,"");
    return Number(n||0);
  }
  function getCartTotal(){
    const gt = $("#grandTotal");
    if(gt){
      const v = parseBRL(gt.textContent);
      if(v > 0) return v;
    }
    const ct = $("#ctaTotal");
    if(ct){
      const v = parseBRL(ct.textContent);
      if(v > 0) return v;
    }
    return 0;
  }

  function isRetirarMode(){
    const btnR = $("#modeRetirar");
    const btnE = $("#modeEntrega");
    if(btnR?.classList.contains("active")) return true;
    if(btnE?.classList.contains("active")) return false;
    if(btnR?.getAttribute("aria-pressed") === "true") return true;
    return false;
  }

  const overlay = $("#checkoutOverlay");
  if(!overlay) return;

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

  function goStep(name){
    Object.values(steps).forEach(s => s.hidden = true);
    steps[name].hidden = false;
  }
  function openOverlay(){
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden","false");
    goStep("pay");
    paymentMethod = null;
    lastKm = null;
    lastFee = 0;
    elFeeLine.hidden = true;
    elBlocked.hidden = true;
    elKmHint.textContent = "A taxa depende da distância até Maria Teresa (BH).";
  }
  function closeOverlay(){
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden","true");
  }

  $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
  $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);
  $("#ckBackFromPix", overlay)?.addEventListener("click", ()=> goStep("pay"));
  $("#ckBackFromAddr", overlay)?.addEventListener("click", ()=> goStep("pay"));
  overlay.addEventListener("click", (e)=>{ if(e.target === overlay) closeOverlay(); });

  function interceptCheckoutLinks(){
    const selectors = [
      'a.tile.highlight[href="checkout.html"]',
      '.drawer-actions a.btn.primary[href="checkout.html"]',
      '.sticky-cta a.cta.primary[href="checkout.html"]'
    ];
    document.querySelectorAll(selectors.join(",")).forEach(a => {
      a.addEventListener("click", (e)=>{
        e.preventDefault();
        openOverlay();
      });
    });
  }

  function haversineKm(lat1, lon1, lat2, lon2){
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a =
      Math.sin(dLat/2)**2 +
      Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
      Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function feeByKm(km){
    if(km > CONFIG.maxKm) return { blocked:true, fee:0 };
    if(km <= 5) return { blocked:false, fee: CONFIG.feeUpTo5km };
    return { blocked:false, fee: CONFIG.fee5to10km };
  }
  function calcFeeWithGPS(){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject(new Error("GPS não suportado."));
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          const { latitude, longitude } = pos.coords;
          const km = haversineKm(CONFIG.baseLat, CONFIG.baseLon, latitude, longitude);
          const rule = feeByKm(km);
          resolve({ km, ...rule });
        },
        reject,
        { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
      );
    });
  }

  function crc16(payload){
    let crc = 0xFFFF;
    for(let i=0;i<payload.length;i++){
      crc ^= payload.charCodeAt(i) << 8;
      for(let j=0;j<8;j++){
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4,"0");
  }
  function emv(id, value){
    const len = String(value.length).padStart(2,"0");
    return `${id}${len}${value}`;
  }
  function buildPixPayload({key, name, city, amount, txid}){
    const mai = emv("00","BR.GOV.BCB.PIX") + emv("01", key) + (txid ? emv("02", txid) : "");
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

  function renderPix(total, fee){
    const grand = total + fee;
    elTotalPix.textContent = money(total);
    elFeePix.textContent = money(fee);

    const code = buildPixPayload({
      key: CONFIG.pixKey,
      name: CONFIG.merchantName,
      city: CONFIG.merchantCity,
      amount: grand,
      txid: CONFIG.txid
    });

    elPixCode.value = code;
    elQr.innerHTML = "";

    if(typeof QRCode === "undefined"){
      elQr.textContent = "QR Code não carregou.";
      return;
    }
    QRCode.toCanvas(code, { width: 220, margin: 1 }, (err, canvas)=>{
      if(err || !canvas){
        elQr.textContent = "Erro ao gerar QR.";
        return;
      }
      elQr.appendChild(canvas);
    });
  }

  function openWhatsApp(msg){
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  overlay.querySelectorAll("[data-pay]").forEach((b)=>{
    b.addEventListener("click", async ()=>{
      paymentMethod = b.getAttribute("data-pay");

      if(paymentMethod === "pix"){
        goStep("pix");

        const total = getCartTotal();
        if(total <= 0){
          elQr.innerHTML = "";
          elPixCode.value = "";
          elTotalPix.textContent = money(0);
          elFeePix.textContent = money(0);
          overlay.querySelector(".ck-warn").innerHTML =
            "<strong>Carrinho vazio.</strong> Adicione itens para gerar o Pix.";
          return;
        }

        if(isRetirarMode()){
          lastKm = 0;
          lastFee = 0;
          overlay.querySelector(".ck-warn").innerHTML =
            "<strong>Retirada no local:</strong> após pagar via PIX, envie o comprovante no WhatsApp para liberarmos seu pedido imediatamente.";
          renderPix(total, 0);
          return;
        }

        try{
          const res = await calcFeeWithGPS();
          lastKm = res.km;
          lastFee = res.blocked ? 0 : res.fee;

          if(res.blocked){
            elQr.innerHTML = "";
            elPixCode.value = "";
            overlay.querySelector(".ck-warn").innerHTML =
              "<strong>Entrega indisponível:</strong> você está fora do raio de 10 km do bairro Maria Teresa (BH).";
            elTotalPix.textContent = money(total);
            elFeePix.textContent = money(0);
            return;
          }

          overlay.querySelector(".ck-warn").innerHTML =
            "<strong>Depois de pagar via PIX,</strong> envie o comprovante no WhatsApp para <strong>liberarmos seu pedido imediatamente</strong>.";

          renderPix(total, lastFee);
        } catch {
          elQr.innerHTML = "";
          elPixCode.value = "";
          overlay.querySelector(".ck-warn").innerHTML =
            "<strong>Ative a localização (GPS)</strong> para calcular a taxa de entrega corretamente e gerar o PIX.";
          elTotalPix.textContent = money(total);
          elFeePix.textContent = money(0);
        }
        return;
      }

      if(paymentMethod === "credit" || paymentMethod === "debit"){
        goStep("addr");
      }
    });
  });

  $("#ckCopyPix", overlay)?.addEventListener("click", async ()=>{
    const val = elPixCode.value.trim();
    if(!val) return;
    try{
      await navigator.clipboard.writeText(val);
      $("#ckCopyPix", overlay).textContent = "Copiado ✅";
      setTimeout(()=> $("#ckCopyPix", overlay).textContent = "Copiar código PIX", 1200);
    } catch {
      elPixCode.select();
      document.execCommand("copy");
    }
  });

  $("#ckPaidPix", overlay)?.addEventListener("click", ()=>{
    const total = getCartTotal();
    const fee = Number(lastFee || 0);
    const grand = total + fee;

    const msg =
      "✅ *PAGAMENTO PIX REALIZADO*\n" +
      "Estou enviando o comprovante para liberar o pedido.\n\n" +
      `Forma de pagamento: PIX\n` +
      `Taxa de entrega: ${money(fee)}\n` +
      `Total com taxa: ${money(grand)}\n\n` +
      "📎 Comprovante: (anexar aqui)\n";

    openWhatsApp(msg);
  });

  $("#ckGetLocation", overlay)?.addEventListener("click", async ()=>{
    elKmHint.textContent = "Calculando distância...";
    elFeeLine.hidden = true;
    elBlocked.hidden = true;

    try{
      const { km, fee, blocked } = await calcFeeWithGPS();
      lastKm = km;
      lastFee = fee;

      elKm.textContent = `${km.toFixed(1)} km`;
      elFee.textContent = money(fee);
      elFeeLine.hidden = false;

      elBlocked.hidden = !blocked;
      elKmHint.textContent = "Taxa calculada pela distância (GPS).";
    } catch {
      elKmHint.textContent = "Não consegui acessar o GPS. Ative a localização para calcular a taxa.";
    }
  });

  $("#ckConfirmOrder", overlay)?.addEventListener("click", ()=>{
    const name = $("#ckName", overlay).value.trim();
    const phone = $("#ckPhone", overlay).value.trim();
    const addr = $("#ckAddress", overlay).value.trim();
    const compl = $("#ckCompl", overlay).value.trim();
    const obs = $("#ckObs", overlay).value.trim();

    if(!name || !phone || !addr){
      alert("Preencha Nome, Telefone e Endereço.");
      return;
    }

    if(!isRetirarMode()){
      if(lastKm == null){
        alert("Toque em “Usar minha localização (GPS)” para calcular a taxa de entrega.");
        return;
      }
      if(lastKm > CONFIG.maxKm){
        alert("Fora do raio de 10 km do bairro Maria Teresa (BH). Entrega indisponível.");
        return;
      }
    } else {
      lastKm = 0;
      lastFee = 0;
    }

    const methodLabel = paymentMethod === "credit" ? "Crédito" : "Débito";
    const total = getCartTotal();
    const fee = Number(lastFee || 0);
    const grand = total + fee;

    const msg = [
      "🛒 *NOVO PEDIDO — LP GRILL*",
      "",
      `Forma de pagamento: ${methodLabel}`,
      isRetirarMode() ? "Modo: Retirar no local" : `Distância: ${lastKm.toFixed(1)} km`,
      `Taxa de entrega: ${money(fee)}`,
      `Total com taxa: ${money(grand)}`,
      "",
      "*DADOS DO CLIENTE*",
      `Nome: ${name}`,
      `Telefone: ${phone}`,
      `Endereço: ${addr}`,
      compl ? `Complemento: ${compl}` : null,
      obs ? `Obs: ${obs}` : null
    ].filter(Boolean).join("\n");

    openWhatsApp(msg);
  });

  interceptCheckoutLinks();
})();
