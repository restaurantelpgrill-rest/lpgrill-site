// js/page-products.js — renderizador padrão de páginas (LP Grill)
(function(){
  // ===== util =====
  window.money = window.money || function(v){
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  };

  // ===== garantir Cart (caso não exista) =====
  // Se você já tem cart.js, ele assume. Se não tiver, cria um Cart básico.
  if(!window.Cart){
    const KEY = "LPGRILL_CART_V1";
    const read = ()=>{ try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}} };
    const write = (m)=> localStorage.setItem(KEY, JSON.stringify(m));
    window.Cart = {
      getMap(){ return read(); },
      qty(id){ const m=read(); return Number(m[id]||0); },
      count(){ const m=read(); return Object.values(m).reduce((a,b)=>a+(b||0),0); },
      add(id){ const m=read(); m[id]=(m[id]||0)+1; write(m); this.syncUI(); },
      dec(id){ const m=read(); m[id]=(m[id]||0)-1; if(m[id]<=0) delete m[id]; write(m); this.syncUI(); },
      remove(id){ const m=read(); delete m[id]; write(m); this.syncUI(); },
      clear(){ write({}); this.syncUI(); },
      subtotal(){
        const m=read(); let sum=0;
        const all = allProducts();
        for(const [id,qty] of Object.entries(m)){
          const p = all.find(x=>x.id===id);
          if(p) sum += p.price*qty;
        }
        return sum;
      },
      itemsDetailed(){
        const m=read(); const all = allProducts();
        return Object.entries(m).map(([id,qty])=>{
          const p = all.find(x=>x.id===id);
          return p ? {id, qty, product:p} : null;
        }).filter(Boolean);
      },
      syncUI(){
        const badge = document.getElementById("cartBadge");
        const total = document.getElementById("ctaTotal");
        if(badge) badge.textContent = String(this.count());
        if(total) total.textContent = money(this.subtotal());
        document.querySelectorAll("[data-qty-for]").forEach(el=>{
          const id = el.getAttribute("data-qty-for");
          el.textContent = String(this.qty(id));
        });
      }
    };
  }

  function allProducts(){
    const list = [];
    if(window.DATA){
      for(const k in window.DATA){
        if(Array.isArray(window.DATA[k])) list.push(...window.DATA[k]);
      }
    }
    return list;
  }

  // ===== drawer =====
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
            <a class="btn primary" href="./checkout.html">Finalizar</a>
            <button class="btn light" id="clearCart" type="button">Limpar</button>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(wrap);

    const open = ()=>{ wrap.classList.add("open"); renderDrawer(); };
    const close = ()=> wrap.classList.remove("open");

    document.getElementById("openCart")?.addEventListener("click", open);
    document.getElementById("ctaCart")?.addEventListener("click", open);
    document.getElementById("drawerBackdrop")?.addEventListener("click", close);
    document.getElementById("closeCart")?.addEventListener("click", close);

    document.getElementById("clearCart")?.addEventListener("click", ()=>{
      Cart.clear();
      renderDrawer();
    });

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
          <button class="qbtn remove" data-rm="${id}" type="button">remover</button>
        </div>

        <div class="ccontrols">
          <div class="qty">
            <button class="qbtn" data-dec="${id}" type="button">-</button>
            <strong data-qty-for="${id}">${qty}</strong>
            <button class="qbtn" data-add="${id}" type="button">+</button>
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
    body.querySelectorAll("[data-rm]").forEach(b=>{
      b.addEventListener("click", ()=>{
        Cart.remove(b.getAttribute("data-rm"));
        renderDrawer();
      });
    });

    if(tot) tot.textContent = money(Cart.subtotal());
    Cart.syncUI();
  }

  // ===== render da página de produtos =====
  window.renderCategoryPage = function(KEY){
    ensureDrawer();

    const $list = document.getElementById("productList");
    const $search = document.getElementById("searchItems");
    const $hint = document.getElementById("emptyHint");

    const items = (window.DATA && window.DATA[KEY]) ? window.DATA[KEY] : [];

    function card(p){
      return `
        <div class="product" data-tap-add="${p.id}">
          <img class="pimg" src="${p.img}" alt="${p.title}" onerror="this.style.display='none'">
          <div class="pbody">
            <div class="ptitle">
              <strong>${p.title}</strong>
              <span class="price">${money(p.price)}</span>
            </div>

            <div class="pdesc">${p.desc || ""}</div>

            <div class="pmeta">
              <span class="badge">${p.tag || "LP Grill"}</span>

              <div class="qty">
                <button class="qbtn" data-dec-item="${p.id}" type="button">-</button>
                <strong data-qty-for="${p.id}">0</strong>
                <button class="qbtn" data-add-item="${p.id}" type="button">+</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function render(list){
      if(!list.length){
        if($list) $list.innerHTML = "";
        if($hint) $hint.style.display = "block";
        Cart.syncUI();
        return;
      }
      if($hint) $hint.style.display = "none";
      if($list) $list.innerHTML = list.map(card).join("");

      // binds
      document.querySelectorAll("[data-add-item]").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          e.stopPropagation();
          Cart.add(btn.getAttribute("data-add-item"));
          Cart.syncUI();
        });
      });
      document.querySelectorAll("[data-dec-item]").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          e.stopPropagation();
          Cart.dec(btn.getAttribute("data-dec-item"));
          Cart.syncUI();
        });
      });
      document.querySelectorAll("[data-tap-add]").forEach(cardEl=>{
        cardEl.addEventListener("click", (e)=>{
          if(e.target.closest("button")) return;
          Cart.add(cardEl.getAttribute("data-tap-add"));
          Cart.syncUI();
        });
      });

      Cart.syncUI();
    }

    render(items);

    if($search){
      $search.addEventListener("input", ()=>{
        const q = $search.value.trim().toLowerCase();
        const filtered = items.filter(p => (p.title + " " + (p.desc||"")).toLowerCase().includes(q));
        render(filtered);
      });
    }
  };

})();
