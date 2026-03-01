// js/app.js — LP Grill (App Core v3) — SYNC TOTAL + TAXA + ADICIONAIS MODAL
// ✅ NÃO cria checkout overlay (evita duplicação / quebra do QR)
// ✅ findProduct resolve marmitas + massas + combos + addons (compat total com cart.js)
// ✅ Taxa: entrega (raio 12km) + R$1/km (mín. R$5) — salva em LPGRILL_FEE_V1
// ✅ Modo entrega/retirar via LPGRILL_MODE_V3
// ✅ WhatsApp flutuante
// ✅ Modal de adicionais (bottom sheet) — só em marmitas e massas (por window.PAGE)
// ✅ Pratos por dia: app expõe helpers (render.js já bloqueia, mas fica compat)

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

    entrega: {
      maxKm: 12,
      base: { lat: -19.818749, lng: -43.881194 }, // Maria Tereza
      feePerKm: 1,
      feeMin: 5,

      // bairros (você já tinha)
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

  // =========================
  // ✅ LocalStorage keys (compat)
  // =========================
  const LS = {
    CART: "LPGRILL_CART_V3",
    MODE: "LPGRILL_MODE_V3",
    FEE:  "LPGRILL_FEE_V1",
    ADDR: "LPGRILL_ADDR_V1",
  };

  // =========================
  // ✅ Dias (compat com render.js)
  // =========================
  function lpToday(){ return new Date().getDay(); } // 0 dom..6 sáb
  function lpIsAvailable(p){
    if(!p || !Array.isArray(p.days) || p.days.length === 0) return true;
    return p.days.includes(lpToday());
  }
  window.lpToday = lpToday;
  window.lpIsAvailable = lpIsAvailable;

  // =========================
  // ✅ Products resolver (Marmitas + Massas + Combo/Combos + Addons)
  // =========================
  function normalizeData(){
    const base = window.DATA || window.LP_DATA || window.MENU || {};
    const cats = base.categories || base.categorias || null;

    const pick = (key)=>{
      if (cats && Array.isArray(cats[key])) return cats[key];
      if (Array.isArray(base[key])) return base[key];
      return [];
    };

    // combos compat
    const comboSrc  = pick("combo");
    const combosSrc = pick("combos");
    const finalCombos = (comboSrc.length ? comboSrc : combosSrc);

    return {
      marmitas: pick("marmitas"),
      massas:   pick("massas"),
      // alias legado
      sobremesas: pick("sobremesas"),
      // compat combos
      combo:  finalCombos,
      combos: finalCombos,
      // adicionais
      addons: pick("addons"),
    };
  }

  function allProducts(){
    const d = normalizeData();

    // massas: se vier legado "sobremesas", junta
    const massas = (Array.isArray(d.massas) && d.massas.length) ? d.massas
                  : (Array.isArray(d.sobremesas) ? d.sobremesas : []);

    const out = [];
    (Array.isArray(d.marmitas) ? d.marmitas : []).forEach(p => out.push(p));
    (Array.isArray(massas) ? massas : []).forEach(p => out.push(p));

    // combos + addons também precisam ser resolvidos no carrinho
    (Array.isArray(d.combos) ? d.combos : []).forEach(p => out.push(p));
    (Array.isArray(d.addons) ? d.addons : []).forEach(p => out.push(p));

    return out;
  }

  window.findProduct = function(id){
    const sid = String(id);
    return allProducts().find(p => String(p.id) === sid) || null;
  };

  // =========================
  // ✅ Cart helpers
  // =========================
  function readCartObj(){
    try { return JSON.parse(localStorage.getItem(LS.CART) || "{}"); }
    catch { return {}; }
  }

  function getMode(){
    return localStorage.getItem(LS.MODE) || "entrega";
  }

  function setMode(mode){
    const m = (mode === "retirar") ? "retirar" : "entrega";
    localStorage.setItem(LS.MODE, m);
    if(m !== "entrega") localStorage.setItem(LS.FEE, "0");
    dispatchCartChange();
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

  function dispatchCartChange(){
    document.dispatchEvent(new CustomEvent("lp:cart-change"));
  }
  function dispatchFeeChange(){
    document.dispatchEvent(new CustomEvent("lp:fee-change", { detail: { fee: fee(), mode: getMode() } }));
    dispatchCartChange();
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

  function findBairroExact(name){
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

  // calcula taxa a partir do bairro (somente entrega)
  function computeAndStoreFeeForBairro(bairroName){
    if(getMode() !== "entrega"){
      localStorage.setItem(LS.FEE, "0");
      dispatchFeeChange();
      return { ok:true, km:0, fee:0, reason:"retirar" };
    }

    const b = findBairroExact(bairroName);
    if(!b){
      localStorage.setItem(LS.FEE, "0");
      dispatchFeeChange();
      return { ok:false, km:0, fee:0, reason:"bairro" };
    }

    const km = haversineKm(CONFIG.entrega.base, {lat:b.lat, lng:b.lng});
    if(km > CONFIG.entrega.maxKm){
      localStorage.setItem(LS.FEE, "0");
      dispatchFeeChange();
      return { ok:false, km, fee:0, reason:"raio" };
    }

    const feeV = calcDeliveryFeeFromKm(km);
    localStorage.setItem(LS.FEE, String(feeV));
    dispatchFeeChange();
    return { ok:true, km, fee:feeV };
  }

  // expõe pro checkout.js usar se quiser
  window.LPGRILL = window.LPGRILL || {};
  window.LPGRILL.getMode = getMode;
  window.LPGRILL.setMode = setMode;
  window.LPGRILL.subtotal = subtotal;
  window.LPGRILL.fee = fee;
  window.LPGRILL.total = total;
  window.LPGRILL.computeAndStoreFeeForBairro = computeAndStoreFeeForBairro;
  window.LPGRILL.suggestBairros = suggestBairros;

  // =========================
  // ✅ WhatsApp helper
  // =========================
  function waLink(text){
    const msg = encodeURIComponent(text);
    return `https://wa.me/${CONFIG.whatsappDDI55}?text=${msg}`;
  }

  function bindWaFloat(){
    const wa = $("#waFloat");
    if(!wa) return;
    if(wa.dataset.bound === "1") return;
    wa.dataset.bound = "1";
    wa.addEventListener("click", (e)=>{
      e.preventDefault();
      const text = `Olá! Quero fazer um pedido no *${CONFIG.lojaNome}* 😊`;
      window.location.href = waLink(text);
    });
  }

  // =========================
  // ✅ Modal de Adicionais (Bottom Sheet)
  // =========================
  function initAddonsModal(){
    // só ativa se a página tiver o modal no HTML
    const modal = $("#addonsModal");
    const fab = $("#openAddons");
    const listEl = $("#addonsList");
    const btnClose = $("[data-close-addons]");
    const btnAdd = $("#addonsAddBtn");
    const sub = $("#addonsSubtitle");
    const sumCount = $("#addonsCount");
    const sumTotal = $("#addonsTotal");

    if(!modal || !fab || !listEl || !btnAdd) return;

    // só marmitas e massas
    const page = String(window.PAGE || "").toLowerCase();
    const allowed = (page === "marmitas" || page === "massas");
    fab.hidden = !allowed;
    if(!allowed) return;

    // evita duplicar bind
    if(modal.dataset.bound === "1") return;
    modal.dataset.bound = "1";

    // pega addons do DATA
    const d = normalizeData();
    const addons = Array.isArray(d.addons) ? d.addons : [];

    // filtra pelos applies
    function addonsForPage(){
      const accept = (page === "massas") ? ["massas","sobremesas"] : ["marmitas"];
      return addons.filter(a=>{
        const applies = Array.isArray(a.applies) ? a.applies : null;
        if(!applies) return true;
        const low = applies.map(x => String(x).toLowerCase());
        return accept.some(k => low.includes(k));
      });
    }

    // seleção temporária (somente no modal)
    let selected = {}; // {addonId: qty}

    function open(){
      selected = {};
      render();
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden","false");
      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");

      if(sub){
        sub.textContent = page === "massas"
          ? "Escolha adicionais para suas massas"
          : "Escolha adicionais para sua marmita";
      }
    }

    function close(){
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden","true");
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    }

    function selCountAndTotal(){
      let c = 0;
      let t = 0;
      const list = addonsForPage();
      for(const [id,q] of Object.entries(selected)){
        const qq = Number(q||0);
        if(qq <= 0) continue;
        c += qq;
        const a = list.find(x => String(x.id) === String(id));
        if(a) t += Number(a.price||0) * qq;
      }
      if(sumCount) sumCount.textContent = String(c);
      if(sumTotal) sumTotal.textContent = money(t);
    }

    function rowHtml(a){
      const q = Number(selected[a.id] || 0);
      const canDec = q > 0;
      return `
        <div class="lp-addon-card" data-id="${esc(a.id)}" style="margin-bottom:10px;">
          <div class="lp-addon-left">
            <div class="lp-addon-name">${esc(a.title || a.name || "Adicional")}</div>
            <div class="lp-addon-price">${money(a.price)}</div>
          </div>
          <div class="lp-addon-step">
            <button type="button" class="lp-addon-btn" ${canDec ? "" : "disabled"} data-dec="${esc(a.id)}">−</button>
            <button type="button" class="lp-addon-mid" data-add="${esc(a.id)}">
              <span>Adicionar</span><span>${q}</span>
            </button>
            <button type="button" class="lp-addon-btn" data-add="${esc(a.id)}">+</button>
          </div>
        </div>
      `;
    }

    function render(){
      const list = addonsForPage();
      if(!list.length){
        listEl.innerHTML = `<div class="lp-empty">Sem adicionais cadastrados.</div>`;
        selCountAndTotal();
        return;
      }
      listEl.innerHTML = list.map(rowHtml).join("");
      selCountAndTotal();
    }

    // clicks dentro do modal
    listEl.addEventListener("click", (e)=>{
      const add = e.target.closest("[data-add]");
      const dec = e.target.closest("[data-dec]");
      if(add){
        const id = add.getAttribute("data-add");
        selected[id] = Number(selected[id]||0) + 1;
        render();
      }
      if(dec){
        const id = dec.getAttribute("data-dec");
        selected[id] = Math.max(0, Number(selected[id]||0) - 1);
        render();
      }
    });

    // aplicar no carrinho
    btnAdd.addEventListener("click", ()=>{
      // adiciona no carrinho usando Cart (compat)
      const entries = Object.entries(selected).filter(([,q]) => Number(q||0) > 0);
      if(!entries.length){
        close();
        return;
      }

      // adiciona N vezes
      entries.forEach(([id,q])=>{
        const n = Number(q||0);
        for(let i=0; i<n; i++){
          window.Cart?.add?.(id);
        }
      });

      window.Cart?.renderAll?.();
      dispatchCartChange();
      close();
    });

    // abrir / fechar
    fab.addEventListener("click", open);
    btnClose && btnClose.addEventListener("click", close);
    modal.addEventListener("click", (e)=>{
      if(e.target && e.target.hasAttribute("data-close-addons")) close();
    });
    window.addEventListener("keydown", (e)=>{
      if(e.key === "Escape" && modal.classList.contains("is-open")) close();
    });
  }

  // =========================
  // ✅ Modo entrega / retirar (botões do drawer, se existirem)
  // =========================
  function bindModeButtons(){
    const bEnt = $("#modeEntrega");
    const bRet = $("#modeRetirar");

    if(bEnt && bEnt.dataset.bound !== "1"){
      bEnt.dataset.bound = "1";
      bEnt.addEventListener("click", ()=> setMode("entrega"));
    }
    if(bRet && bRet.dataset.bound !== "1"){
      bRet.dataset.bound = "1";
      bRet.addEventListener("click", ()=> setMode("retirar"));
    }
  }

  // =========================
  // ✅ Boot
  // =========================
  function init(){
    // garante taxa zerada se retirar
    if(getMode() !== "entrega") localStorage.setItem(LS.FEE, "0");

    bindWaFloat();
    bindModeButtons();

    // init adicionais (se existir no HTML)
    initAddonsModal();

    // re-render geral (cart.js cuida do resto)
    window.Cart?.renderAll?.();
    dispatchCartChange();
    dispatchFeeChange();
  }

  // boot robusto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
