/* js/checkout.js — LP GRILL (PIX/QR robusto + overlay) */
(() => {
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
    storageKey: "lpgrill.checkout.v1",
    feeKey: "LPGRILL_FEE_V1"
  };

  const $ = (s, r = document) => r.querySelector(s);
  const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function getCart(){ return window.Cart || null; }

  function safeJsonParse(s){ try{ return JSON.parse(s); }catch{ return null; } }
  function loadSaved(){
    const raw = localStorage.getItem(CONFIG.storageKey);
    const data = safeJsonParse(raw);
    return (data && typeof data === "object") ? data : {};
  }
  function saveSaved(patch){
    const cur = loadSaved();
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({ ...cur, ...patch }));
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

  function feeByKm(km){
    if (km > CONFIG.maxKm) return { blocked:true, fee:0 };
    if (km <= 5) return { blocked:false, fee:CONFIG.feeUpTo5km };
    return { blocked:false, fee:CONFIG.fee5to10km };
  }
  function calcFeeByCoords(lat, lon){
    const km = haversineKm(CONFIG.baseLat, CONFIG.baseLon, lat, lon);
    return { km, ...feeByKm(km) };
  }
  function calcFeeWithGPS(){
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS não suportado."));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(calcFeeByCoords(pos.coords.latitude, pos.coords.longitude)),
        reject,
        { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
      );
    });
  }

  // ===== PIX EMV + CRC16 =====
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
    const mai = emv("00","BR.GOV.BCB.PIX") + emv("01", key) + (txid ? emv("02", txid) : "");
    const payload =
      emv("00","01") +
      emv("01","12") +
      emv("26", mai) +
      emv("52","0000") +
      emv("53","986") +
      emv("54", Number(amount||0).toFixed(2)) +
      emv("58","BR") +
      emv("59", String(name||"").slice(0,25)) +
      emv("60", String(city||"").slice(0,15)) +
      emv("62", emv("05", txid || "PEDIDO"));

    const toCrc = payload + "6304";
    return toCrc + crc16(toCrc);
  }

  function setBusy(btn, on, label){
    if (!btn) return;
    if (on){
      btn.dataset._label = btn.textContent;
      btn.textContent = label || "Aguarde...";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset._label || btn.textContent;
      btn.disabled = false;
    }
  }

  function init(){
    const overlay = $("#checkoutOverlay");
    if (!overlay) return;

    const cart = getCart();
    if (!cart) { console.warn("checkout.js: window.Cart não existe."); return; }

    // ===== scroll lock =====
    let prevOverflowHtml = "", prevOverflowBody = "", lastFocusEl = null;
    const lockScroll = () => {
      prevOverflowHtml = document.documentElement.style.overflow || "";
      prevOverflowBody = document.body.style.overflow || "";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
    const unlockScroll = () => {
      document.documentElement.style.overflow = prevOverflowHtml;
      document.body.style.overflow = prevOverflowBody;
    };

    // ⚠️ robusto: pega o primeiro de cada step
    const steps = {
      pay: overlay.querySelector('[data-step="pay"]'),
      addr: overlay.querySelector('[data-step="addr"]'),
      pix: overlay.querySelector('[data-step="pix"]')
    };

    const payButtons = Array.from(overlay.querySelectorAll("[data-pay]"));
    let payMethod = "";
    let lastKm = null;
    let lastFee = 0;

    // ===== endereço UI =====
    const elKmHint   = $("#ckKmHint", overlay);
    const elFeeLine  = $("#ckFeeLine", overlay);
    const elKm       = $("#ckKm", overlay);
    const elFee      = $("#ckFee", overlay);
    const elBlocked  = $("#ckBlocked", overlay);
    const btnGps     = $("#ckGetLocation", overlay);
    const btnConfirm = $("#ckConfirmOrder", overlay);

    const inName   = $("#ckName", overlay);
    const inPhone  = $("#ckPhone", overlay);
    const inBairro = $("#ckBairro", overlay);
    const inAddr   = $("#ckAddress", overlay);
    const inCompl  = $("#ckCompl", overlay);
    const inObs    = $("#ckObs", overlay);

    // ===== PIX UI (STEP COMPLETO) =====
    const elPixSub   = $("#ckTotalPix", overlay);
    const elFeePix   = $("#ckFeePix", overlay);
    const elPixTotal = $("#ckPixTotal", overlay);
    const elPixCode  = $("#ckPixCode", overlay);
    const btnCopyPix = $("#ckCopyPix", overlay);
    const btnPaidPix = $("#ckPaidPix", overlay);
    const elQrWrap   = $("#ckQr", overlay); // pode ser DIV ou IMG

    function goStep(step){
      Object.keys(steps).forEach(k => {
        if (!steps[k]) return;
        steps[k].hidden = (k !== step);
      });
    }

    function persistInputs(){
      saveSaved({
        name: (inName?.value || "").trim(),
        phone: (inPhone?.value || "").trim(),
        bairro: (inBairro?.value || "").trim(),
        address: (inAddr?.value || "").trim(),
        compl: (inCompl?.value || "").trim(),
        obs: (inObs?.value || "").trim()
      });
    }
    function hydrate(){
      const s = loadSaved();
      if (inName && s.name) inName.value = s.name;
      if (inPhone && s.phone) inPhone.value = onlyDigits(s.phone).slice(0,11);
      if (inBairro && s.bairro) inBairro.value = s.bairro;
      if (inAddr && s.address) inAddr.value = s.address;
      if (inCompl && s.compl) inCompl.value = s.compl;
      if (inObs && s.obs) inObs.value = s.obs;
    }

    function cartSubtotal(){
      try{
        if (typeof cart.subtotal === "function") return Number(cart.subtotal() || 0);
        if (typeof cart.total === "function") return Number(cart.total() || 0);
        const items = (typeof cart.items === "function" && cart.items()) || cart.items || cart.state?.items || [];
        if (!Array.isArray(items)) return 0;
        return items.reduce((acc,it)=>{
          const qty = Number(it.qty ?? it.qtd ?? it.quantity ?? 1) || 1;
          const price = Number(it.price ?? it.valor ?? it.unitPrice ?? 0) || 0;
          const line = Number(it.total ?? it.lineTotal ?? 0) || (qty*price);
          return acc + (Number(line)||0);
        },0);
      } catch { return 0; }
    }

    function isEntregaMode(){
      const v =
        localStorage.getItem("LPGRILL_DELIVERY_MODE_V1") ||
        localStorage.getItem("LPGRILL_MODE_V1") ||
        "";
      if (String(v).toLowerCase().includes("ret")) return false;
      return true;
    }

    // ==========================
    // ✅ QR ROBUSTO (DIV ou IMG)
    // ==========================
    async function renderPixQr(code){
      if (!elQrWrap) return;

      const pix = String(code || "").trim();

      // Se for IMG: seta src direto (não usa innerHTML)
      const isImg = elQrWrap.tagName === "IMG";

      // limpa
      if (isImg) {
        elQrWrap.removeAttribute("src");
      } else {
        elQrWrap.innerHTML = "";
      }

      if (!pix){
        if (isImg) return;
        elQrWrap.textContent = "Código PIX vazio.";
        return;
      }

      const QR = window.QRCode;
      if (!QR){
        if (isImg) return;
        elQrWrap.textContent = "QR indisponível (biblioteca QR não carregou).";
        return;
      }

      try{
        // Preferir DataURL
        if (typeof QR.toDataURL === "function"){
          const url = await QR.toDataURL(pix, { margin: 1, width: 240 });

          if (isImg){
            elQrWrap.alt = "QR Code PIX";
            elQrWrap.src = url;
            return;
          }

          const img = new Image();
          img.alt = "QR Code PIX";
          img.src = url;
          img.style.width = "240px";
          img.style.height = "240px";
          img.style.display = "block";
          img.style.margin = "0 auto";
          img.style.borderRadius = "12px";
          elQrWrap.appendChild(img);
          return;
        }

        // Fallback Canvas
        if (typeof QR.toCanvas === "function"){
          // se for IMG e só tem canvas, cria img via canvas
          const canvas = document.createElement("canvas");
          await QR.toCanvas(canvas, pix, { margin: 1, width: 240 });

          if (isImg){
            elQrWrap.alt = "QR Code PIX";
            elQrWrap.src = canvas.toDataURL("image/png");
            return;
          }

          canvas.style.display = "block";
          canvas.style.margin = "0 auto";
          canvas.style.borderRadius = "12px";
          elQrWrap.appendChild(canvas);
          return;
        }

        if (!isImg) elQrWrap.textContent = "QR indisponível (API da biblioteca diferente).";
      } catch (e){
        console.warn("Falha ao gerar QR:", e);
        if (!isImg) elQrWrap.textContent = "Não consegui gerar o QR.";
      }
    }

    async function copyPix(){
      const val = String(elPixCode?.value || "").trim();
      if (!val) return;

      setBusy(btnCopyPix, true, "Copiando...");
      try{
        await navigator.clipboard.writeText(val);
        btnCopyPix.textContent = "Copiado ✅";
        setTimeout(()=>{
          btnCopyPix.textContent = btnCopyPix.dataset._label || "Copiar código PIX";
          btnCopyPix.disabled = false;
        }, 1200);
      } catch {
        try{
          elPixCode?.focus?.();
          elPixCode?.select?.();
          document.execCommand("copy");
          btnCopyPix.textContent = "Copiado ✅";
          setTimeout(()=>{
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

    function openWhatsApp(msg){
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    }

    function openOverlay(){
      lastFocusEl = document.activeElement;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden","false");
      lockScroll();

      payMethod = "";
      lastKm = null;
      lastFee = 0;

      if (elFeeLine) elFeeLine.hidden = true;
      if (elBlocked) elBlocked.hidden = true;
      if (elKmHint) elKmHint.textContent = isEntregaMode()
        ? "Toque em “Usar minha localização (GPS)” para calcular a taxa."
        : "Modo Retirar: sem taxa de entrega.";

      hydrate();
      goStep("pay");
    }

    function closeOverlay(){
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden","true");
      unlockScroll();
      setTimeout(() => lastFocusEl?.focus?.(), 10);
    }

    // fechar
    $("#ckClose", overlay)?.addEventListener("click", closeOverlay);
    $("#ckCancel", overlay)?.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeOverlay();
    });

    // abrir: botão finalizar do sticky + link finalizar do carrinho
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest("#ctaCheckout,[data-open-checkout],a[data-open-checkout]");
      if (!btn) return;
      e.preventDefault();
      openOverlay();
    });

    // inputs save
    [inName,inPhone,inBairro,inAddr,inCompl,inObs].forEach(el=>{
      if (!el) return;
      el.addEventListener("input", persistInputs);
      el.addEventListener("blur", persistInputs);
    });
    inPhone?.addEventListener("input", ()=>{ inPhone.value = onlyDigits(inPhone.value).slice(0,11); });

    // pagamentos
    payButtons.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        payMethod = String(btn.getAttribute("data-pay")||"").toLowerCase().trim();
        goStep("addr");
      });
    });

    $("#ckBackFromAddr", overlay)?.addEventListener("click", ()=>goStep("pay"));
    $("#ckBackFromPix", overlay)?.addEventListener("click", ()=>goStep("addr"));

    // GPS
    btnGps?.addEventListener("click", async ()=>{
      if (!isEntregaMode()){
        lastKm = 0; lastFee = 0;
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
      try{
        const res = await calcFeeWithGPS();
        lastKm = res.km;
        lastFee = res.fee;

        localStorage.setItem(CONFIG.feeKey, String(lastFee));
        document.dispatchEvent(new CustomEvent("lp:cart-change"));

        if (elKm) elKm.textContent = `${clamp(res.km,0,999).toFixed(1)} km`;
        if (elFee) elFee.textContent = money(res.fee);
        if (elFeeLine) elFeeLine.hidden = false;

        if (elBlocked) elBlocked.hidden = !res.blocked;
        if (elKmHint) elKmHint.textContent = res.blocked
          ? "Fora da área de entrega. Escolha Retirar."
          : "Taxa calculada. Pode confirmar o pedido.";
      } catch(e){
        console.error(e);
        alert("Não consegui calcular a distância pelo GPS.");
        if (elKmHint) elKmHint.textContent = "Não consegui calcular. Tente novamente ou use Retirar.";
      } finally {
        setBusy(btnGps, false);
      }
    });

    // copiar pix
    btnCopyPix?.addEventListener("click", copyPix);

    // já paguei
    btnPaidPix?.addEventListener("click", ()=>{
      const name = (inName?.value||"").trim();
      const phone = onlyDigits(inPhone?.value||"");
      openWhatsApp(
        `✅ *PIX PAGO* — vou enviar o comprovante agora.\n` +
        `Por favor, libere meu pedido assim que confirmar.\n\n` +
        `Nome: ${name}\nTelefone: ${phone}`
      );
    });

    // confirmar
    btnConfirm?.addEventListener("click", ()=>{
      if (!payMethod){
        alert("Escolha uma forma de pagamento (PIX, Crédito ou Débito).");
        goStep("pay");
        return;
      }

      const name = (inName?.value||"").trim();
      const phoneDigits = onlyDigits(inPhone?.value||"");
      const bairro = (inBairro?.value||"").trim();
      const address = (inAddr?.value||"").trim();
      const compl = (inCompl?.value||"").trim();
      const obs = (inObs?.value||"").trim();

      persistInputs();

      if (!name || phoneDigits.length < 10){
        alert("Preencha Nome e Telefone (com DDD).");
        if (!name) inName?.focus?.(); else inPhone?.focus?.();
        return;
      }

      const isEntrega = isEntregaMode();
      if (isEntrega){
        if (!bairro) { alert("Informe o bairro."); inBairro?.focus?.(); return; }
        if (!address) { alert("Preencha o endereço completo."); inAddr?.focus?.(); return; }
        if (lastKm == null) { alert("Toque em “Usar minha localização (GPS)” para calcular a taxa."); return; }
        if (lastKm > CONFIG.maxKm) { alert(`Fora do raio de ${CONFIG.maxKm} km. Entrega indisponível.`); return; }
      } else {
        lastKm = 0; lastFee = 0;
        localStorage.setItem(CONFIG.feeKey, "0");
      }

      const sub = cartSubtotal();
      const total = sub + Number(lastFee||0);

      // ===== PIX: MOSTRA QR + COPIA E COLA =====
      if (payMethod === "pix"){
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

        // ✅ garante que o QR é sempre redesenhado
        renderPixQr(code);

        return;
      }

      // cartão -> whatsapp
      const label = (payMethod === "credit") ? "Crédito" : "Débito";
      const msg =
        `🛒 *NOVO PEDIDO — LP GRILL*\n` +
        `Pagamento: *${label}*\n\n` +
        `Subtotal: ${money(sub)}\n` +
        (isEntrega ? `Distância: ${Number(lastKm||0).toFixed(1)} km\nTaxa: ${money(lastFee)}\n` : "") +
        `Total: *${money(total)}*\n\n` +
        `Nome: ${name}\nTelefone: ${phoneDigits}\n` +
        (isEntrega ? `Bairro: ${bairro}\nEndereço: ${address}\n` : `Modo: Retirar\n`) +
        (compl ? `Compl: ${compl}\n` : "") +
        (obs ? `Obs: ${obs}\n` : "");

      openWhatsApp(msg);
    });
  }

  function boot(){
    try{ init(); }
    catch(e){ console.error("checkout init error:", e); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
