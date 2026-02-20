// js/app.js — LP Grill (carrinho + finalizar WhatsApp) - sem mexer no layout
(function(){
  // ===== Config =====
  const CFG = {
    brand: "LP Grill",
    whatsapp: "5531999999999", // TROQUE AQUI (só números com DDI 55)
    taxaEntrega: 5.00
  };

  // ===== Utils =====
  window.money = window.money || function(v){
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  };

  function allProducts(){
    const list = [];
    if(window.DATA){
      for(const k in window.DATA){
        if(Array.isArray(window.DATA[k])) list.push(...window.DATA[k]);
      }
    }
    return list;
  }

  function findProduct(id){
    return allProducts().find(p => p.id === id);
  }

  // ===== Cart (localStorage) =====
  const Cart = window.Cart || {};
  window.Cart = Cart;

  Cart.key = "LPGRILL_CART";
  Cart.stateKey = "LPGRILL_CHECKOUT";

  Cart.read = function(){
    try{ return JSON.parse(localStorage.getItem(Cart.key) || "[]"); }
    catch(e){ return []; }
  };

  Cart.write = function(items){
    localStorage.setItem(Cart.key, JSON.stringify(items));
    Cart.syncUI();
  };

  Cart.add = function(id){
    const items = Cart.read();
    const found = items.find(x => x.id === id);
    if(found) found.qty += 1;
    else items.push({id, qty:1});
    Cart.write(items);
  };

  Cart.dec = function(id){
    const items = Cart.read();
    const found = items.find(x => x.id === id);
    if(!found) return;
    found.qty -= 1;
    const next = items.filter(x => x.qty > 0);
    Cart.write(next);
  };

  Cart.remove = function(id){
    Cart.write(Cart.read().filter(x => x.id !== id));
  };

  Cart.count = function(){
    return Cart.read().reduce((a,b)=> a + (b.qty||0), 0);
  };

  Cart.subtotal = function(){
    return Cart.read().reduce((sum, it)=>{
      const p = findProduct(it.id);
      return sum + (p ? (p.price*it.qty) : 0);
    },0);
  };

  Cart.checkoutState = function(){
    try{
      return JSON.parse(localStorage.getItem(Cart.stateKey) || "{}");
    }catch(e){ return {}; }
  };

  Cart.setCheckoutState = function(patch){
    const cur = Cart.checkoutState();
    const next = {...cur, ...patch};
    localStorage.setItem(Cart.stateKey, JSON.stringify(next));
    return next;
  };

  Cart.total = function(){
    const st = Cart.checkoutState();
    const sub = Cart.subtotal();
    const taxa = (st.tipo === "entrega") ? (Number(CFG.taxaEntrega)||0) : 0;
    return sub + taxa;
  };

  Cart.syncUI = function(){
    const badge = document.getElementById("cartBadge");
    const total = document.getElementById("ctaTotal");
    if(badge) badge.textContent = String(Cart.count());
    if(total) total.textContent = money(Cart.total());
  };

  // ===== Drawer simples (se não existir no seu HTML, ele não aparece) =====
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
            <div class="mini muted">Revise e finalize no WhatsApp</div>
          </div>
          <button class="icon-btn" id="closeCart" type="button">✕</button>
        </div>

        <div class="drawer-body">
          <div class="delivery-toggle">
            <button class="dt-btn" id="dtEntrega" type="button">Entrega</button>
            <button class="dt-btn" id="dtRetirada" type="button">Retirada</button>
          </div>

          <div class="note">
            <label>Endereço (obrigatório se Entrega)</label>
            <textarea id="addr" placeholder="Rua, número, bairro, complemento..."></textarea>
          </div>

          <div class="note">
            <label>Pagamento</label>
            <select id="pay" style="border:1px solid rgba(199,201,209,.85);border-radius:14px;padding:12px;background:rgba(255,255,255,.82);outline:none">
              <option value="Pix">Pix</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          <div class="note" id="trocoBox" style="display:none">
            <label>Troco para quanto?</label>
            <input id="troco" placeholder="Ex: 50" style="border:1px solid rgba(199,201,209,.85);border-radius:14px;padding:12px;background:rgba(255,255,255,.82);outline:none" />
          </div>

          <div class="note">
            <label>Observações</label>
            <textarea id="obs" placeholder="Sem cebola, bem passado, etc..."></textarea>
          </div>

          <div style="height:12px"></div>

          <div id="cartItems"></div>
        </div>

        <div class="drawer-foot">
          <div class="totals">
            <div class="row"><span class="muted">Subtotal</span><strong id="subV">${money(0)}</strong></div>
            <div class="row"><span class="muted">Taxa</span><strong id="taxV">${money(0)}</strong></div>
            <div class="row total"><span>Total</span><strong id="totV">${money(0)}</strong></div>
          </div>

          <div class="drawer-actions">
            <a class="btn primary" id="goCheckout" href="./checkout.html">Finalizar</a>
          </div>

          <div class="mini muted" id="warn" style="margin-top:10px; display:none; color:#b91c1c; font-weight:900">
            Coloque o endereço para enviar o pedido!!
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(wrap);

    // Events
    const open = ()=> { wrap.classList.add("open"); renderDrawer(); };
    const close = ()=> wrap.classList.remove("open");

    document.getElementById("openCart")?.addEventListener("click", open);
    document.getElementById("ctaCart")?.addEventListener("click", open);
    document.getElementById("drawerBackdrop")?.addEventListener("click", close);
    document.getElementById("closeCart")?.addEventListener("click", close);

    const st = Cart.checkoutState();
    const tipo = st.tipo || "entrega";
    setTipo(tipo);

    document.getElementById("dtEntrega").addEventListener("click", ()=> setTipo("entrega"));
    document.getElementById("dtRetirada").addEventListener("click", ()=> setTipo("retirada"));

    const addr = document.getElementById("addr");
    const pay = document.getElementById("pay");
    const obs = document.getElementById("obs");
    const troco = document.getElementById("troco");

    addr.value = st.endereco || "";
    pay.value = st.pagamento || "Pix";
    obs.value = st.obs || "";
    troco.value = st.troco || "";

    const syncState = ()=>{
      Cart.setCheckoutState({
        endereco: addr.value,
        pagamento: pay.value,
        obs: obs.value,
        troco: troco.value
      });
      toggleTroco(pay.value);
      renderDrawer();
    };

    addr.addEventListener("input", syncState);
    obs.addEventListener("input", syncState);
    pay.addEventListener("change", syncState);
    troco.addEventListener("input", syncState);

    toggleTroco(pay.value);
  }

  function setTipo(tipo){
    Cart.setCheckoutState({tipo});
    const e = document.getElementById("dtEntrega");
    const r = document.getElementById("dtRetirada");
    if(e && r){
      e.classList.toggle("active", tipo==="entrega");
      r.classList.toggle("active", tipo==="retirada");
    }
    renderDrawer();
  }

  function toggleTroco(pay){
    const box = document.getElementById("trocoBox");
    if(!box) return;
    box.style.display = (pay === "Dinheiro") ? "block" : "none";
  }

  function renderDrawer(){
    const items = Cart.read();
    const $items = document.getElementById("cartItems");
    const $sub = document.getElementById("subV");
    const $tax = document.getElementById("taxV");
    const $tot = document.getElementById("totV");
    const $warn = document.getElementById("warn");

    if(!$items) return;

    if(!items.length){
      $items.innerHTML = `<div class="muted" style="padding:10px 2px">Seu carrinho está vazio.</div>`;
    }else{
      $items.innerHTML = items.map(it=>{
        const p = findProduct(it.id) || {title:"Item", price:0};
        return `
          <div class="citem">
            <div class="citem-top">
              <div>
                <div class="cname">${p.title}</div>
                <div class="cdesc">${money(p.price)} • x${it.qty}</div>
              </div>
              <button class="qbtn remove" onclick="Cart.remove('${it.id}')">remover</button>
            </div>
            <div class="ccontrols">
              <div class="qty">
                <button class="qbtn" onclick="Cart.dec('${it.id}')">-</button>
                <strong>${it.qty}</strong>
                <button class="qbtn" onclick="Cart.add('${it.id}')">+</button>
              </div>
              <strong>${money(p.price*it.qty)}</strong>
            </div>
          </div>
        `;
      }).join("");
    }

    const st = Cart.checkoutState();
    const sub = Cart.subtotal();
    const taxa = (st.tipo === "entrega") ? (Number(CFG.taxaEntrega)||0) : 0;
    const tot = sub + taxa;

    if($sub) $sub.textContent = money(sub);
    if($tax) $tax.textContent = money(taxa);
    if($tot) $tot.textContent = money(tot);

    // valida endereço se entrega
    const needAddr = (st.tipo === "entrega");
    const hasAddr = (st.endereco || "").trim().length >= 6;
    if($warn) $warn.style.display = (needAddr && !hasAddr && items.length) ? "block" : "none";

    Cart.syncUI();
  }

  // ===== Finalizar (WhatsApp) =====
  function buildWhatsMessage(){
    const items = Cart.read();
    const st = Cart.checkoutState();
    const lines = [];

    lines.push(`*Pedido — ${CFG.brand}*`);
    lines.push(``);

    if(!items.length){
      lines.push(`(Carrinho vazio)`);
      return lines.join("\n");
    }

    // itens
    lines.push(`*Itens:*`);
    items.forEach(it=>{
      const p = findProduct(it.id);
      if(!p) return;
      lines.push(`- ${it.qty}x ${p.title} — ${money(p.price*it.qty)}`);
    });

    const sub = Cart.subtotal();
    const taxa = (st.tipo === "entrega") ? (Number(CFG.taxaEntrega)||0) : 0;
    const total = sub + taxa;

    lines.push(``);
    lines.push(`Subtotal: *${money(sub)}*`);
    lines.push(`Taxa: *${money(taxa)}*`);
    lines.push(`Total: *${money(total)}*`);
    lines.push(``);

    // entrega/retirada
    const tipo = st.tipo || "entrega";
    lines.push(`*${tipo === "entrega" ? "Entrega" : "Retirada"}*`);

    // endereço obrigatório se entrega
    const addr = (st.endereco || "").trim();
    if(tipo === "entrega"){
      lines.push(`Endereço: ${addr || "(NÃO INFORMADO)"} `);
    }

    // pagamento/troco
    const pay = st.pagamento || "Pix";
    lines.push(`Pagamento: *${pay}*`);
    if(pay === "Dinheiro"){
      const troco = (st.troco || "").trim();
      if(troco) lines.push(`Troco: ${troco}`);
    }

    // observações
    const obs = (st.obs || "").trim();
    if(obs){
      lines.push(``);
      lines.push(`Obs: ${obs}`);
    }

    return lines.join("\n");
  }

  function canFinish(){
    const items = Cart.read();
    if(!items.length) return {ok:false, msg:"Carrinho vazio."};

    const st = Cart.checkoutState();
    const tipo = st.tipo || "entrega";
    if(tipo === "entrega"){
      const addr = (st.endereco || "").trim();
      if(addr.length < 6){
        return {ok:false, msg:"Coloque o endereço para enviar o pedido!!"};
      }
    }
    return {ok:true};
  }

  function goWhats(){
    const v = canFinish();
    if(!v.ok){
      alert(v.msg);
      return;
    }
    const text = buildWhatsMessage();
    const url = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  // ===== Bind em qualquer página =====
  document.addEventListener("DOMContentLoaded", ()=>{
    ensureDrawer();
    Cart.syncUI();

    // botão "Finalizar" da home (link) — deixa funcionando mesmo se clicar
    // Se tiver checkout.html com botão, pode chamar goWhats lá também.
    // Aqui: se existir um elemento com id="btnWhats" ou id="finalizarWhats", ele usa.
    document.getElementById("finalizarWhats")?.addEventListener("click", goWhats);
    document.getElementById("btnWhats")?.addEventListener("click", goWhats);

    // Se o seu checkout tiver um botão "Enviar no WhatsApp", dê um id pra ele:
    // id="finalizarWhats"
  });

  // expõe para uso manual
  window.goWhats = goWhats;

})();
