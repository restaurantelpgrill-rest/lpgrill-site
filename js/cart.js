// js/cart.js — LP Grill (Carrinho V3) ✅ (com evento lp:cart-change)
(() => {
  const CART_KEY = "LPGRILL_CART_V3";
  const MODE_KEY = "LPGRILL_MODE_V3"; // entrega | retirar
  const FEE_KEY  = "LPGRILL_FEE_V1";  // taxa salva pelo checkout (ou reset no retirar)

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const $ = (s, r=document)=> r.querySelector(s);

  function emitChange(){
    // ✅ padrão para toda UI se atualizar (badge, sticky, etc.)
    document.dispatchEvent(new CustomEvent("lp:cart-change"));
  }

  function readCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); }
    catch { return {}; }
  }
  function writeCart(obj){
    localStorage.setItem(CART_KEY, JSON.stringify(obj || {}));
  }

  function getMode(){ return localStorage.getItem(MODE_KEY) || "entrega"; }
  function setMode(mode){ localStorage.setItem(MODE_KEY, mode); }

  function getFee(){
    const fee = Number(localStorage.getItem(FEE_KEY) || "0");
    return Number.isFinite(fee) ? fee : 0;
  }

  function cartCount(){
    const c = readCart();
    return Object.values(c).reduce((a,q)=> a + Number(q||0), 0);
  }

  function subtotal(){
    const c = readCart();
    let sum = 0;
    for(const [id,q] of Object.entries(c)){
      const p = window.findProduct?.(id);
      if(p) sum += Number(p.price||0) * Number(q||0);
    }
    return sum;
  }

  function total(){
    const sub = subtotal();
    const fee = (getMode()==="entrega") ? getFee() : 0;
    return sub + fee;
  }

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

  function renderTopUI(){
    const count = cartCount();

    // se existir algum contador em outras telas, atualiza (não depende disso)
    const cartCountEl = $("#cartCount");
    if(cartCountEl) cartCountEl.textContent = String(count);

    $("#ctaTotal") && ($("#ctaTotal").textContent = money(total()));

    const sticky = $("#stickyCTA");
    if(sticky) sticky.hidden = (count <= 0);
  }

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
        const p = window.findProduct?.(id);
        if(!p) return "";
        const line = Number(p.price||0)*Number(q||0);
        return `
          <div class="citem" data-id="${id}">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${q} × ${money(p.price)}</div>
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

  function renderAll(){
    // Atualiza tudo sem loop infinito
    setModeActiveUI();
    renderTopUI();
    renderDrawer();

    // ✅ se existir vitrine com qty/seleção, pede pra render.js atualizar
    window.renderCardsQty?.();

    // ✅ notifica UI externa (badge do header, etc.)
    emitChange();
  }

  function bind(){
    // ✅ o index padronizado pode clicar em data-open-cart
    // mas manter ids também (compatibilidade)
    $("#openCart")?.addEventListener("click", openDrawer);
    $("#ctaOpenCart")?.addEventListener("click", openDrawer);

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

    // Delegação de eventos do carrinho
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

    renderAll();
  }

  document.addEventListener("DOMContentLoaded", bind);

  window.Cart = {
    readCart, writeCart,
    add, dec, remove, clear,
    openDrawer, closeDrawer,
    subtotal, total,
    getMode, setMode,
    renderAll
  };
  // ===== Badge (compat: cartBadge e cartCount) =====
function lpUpdateBadges(count){
  const n = Number(count || 0);

  // pega qualquer badge existente (novo e antigo)
  const b1 = document.getElementById("cartBadge");
  const b2 = document.getElementById("cartCount");

  [b1, b2].forEach(b=>{
    if(!b) return;
    b.hidden = n <= 0;
    b.textContent = String(n);
  });
}

// chama sempre que o carrinho mudar
function lpEmitCartChange(){
  document.dispatchEvent(new CustomEvent("lp:cart-change"));
}

// quando qualquer página abrir, tenta sincronizar
document.addEventListener("lp:cart-change", () => {
  try{
    const c = window.Cart;
    if(!c) return;

    // tenta pegar contagem por métodos diferentes
    let n = 0;
    if (typeof c.count === "function") n = c.count() || 0;
    else if (typeof c.items === "function") n = (c.items() || []).length;
    else if (c.state && Array.isArray(c.state.items)) n = c.state.items.length;

    lpUpdateBadges(n);
  }catch(e){}
});

// dispara uma vez ao carregar
setTimeout(() => lpEmitCartChange(), 0);
})();
