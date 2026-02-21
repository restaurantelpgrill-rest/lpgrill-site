/* js/checkout.js — LP GRILL Checkout Overlay (sem mexer no render/produtos) */
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

  const $ = (s, r=document)=> r.querySelector(s);
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  // Usa o Cart do seu sistema atual (cart.js)
  function getCart(){
    return window.Cart || null;
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

  function calcFeeByCoords(lat, lon){
    const km = haversineKm(CONFIG.baseLat, CONFIG.baseLon, lat, lon);
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

  // CRC16 / EMV
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

  function openWhatsApp(msg){
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function init(){
    const overlay = $("#checkoutOverlay");
    if(!overlay) return;

    const cart = getCart();
    if(!cart){
      console.warn("checkout.js: window.Cart não existe (cart.js não carregou).");
      return;
    }

    const steps = {
      pay: overlay.querySelector('[data-step="pay"]'),
      addr: overlay.querySelector('[data-step="addr"]'),
      pix: overlay.querySelector('[data-step="pix"]')
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
    const inBairro = $("#ckBairro", overlay);

    let payMethod = null;
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
      payMethod = null;
      lastKm = null;
      lastFee = 0;
      if(elFeeLine) elFeeLine.hidden = true;
      if(elBlocked) elBlocked.hidden = true;
      if(elKmHint) elKmHint.textContent = "A taxa depende da distância até Maria Teresa (BH).";
    }
    function closeOverlay(){
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden","true");
    }

    $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
    $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (e)=>{ if(e.target === overlay) closeOverlay(); });

    // Intercepta Finalizar (sem mexer no layout)
    const selectors = [
      'a.tile.highlight[href="checkout.html"]',
      '.drawer-actions a.btn.primary[href="checkout.html"]',
      '.sticky-cta a.cta.primary[href="checkout.html"]'
    ];
    document.querySelectorAll(selectors.join(",")).forEach(a=>{
      a.addEventListener("click",(e)=>{ e.preventDefault(); openOverlay(); });
    });

    // Escolha pagamento -> endereço
    overlay.querySelectorAll("[data-pay]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        payMethod = btn.getAttribute("data-pay"); // pix|credit|debit
        goStep("addr");
      });
    });

    $("#ckBackFromAddr", overlay)?.addEventListener("click", ()=> goStep("pay"));
    $("#ckBackFromPix", overlay)?.addEventListener("click", ()=> goStep("addr"));

    // GPS
    $("#ckGetLocation", overlay)?.addEventListener("click", async ()=>{
      if(elKmHint) elKmHint.textContent = "Calculando distância...";
      if(elFeeLine) elFeeLine.hidden = true;
      if(elBlocked) elBlocked.hidden = true;

      try{
        const res = await calcFeeWithGPS();
        lastKm = res.km;
        lastFee = res.fee;

        if(elKm) elKm.textContent = `${res.km.toFixed(1)} km`;
        if(elFee) elFee.textContent = money(res.fee);
        if(elFeeLine) elFeeLine.hidden = false;
        if(elBlocked) elBlocked.hidden = !res.blocked;

        if(elKmHint) elKmHint.textContent = res.blocked ? "Fora do raio de 10 km. Entrega indisponível." : "Taxa calculada pela distância.";
      }catch{
        if(elKmHint) elKmHint.textContent = "Não consegui acessar o GPS. Tente novamente.";
      }
    });

    // Confirmar endereço
    $("#ckConfirmOrder", overlay)?.addEventListener("click", ()=>{
      const name = (inName?.value || "").trim();
      const phone = (inPhone?.value || "").trim();
      const bairro = (inBairro?.value || "").trim();
      const address = (inAddr?.value || "").trim();
      const compl = (inCompl?.value || "").trim();
      const obs = (inObs?.value || "").trim();

      if(!name || !phone){
        alert("Preencha Nome e Telefone.");
        return;
      }

      // Se for entrega, exige endereço e taxa calculada
      const mode = (cart.getMode && cart.getMode()) || "entrega"; // se existir no seu cart.js
      const isEntrega = (mode !== "retirar" && mode !== "retirada");

      if(isEntrega){
        if(!bairro) { alert("Informe o bairro."); return; }
        if(!address) { alert("Preencha o endereço completo."); return; }
        if(lastKm == null) { alert("Toque em “Usar minha localização (GPS)” para calcular a taxa."); return; }
        if(lastKm > CONFIG.maxKm) { alert("Fora do raio de 10 km. Entrega indisponível."); return; }
      } else {
        lastKm = 0; lastFee = 0;
      }

      // PIX -> gera e trava
      if(payMethod === "pix"){
        goStep("pix");

        const sub = (cart.subtotal ? cart.subtotal() : 0);
        const total = sub + (Number(lastFee||0));

        if(elTotalPix) elTotalPix.textContent = money(sub);
        if(elFeePix) elFeePix.textContent = money(lastFee);

        const code = buildPixPayload({
          key: CONFIG.pixKey,
          name: CONFIG.merchantName,
          city: CONFIG.merchantCity,
          amount: total,
          txid: CONFIG.txid
        });
        if(elPixCode) elPixCode.value = code;

        if(elQr){
          elQr.innerHTML = "";
          if(typeof QRCode === "undefined"){
            elQr.textContent = "QR Code não carregou.";
          }else{
            const canvas = document.createElement("canvas");
            canvas.width = 220; canvas.height = 220;
            elQr.appendChild(canvas);
            QRCode.toCanvas(canvas, code, { margin: 1, scale: 6 }, (err)=>{
              if(err) elQr.textContent = "Erro ao gerar QR.";
            });
          }
        }
        return;
      }

      // Crédito / Débito -> manda WhatsApp
      const label = (payMethod === "credit") ? "Crédito" : "Débito";
      const msg =
        `🛒 *NOVO PEDIDO — LP GRILL*\n`+
        `Pagamento: *${label}*\n`+
        (isEntrega ? `Distância: ${Number(lastKm||0).toFixed(1)} km\nTaxa: ${money(lastFee)}\n` : "")+
        `\nNome: ${name}\nTelefone: ${phone}\n`+
        (isEntrega ? `Bairro: ${bairro}\nEndereço: ${address}\n` : `Modo: Retirar\n`) +
        (compl ? `Compl: ${compl}\n` : "") +
        (obs ? `Obs: ${obs}\n` : "");
      openWhatsApp(msg);
    });

    // Copiar PIX
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
      }catch{
        elPixCode?.select?.();
        document.execCommand("copy");
      }
    });

    // Já paguei -> WhatsApp comprovante
    $("#ckPaidPix", overlay)?.addEventListener("click", ()=>{
      const name = (inName?.value || "").trim();
      const phone = (inPhone?.value || "").trim();

      const msg =
        `✅ *PIX PAGO* — vou enviar o comprovante agora.\n`+
        `Por favor, libere meu pedido assim que confirmar.\n\n`+
        `Nome: ${name}\nTelefone: ${phone}`;
      openWhatsApp(msg);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
