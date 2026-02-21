const CART_KEY="LP_CART";

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY)||"{}");
}
function saveCart(c){
  localStorage.setItem(CART_KEY,JSON.stringify(c));
}
function addItem(id){
  let c=getCart();
  c[id]=(c[id]||0)+1;
  saveCart(c);
}
function removeItem(id){
  let c=getCart();
  if(!c[id]) return;
  c[id]--;
  if(c[id]<=0) delete c[id];
  saveCart(c);
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
}// js/cart.js — mantido apenas para compatibilidade (carrinho está no app.js)
// js/cart.js
(() => {
  const CART_KEY = "LPGRILL_CART_V3";
  const MODE_KEY = "LPGRILL_MODE_V3"; // entrega | retirar

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const $ = (s, r=document)=> r.querySelector(s);

  function readCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); }
    catch { return {}; }
  }
  function writeCart(obj){
    localStorage.setItem(CART_KEY, JSON.stringify(obj || {}));
  }

  function getMode(){
    return localStorage.getItem(MODE_KEY) || "entrega";
  }
  function setMode(mode){
    localStorage.setItem(MODE_KEY, mode);
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

  function clear(){
    writeCart({});
    syncUI();
  }

  function add(id){
    const c = readCart();
    c[id] = Number(c[id]||0) + 1;
    writeCart(c);
    syncUI();
  }

  function dec(id){
    const c = readCart();
    c[id] = Number(c[id]||0) - 1;
    if(c[id] <= 0) delete c[id];
    writeCart(c);
    syncUI();
  }

  function remove(id){
    const c = readCart();
    delete c[id];
    writeCart(c);
    syncUI();
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

  function renderDrawer(){
    const wrap = $("#cartItems");
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
          <div class="citem">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${q} × ${money(p.price)}</div>
              </div>
              <button class="qbtn remove" onclick="Cart.remove('${id}')">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" onclick="Cart.dec('${id}')">-</button>
                <strong>${q}</strong>
                <button class="qbtn" onclick="Cart.add('${id}')">+</button>
              </div>
              <strong>${money(line)}</strong>
            </div>
          </div>
        `;
      }).join("");
    }

    const sub = subtotal();
    // a taxa real é calculada no checkout (checkout.js) e salva em localStorage pelo overlay
    const fee = Number(localStorage.getItem("LPGRILL_FEE_V1") || "0");
    const mode = getMode();
    const feeUse = (mode === "entrega") ? fee : 0;
    const total = sub + feeUse;

    if(subEl) subEl.textContent = money(sub);
    if(feeEl) feeEl.textContent = money(feeUse);
    if(totEl) totEl.textContent = money(total);
    if(etaEl) etaEl.textContent = "30–60 min";

    syncUI();
  }

  function syncUI(){
    $("#cartCount") && ($("#cartCount").textContent = String(cartCount()));
    $("#ctaTotal") && ($("#ctaTotal").textContent = money(subtotal() + (getMode()==="entrega" ? Number(localStorage.getItem("LPGRILL_FEE_V1")||0) : 0)));
    renderDrawer();
  }

  // Bind
  document.addEventListener("DOMContentLoaded", ()=>{
    $("#openCart")?.addEventListener("click", openDrawer);
    $("#ctaOpenCart")?.addEventListener("click", openDrawer);

    $("#closeCart")?.addEventListener("click", closeDrawer);
    $("#closeCartBackdrop")?.addEventListener("click", closeDrawer);

    $("#clearCart")?.addEventListener("click", clear);

    $("#modeEntrega")?.addEventListener("click", ()=>{
      setMode("entrega");
      syncUI();
    });
    $("#modeRetirar")?.addEventListener("click", ()=>{
      setMode("retirar");
      localStorage.setItem("LPGRILL_FEE_V1","0");
      syncUI();
    });

    syncUI();
  });

  window.Cart = { readCart, writeCart, add, dec, remove, clear, openDrawer, closeDrawer, subtotal, getMode, setMode, syncUI };
})();
