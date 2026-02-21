// js/app.js — LP Grill (produtos via window.DATA + carrinho + Checkout Overlay PIX/Cartão)
// Mantém layout / não mexe nos cards; só adiciona overlay e taxa por distância.
(function(){
  // ===== Config =====
  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531998064556", // ✅ correto
    // Base Maria Teresa BH
    baseLat: -19.8850878,
    baseLon: -43.9877612,
    feeUpTo5km: 5.00,
    fee5to10km: 8.00,
    maxKm: 10
  };

  // ===== Utils =====
  window.money = window.money || function(v){
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  };

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

  function allProducts(){
    const list = [];
    if(window.DATA){
      for(const k in window.DATA){
        if(Array.isArray(window.DATA[k])) list.push(...window.DATA[k]);
      }
    }
    return list;
  }

  function findProduct(id){
    return allProducts().find(p => p.id === id);
  }

  // ===== Cart (localStorage) =====
  const Cart = window.Cart || {};
  window.Cart = Cart;

  Cart.key = "LPGRILL_CART";
  Cart.stateKey = "LPGRILL_CHECKOUT";

  Cart.read = function(){
    try{ return JSON.parse(localStorage.getItem(Cart.key) || "[]"); }
    catch(e){ return []; }
  };

  Cart.write = function(items){
    localStorage.setItem(Cart.key, JSON.stringify(items));
    Cart.syncUI();
  };

  Cart.add = function(id){
    const items = Cart.read();
    const found = items.find(x => x.id === id);
    if(found) found.qty += 1;
    else items.push({id, qty:1});
    Cart.write(items);
  };

  Cart.dec = function(id){
    const items = Cart.read();
    const found = items.find(x => x.id === id);
    if(!found) return;
    found.qty -= 1;
    const next = items.filter(x => x.qty > 0);
    Cart.write(next);
  };

  Cart.remove = function(id){
    Cart.write(Cart.read().filter(x => x.id !== id));
  };

  Cart.count = function(){
    return Cart.read().reduce((a,b)=> a + (b.qty||0), 0);
  };

  Cart.subtotal = function(){
    return Cart.read().reduce((sum, it)=>{
      const p = findProduct(it.id);
      return sum + (p ? (p.price*it.qty) : 0);
    },0);
  };

  Cart.checkoutState = function(){
    try{
      return JSON.parse(localStorage.getItem(Cart.stateKey) || "{}");
    }catch(e){ return {}; }
  };

  Cart.setCheckoutState = function(patch){
    const cur = Cart.checkoutState();
    const next = {...cur, ...patch};
    localStorage.setItem(Cart.stateKey, JSON.stringify(next));
    return next;
  };

  // ===== Distância / taxa =====
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
    if(km > CFG.maxKm) return { blocked:true, fee:0 };
    if(km <= 5) return { blocked:false, fee: CFG.feeUpTo5km };
    return { blocked:false, fee: CFG.fee5to10km };
  }

  function calcFeeByCoords(lat, lon){
    const km = haversineKm(CFG.baseLat, CFG.baseLon, lat, lon);
    const rule = feeByKm(km);
    return { km, ...rule };
  }

  function calcFeeWithGPS(){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject(new Error("GPS não suportado."));
      navigator.geolocation.getCurrentPosition(
        (pos)=> resolve(calcFeeByCoords(pos.coords.latitude, pos.coords.longitude)),
        reject,
        { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
      );
    });
  }

  // ===== Totais =====
  Cart.fee = function(){
    const st = Cart.checkoutState();
    if((st.tipo || "entrega") !== "entrega") return 0;

    // taxa vem do cálculo (gps/bairro). Se não calculou ainda, 0.
    const fee = Number(st.fee || 0);
    return fee;
  };

  Cart.total = function(){
    return Cart.subtotal() + Cart.fee();
  };

  Cart.syncUI = function(){
    const badge = document.getElementById("cartBadge");
    const total = document.getElementById("ctaTotal");
    const gt = document.getElementById("grandTotal");
    if(badge) badge.textContent = String(Cart.count());
    if(total) total.textContent = money(Cart.total());
    if(gt) gt.textContent = money(Cart.total());
  };

  // ===== Drawer (mantém seu layout) =====
  function ensureDrawer(){
    if(document.getElementById("cartDrawer")) return;

    const wrap = document.createElement("div");
    wrap.className = "drawer";
    wrap.id = "cartDrawer";
    wrap.innerHTML = `
      <div class="drawer-backdrop" id="drawerBackdrop"></div>
      <aside class="drawer-panel" role="dialog" aria-label="Carrinho">
        <div class="drawer-head">
          <div>
            <strong style="font-size:16px">Seu carrinho</strong>
            <div class="mini muted">Revise e finalize</div>
          </div>
          <button class="icon-btn" id="closeCart" type="button">✕</button>
        </div>

        <div class="drawer-body">
          <div class="delivery-toggle">
            <button class="dt-btn" id="dtEntrega" type="button">Entrega</button>
            <button class="dt-btn" id="dtRetirada" type="button">Retirada</button>
          </div>

          <div class="note">
            <label>Endereço (obrigatório se Entrega)</label>
            <textarea id="addr" placeholder="Rua, número, bairro, complemento..."></textarea>
          </div>

          <div class="note">
            <label>Pagamento</label>
            <select id="pay" style="border:1px solid rgba(199,201,209,.85);border-radius:14px;padding:12px;background:rgba(255,255,255,.82);outline:none">
              <option value="Pix">Pix</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          <div class="note" id="trocoBox" style="display:none">
            <label>Troco para quanto?</label>
            <input id="troco" placeholder="Ex: 50" style="border:1px solid rgba(199,201,209,.85);border-radius:14px;padding:12px;background:rgba(255,255,255,.82);outline:none" />
          </div>

          <div class="note">
            <label>Observações</label>
            <textarea id="obs" placeholder="Sem cebola, bem passado, etc..."></textarea>
          </div>

          <div style="height:12px"></div>
          <div id="cartItems"></div>
        </div>

        <div class="drawer-foot">
          <div class="totals">
            <div class="row"><span class="muted">Subtotal</span><strong id="subV">${money(0)}</strong></div>
            <div class="row"><span class="muted">Taxa</span><strong id="taxV">${money(0)}</strong></div>
            <div class="row total"><span>Total</span><strong id="totV">${money(0)}</strong></div>
          </div>

          <div class="drawer-actions">
            <a class="btn primary" id="goCheckout" href="./checkout.html">Finalizar</a>
          </div>

          <div class="mini muted" id="warn" style="margin-top:10px; display:none; color:#b91c1c; font-weight:900">
            Coloque o endereço para enviar o pedido!!
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(wrap);

    const open = ()=> { wrap.classList.add("open"); renderDrawer(); };
    const close = ()=> wrap.classList.remove("open");

    document.getElementById("openCart")?.addEventListener("click", open);
    document.getElementById("ctaCart")?.addEventListener("click", open);
    document.getElementById("drawerBackdrop")?.addEventListener("click", close);
    document.getElementById("closeCart")?.addEventListener("click", close);

    const st = Cart.checkoutState();
    const tipo = st.tipo || "entrega";
    setTipo(tipo);

    document.getElementById("dtEntrega").addEventListener("click", ()=> setTipo("entrega"));
    document.getElementById("dtRetirada").addEventListener("click", ()=> setTipo("retirada"));

    const addr = document.getElementById("addr");
    const pay = document.getElementById("pay");
    const obs = document.getElementById("obs");
    const troco = document.getElementById("troco");

    addr.value = st.endereco || "";
    pay.value = st.pagamento || "Pix";
    obs.value = st.obs || "";
    troco.value = st.troco || "";

    const syncState = ()=>{
      Cart.setCheckoutState({
        endereco: addr.value,
        pagamento: pay.value,
        obs: obs.value,
        troco: troco.value
      });
      toggleTroco(pay.value);
      renderDrawer();
    };

    addr.addEventListener("input", syncState);
    obs.addEventListener("input", syncState);
    pay.addEventListener("change", syncState);
    troco.addEventListener("input", syncState);

    toggleTroco(pay.value);
  }

  function setTipo(tipo){
    const st = Cart.setCheckoutState({tipo});

    const e = document.getElementById("dtEntrega");
    const r = document.getElementById("dtRetirada");
    if(e && r){
      e.classList.toggle("active", tipo==="entrega");
      r.classList.toggle("active", tipo==="retirada");
    }

    // ao trocar tipo, zera taxa se retirada
    if((st.tipo||"entrega") !== "entrega"){
      Cart.setCheckoutState({ km:0, fee:0, blocked:false });
    }

    renderDrawer();
  }

  function toggleTroco(pay){
    const box = document.getElementById("trocoBox");
    if(!box) return;
    box.style.display = (pay === "Dinheiro") ? "block" : "none";
  }

  function renderDrawer(){
    const items = Cart.read();
    const $items = document.getElementById("cartItems");
    const $sub = document.getElementById("subV");
    const $tax = document.getElementById("taxV");
    const $tot = document.getElementById("totV");
    const $warn = document.getElementById("warn");

    if(!$items) return;

    if(!items.length){
      $items.innerHTML = `<div class="muted" style="padding:10px 2px">Seu carrinho está vazio.</div>`;
    }else{
      $items.innerHTML = items.map(it=>{
        const p = findProduct(it.id) || {title:"Item", price:0};
        return `
          <div class="citem">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${money(p.price)} • x${it.qty}</div>
              </div>
              <button class="qbtn remove" onclick="Cart.remove('${it.id}')">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" onclick="Cart.dec('${it.id}')">-</button>
                <strong>${it.qty}</strong>
                <button class="qbtn" onclick="Cart.add('${it.id}')">+</button>
              </div>
              <strong>${money(p.price*it.qty)}</strong>
            </div>
          </div>
        `;
      }).join("");
    }

    const st = Cart.checkoutState();
    const sub = Cart.subtotal();
    const taxa = Cart.fee();
    const tot = sub + taxa;

    if($sub) $sub.textContent = money(sub);
    if($tax) $tax.textContent = money(taxa);
    if($tot) $tot.textContent = money(tot);

    const needAddr = ((st.tipo || "entrega") === "entrega");
    const hasAddr = (st.endereco || "").trim().length >= 6;
    if($warn) $warn.style.display = (needAddr && !hasAddr && items.length) ? "block" : "none";

    Cart.syncUI();
  }

  // ===== WhatsApp message =====
  function buildWhatsMessage(extraLines=[]){
    const items = Cart.read();
    const st = Cart.checkoutState();
    const lines = [];

    lines.push(`*Pedido — ${CFG.brand}*`);
    lines.push(``);

    if(!items.length){
      lines.push(`(Carrinho vazio)`);
      return lines.join("\n");
    }

    lines.push(`*Itens:*`);
    items.forEach(it=>{
      const p = findProduct(it.id);
      if(!p) return;
      lines.push(`- ${it.qty}x ${p.title} — ${money(p.price*it.qty)}`);
    });

    const sub = Cart.subtotal();
    const taxa = Cart.fee();
    const total = sub + taxa;

    lines.push(``);
    lines.push(`Subtotal: *${money(sub)}*`);
    lines.push(`Taxa: *${money(taxa)}*`);
    lines.push(`Total: *${money(total)}*`);
    lines.push(``);

    const tipo = st.tipo || "entrega";
    lines.push(`*${tipo === "entrega" ? "Entrega" : "Retirada"}*`);

    const addr = (st.endereco || "").trim();
    if(tipo === "entrega"){
      lines.push(`Endereço: ${addr || "(NÃO INFORMADO)"}`);
    }

    extraLines.filter(Boolean).forEach(l=> lines.push(l));

    const obs = (st.obs || "").trim();
    if(obs){
      lines.push(``);
      lines.push(`Obs: ${obs}`);
    }

    return lines.join("\n");
  }

  function canFinish(){
    const items = Cart.read();
    if(!items.length) return {ok:false, msg:"Carrinho vazio."};

    const st = Cart.checkoutState();
    const tipo = st.tipo || "entrega";
    if(tipo === "entrega"){
      const addr = (st.endereco || "").trim();
      if(addr.length < 6){
        return {ok:false, msg:"Coloque o endereço para enviar o pedido!!"};
      }
      // precisa taxa calculada (para sua regra)
      if(!Number.isFinite(Number(st.km)) || st.km == null){
        return {ok:false, msg:"Calcule a taxa (GPS) antes de finalizar."};
      }
      if(Number(st.km) > CFG.maxKm){
        return {ok:false, msg:"Fora do raio de 10 km. Entrega indisponível."};
      }
    }
    return {ok:true};
  }

  function openWhats(text){
    const url = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  // ===== PIX (EMV + CRC16) =====
  const PIX = {
    key: "e02484b0-c924-4d38-9af9-79af9ad97c3e",
    merchantName: "LP GRILL",
    merchantCity: "BELO HORIZONTE",
    txid: "LPGRILL01"
  };

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

  // ===== Checkout Overlay (precisa do HTML do overlay no index) =====
  function initOverlay(){
    const overlay = $("#checkoutOverlay");
    if(!overlay) return; // se não tiver HTML, ignora

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

    const inName   = $("#ckName", overlay);
    const inPhone  = $("#ckPhone", overlay);
    const inAddr   = $("#ckAddress", overlay);
    const inCompl  = $("#ckCompl", overlay);
    const inObs    = $("#ckObs", overlay);

    const inBairro  = $("#ckBairro", overlay);
    const dlBairro  = $("#ckBairroList", overlay);
    const bairroHint = $("#ckBairroHint", overlay);

    let paymentMethod = null;
    let lastResults = [];
    let selectedPlace = null;
    let tDebounce = null;

    function goStep(name){
      Object.values(steps).forEach(s => s && (s.hidden = true));
      if(steps[name]) steps[name].hidden = false;
    }

    function openOverlay(){
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden","false");
      goStep("pay");
      paymentMethod = null;
      selectedPlace = null;

      elFeeLine && (elFeeLine.hidden = true);
      elBlocked && (elBlocked.hidden = true);
      elKmHint && (elKmHint.textContent = "A taxa depende da distância até Maria Teresa (BH).");

      // limpa campos
      if(inBairro) inBairro.value = "";
      if(bairroHint) bairroHint.textContent = "Digite para ver opções próximas (até 10 km).";
    }

    function closeOverlay(){
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden","true");
    }

    $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
    $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (e)=>{ if(e.target === overlay) closeOverlay(); });

    // Intercepta seus links de checkout (mantém layout)
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

    // ===== Bairros (Nominatim) =====
    async function searchBairros(q){
      const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=jsonv2&addressdetails=1&limit=12&q=${encodeURIComponent(q + " bairro, Belo Horizonte, MG")}`;
      const res = await fetch(url, { headers: { "Accept":"application/json" }});
      if(!res.ok) throw new Error("Falha na busca");
      const data = await res.json();

      const list = data.map(it => ({
        label: it.display_name,
        lat: Number(it.lat),
        lon: Number(it.lon)
      }))
      .filter(it => Number.isFinite(it.lat) && Number.isFinite(it.lon))
      .map(it => ({ ...it, ...calcFeeByCoords(it.lat, it.lon) }))
      .filter(it => it.km <= CFG.maxKm)
      .sort((a,b)=> a.km - b.km)
      .slice(0, 10);

      return list;
    }

    function fillDatalist(list){
      if(!dlBairro) return;
      dlBairro.innerHTML = "";
      list.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.label.split(",").slice(0,3).join(",").trim();
        dlBairro.appendChild(opt);
      });
    }

    function applyFeeUI(res){
      Cart.setCheckoutState({ km: res.km, fee: res.fee, blocked: !!res.blocked });

      if(elKm) elKm.textContent = `${res.km.toFixed(1)} km`;
      if(elFee) elFee.textContent = money(res.fee);
      if(elFeeLine) elFeeLine.hidden = false;
      if(elBlocked) elBlocked.hidden = !res.blocked;

      if(elKmHint){
        elKmHint.textContent = res.blocked
          ? "Fora do raio de 10 km. Entrega indisponível."
          : "Taxa calculada pela distância.";
      }

      renderDrawer();
      Cart.syncUI();
    }

    function pickFromInput(){
      if(!inBairro) return;
      const val = inBairro.value.trim().toLowerCase();
      selectedPlace = null;
      if(!val) return;

      const hit = lastResults.find(r =>
        r.label.toLowerCase().includes(val) ||
        val.includes(r.label.split(",")[0].toLowerCase())
      );

      if(hit){
        selectedPlace = hit;
        if(bairroHint) bairroHint.textContent = `OK • ${hit.km.toFixed(1)} km • taxa ${money(hit.fee)}`;
        applyFeeUI(hit);
      }
    }

    if(inBairro){
      inBairro.addEventListener("input", ()=>{
        const q = inBairro.value.trim();
        selectedPlace = null;

        if(tDebounce) clearTimeout(tDebounce);
        tDebounce = setTimeout(async ()=>{
          if(q.length < 3){
            if(bairroHint) bairroHint.textContent = "Digite ao menos 3 letras para sugerir bairros (até 10 km).";
            return;
          }
          try{
            if(bairroHint) bairroHint.textContent = "Buscando bairros próximos...";
            const list = await searchBairros(q);
            lastResults = list;
            fillDatalist(list);
            if(bairroHint) bairroHint.textContent = list.length ? "Escolha um bairro da lista." : "Nenhum bairro (até 10 km).";
            pickFromInput();
          }catch{
            if(bairroHint) bairroHint.textContent = "Não consegui buscar bairros agora. Use GPS.";
          }
        }, 350);
      });
      inBairro.addEventListener("change", pickFromInput);
    }

    // GPS calcula taxa
    $("#ckGetLocation", overlay)?.addEventListener("click", async ()=>{
      if(elKmHint) elKmHint.textContent = "Calculando distância...";
      if(elFeeLine) elFeeLine.hidden = true;
      if(elBlocked) elBlocked.hidden = true;

      try{
        const res = await calcFeeWithGPS();
        selectedPlace = null;
        applyFeeUI(res);
        if(bairroHint) bairroHint.textContent = "Usando GPS para calcular taxa.";
      }catch{
        if(elKmHint) elKmHint.textContent = "Não consegui acessar o GPS. Escolha um bairro da lista.";
      }
    });

    // ===== Render PIX (QR + copia e cola) =====
    function renderPix(){
      const st = Cart.checkoutState();
      const total = Cart.subtotal() + Cart.fee();

      if(elTotalPix) elTotalPix.textContent = money(Cart.subtotal());
      if(elFeePix) elFeePix.textContent = money(Cart.fee());

      const code = buildPixPayload({
        key: PIX.key,
        name: PIX.merchantName,
        city: PIX.merchantCity,
        amount: total,
        txid: PIX.txid
      });

      if(elPixCode) elPixCode.value = code;

      if(elQr){
        elQr.innerHTML = "";
        if (typeof QRCode === "undefined") {
          elQr.textContent = "QR Code não carregou.";
        } else {
          const canvas = document.createElement("canvas");
          canvas.width = 220;
          canvas.height = 220;
          elQr.appendChild(canvas);
          QRCode.toCanvas(canvas, code, { margin: 1, scale: 6 }, (err)=>{
            if(err){
              console.error(err);
              elQr.textContent = "Erro ao gerar QR.";
            }
          });
        }
      }
    }

    // ===== fluxo pagamento =====
    overlay.querySelectorAll("[data-pay]").forEach((b)=>{
      b.addEventListener("click", ()=>{
        paymentMethod = b.getAttribute("data-pay"); // pix|credit|debit
        Cart.setCheckoutState({ payMethod: paymentMethod });

        // todos vão pra endereço primeiro (como seu módulo “novo”)
        goStep("addr");
      });
    });

    // Confirmar endereço:
    // - PIX -> vai pra tela PIX e gera QR
    // - crédito/débito -> WhatsApp direto
    $("#ckConfirmOrder", overlay)?.addEventListener("click", ()=>{
      const name = (inName?.value || "").trim();
      const phone = (inPhone?.value || "").trim();
      const address = (inAddr?.value || "").trim();
      const bairro = (inBairro?.value || "").trim();
      const compl = (inCompl?.value || "").trim();
      const obs = (inObs?.value || "").trim();

      const st = Cart.checkoutState();
      const tipo = st.tipo || "entrega";

      if(!name || !phone){
        alert("Preencha Nome e Telefone.");
        return;
      }

      Cart.setCheckoutState({
        nome: name, telefone: phone,
        endereco: address, bairro,
        compl, obs
      });

      // Retirada: não exige taxa
      if(tipo !== "entrega"){
        Cart.setCheckoutState({ km:0, fee:0, blocked:false });
      } else {
        // Entrega: precisa taxa calculada
        if(selectedPlace?.lat && selectedPlace?.lon){
          applyFeeUI(selectedPlace);
        }

        const st2 = Cart.checkoutState();
        if(!bairro){
          alert("Selecione um bairro (até 10 km) ou use o GPS para calcular a taxa.");
          return;
        }
        if(!address){
          alert("Preencha o Endereço completo.");
          return;
        }
        if(st2.km == null){
          alert("Calcule a taxa (GPS) ou escolha um bairro válido da lista.");
          return;
        }
        if(Number(st2.km) > CFG.maxKm){
          alert("Fora do raio de 10 km do bairro Maria Teresa (BH). Entrega indisponível.");
          return;
        }
      }

      // PIX → trava no PIX
      if(paymentMethod === "pix"){
        goStep("pix");
        renderPix();
        return;
      }

      // Crédito / Débito → WhatsApp normal
      const methodLabel = (paymentMethod === "credit") ? "Crédito" : "Débito";
      const text = buildWhatsMessage([
        `Pagamento: *${methodLabel}*`,
        `Nome: ${name}`,
        `Telefone: ${phone}`,
        (tipo === "entrega" ? `Bairro: ${bairro}` : null),
        (tipo === "entrega" ? `Endereço: ${address}` : null),
        (compl ? `Compl: ${compl}` : null)
      ]);

      openWhats(text);
    });

    // PIX: copiar
    $("#ckCopyPix", overlay)?.addEventListener("click", async ()=>{
      const val = (elPixCode?.value || "").trim();
      if(!val) return;
      try{
        await navigator.clipboard.writeText(val);
        const btn = $("#ckCopyPix", overlay);
        if(btn){
          btn.textContent = "Copiado ✅";
          setTimeout(()=> btn.textContent = "Copiar código PIX", 1200);
        }
      } catch {
        elPixCode?.select?.();
        document.execCommand("copy");
      }
    });

    // PIX: Já paguei -> WhatsApp (comprovante)
    $("#ckPaidPix", overlay)?.addEventListener("click", ()=>{
      const st = Cart.checkoutState();
      const name = (st.nome || "").trim();
      const phone = (st.telefone || "").trim();
      const tipo = st.tipo || "entrega";

      const aviso = "✅ *PIX realizado.* Vou enviar o comprovante agora para liberar o pedido.";
      const extra = [
        aviso,
        `Pagamento: *PIX*`,
        (tipo === "entrega" ? `Distância: ${Number(st.km||0).toFixed(1)} km` : null)
      ];

      openWhats(buildWhatsMessage(extra));
    });

    $("#ckBackFromPix", overlay)?.addEventListener("click", ()=> goStep("addr"));
  }

  // ===== Bind =====
  document.addEventListener("DOMContentLoaded", ()=>{
    ensureDrawer();
    renderDrawer();
    Cart.syncUI();
    initOverlay();
  });

})();
