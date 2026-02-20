// js/app.js — LP Grill (padrão Açaí: render + carrinho + drawer)
(function(){
  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531999999999", // <<< TROQUE AQUI (DDI 55 + número)
    deliveryFee: 5.00,
    eta: "30–60 min"
  };

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const $ = (s)=> document.querySelector(s);

  const CART_KEY = "LPGRILL_CART_V2";
  const MODE_KEY = "LPGRILL_MODE_V2"; // entrega|retirar

  const readCart = ()=> { try{return JSON.parse(localStorage.getItem(CART_KEY)||"{}")}catch{return {}}; };
  const writeCart = (m)=> localStorage.setItem(CART_KEY, JSON.stringify(m));
  const readMode = ()=> (localStorage.getItem(MODE_KEY) || "entrega");
  const writeMode = (v)=> localStorage.setItem(MODE_KEY, v);

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

  function qty(id){
    const m = readCart();
    return Number(m[id]||0);
  }
  function count(){
    const m = readCart();
    return Object.values(m).reduce((a,b)=>a+(b||0),0);
  }
  function subtotal(){
    const m = readCart();
    let sum = 0;
    for(const [id, q] of Object.entries(m)){
      const p = findProduct(id);
      if(p) sum += p.price * q;
    }
    return sum;
  }
  function fee(){
    return readMode()==="entrega" ? Number(CFG.deliveryFee||0) : 0;
  }
  function total(){
    return subtotal() + fee();
  }

  function add(id){
    const m = readCart();
    m[id] = Number(m[id]||0) + 1;
    writeCart(m);
    syncUI();
  }
  function dec(id){
    const m = readCart();
    m[id] = Number(m[id]||0) - 1;
    if(m[id] <= 0) delete m[id];
    writeCart(m);
    syncUI();
  }
  function remove(id){
    const m = readCart();
    delete m[id];
    writeCart(m);
    syncUI();
  }
  function clear(){
    writeCart({});
    syncUI();
  }

  function openDrawer(){
    const d = $("#cartDrawer");
    if(!d) return;
    d.classList.add("open");
    d.setAttribute("aria-hidden","false");
    renderDrawer();
  }
  function closeDrawer(){
    const d = $("#cartDrawer");
    if(!d) return;
    d.classList.remove("open");
    d.setAttribute("aria-hidden","true");
  }

  function productCard(p){
    return `
      <article class="product" data-tap="${p.id}">
        <img class="pimg" src="${p.img}" alt="${p.title}" onerror="this.style.display='none'">
        <div class="pbody">
          <div class="ptitle">
            <strong>${p.title}</strong>
            <span class="price">${money(p.price)}</span>
          </div>
          <div class="pdesc">${p.desc||""}</div>
          <div class="pmeta">
            <span class="badge">${p.tag||"LP Grill"}</span>
            <div class="qty">
              <button class="qbtn" data-dec="${p.id}" type="button">-</button>
              <strong data-qty-for="${p.id}">0</strong>
              <button class="qbtn" data-add="${p.id}" type="button">+</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // GLOBAL: páginas chamam isso
  window.renderCategory = function(key, listId){
    const list = document.getElementById(listId);
    if(!list) return;

    const items = (window.DATA && window.DATA[key]) ? window.DATA[key] : [];
    list.innerHTML = items.map(productCard).join("");

    list.querySelectorAll("[data-add]").forEach(b=>{
      b.addEventListener("click",(e)=>{ e.stopPropagation(); add(b.getAttribute("data-add")); });
    });
    list.querySelectorAll("[data-dec]").forEach(b=>{
      b.addEventListener("click",(e)=>{ e.stopPropagation(); dec(b.getAttribute("data-dec")); });
    });

    list.querySelectorAll("[data-tap]").forEach(card=>{
      card.addEventListener("click",(e)=>{
        if(e.target.closest("button")) return;
        add(card.getAttribute("data-tap"));
      });
    });

    syncUI();
  };

  function renderDrawer(){
    const wrap = $("#cartItems");
    if(!wrap) return;

    const m = readCart();
    const entries = Object.entries(m).filter(([,q])=>q>0);

    if(!entries.length){
      wrap.innerHTML = `<div class="muted">Seu carrinho está vazio.</div>`;
    }else{
      wrap.innerHTML = entries.map(([id,q])=>{
        const p = findProduct(id);
        if(!p) return "";
        return `
          <div class="citem">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${money(p.price)} cada</div>
              </div>
              <button class="qbtn remove" data-rm="${id}" type="button">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" data-d="${id}" type="button">-</button>
                <strong data-qty-for="${id}">${q}</strong>
                <button class="qbtn" data-a="${id}" type="button">+</button>
              </div>
              <strong>${money(p.price*q)}</strong>
            </div>
          </div>
        `;
      }).join("");

      wrap.querySelectorAll("[data-a]").forEach(b=> b.addEventListener("click",()=>{ add(b.getAttribute("data-a")); renderDrawer(); }));
      wrap.querySelectorAll("[data-d]").forEach(b=> b.addEventListener("click",()=>{ dec(b.getAttribute("data-d")); renderDrawer(); }));
      wrap.querySelectorAll("[data-rm]").forEach(b=> b.addEventListener("click",()=>{ remove(b.getAttribute("data-rm")); renderDrawer(); }));
    }

    $("#subTotal") && ($("#subTotal").textContent = money(subtotal()));
    $("#deliveryFee") && ($("#deliveryFee").textContent = money(fee()));
    $("#grandTotal") && ($("#grandTotal").textContent = money(total()));
    $("#etaText") && ($("#etaText").textContent = CFG.eta);
  }

  function syncUI(){
    document.querySelectorAll("[data-qty-for]").forEach(el=>{
      const id = el.getAttribute("data-qty-for");
      el.textContent = String(qty(id));
    });

    $("#cartCount") && ($("#cartCount").textContent = String(count()));

    const sticky = $("#stickyCTA");
    const ctaTotal = $("#ctaTotal");
    ctaTotal && (ctaTotal.textContent = money(total()));
    sticky && (sticky.hidden = count() === 0);

    if($("#cartDrawer")?.classList.contains("open")){
      renderDrawer();
    }
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    const wa = $("#waFloat");
    if(wa){
      wa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent("Olá! Quero fazer um pedido no "+CFG.brand+" 🍽️")}`;
    }

    $("#openCart")?.addEventListener("click", openDrawer);
    $("#ctaOpenCart")?.addEventListener("click", openDrawer);
    $("#closeCart")?.addEventListener("click", closeDrawer);
    $("#closeCartBackdrop")?.addEventListener("click", closeDrawer);

    const btnE = $("#modeEntrega");
    const btnR = $("#modeRetirar");

    const applyMode = ()=>{
      const mode = readMode();
      btnE?.classList.toggle("active", mode==="entrega");
      btnR?.classList.toggle("active", mode==="retirar");
      syncUI();
    };

    btnE?.addEventListener("click", ()=>{ writeMode("entrega"); applyMode(); });
    btnR?.addEventListener("click", ()=>{ writeMode("retirar"); applyMode(); });
    applyMode();

    $("#clearCart")?.addEventListener("click", ()=>{ clear(); renderDrawer(); });

    // infoBar opcional
    const info = $("#infoBar");
    if(info){
      info.innerHTML = `
        <div class="pill">🚚 <strong>Taxa:</strong> ${money(CFG.deliveryFee)}</div>
        <div class="pill">⏱️ <strong>Tempo:</strong> ${CFG.eta}</div>
      `;
    }

    syncUI();
  });
})();
