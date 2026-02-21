/* ===== LP GRILL — Checkout Overlay (PIX: Endereço -> QR) ===== */
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

  const CART_KEY = "LPGRILL_CART_V3";
  const MODE_KEY = "LPGRILL_MODE_V3";

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

  function readMode(){ return localStorage.getItem(MODE_KEY) || "entrega"; }
  function isRetirarMode(){ return readMode() === "retirar"; }

  // ====== Cupom curto (WhatsApp / impressora) ======
  function readCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)||"{}"); }
    catch { return {}; }
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
  function findProduct(id){ return allProducts().find(p=>p.id===id); }

  function buildReceipt({ methodLabel, fee, km, name, phone, bairro, address, compl, obs }){
    const cart = readCart();
    const items = Object.entries(cart).filter(([,q])=>Number(q)>0);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0");
    const mm = String(now.getMinutes()).padStart(2,"0");

    let sub = 0;
    const lines = [];

    lines.push("LP GRILL");
    lines.push(`PEDIDO ${hh}:${mm}`);
    lines.push("--------------------");

    for(const [id, qRaw] of items){
      const q = Number(qRaw||0);
      const p = findProduct(id);
      if(!p) continue;
      const itemTotal = p.price * q;
      sub += itemTotal;

      const title = String(p.title||"Item").slice(0,18);
      lines.push(`${q}x ${title}`);
      lines.push(`${money(itemTotal)}`);
    }

    if(!items.length) lines.push("(carrinho vazio)");

    lines.push("--------------------");
    lines.push(`SUB:  ${money(sub)}`);
    lines.push(`TAXA: ${money(fee)}`);
    lines.push(`TOT:  ${money(sub + fee)}`);
    if(!isRetirarMode()) lines.push(`KM:   ${km!=null ? km.toFixed(1) : "-"}`);
    lines.push(`PAG:  ${methodLabel}`);
    lines.push("--------------------");
    lines.push(`NOME: ${name}`);
    lines.push(`TEL:  ${phone}`);
    if(isRetirarMode()){
      lines.push("MODO: RETIRAR");
    }else{
      lines.push(`BAIR: ${bairro || "-"}`);
      lines.push(`END:  ${address}`);
      if(compl) lines.push(`COMP:${compl}`);
    }
    if(obs) lines.push(`OBS:  ${String(obs).slice(0,90)}`);
    lines.push("--------------------");
    lines.push("PIX: comprovante acima");
    return lines.join("\n");
  }

  // ===== Overlay =====
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

  const inName   = $("#ckName", overlay);
  const inPhone  = $("#ckPhone", overlay);
  const inAddr   = $("#ckAddress", overlay);
  const inCompl  = $("#ckCompl", overlay);
  const inObs    = $("#ckObs", overlay);

  const inBairro  = $("#ckBairro", overlay);
  const dlBairro  = $("#ckBairroList", overlay);
  const bairroHint = $("#ckBairroHint", overlay);

  let paymentMethod = null; // pix|credit|debit
  let lastKm = null;
  let lastFee = 0;
  let lastResults = [];
  let selectedPlace = null; // {lat, lon, km, fee, blocked, label}

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
    selectedPlace = null;
    elFeeLine.hidden = true;
    elBlocked.hidden = true;
    elKmHint.textContent = "A taxa depende da distância até Maria Teresa (BH).";
    if(bairroHint) bairroHint.textContent = "Digite para ver opções próximas (até 10 km).";
    if(inBairro) inBairro.value = "";
  }
  function closeOverlay(){
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden","true");
  }

  $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
  $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);
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
    if(km > CONFIG.maxKm) return { blocked:true, fee:0 };
    if(km <= 5) return { blocked:false, fee: CONFIG.feeUpTo5km };
    return { blocked:false, fee: CONFIG.fee5to10km };
  }
  function calcFeeByCoords(lat, lon){
    const km = haversineKm(CONFIG.baseLat, CONFIG.baseLon, lat, lon);
    const rule = feeByKm(km);
    return { km, ...rule };
  }
  function calcFeeWithGPS(){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject(new Error("GPS não suportado."));
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          resolve(calcFeeByCoords(pos.coords.latitude, pos.coords.longitude));
        },
        reject,
        { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
      );
    });
  }
  function applyFeeUI({km, fee, blocked}){
    lastKm = km;
    lastFee = fee;

    elKm.textContent = `${km.toFixed(1)} km`;
    elFee.textContent = money(fee);
    elFeeLine.hidden = false;

    elBlocked.hidden = !blocked;
    elKmHint.textContent = blocked ? "Fora do raio de 10 km. Entrega indisponível." : "Taxa calculada pela distância.";
  }

  // ===== Bairros (autocomplete) =====
  let tDebounce = null;

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
    })).filter(it => Number.isFinite(it.lat) && Number.isFinite(it.lon))
      .map(it => ({ ...it, ...calcFeeByCoords(it.lat, it.lon) }))
      .filter(it => it.km <= CONFIG.maxKm)
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

  function pickFromInput(){
    if(!inBairro) return;
    const val = inBairro.value.trim().toLowerCase();
    selectedPlace = null;
    if(!val) return;

    const hit = lastResults.find(r => r.label.toLowerCase().includes(val) || val.includes(r.label.split(",")[0].toLowerCase()));
    if(hit){
      selectedPlace = hit;
      if(bairroHint) bairroHint.textContent = `OK • ${hit.km.toFixed(1)} km • taxa ${money(hit.fee)}`;
      if(readMode()==="entrega") applyFeeUI(hit);
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

  // ===== PIX EMV + CRC16 =====
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
    if (typeof QRCode === "undefined") {
      elQr.textContent = "QR Code não carregou.";
      return;
    }

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

  function openWhatsApp(msg){
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ===== fluxo pagamento =====
  overlay.querySelectorAll("[data-pay]").forEach((b)=>{
    b.addEventListener("click", ()=>{
      paymentMethod = b.getAttribute("data-pay");

      // ✅ PIX agora abre endereço primeiro
      if(paymentMethod === "pix"){
        goStep("addr");
        return;
      }

      // crédito/débito: continua endereço
      if(paymentMethod === "credit" || paymentMethod === "debit"){
        goStep("addr");
      }
    });
  });

  // GPS calcula taxa
  $("#ckGetLocation", overlay)?.addEventListener("click", async ()=>{
    elKmHint.textContent = "Calculando distância...";
    elFeeLine.hidden = true;
    elBlocked.hidden = true;

    try{
      const res = await calcFeeWithGPS();
      applyFeeUI(res);
      selectedPlace = null;
      if(bairroHint) bairroHint.textContent = "Usando GPS para calcular taxa.";
    } catch {
      elKmHint.textContent = "Não consegui acessar o GPS. Escolha um bairro da lista.";
    }
  });

  // Confirmar no endereço:
  // - PIX -> vai pra tela PIX e gera QR com taxa
  // - crédito/débito -> WhatsApp direto
  $("#ckConfirmOrder", overlay)?.addEventListener("click", ()=>{
    const name = inName?.value.trim() || "";
    const phone = inPhone?.value.trim() || "";
    const address = inAddr?.value.trim() || "";
    const bairro = inBairro?.value.trim() || "";
    const compl = inCompl?.value.trim() || "";
    const obs = inObs?.value.trim() || "";

    if(!name || !phone){
      alert("Preencha Nome e Telefone.");
      return;
    }

    // Retirar: não exige bairro/endereço
    if(isRetirarMode()){
      lastKm = 0; lastFee = 0;

      if(paymentMethod === "pix"){
        goStep("pix");
        renderPix(getCartTotal(), 0);
        return;
      }

      const methodLabel = paymentMethod === "credit" ? "Crédito" : "Débito";
      const msg = buildReceipt({
        methodLabel, fee: 0, km: 0,
        name, phone, bairro:"-", address:"-", compl, obs
      });
      openWhatsApp(msg);
      return;
    }

    // Entrega: precisa taxa calculada
    if(selectedPlace?.lat && selectedPlace?.lon){
      applyFeeUI(selectedPlace);
    }

    if(!bairro){
      alert("Selecione um bairro (até 10 km) ou use o GPS para calcular a taxa.");
      return;
    }
    if(!address){
      alert("Preencha o Endereço completo.");
      return;
    }
    if(lastKm == null){
      alert("Calcule a taxa (GPS) ou escolha um bairro válido da lista.");
      return;
    }
    if(lastKm > CONFIG.maxKm){
      alert("Fora do raio de 10 km do bairro Maria Teresa (BH). Entrega indisponível.");
      return;
    }

    if(paymentMethod === "pix"){
      goStep("pix");
      renderPix(getCartTotal(), Number(lastFee||0));
      return;
    }

    const methodLabel = paymentMethod === "credit" ? "Crédito" : "Débito";
    const msg = buildReceipt({
      methodLabel,
      fee: Number(lastFee||0),
      km: lastKm,
      name, phone,
      bairro,
      address,
      compl, obs
    });
    openWhatsApp(msg);
  });

  // PIX: copiar
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

  // PIX: Já paguei -> WhatsApp cupom
  $("#ckPaidPix", overlay)?.addEventListener("click", ()=>{
    const name = inName?.value.trim() || "";
    const phone = inPhone?.value.trim() || "";
    const address = inAddr?.value.trim() || "";
    const bairro = inBairro?.value.trim() || "";
    const compl = inCompl?.value.trim() || "";
    const obs = inObs?.value.trim() || "";

    const msg = buildReceipt({
      methodLabel: "PIX",
      fee: Number(lastFee||0),
      km: lastKm,
      name, phone,
      bairro: isRetirarMode() ? "-" : bairro,
      address: isRetirarMode() ? "-" : address,
      compl, obs
    });
    openWhatsApp(msg);
  });

  $("#ckBackFromPix", overlay)?.addEventListener("click", ()=> goStep("addr"));

  // INIT
  interceptCheckoutLinks();
})();
