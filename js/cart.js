// js/cart.js — LP Grill (Carrinho V3) ✅ FIX completo (lp:cart-change + addons somando)
// ✅ soma qualquer item que exista em window.DATA (inclui addons)
// ✅ expõe Cart.count() e Cart.items() (pra badge/cta/checkout)
// ✅ abre carrinho por #openCart, #ctaOpenCart e [data-open-cart]
// ✅ 1 único evento: lp:cart-change

(() => {
  "use strict";

  const CART_KEY = "LPGRILL_CART_V3";
  const MODE_KEY = "LPGRILL_MODE_V3"; // entrega | retirar
  const FEE_KEY  = "LPGRILL_FEE_V1";  // taxa salva pelo checkout

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const $ = (s, r=document)=> r.querySelector(s);

  // =========================
  // ✅ Evento padrão (1 só)
  // =========================
  function emitChange(){
    document.dispatchEvent(new CustomEvent("lp:cart-change"));
  }

  // =========================
  // ✅ Storage
  // =========================
  function readCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); }
    catch { return {}; }
  }
  function writeCart(obj){
    localStorage.setItem(CART_KEY, JSON.stringify(obj || {}));
  }

  // =========================
  // ✅ Mode / Fee
  // =========================
  function getMode(){ return localStorage.getItem(MODE_KEY) || "entrega"; }
  function setMode(mode){ localStorage.setItem(MODE_KEY, mode); }

  function getFee(){
    const fee = Number(localStorage.getItem(FEE_KEY) || "0");
    return Number.isFinite(fee) ? fee : 0;
  }

  // =========================
  // ✅ Resolver de produto (fallback inclui addons)
  // =========================
  function findProductFallback(id){
    const d = window.DATA || {};
    const pick = (k)=> Array.isArray(d[k]) ? d[k] : [];

    const all = []
      .concat(pick("marmitas"))
      .concat(pick("massas"))
      .concat(pick("sobremesas")) // alias
      .concat(pick("porcoes"))
      .concat(pick("bebidas"))
      .concat(pick("combo"))
      .concat(pick("combos"))
      .concat(pick("addons"));    // ✅ aqui está o principal

    return all.find(p => String(p?.id) === String(id)) || null;
  }

  function findProduct(id){
    const fn = window.findProduct;
    if(typeof fn === "function"){
      const p = fn(id);
      if(p) return p;
    }
    return findProductFallback(id);
  }

  // =========================
  // ✅ Contagem / Totais
  // =========================
  function cartCount(){
    const c = readCart();
    return Object.values(c).reduce((a,q)=> a + Number(q||0), 0);
  }

  function cartItems(){
    // retorna array {id, qty, product}
    const c = readCart();
    return Object.entries(c).map(([id, qty]) => ({
      id,
      qty: Number(qty||0),
      product: findProduct(id)
    })).filter(x => x.qty > 0);
  }

  function subtotal(){
    const c = readCart();
    let sum = 0;
    for(const [id,q] of Object.entries(c)){
      const p = findProduct(id);
      if(p) sum += Number(p.price||0) * Number(q||0);
    }
    return sum;
  }

  function total(){
    const sub = subtotal();
    const fee = (getMode()==="entrega") ? getFee() : 0;
    return sub + fee;
  }

  // =========================
  // ✅ Ações
  // =========================
  function clear(){
    writeCart({});
    renderAll();
  }

  function add(id){
    const c = readCart();
    c[id] = Number(c[id]||0) + 1;
    writeCart(c);
    renderAll();
  }

  function dec(id){
    const c = readCart();
    c[id] = Number(c[id]||0) - 1;
    if(c[id] <= 0) delete c[id];
    writeCart(c);
    renderAll();
  }

  function remove(id){
    const c = readCart();
    delete c[id];
    writeCart(c);
    renderAll();
  }

  // =========================
  // ✅ Drawer
  // =========================
  function openDrawer(){
    const drawer = $("#cartDrawer");
    if(!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden","false");
    renderDrawer();
  }

  function closeDrawer(){
    const drawer = $("#cartDrawer");
    if(!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden","true");
  }

  function setModeActiveUI(){
    const m = getMode();
    $("#modeEntrega")?.classList.toggle("active", m==="entrega");
    $("#modeRetirar")?.classList.toggle("active", m==="retirar");
  }

  // =========================
  // ✅ Badge + Sticky + Totais topo
  // =========================
  function updateBadges(n){
    const count = Number(n || 0);
    const b1 = document.getElementById("cartBadge");
    const b2 = document.getElementById("cartCount");

    [b1, b2].forEach(b=>{
      if(!b) return;
      b.hidden = count <= 0;
      b.textContent = String(count);
    });
  }

  function renderTopUI(){
    const count = cartCount();

    // total na sticky
    $("#ctaTotal") && ($("#ctaTotal").textContent = money(total()));

    const sticky = $("#stickyCTA");
    if(sticky) sticky.hidden = (count <= 0);

    updateBadges(count);
  }

  // =========================
  // ✅ Render do carrinho
  // =========================
  function renderDrawer(){
    const wrap  = $("#cartItems");
    const subEl = $("#subTotal");
    const feeEl = $("#deliveryFee");
    const totEl = $("#grandTotal");
    const etaEl = $("#etaText");

    if(!wrap) return;

    const c = readCart();
    const entries = Object.entries(c);

    if(!entries.length){
      wrap.innerHTML = `<div class="muted" style="padding:10px 2px">Seu carrinho está vazio.</div>`;
    } else {
      wrap.innerHTML = entries.map(([id,q])=>{
        const p = findProduct(id);
        if(!p) return ""; // se item não existe no DATA, ignora
        const title = p.title || p.name || "Item";
        const unit = Number(p.price||0);
        const line = unit * Number(q||0);

        return `
          <div class="citem" data-id="${String(id)}">
            <div class="citem-top">
              <div>
                <div class="cname">${title}</div>
                <div class="cdesc">${q} × ${money(unit)}</div>
              </div>
              <button class="qbtn remove" data-action="remove" type="button">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" data-action="dec" type="button">-</button>
                <strong>${q}</strong>
                <button class="qbtn" data-action="add" type="button">+</button>
              </div>
              <strong>${money(line)}</strong>
            </div>
          </div>
        `;
      }).join("");
    }

    const sub = subtotal();
    const fee = (getMode()==="entrega") ? getFee() : 0;
    const tot = sub + fee;

    if(subEl) subEl.textContent = money(sub);
    if(feeEl) feeEl.textContent = money(fee);
    if(totEl) totEl.textContent = money(tot);
    if(etaEl) etaEl.textContent = "30–60 min";
  }

  // =========================
  // ✅ Render geral
  // =========================
  function renderAll(){
    setModeActiveUI();
    renderTopUI();
    renderDrawer();

    // se existir vitrine com qty, pede update (opcional)
    window.renderCardsQty?.();

    emitChange();
  }

  // =========================
  // ✅ Bind (1 vez)
  // =========================
  function bind(){
    // IDs (compat)
    $("#openCart")?.addEventListener("click", openDrawer);
    $("#ctaOpenCart")?.addEventListener("click", openDrawer);

    // ✅ padrão: qualquer coisa com data-open-cart
    document.addEventListener("click", (e)=>{
      const el = e.target?.closest?.("[data-open-cart]");
      if(!el) return;
      e.preventDefault();
      openDrawer();
    }, true);

    $("#closeCart")?.addEventListener("click", closeDrawer);
    $("#closeCartBackdrop")?.addEventListener("click", closeDrawer);

    $("#clearCart")?.addEventListener("click", clear);

    $("#modeEntrega")?.addEventListener("click", ()=>{
      setMode("entrega");
      renderAll();
    });

    $("#modeRetirar")?.addEventListener("click", ()=>{
      setMode("retirar");
      localStorage.setItem(FEE_KEY,"0");
      renderAll();
    });

    // Delegação ações no carrinho
    $("#cartItems")?.addEventListener("click", (e)=>{
      const btn = e.target.closest("[data-action]");
      if(!btn) return;
      const item = btn.closest(".citem");
      const id = item?.getAttribute("data-id");
      if(!id) return;

      const act = btn.getAttribute("data-action");
      if(act==="add") add(id);
      if(act==="dec") dec(id);
      if(act==="remove") remove(id);
    });

    // primeira renderização
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", bind);

  // =========================
  // ✅ API pública
  // =========================
  window.Cart = {
    readCart, writeCart,
    add, dec, remove, clear,
    openDrawer, closeDrawer,
    subtotal, total,
    getMode, setMode,
    renderAll,

    // ✅ necessários pro badge/integrações
    count: cartCount,
    items: cartItems
  };

  // força sync inicial do badge em páginas que carregam depois
  setTimeout(() => emitChange(), 0);
})();
