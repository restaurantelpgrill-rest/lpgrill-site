// js/app.js — LP Grill (Checkout Premium: endereço obrigatório + PIX QR/copia-cola + WhatsApp)
(() => {
  "use strict";

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  // =========================
  // ✅ CONFIG (edite aqui)
  // =========================
  const CONFIG = {
    whatsappDDI55: "5531998832407", // seu número (só números com DDI 55)
    lojaNome: "LP Grill",
    lojaCidadeUF: "Belo Horizonte/MG",

    // PIX (obrigatório p/ QR e copia/cola)
    pix: {
      chave: "SUA_CHAVE_PIX_AQUI",     // ex: email/telefone/cpf/cnpj/chave aleatória
      recebedor: "LP GRILL",           // nome do recebedor
      cidade: "BELO HORIZONTE",        // cidade do recebedor (sem acento é ok)
      // txid pode ser fixo ou gerado. Aqui vou gerar no pedido.
    },

    // raio/entrega
    entrega: {
      maxKm: 12,
      base: { lat: -19.818749, lng: -43.881194 }, // ponto base que você passou
      // ✅ Lista de bairros (coloque os que você quiser)
      // DICA: você pode ir adicionando aos poucos.
      bairros: [
        // exemplos (coloque as coords reais quando tiver)
        { name: "Monte Azul",  lat: -19.9000, lng: -43.9500 },
        { name: "São Gabriel", lat: -19.8600, lng: -43.9000 },
        { name: "Belmonte",    lat: -19.8600, lng: -43.8800 },
      ],
      // taxa (se quiser cobrar)
      // aqui deixo 0; você pode mudar depois:
      feeFixed: 0
    }
  };

  // chaves LS usadas pelo cart.js
  const LS = {
    CART: "LPGRILL_CART_V3",
    MODE: "LPGRILL_MODE_V3",
    FEE:  "LPGRILL_FEE_V1",
    ADDR: "LPGRILL_ADDR_V1",
    PAY:  "LPGRILL_PAY_V1"
  };

  // =========================
  // ✅ Product helpers
  // =========================
  function allProducts(){
    const d = window.DATA || {};
    const cats = ["marmitas","porcoes","bebidas","sobremesas"];
    const out = [];
    cats.forEach(k => {
      const arr = Array.isArray(d[k]) ? d[k] : [];
      arr.forEach(p => out.push(p));
    });
    return out;
  }

  // ✅ usado pelo cart.js pra calcular subtotal
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
    const mode = getMode();
    if(mode !== "entrega") return 0;
    const f = Number(localStorage.getItem(LS.FEE) || CONFIG.entrega.feeFixed || 0);
    return Number.isFinite(f) ? f : 0;
  }

  function total(){
    return subtotal() + fee();
  }

  // =========================
  // ✅ Distância / raio
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
    return CONFIG.entrega.bairros
      .filter(b => b.name.toLowerCase().includes(p))
      .slice(0, 8);
  }

  // =========================
  // ✅ PIX EMV (copia e cola) + CRC16
  // =========================
  function crc16(payload){
    // CRC-16/CCITT-FALSE
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
    // Padrão EMV BR (Pix)
    // 00: Payload Format Indicator
    // 01: Point of Initiation Method (12 = dinâmico) — opcional
    // 26: Merchant Account Info (GUI + chave)
    // 52: MCC (0000)
    // 53: Moeda (986 = BRL)
    // 54: Valor (opcional mas recomendado)
    // 58: País (BR)
    // 59: Nome recebedor
    // 60: Cidade
    // 62: Additional Data Field Template (TXID)
    // 63: CRC
    const gui = field("00", "BR.GOV.BCB.PIX") + field("01", chave);

    const p00 = field("00", "01");
    const p01 = field("01", "12"); // dinâmico (pode manter)
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
    // QR via Google Chart (sem depender de lib)
    const chl = encodeURIComponent(payload);
    return `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chld=M|1&chl=${chl}`;
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
  // ✅ Checkout Overlay (auto-create)
  // =========================
  function ensureOverlay(){
    let overlay = $("#checkoutOverlay");
    if(overlay) return overlay;

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

        <!-- STEP: pay -->
        <section class="ck-step" data-step="pay">
          <div class="ck-box">
            <div class="ck-k">Total atual</div>
            <div class="ck-v" id="ckTotalPay">R$ 0,00</div>
            <div class="ck-hint">Você só consegue pagar/mandar pedido depois de preencher o endereço.</div>
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

        <!-- STEP: addr -->
        <section class="ck-step" data-step="addr" hidden>
          <div class="ck-box">
            <div class="ck-k">Preencha o endereço</div>
            <div class="ck-hint">Obrigatório para liberar o pagamento e o envio no WhatsApp.</div>
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

          <div class="ck-field ck-loc">
            <div class="ck-lbl">Bairro (com sugestão)</div>
            <input class="ck-inp" id="addrBairro" placeholder="Digite: mon..." autocomplete="off" />
            <div id="bairroSug" style="margin-top:8px; display:none"></div>
            <div class="ck-hint">Raio máximo: <strong>${CONFIG.entrega.maxKm} km</strong> (entrega). Retirar não tem limite.</div>
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

        <!-- STEP: pix -->
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
                Depois de pagar, clique em <strong>Pagamento concluído</strong> para enviar o pedido no WhatsApp.
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

  function openCheckout(){
    const overlay = ensureOverlay();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden","false");
    lockScroll(true);

    if(window.Cart?.closeDrawer) window.Cart.closeDrawer();

    // total da tela
    $("#ckTotalPay") && ($("#ckTotalPay").textContent = money(total()));
    showStep(overlay, "pay");
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

    // entrega: valida raio
    if(mode === "entrega"){
      const b = findBairro(addr.bairro);
      if(!b){
        showAddrBlock("Escolha um bairro da lista de sugestões (para validar o raio de entrega).");
        return { ok:false, addr:null };
      }

      const km = haversineKm(CONFIG.entrega.base, {lat:b.lat, lng:b.lng});
      if(km > CONFIG.entrega.maxKm){
        showAddrBlock(`Fora do raio de entrega (${CONFIG.entrega.maxKm} km). Selecione Retirar ou escolha outro bairro.`);
        return { ok:false, addr:null };
      }

      // taxa (se quiser cobrar, você pode mudar depois)
      localStorage.setItem(LS.FEE, String(CONFIG.entrega.feeFixed || 0));
    } else {
      localStorage.setItem(LS.FEE, "0");
    }

    showAddrBlock("");
    saveAddr(addr);
    return { ok:true, addr };
  }

  // =========================
  // ✅ Autocomplete bairro
  // =========================
  function renderSug(list){
    const box = $("#bairroSug");
    if(!box) return;

    if(!list.length){
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }

    box.style.display = "block";
    box.innerHTML = `
      <div style="
        display:flex; flex-wrap:wrap; gap:8px;
      ">
        ${list.map(b => `
          <button type="button" data-bairro="${esc(b.name)}"
            style="
              border:1px solid rgba(255,255,255,.14);
              background:rgba(255,255,255,.06);
              color:#fff;
              border-radius:999px;
              padding:8px 10px;
              font-weight:800;
              cursor:pointer;
            ">
            ${esc(b.name)}
          </button>
        `).join("")}
      </div>
    `;
  }

  function bindBairroAutocomplete(){
    const inp = $("#addrBairro");
    const box = $("#bairroSug");
    if(!inp || !box) return;

    inp.addEventListener("input", ()=>{
      const list = suggestBairros(inp.value);
      renderSug(list);
    });

    box.addEventListener("click", (e)=>{
      const btn = e.target.closest("[data-bairro]");
      if(!btn) return;
      inp.value = btn.getAttribute("data-bairro") || "";
      renderSug([]);
    });
  }

  // =========================
  // ✅ PIX step
  // =========================
  function goPix(){
    // endereço obrigatório antes do pix
    const v = validateAddrAndFee();
    if(!v.ok) return;

    if(!CONFIG.pix.chave || CONFIG.pix.chave === "SUA_CHAVE_PIX_AQUI"){
      showAddrBlock("Falta configurar sua CHAVE PIX no app.js (CONFIG.pix.chave).");
      return;
    }

    localStorage.setItem(LS.PAY, "pix");

    const overlay = $("#checkoutOverlay");
    if(!overlay) return;

    // total/fee
    $("#ckTotalPix") && ($("#ckTotalPix").textContent = money(total()));
    $("#ckFeeLine") && ($("#ckFeeLine").textContent = `Taxa: ${money(fee())}`);

    // gera payload
    const txid = `LP${Date.now().toString().slice(-8)}`;
    const payload = buildPixPayload({
      chave: CONFIG.pix.chave,
      recebedor: CONFIG.pix.recebedor || CONFIG.lojaNome,
      cidade: CONFIG.pix.cidade || "BELO HORIZONTE",
      valor: total(),
      txid
    });

    $("#ckPixPayload") && ($("#ckPixPayload").value = payload);
    const qr = $("#ckQrImg");
    if(qr) qr.src = qrUrlFromPayload(payload);

    // salva pra usar no whatsapp
    localStorage.setItem("LPGRILL_PIX_TXID_V1", txid);

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

    // preencher com o que já tinha
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
    showStep(overlay, "addr");
    renderSug([]); // limpa sugestão
  }

  function continueFromAddr(){
    const pay = localStorage.getItem(LS.PAY) || "pix";
    const v = validateAddrAndFee();
    if(!v.ok) return;

    // cartão/débito: manda direto pro WhatsApp após endereço
    if(pay === "credit" || pay === "debit"){
      const text = buildOrderText(v.addr, pay, null);
      window.location.href = waLink(text);
      return;
    }

    // pix: vai pro step pix
    goPix();
  }

  function paidAndSend(){
    const addr = readAddr();
    if(!addr){
      alert("Preencha o endereço primeiro.");
      return;
    }
    const txid = localStorage.getItem("LPGRILL_PIX_TXID_V1") || "";
    const text = buildOrderText(addr, "pix", { txid });
    window.location.href = waLink(text);
  }

  // =========================
  // ✅ Openers/Closers
  // =========================
  function bindCheckoutOpeners(){
    // intercepta checkout.html (sticky + drawer + links)
    $$('a[href="checkout.html"], a[href="./checkout.html"]').forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout();
      });
    });

    const stickyFinal = $("#stickyCTA a.cta.primary");
    if(stickyFinal){
      stickyFinal.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout();
      });
    }

    $$('#cartDrawer a[href="checkout.html"]').forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout();
      });
    });
  }

  function bindCheckoutClosers(){
    const overlay = ensureOverlay();
    const ckClose  = $("#ckClose", overlay);
    const ckCancel = $("#ckCancel", overlay);

    ckClose?.addEventListener("click", closeCheckout);
    ckCancel?.addEventListener("click", closeCheckout);

    overlay.addEventListener("click", (e) => {
      if(e.target === overlay) closeCheckout();
    });

    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && overlay.classList.contains("is-open")) closeCheckout();
    });
  }

  function bindPayButtons(){
    const overlay = ensureOverlay();

    $$(".ck-paybtn", overlay).forEach(btn => {
      btn.addEventListener("click", () => {
        const pay = btn.getAttribute("data-pay");
        if(pay === "pix") goAddr("pix");     // ✅ endereço antes
        if(pay === "credit") goAddr("credit");
        if(pay === "debit")  goAddr("debit");
      });
    });

    $("#ckBackFromAddr", overlay)?.addEventListener("click", ()=> showStep(overlay, "pay"));
    $("#ckBackFromPix", overlay)?.addEventListener("click", ()=> showStep(overlay, "pay"));

    $("#ckAddrContinue", overlay)?.addEventListener("click", continueFromAddr);

    $("#ckCopyPix", overlay)?.addEventListener("click", copyPix);
    $("#ckPaid", overlay)?.addEventListener("click", paidAndSend);

    bindBairroAutocomplete();
  }

  // =========================
  // ✅ WhatsApp flutuante (opcional)
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
    ensureOverlay();
    bindCheckoutOpeners();
    bindCheckoutClosers();
    bindPayButtons();
    bindWaFloat();

    // garante UI do carrinho ok
    window.Cart?.renderAll?.();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
