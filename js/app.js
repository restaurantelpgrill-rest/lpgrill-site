// js/app.js — LP Grill (Checkout Premium v2.2) — FIX DUPLICAÇÃO
// ✅ Endereço obrigatório (entrega) + valida raio 12 km + taxa R$1/km (mín. R$5)
// ✅ Taxa entra no carrinho (localStorage LPGRILL_FEE_V1) e soma no total automaticamente
// ✅ PIX (QR + copia/cola) com TXID
// ✅ WhatsApp com pedido completo
// ✅ NOVO DESIGNER (CSS premium injetado pelo JS)
// ✅ SEM DUPLICAR MODAIS: remove payOverlay antigo e recria overlay se quebrado
// ✅ FIX: 1 ÚNICO "openCheckout" + 1 ÚNICO listener global (data-open-checkout)

(() => {
  "use strict";

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  // =========================
  // ✅ CONFIG
  // =========================
  const CONFIG = {
    whatsappDDI55: "5531998832407",
    lojaNome: "LP Grill",
    lojaCidadeUF: "Belo Horizonte/MG",

    pix: {
      chave: "e02484b0-c924-4d38-9af9-79af9ad97c3e",
      recebedor: "LP GRILL",
      cidade: "BELO HORIZONTE",
    },

    entrega: {
      maxKm: 12,
      base: { lat: -19.818749, lng: -43.881194 }, // Maria Tereza
      feePerKm: 1,
      feeMin: 5,

      bairros: [
        { name: "Aarão Reis", lat: -19.8097, lng: -43.9143 },
        { name: "Primeiro de Maio", lat: -19.8049, lng: -43.9056 },
        { name: "Novo Aarão Reis", lat: -19.8065, lng: -43.9198 },
        { name: "Heliópolis", lat: -19.8006, lng: -43.8992 },
        { name: "São Gabriel", lat: -19.7897, lng: -43.9053 },
        { name: "Belmonte", lat: -19.7815, lng: -43.8954 },
        { name: "Monte Azul", lat: -19.7782, lng: -43.8887 },
        { name: "Ribeiro de Abreu", lat: -19.7709, lng: -43.8758 },
        { name: "Paulo VI", lat: -19.7892, lng: -43.8911 },
        { name: "Nazaré", lat: -19.7950, lng: -43.8843 },
        { name: "Guarani", lat: -19.7834, lng: -43.9180 },
        { name: "Tupi", lat: -19.7768, lng: -43.9242 },
        { name: "Floramar", lat: -19.7714, lng: -43.9136 },
        { name: "Minaslândia", lat: -19.7647, lng: -43.9035 },
        { name: "Jaqueline", lat: -19.7589, lng: -43.8952 },
        { name: "Juliana", lat: -19.7560, lng: -43.9103 },
        { name: "Jardim Felicidade", lat: -19.7688, lng: -43.9281 },
        { name: "Copacabana", lat: -19.7525, lng: -43.9273 },
        { name: "Serra Verde", lat: -19.7471, lng: -43.9020 },
        { name: "Planalto", lat: -19.7402, lng: -43.9175 },
        { name: "Capitão Eduardo", lat: -19.7309, lng: -43.8796 },
        { name: "Itapoã", lat: -19.7652, lng: -43.9651 },
        { name: "Venda Nova (Centro)", lat: -19.8123, lng: -43.9552 },
        { name: "Rio Branco", lat: -19.8055, lng: -43.9648 },
        { name: "Santa Mônica", lat: -19.7879, lng: -43.9590 }
      ],
    }
  };

  // chaves LS usadas pelo cart.js
  const LS = {
    CART: "LPGRILL_CART_V3",
    MODE: "LPGRILL_MODE_V3",
    FEE:  "LPGRILL_FEE_V1",
    ADDR: "LPGRILL_ADDR_V1",
    PAY:  "LPGRILL_PAY_V1",
    PIX_TXID: "LPGRILL_PIX_TXID_V1"
  };

  // =========================
  // ✅ Products resolver (compat com render/cart)
  // =========================
  function allProducts(){
    const d = window.DATA || {};
    const cats = ["marmitas","porcoes","bebidas","sobremesas"];
    const out = [];
    cats.forEach(k => (Array.isArray(d[k]) ? d[k] : []).forEach(p => out.push(p)));
    return out;
  }

  window.findProduct = function(id){
    return allProducts().find(p => String(p.id) === String(id)) || null;
  };

  function readCartObj(){
    try { return JSON.parse(localStorage.getItem(LS.CART) || "{}"); }
    catch { return {}; }
  }

  function getMode(){
    return localStorage.getItem(LS.MODE) || "entrega";
  }

  function subtotal(){
    const c = readCartObj();
    let sum = 0;
    for(const [id,q] of Object.entries(c)){
      const p = window.findProduct(id);
      if(p) sum += Number(p.price||0) * Number(q||0);
    }
    return sum;
  }

  function fee(){
    if(getMode() !== "entrega") return 0;
    const f = Number(localStorage.getItem(LS.FEE) || "0");
    return Number.isFinite(f) ? f : 0;
  }

  function total(){
    return subtotal() + fee();
  }

  // =========================
  // ✅ Distância / raio / taxa
  // =========================
  function haversineKm(a, b){
    const toRad = (v)=> (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat/2);
    const s2 = Math.sin(dLng/2);
    const aa = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
    return R * c;
  }

  function findBairro(name){
    const n = String(name||"").trim().toLowerCase();
    return CONFIG.entrega.bairros.find(b => b.name.toLowerCase() === n) || null;
  }

  function suggestBairros(prefix){
    const p = String(prefix||"").trim().toLowerCase();
    if(!p) return [];
    const all = CONFIG.entrega.bairros.slice();
    const starts = all.filter(b => b.name.toLowerCase().startsWith(p));
    const contains = all.filter(b => !b.name.toLowerCase().startsWith(p) && b.name.toLowerCase().includes(p));
    return [...starts, ...contains].slice(0, 8);
  }

  function calcDeliveryFeeFromKm(km){
    const perKm = Number(CONFIG.entrega.feePerKm || 1);
    const min = Number(CONFIG.entrega.feeMin || 5);
    const kmBill = Math.max(1, Math.ceil(Number(km || 0)));
    const raw = kmBill * perKm;
    return Math.max(min, raw);
  }

  function computeAndStoreFeeForBairro(bairroName){
    if(getMode() !== "entrega"){
      localStorage.setItem(LS.FEE, "0");
      window.Cart?.renderAll?.();
      return { ok:true, km:0, fee:0 };
    }

    const b = findBairro(bairroName);
    if(!b){
      localStorage.setItem(LS.FEE, "0");
      window.Cart?.renderAll?.();
      return { ok:false, km:0, fee:0, reason:"bairro" };
    }

    const km = haversineKm(CONFIG.entrega.base, {lat:b.lat, lng:b.lng});
    if(km > CONFIG.entrega.maxKm){
      localStorage.setItem(LS.FEE, "0");
      window.Cart?.renderAll?.();
      return { ok:false, km, fee:0, reason:"raio" };
    }

    const feeV = calcDeliveryFeeFromKm(km);
    localStorage.setItem(LS.FEE, String(feeV));
    window.Cart?.renderAll?.();
    return { ok:true, km, fee:feeV };
  }

  // =========================
  // ✅ PIX EMV + CRC16
  // =========================
  function crc16(payload){
    let crc = 0xFFFF;
    for(let i=0; i<payload.length; i++){
      crc ^= payload.charCodeAt(i) << 8;
      for(let j=0; j<8; j++){
        if(crc & 0x8000) crc = (crc << 1) ^ 0x1021;
        else crc = crc << 1;
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function pad2(n){ return String(n).padStart(2,"0"); }
  function field(id, value){
    const v = String(value ?? "");
    return `${id}${pad2(v.length)}${v}`;
  }

  function buildPixPayload({chave, recebedor, cidade, valor, txid}){
    const gui = field("00", "BR.GOV.BCB.PIX") + field("01", chave);

    const p00 = field("00", "01");
    const p01 = field("01", "12");
    const p26 = field("26", gui);
    const p52 = field("52", "0000");
    const p53 = field("53", "986");
    const p54 = valor > 0 ? field("54", valor.toFixed(2)) : "";
    const p58 = field("58", "BR");
    const p59 = field("59", recebedor.toUpperCase().slice(0,25));
    const p60 = field("60", cidade.toUpperCase().slice(0,15));
    const p62 = field("62", field("05", String(txid).slice(0,25)));

    const partial = p00 + p01 + p26 + p52 + p53 + p54 + p58 + p59 + p60 + p62;
    const withCrcId = partial + "6304";
    const crc = crc16(withCrcId);
    return withCrcId + crc;
  }

  function qrUrlFromPayload(payload){
    const chl = encodeURIComponent(payload);
    return `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chld=M|1&chl=${chl}`;
  }

  // =========================
  // ✅ WhatsApp message
  // =========================
  function buildOrderText(addr, payMethod, pixInfo){
    const c = readCartObj();
    const items = Object.entries(c)
      .map(([id,q])=>{
        const p = window.findProduct(id);
        if(!p) return null;
        const line = Number(p.price||0) * Number(q||0);
        return `• ${q}x ${p.title} — ${money(line)}`;
      })
      .filter(Boolean);

    const mode = getMode();
    const sub = subtotal();
    const feeV = fee();
    const tot = total();

    const addrLines = addr ? [
      `Nome: ${addr.nome}`,
      `WhatsApp: ${addr.whats}`,
      `Rua: ${addr.rua}, Nº ${addr.numero}`,
      `Bairro: ${addr.bairro}`,
      addr.complemento ? `Compl.: ${addr.complemento}` : null,
      addr.referencia ? `Ref.: ${addr.referencia}` : null,
    ].filter(Boolean) : [];

    const payLines = [];
    if(payMethod === "pix"){
      payLines.push("Pagamento: PIX");
      if(pixInfo?.txid) payLines.push(`TXID: ${pixInfo.txid}`);
    }
    if(payMethod === "credit") payLines.push("Pagamento: Cartão de Crédito");
    if(payMethod === "debit")  payLines.push("Pagamento: Cartão de Débito");

    const head = `*Pedido — ${CONFIG.lojaNome}*\n`;
    const modeTxt = mode === "entrega" ? "🚚 Entrega" : "🏬 Retirar";

    const parts = [
      head,
      `*Modo:* ${modeTxt}`,
      "",
      "*Itens:*",
      ...items,
      "",
      `Subtotal: ${money(sub)}`,
      `Taxa: ${money(mode==="entrega" ? feeV : 0)}`,
      `*Total:* ${money(tot)}`,
      "",
      "*Endereço:*",
      ...addrLines,
      "",
      ...payLines
    ].filter(Boolean);

    return parts.join("\n");
  }

  function waLink(text){
    const msg = encodeURIComponent(text);
    return `https://wa.me/${CONFIG.whatsappDDI55}?text=${msg}`;
  }

  // =========================
  // ✅ Designer CSS Premium (injetado)
  // =========================
  function ensureCheckoutStyles(){
    if(document.getElementById("lpCheckoutStyles")) return;

    const st = document.createElement("style");
    st.id = "lpCheckoutStyles";
    st.textContent = `
:root{
  --ck-bg: rgba(10,12,16,.58);
  --ck-card: rgba(255,255,255,.94);
  --ck-card2: rgba(255,255,255,.78);
  --ck-txt:#0b1220;
  --ck-mut: rgba(11,18,32,.68);
  --ck-line: rgba(15,23,42,.12);
  --ck-shadow: 0 18px 60px rgba(0,0,0,.22);
  --ck-radius: 18px;
}
html.modal-open, body.modal-open{ overflow:hidden !important; }
.ck-overlay{
  position:fixed; inset:0;
  background: var(--ck-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display:none;
  z-index: 9999;
  padding: 18px;
}
.ck-overlay.is-open{ display:flex; align-items:flex-end; justify-content:center; }
.ck-sheet{
  width:min(980px, 100%);
  background: linear-gradient(180deg, var(--ck-card), var(--ck-card2));
  border:1px solid rgba(255,255,255,.45);
  border-radius: 24px;
  box-shadow: var(--ck-shadow);
  overflow:hidden;
  transform: translateY(10px);
  animation: ckUp .22s ease-out forwards;
}
@keyframes ckUp{ to{ transform: translateY(0); } }
.ck-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--ck-line);
  background: rgba(255,255,255,.86);
}
.ck-title{ font-weight: 1000; letter-spacing:-.02em; font-size: 16px; color: var(--ck-txt); }
.ck-sub{ font-size: 12px; color: var(--ck-mut); margin-top:2px; }
.ck-x{
  border:1px solid var(--ck-line);
  background: rgba(255,255,255,.94);
  width: 40px; height:40px;
  border-radius: 12px;
  font-size: 16px;
  cursor:pointer;
}
.ck-step{ padding: 16px 18px 18px; }
.ck-box{
  border:1px solid var(--ck-line);
  background: rgba(255,255,255,.90);
  border-radius: var(--ck-radius);
  padding: 14px;
}
.ck-k{
  font-size: 12px;
  color: var(--ck-mut);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing:.08em;
}
.ck-v{ font-size: 22px; font-weight: 1100; color: var(--ck-txt); margin-top: 4px; }
.ck-hint{ font-size: 12px; color: var(--ck-mut); margin-top: 6px; line-height: 1.35; }
.ck-paygrid{ display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 720px){ .ck-paygrid{ grid-template-columns: 1fr; } }
.ck-paybtn{
  border:1px solid var(--ck-line);
  background: rgba(255,255,255,.94);
  border-radius: var(--ck-radius);
  padding: 12px;
  cursor:pointer;
  display:flex; gap:10px; align-items:center;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.ck-paybtn:hover{
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(0,0,0,.12);
  border-color: rgba(15,23,42,.22);
}
.ck-ic{
  width: 38px; height: 38px;
  border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(15,23,42,.06);
  font-size: 18px;
}
.ck-paytxt strong{ display:block; font-size: 14px; color: var(--ck-txt); }
.ck-paytxt small{ display:block; font-size: 12px; color: var(--ck-mut); margin-top:2px; }
.ck-actions{ display:flex; justify-content:flex-end; gap: 10px; margin-top: 14px; }
.ck-btn, .ck-back{
  border:1px solid rgba(15,23,42,.14);
  background: linear-gradient(180deg, rgba(15,23,42,.96), rgba(15,23,42,.88));
  color:#fff;
  border-radius: 14px;
  padding: 10px 14px;
  font-weight: 1000;
  cursor:pointer;
}
.ck-btn.ghost, .ck-back.ghost{ background: rgba(255,255,255,.92); color: var(--ck-txt); }
.ck-field{ margin-top: 10px; }
.ck-lbl{ font-size: 12px; font-weight: 900; color: var(--ck-txt); margin-bottom: 6px; }
.ck-inp{
  width: 100%;
  border:1px solid rgba(15,23,42,.16);
  background: rgba(255,255,255,.92);
  border-radius: 14px;
  padding: 12px 12px;
  outline:none;
  font-size: 14px;
}
.ck-row2{ display:grid; grid-template-columns: 1fr 140px; gap:10px; }
@media (max-width: 560px){ .ck-row2{ grid-template-columns: 1fr; } }
.ck-block{
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(239,68,68,.22);
  background: rgba(239,68,68,.08);
  color: #7f1d1d;
  font-weight: 800;
  font-size: 12px;
}
.ck-qrwrap{ display:grid; grid-template-columns: 280px 1fr; gap: 12px; margin-top: 12px; }
@media (max-width: 820px){ .ck-qrwrap{ grid-template-columns: 1fr; } }
.ck-qrbox{
  border:1px solid var(--ck-line);
  background: rgba(255,255,255,.94);
  border-radius: var(--ck-radius);
  padding: 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height: 280px;
}
.ck-qr{ width: 240px; height:240px; object-fit: contain; }
.ck-copy{
  border:1px solid var(--ck-line);
  background: rgba(255,255,255,.94);
  border-radius: var(--ck-radius);
  padding: 12px;
}
.ck-textarea{
  width:100%;
  border:1px solid rgba(15,23,42,.16);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(255,255,255,.94);
  font-size: 12px;
  resize:none;
  outline:none;
  margin-top: 8px;
}
#bairroSug .ck-sugwrap{
  display:flex; flex-wrap:wrap; gap:8px;
  padding:10px;
  border-radius:14px;
  border:1px solid rgba(15,23,42,.14);
  background: rgba(255,255,255,.96);
  box-shadow: 0 12px 28px rgba(0,0,0,.10);
}
#bairroSug .ck-sugbtn{
  border:1px solid rgba(15,23,42,.16);
  background:#fff;
  color:#0b1220;
  border-radius:999px;
  padding:8px 12px;
  font-weight:1000;
  cursor:pointer;
}
#bairroSug .ck-sugbtn:hover{ background: rgba(15,23,42,.05); }
    `;
    document.head.appendChild(st);
  }

  // =========================
  // ✅ Checkout Overlay (auto-create) — SEM DUPLICAR
  // =========================
  function ensureOverlay(){
    const old = $("#payOverlay");
    if(old) old.remove();

    let overlay = $("#checkoutOverlay");
    if(overlay){
      // se existir, garante que estrutura está OK
      if($("#ckTotalPay", overlay) && $("#addrBairro", overlay) && $("#ckPixPayload", overlay)){
        return overlay;
      }
      overlay.remove();
    }

    overlay = document.createElement("div");
    overlay.id = "checkoutOverlay";
    overlay.className = "ck-overlay";
    overlay.setAttribute("aria-hidden","true");

    overlay.innerHTML = `
      <div class="ck-sheet" role="dialog" aria-modal="true" aria-label="Checkout">
        <div class="ck-head">
          <div>
            <div class="ck-title">Finalizar pedido</div>
            <div class="ck-sub">Pagamento • Endereço • WhatsApp</div>
          </div>
          <button class="ck-x" id="ckClose" type="button" aria-label="Fechar">✕</button>
        </div>

        <section class="ck-step" data-step="pay">
          <div class="ck-box">
            <div class="ck-k">Total atual</div>
            <div class="ck-v" id="ckTotalPay">R$ 0,00</div>
            <div class="ck-hint">Preencha o endereço para liberar pagamento/envio no WhatsApp.</div>
          </div>

          <div style="height:12px"></div>

          <div class="ck-paygrid">
            <button class="ck-paybtn" type="button" data-pay="pix">
              <div class="ck-ic">💠</div>
              <div class="ck-paytxt"><strong>PIX</strong><small>QR + copia e cola</small></div>
            </button>
            <button class="ck-paybtn" type="button" data-pay="credit">
              <div class="ck-ic">💳</div>
              <div class="ck-paytxt"><strong>Crédito</strong><small>vai pro WhatsApp</small></div>
            </button>
            <button class="ck-paybtn" type="button" data-pay="debit">
              <div class="ck-ic">💳</div>
              <div class="ck-paytxt"><strong>Débito</strong><small>vai pro WhatsApp</small></div>
            </button>
          </div>

          <div class="ck-actions">
            <button class="ck-back ghost" id="ckCancel" type="button">Cancelar</button>
          </div>
        </section>

        <section class="ck-step" data-step="addr" hidden>
          <div class="ck-box">
            <div class="ck-k">Endereço</div>
            <div class="ck-hint">Entrega: valida raio (${CONFIG.entrega.maxKm} km) e calcula taxa (R$ 1/km, mínimo R$ 5).</div>
          </div>

          <div style="height:12px"></div>

          <div class="ck-field">
            <div class="ck-lbl">Seu nome</div>
            <input class="ck-inp" id="addrNome" placeholder="Ex: Paulo" />
          </div>

          <div class="ck-field">
            <div class="ck-lbl">Seu WhatsApp</div>
            <input class="ck-inp" id="addrWhats" placeholder="Ex: (31) 9xxxx-xxxx" />
          </div>

          <div class="ck-row2">
            <div class="ck-field">
              <div class="ck-lbl">Rua</div>
              <input class="ck-inp" id="addrRua" placeholder="Ex: Rua X" />
            </div>
            <div class="ck-field">
              <div class="ck-lbl">Número</div>
              <input class="ck-inp" id="addrNumero" placeholder="Ex: 120" />
            </div>
          </div>

          <div class="ck-field">
            <div class="ck-lbl">Bairro (com sugestão)</div>
            <input class="ck-inp" id="addrBairro" placeholder="Digite: mon..." autocomplete="off" />
            <div id="bairroSug" style="margin-top:8px; display:none"></div>
            <div class="ck-hint" id="feePreviewText">Taxa: —</div>
          </div>

          <div class="ck-field">
            <div class="ck-lbl">Complemento (opcional)</div>
            <input class="ck-inp" id="addrComp" placeholder="Apto, bloco..." />
          </div>

          <div class="ck-field">
            <div class="ck-lbl">Referência (opcional)</div>
            <input class="ck-inp" id="addrRef" placeholder="Perto de..." />
          </div>

          <div class="ck-block" id="addrBlock" style="display:none"></div>

          <div class="ck-actions">
            <button class="ck-back ghost" id="ckBackFromAddr" type="button">Voltar</button>
            <button class="ck-btn" id="ckAddrContinue" type="button">Continuar</button>
          </div>
        </section>

        <section class="ck-step" data-step="pix" hidden>
          <div class="ck-box">
            <div class="ck-k">Total</div>
            <div class="ck-v" id="ckTotalPix">R$ 0,00</div>
            <div class="ck-feeline" id="ckFeeLine"></div>
          </div>

          <div class="ck-qrwrap">
            <div class="ck-qrbox">
              <img class="ck-qr" id="ckQrImg" alt="QR Code Pix" />
            </div>
            <div class="ck-copy">
              <div class="ck-k">PIX copia e cola</div>
              <textarea class="ck-textarea" id="ckPixPayload" rows="6" readonly></textarea>

              <div class="ck-actions" style="justify-content:flex-start; margin-top:10px;">
                <button class="ck-btn" id="ckCopyPix" type="button">Copiar</button>
                <button class="ck-btn ghost" id="ckBackFromPix" type="button">Voltar</button>
              </div>

              <div class="ck-warn" style="margin-top:10px;">
                Após efetuar o pagamento, envie o comprovante no WhatsApp para confirmação.
                Sem comprovante o pedido não será entregue. Clique em <strong>Pagamento concluído</strong>.
              </div>

              <div class="ck-actions" style="justify-content:flex-end; margin-top:10px;">
                <button class="ck-btn" id="ckPaid" type="button">Pagamento concluído</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  const LOCK_CLASS = "modal-open";
  function lockScroll(lock){
    if(lock){
      document.documentElement.classList.add(LOCK_CLASS);
      document.body.classList.add(LOCK_CLASS);
    }else{
      document.documentElement.classList.remove(LOCK_CLASS);
      document.body.classList.remove(LOCK_CLASS);
    }
  }

  function showStep(overlay, step){
    $$(".ck-step", overlay).forEach(sec => {
      sec.hidden = sec.getAttribute("data-step") !== step;
    });
  }

  // ✅ ÚNICA função pública de abrir checkout
  function openCheckout(){
    ensureCheckoutStyles();
    const overlay = ensureOverlay();

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden","false");
    lockScroll(true);

    if(window.Cart?.closeDrawer) window.Cart.closeDrawer();

    const totalPay = $("#ckTotalPay");
    if(totalPay) totalPay.textContent = money(total());

    showStep(overlay, "pay");
    setTimeout(bindBairroAutocomplete, 0);
  }

  function closeCheckout(){
    const overlay = $("#checkoutOverlay");
    if(!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden","true");
    lockScroll(false);
  }

  // =========================
  // ✅ Endereço / validação
  // =========================
  function readAddr(){
    try { return JSON.parse(localStorage.getItem(LS.ADDR) || "null"); }
    catch { return null; }
  }
  function saveAddr(addr){
    localStorage.setItem(LS.ADDR, JSON.stringify(addr || null));
  }

  function showAddrBlock(msg){
    const box = $("#addrBlock");
    if(!box) return;
    box.style.display = msg ? "block" : "none";
    box.textContent = msg || "";
  }

  function setFeePreviewText(html){
    const el = $("#feePreviewText");
    if(el) el.innerHTML = html || "Taxa: —";
  }

  function validateAddrAndFee(){
    const mode = getMode();

    const addr = {
      nome: ($("#addrNome")?.value || "").trim(),
      whats: ($("#addrWhats")?.value || "").trim(),
      rua: ($("#addrRua")?.value || "").trim(),
      numero: ($("#addrNumero")?.value || "").trim(),
      bairro: ($("#addrBairro")?.value || "").trim(),
      complemento: ($("#addrComp")?.value || "").trim(),
      referencia: ($("#addrRef")?.value || "").trim()
    };

    if(!addr.nome || !addr.whats || !addr.rua || !addr.numero || !addr.bairro){
      showAddrBlock("Preencha: nome, WhatsApp, rua, número e bairro.");
      return { ok:false, addr:null };
    }

    if(mode === "entrega"){
      const b = findBairro(addr.bairro);
      if(!b){
        showAddrBlock("Escolha um bairro da lista de sugestões (para validar o raio e calcular a taxa).");
        return { ok:false, addr:null };
      }

      const km = haversineKm(CONFIG.entrega.base, {lat:b.lat, lng:b.lng});
      if(km > CONFIG.entrega.maxKm){
        showAddrBlock(`Fora do raio de entrega (${CONFIG.entrega.maxKm} km). Selecione Retirar ou escolha outro bairro.`);
        localStorage.setItem(LS.FEE, "0");
        window.Cart?.renderAll?.();
        return { ok:false, addr:null };
      }

      const feeV = calcDeliveryFeeFromKm(km);
      localStorage.setItem(LS.FEE, String(feeV));
      setFeePreviewText(`Taxa estimada: <strong>${money(feeV)}</strong> • Distância: <strong>${Math.ceil(km)} km</strong>`);
      window.Cart?.renderAll?.();
    } else {
      localStorage.setItem(LS.FEE, "0");
      setFeePreviewText(`Taxa: <strong>${money(0)}</strong> (retirada)`);
      window.Cart?.renderAll?.();
    }

    showAddrBlock("");
    saveAddr(addr);
    return { ok:true, addr };
  }

  // =========================
  // ✅ Autocomplete bairro + taxa dinâmica
  // =========================
  function updateFeePreviewByBairroName(name){
    if(getMode() !== "entrega"){
      localStorage.setItem(LS.FEE, "0");
      setFeePreviewText(`Taxa: <strong>${money(0)}</strong> (retirada)`);
      window.Cart?.renderAll?.();
      return;
    }

    const r = computeAndStoreFeeForBairro(name);
    if(!name){
      setFeePreviewText("Taxa: —");
      return;
    }
    if(!r.ok && r.reason === "bairro"){
      setFeePreviewText("Escolha um bairro da sugestão para calcular a taxa.");
      return;
    }
    if(!r.ok && r.reason === "raio"){
      setFeePreviewText(`Fora do raio (<strong>${CONFIG.entrega.maxKm} km</strong>). Selecione Retirar.`);
      return;
    }
    setFeePreviewText(`Taxa estimada: <strong>${money(r.fee)}</strong> • Distância: <strong>${Math.ceil(r.km)} km</strong>`);
  }

  function bindBairroAutocomplete(){
    const inp =
      $("#addrBairro") ||
      $("#bairro") ||
      $('input[name="bairro"]') ||
      $('input[id*="bairro" i]') ||
      $$("input").find(i => (i.placeholder || "").toLowerCase().includes("bairro"));

    if(!inp) return;

    let box = $("#bairroSug");
    if(!box){
      box = document.createElement("div");
      box.id = "bairroSug";
      box.style.marginTop = "8px";
      box.style.display = "none";
      inp.insertAdjacentElement("afterend", box);
    }

    if(inp.dataset.bairroBound === "1") return;
    inp.dataset.bairroBound = "1";

    function render(list){
      if(!list.length){
        box.style.display = "none";
        box.innerHTML = "";
        return;
      }

      box.style.display = "block";
      box.innerHTML = `
        <div class="ck-sugwrap">
          ${list.map(b => `
            <button type="button" class="ck-sugbtn" data-bairro="${esc(b.name)}">
              ${esc(b.name)}
            </button>
          `).join("")}
        </div>
      `;
    }

    const onInput = () => {
      const v = inp.value || "";
      render(suggestBairros(v));
      updateFeePreviewByBairroName(v);
    };

    inp.addEventListener("input", onInput);
    inp.addEventListener("focus", onInput);

    box.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bairro]");
      if(!btn) return;
      inp.value = btn.getAttribute("data-bairro") || "";
      render([]);
      updateFeePreviewByBairroName(inp.value);
    });
  }

  // =========================
  // ✅ Fluxo: pay → addr → pix/whats
  // =========================
  function goPix(){
    const v = validateAddrAndFee();
    if(!v.ok) return;

    localStorage.setItem(LS.PAY, "pix");

    const overlay = $("#checkoutOverlay");
    if(!overlay) return;

    const totalPix = $("#ckTotalPix");
    if(totalPix) totalPix.textContent = money(total());

    const feeLine = $("#ckFeeLine");
    if(feeLine) feeLine.textContent = `Taxa: ${money(fee())}`;

    const txid = `LP${Date.now().toString().slice(-8)}`;
    const payload = buildPixPayload({
      chave: CONFIG.pix.chave,
      recebedor: CONFIG.pix.recebedor || CONFIG.lojaNome,
      cidade: CONFIG.pix.cidade || "BELO HORIZONTE",
      valor: total(),
      txid
    });

    const ta = $("#ckPixPayload");
    if(ta) ta.value = payload;

    const qr = $("#ckQrImg");
    if(qr) qr.src = qrUrlFromPayload(payload);

    localStorage.setItem(LS.PIX_TXID, txid);

    showStep(overlay, "pix");
  }

  async function copyPix(){
    const ta = $("#ckPixPayload");
    if(!ta) return;
    const text = ta.value || "";
    try{
      await navigator.clipboard.writeText(text);
      alert("PIX copiado ✅");
    }catch{
      ta.focus();
      ta.select();
      document.execCommand("copy");
      alert("PIX copiado ✅");
    }
  }

  function goAddr(pay){
    localStorage.setItem(LS.PAY, pay);
    const overlay = $("#checkoutOverlay");
    if(!overlay) return;

    const a = readAddr();
    if(a){
      $("#addrNome") && ($("#addrNome").value = a.nome || "");
      $("#addrWhats") && ($("#addrWhats").value = a.whats || "");
      $("#addrRua") && ($("#addrRua").value = a.rua || "");
      $("#addrNumero") && ($("#addrNumero").value = a.numero || "");
      $("#addrBairro") && ($("#addrBairro").value = a.bairro || "");
      $("#addrComp") && ($("#addrComp").value = a.complemento || "");
      $("#addrRef") && ($("#addrRef").value = a.referencia || "");
    }

    showAddrBlock("");
    updateFeePreviewByBairroName($("#addrBairro")?.value || "");
    showStep(overlay, "addr");

    setTimeout(bindBairroAutocomplete, 0);
  }

  function continueFromAddr(){
    const pay = localStorage.getItem(LS.PAY) || "pix";
    const v = validateAddrAndFee();
    if(!v.ok) return;

    if(pay === "credit" || pay === "debit"){
      const text = buildOrderText(v.addr, pay, null);
      window.location.href = waLink(text);
      return;
    }

    goPix();
  }

  function paidAndSend(){
    const addr = readAddr();
    if(!addr){
      alert("Preencha o endereço primeiro.");
      return;
    }
    const txid = localStorage.getItem(LS.PIX_TXID) || "";
    const text = buildOrderText(addr, "pix", { txid });
    window.location.href = waLink(text);
  }

  // =========================
  // ✅ Binds overlay (1 vez)
  // =========================
  function bindOverlayButtons(){
    const overlay = ensureOverlay();

    $("#ckClose", overlay)?.addEventListener("click", closeCheckout);
    $("#ckCancel", overlay)?.addEventListener("click", closeCheckout);

    overlay.addEventListener("click", (e) => {
      if(e.target === overlay) closeCheckout();
    });

    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && overlay.classList.contains("is-open")) closeCheckout();
    });

    $$(".ck-paybtn", overlay).forEach(btn => {
      btn.addEventListener("click", () => {
        const pay = btn.getAttribute("data-pay");
        if(pay === "pix")    goAddr("pix");
        if(pay === "credit") goAddr("credit");
        if(pay === "debit")  goAddr("debit");
      });
    });

    $("#ckBackFromAddr", overlay)?.addEventListener("click", ()=> showStep(overlay, "pay"));
    $("#ckBackFromPix", overlay)?.addEventListener("click", ()=> showStep(overlay, "pay"));
    $("#ckAddrContinue", overlay)?.addEventListener("click", continueFromAddr);
    $("#ckCopyPix", overlay)?.addEventListener("click", copyPix);
    $("#ckPaid", overlay)?.addEventListener("click", paidAndSend);

    setTimeout(bindBairroAutocomplete, 0);
  }

  // =========================
  // ✅ Openers globais (SEM DUPLICAR)
  // =========================
  function bindGlobalOpeners(){
    // Único intercept para qualquer botão/link com data-open-checkout
    document.addEventListener("click", (e) => {
      const el = e.target?.closest?.("[data-open-checkout]");
      if(!el) return;

      // se existe overlay, abre SEM navegar
      if(document.getElementById("checkoutOverlay")){
        e.preventDefault();
        e.stopPropagation();
        openCheckout();
        return;
      }

      // fallback: se for button, navega
      if(el.tagName === "BUTTON"){
        window.location.href = "checkout.html";
      }
      // se for <a>, deixa seguir href normal
    }, true);

    // COMBO (não interfere no checkout)
    document.addEventListener("click", (e) => {
      const el = e.target?.closest?.("[data-open-combo]");
      if(!el) return;
      const overlay = document.getElementById("comboOverlay");
      if(overlay){
        e.preventDefault();
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
      }
      // sem overlay: segue href
    }, true);
  }

  // =========================
  // ✅ WhatsApp flutuante
  // =========================
  function bindWaFloat(){
    const wa = $("#waFloat");
    if(!wa) return;
    wa.addEventListener("click", (e)=>{
      e.preventDefault();
      const text = `Olá! Quero fazer um pedido no *${CONFIG.lojaNome}* 😊`;
      window.location.href = waLink(text);
    });
  }

  function init(){
    ensureCheckoutStyles();
    ensureOverlay();
    bindOverlayButtons();
    bindGlobalOpeners();
    bindWaFloat();

    if(getMode() !== "entrega") localStorage.setItem(LS.FEE, "0");
    window.Cart?.renderAll?.();

    setTimeout(bindBairroAutocomplete, 0);

    // compat: se algo antigo chamar openPaymentSheet()
    window.openPaymentSheet = function(){ openCheckout(); };
  }

  window.addEventListener("DOMContentLoaded", init);
})();
