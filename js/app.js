// js/app.js — liga UI + drawer do carrinho + controles +/-
(function(){
  // ===== Utils =====
  window.money = window.money || function(v){
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  };

  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531999999999" // TROQUE
  };

  // ===== Drawer (painel do carrinho) =====
  function ensureDrawer(){
    if(document.getElementById("cartDrawer")) return;

    const wrap = document.createElement("div");
    wrap.className = "drawer";
    wrap.id = "cartDrawer";
    wrap.innerHTML = `
      <div class="drawer-backdrop" id="drawerBackdrop"></div>
      <aside class="drawer-panel" role="dialog" aria-label="Carrinho">
        <div class="drawer-head">
          <div>
            <strong style="font-size:16px">Seu carrinho</strong>
            <div class="mini muted">Itens selecionados</div>
          </div>
          <button class="icon-btn" id="closeCart" type="button">✕</button>
        </div>

        <div class="drawer-body" id="drawerBody"></div>

        <div class="drawer-foot">
          <div class="totals">
            <div class="row total"><span>Total</span><strong id="drawerTotal">${money(0)}</strong></div>
          </div>

          <div class="drawer-actions">
            <a class="btn primary" id="goCheckout" href="./checkout.html">Finalizar</a>
            <button class="btn light" id="clearCart" type="button">Limpar</button>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(wrap);

    const open = ()=> { wrap.classList.add("open"); renderDrawer(); };
    const close = ()=> wrap.classList.remove("open");

    document.getElementById("openCart")?.addEventListener("click", open);
    document.getElementById("ctaCart")?.addEventListener("click", open);
    document.getElementById("drawerBackdrop")?.addEventListener("click", close);
    document.getElementById("closeCart")?.addEventListener("click", close);

    document.getElementById("clearCart")?.addEventListener("click", ()=>{
      Cart.clear();
      renderDrawer();
    });

    // expõe para outras páginas chamarem
    window.openCart = open;
  }

  function renderDrawer(){
    const body = document.getElementById("drawerBody");
    const tot = document.getElementById("drawerTotal");
    if(!body) return;

    const items = Cart.itemsDetailed();
    if(!items.length){
      body.innerHTML = `<div class="muted" style="padding:10px 2px">Seu carrinho está vazio.</div>`;
      if(tot) tot.textContent = money(0);
      Cart.syncUI();
      return;
    }

    body.innerHTML = items.map(({id, qty, product:p}) => `
      <div class="citem">
        <div class="citem-top">
          <div>
            <div class="cname">${p.title}</div>
            <div class="cdesc">${money(p.price)} cada</div>
          </div>
          <button class="qbtn remove" data-remove="${id}">remover</button>
        </div>

        <div class="ccontrols">
          <div class="qty">
            <button class="qbtn" data-dec="${id}">-</button>
            <strong data-qty-for="${id}">${qty}</strong>
            <button class="qbtn" data-add="${id}">+</button>
          </div>
          <strong>${money(p.price * qty)}</strong>
        </div>
      </div>
    `).join("");

    body.querySelectorAll("[data-add]").forEach(b=>{
      b.addEventListener("click", ()=>{
        Cart.add(b.getAttribute("data-add"));
        renderDrawer();
      });
    });
    body.querySelectorAll("[data-dec]").forEach(b=>{
      b.addEventListener("click", ()=>{
        Cart.dec(b.getAttribute("data-dec"));
        renderDrawer();
      });
    });
    body.querySelectorAll("[data-remove]").forEach(b=>{
      b.addEventListener("click", ()=>{
        Cart.remove(b.getAttribute("data-remove"));
        renderDrawer();
      });
    });

    if(tot) tot.textContent = money(Cart.subtotal());
    Cart.syncUI();
  }

  // ===== Liga controles de produto (+/- no card) =====
  function bindProductControls(){
    document.querySelectorAll("[data-add-item]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-add-item");
        Cart.add(id);
        Cart.syncUI();
      });
    });

    document.querySelectorAll("[data-dec-item]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-dec-item");
        Cart.dec(id);
        Cart.syncUI();
      });
    });

    // clique no card também adiciona (opcional)
    document.querySelectorAll("[data-tap-add]").forEach(card=>{
      card.addEventListener("click", (e)=>{
        // não dispara se clicar nos botões
        if(e.target.closest("button")) return;
        Cart.add(card.getAttribute("data-tap-add"));
        Cart.syncUI();
      });
    });
  }

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    ensureDrawer();
    bindProductControls();
    Cart.syncUI();

    // Whats float (se existir)
    const wa = document.getElementById("waFloat");
    if(wa){
      wa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent("Olá! Quero fazer um pedido no " + CFG.brand + " 🍽️")}`;
    }
  });

  // Quando navegar entre páginas e o HTML mudar, chama manual se precisar:
  window.bindProductControls = bindProductControls;
  window.renderDrawer = renderDrawer;

})();
