/* pagamento/pagamento.js */
(() => {
  const PAYMENT_KEY = "LPGRILL_PAYMENT_V1";
  const CART_FP_KEY = "LPGRILL_CART_FINGERPRINT_V1";

  const PIX = {
    key: "e02484b0-c924-4d38-9af9-79af9ad97c3e",
    merchantName: "LP GRILL",
    merchantCity: "BELO HORIZONTE",
    txid: "LPGRILL01",
  };

  const $ = (s)=> document.querySelector(s);

  const money = (v)=>
    Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function toast(msg){
    const el = $("#toast");
    if(!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(window.__t);
    window.__t = setTimeout(()=> el.style.display = "none", 2200);
  }

  function parseBRL(text){
    if(!text) return 0;
    const n = String(text)
      .replace(/\s/g,"")
      .replace("R$","")
      .replace(/\./g,"")
      .replace(",",".")
      .replace(/[^\d.]/g,"");
    return Number(n || 0);
  }

  // total do carrinho (robusto)
  function getCartTotal(){
    // tenta achar algum total na página (se existir)
    const gt = $("#grandTotal") || document.querySelector("#total, #totalPedido, #orderTotal");
    if(gt){
      const v = parseBRL(gt.textContent);
      if(v > 0) return v;
    }

    // fallback: tenta localStorage com várias chaves comuns
    const keys = ["LPGRILL_CART_V1","LPGRILL_CART","CART","cart","lp_cart","LP_CART","lpgrill_cart"];
    for(const k of keys){
      try{
        const raw = localStorage.getItem(k);
        if(!raw) continue;
        const obj = JSON.parse(raw);
        const nums = [
          obj?.totals?.grandTotal,
          obj?.totals?.total,
          obj?.grandTotal,
          obj?.total,
          obj?.sum,
          obj?.amount
        ].filter(v => typeof v === "number" && v > 0);
        if(nums.length) return nums[0];
      }catch(e){}
    }
    return 0;
  }

  function getCartFingerprint(total){
    // fingerprint simples (pode ficar mais forte depois com itens)
    return `TOTAL:${Number(total||0).toFixed(2)}`;
  }

  function setPill(ok){
    const pill = $("#payPill");
    const payText = $("#payText");
    if(!pill || !payText) return;

    if(ok){
      pill.classList.remove("wait");
      pill.classList.add("ok");
      pill.textContent = "✅ Pagamento concluído";
      payText.textContent = "Liberado para finalizar no checkout.";
    }else{
      pill.classList.remove("ok");
      pill.classList.add("wait");
      pill.textContent = "⏳ Aguardando pagamento";
      payText.textContent = "Aguardando você confirmar.";
    }
  }

  function emv(id, value){
    const len = String(value.length).padStart(2, "0");
    return `${id}${len}${value}`;
  }

  function crc16(payload){
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

  function buildPixPayload({key, merchantName, merchantCity, txid, amount}){
    const gui = emv("00", "br.gov.bcb.pix");
    const keyField = emv("01", key);
    const addData = emv("05", txid || "***");
    const additionalDataFieldTemplate = emv("62", addData);
    const mai = emv("26", gui + keyField);

    const amt = (amount && Number(amount) > 0)
      ? emv("54", Number(amount).toFixed(2))
      : "";

    const payloadNoCrc =
      emv("00", "01") +
      emv("01", "12") +
      mai +
      emv("52", "0000") +
      emv("53", "986") +
      amt +
      emv("58", "BR") +
      emv("59", (merchantName || "LP GRILL").substring(0, 25)) +
      emv("60", (merchantCity || "BELO HORIZONTE").substring(0, 15)) +
      additionalDataFieldTemplate +
      "6304";

    return payloadNoCrc + crc16(payloadNoCrc);
  }

  function isPaidForTotal(total){
    try{
      const raw = localStorage.getItem(PAYMENT_KEY);
      if(!raw) return false;
      const p = JSON.parse(raw);
      if(p?.status !== "paid") return false;
      const a = Number(p?.amount || 0);
      if(Math.abs(a - total) > 0.009) return false;
      // expira em 60 min
      const ageMs = Date.now() - Number(p?.paidAt || 0);
      if(ageMs > 60*60*1000) return false;
      return true;
    }catch(e){
      return false;
    }
  }

  let lastTotal = -1;

  function refreshPix(){
    const total = getCartTotal();
    if(total === lastTotal) return;
    lastTotal = total;

    $("#cartTotalView").textContent = money(total);

    // invalida pagamento se total mudou
    const fp = getCartFingerprint(total);
    const prevFp = localStorage.getItem(CART_FP_KEY);
    if(prevFp && prevFp !== fp){
      localStorage.removeItem(PAYMENT_KEY);
      setPill(false);
    }
    localStorage.setItem(CART_FP_KEY, fp);

    const payload = buildPixPayload({ ...PIX, amount: total > 0 ? total : 0 });
    $("#pixPayload").textContent = payload;

    const canvas = $("#pixCanvas");
    if(typeof QRCode === "undefined" || !canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);

    QRCode.toCanvas(canvas, payload, { margin: 1, scale: 6 }, (err)=>{
      if(err){
        $("#pixPayload").textContent = "Erro ao gerar QR.";
        console.error(err);
      }
    });

    setPill(isPaidForTotal(total));
  }

  function markPaid(){
    const total = getCartTotal();
    if(total <= 0){ toast("Carrinho vazio."); return; }

    localStorage.setItem(PAYMENT_KEY, JSON.stringify({
      status: "paid",
      method: "pix",
      amount: Number(total.toFixed(2)),
      paidAt: Date.now()
    }));

    setPill(true);
    toast("Pagamento concluído ✅");
  }

  function resetPaid(){
    localStorage.removeItem(PAYMENT_KEY);
    setPill(false);
    toast("Status resetado.");
  }

  // init
  refreshPix();
  setInterval(refreshPix, 650);

  $("#btnCopyPix")?.addEventListener("click", async ()=>{
    const payload = $("#pixPayload")?.textContent || "";
    if(!payload || payload.includes("Erro") || payload.includes("Gerando")) return;
    try{
      await navigator.clipboard.writeText(payload);
      toast("Pix copiado ✅");
    }catch(e){
      const t = document.createElement("textarea");
      t.value = payload;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
      toast("Pix copiado ✅");
    }
  });

  $("#btnPaid")?.addEventListener("click", markPaid);
  $("#btnResetPay")?.addEventListener("click", resetPaid);
})();
