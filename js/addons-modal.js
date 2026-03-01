// js/addons-modal.js — Modal de Adicionais (corrigido p/ somar no carrinho)
// ✅ usa window.DATA.addons
// ✅ filtra por applies (marmitas / massas / sobremesas)
// ✅ + / - altera carrinho em tempo real
// ✅ resumo correto (addonsCount / addonsTotal)
// ✅ fecha pelo backdrop / X / botão "Adicionar ao carrinho" (que aqui vira "Fechar")

(() => {
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const modal   = document.getElementById("addonsModal");
  const btnOpen = document.getElementById("openAddons");
  const listEl  = document.getElementById("addonsList");

  // ✅ IDs corretos do seu HTML
  const subEl   = document.getElementById("addonsSubtitle");
  const countEl = document.getElementById("addonsCount");
  const totalEl = document.getElementById("addonsTotal");
  const btnAdd  = document.getElementById("addonsAddBtn");

  if(!modal || !btnOpen || !listEl) return;

  // ==========
  // ✅ GARANTIA: findProduct incluir addons (caso app.js não esteja antes do cart.js)
  // ==========
  if(typeof window.findProduct !== "function"){
    window.findProduct = function(id){
      const d = window.DATA || {};
      const all = []
        .concat(Array.isArray(d.marmitas) ? d.marmitas : [])
        .concat(Array.isArray(d.massas) ? d.massas : [])
        .concat(Array.isArray(d.sobremesas) ? d.sobremesas : [])
        .concat(Array.isArray(d.combo) ? d.combo : [])
        .concat(Array.isArray(d.combos) ? d.combos : [])
        .concat(Array.isArray(d.addons) ? d.addons : []);
      return all.find(p => String(p.id) === String(id)) || null;
    };
  }

  function qtyInCart(id){
    const c = window.Cart?.readCart?.();
    if (c && typeof c === "object") return Number(c[id] || 0);
    // fallback direto do storage (se readCart não existir)
    try{
      const raw = localStorage.getItem("LPGRILL_CART_V3") || "{}";
      const obj = JSON.parse(raw);
      return Number(obj?.[id] || 0);
    }catch{
      return 0;
    }
  }

  function currentCategory(){
    const page = String(window.PAGE || "").toLowerCase();
    if(page === "massas" || page === "marmitas") return page;

    const p = (location.pathname || "").toLowerCase();
    if(p.includes("massas")) return "massas";
    if(p.includes("marmitas")) return "marmitas";
    return "marmitas";
  }

  function getAddonsFor(cat){
    const d = window.DATA || {};
    const addons = Array.isArray(d.addons) ? d.addons : [];
    if(!addons.length) return [];

    const accept = (cat === "massas") ? ["massas","sobremesas"] : ["marmitas"];
    return addons.filter(a=>{
      const applies = Array.isArray(a.applies) ? a.applies : null;
      if(!applies) return true;
      const low = applies.map(x => String(x).toLowerCase());
      return accept.some(k => low.includes(k));
    });
  }

  function addonRow(a){
    const q = qtyInCart(a.id);
    const img = (a.img && String(a.img).trim()) ? String(a.img).trim() : "img/mockup.png";
    const title = a.title || a.name || "Adicional";
    const desc  = a.desc || "";
    const canDec = q > 0;

    return `
      <div class="addon-row" data-id="${esc(a.id)}">
        <img class="addon-img" src="${esc(img)}" alt="${esc(title)}"
          loading="lazy"
          onerror="this.onerror=null; this.src='img/mockup.png';">

        <div>
          <div class="addon-title">${esc(title)}</div>
          ${desc ? `<div class="addon-desc">${esc(desc)}</div>` : ``}
          <div class="addon-price">${money(a.price)}</div>
        </div>

        <div class="addon-qty">
          <button type="button" ${canDec ? `data-dec="${esc(a.id)}"` : "disabled"}>−</button>
          <span class="addon-q">${q}</span>
          <button type="button" data-add="${esc(a.id)}">+</button>
        </div>
      </div>
    `;
  }

  function updateSummary(addons){
    let totalItens = 0;
    let totalValor = 0;

    for(const a of addons){
      const q = qtyInCart(a.id);
      totalItens += q;
      totalValor += q * Number(a.price || 0);
    }

    if(countEl) countEl.textContent = String(totalItens);
    if(totalEl) totalEl.textContent = money(totalValor);
  }

  function render(){
    const cat = currentCategory();
    const addons = getAddonsFor(cat);

    if(subEl){
      subEl.textContent = (cat === "massas")
        ? "Selecione adicionais para Massas"
        : "Selecione adicionais para Marmitas";
    }

    if(!addons.length){
      listEl.innerHTML = `<div class="lp-empty">Sem adicionais disponíveis.</div>`;
      if(countEl) countEl.textContent = "0";
      if(totalEl) totalEl.textContent = money(0);
      return;
    }

    listEl.innerHTML = addons.map(addonRow).join("");
    updateSummary(addons);
  }

  function open(){
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    render();
  }

  function close(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
  }

  // ✅ botão de baixo: no seu layout ele serve para finalizar/fechar
  if(btnAdd){
    btnAdd.textContent = "Fechar";
    btnAdd.addEventListener("click", close);
  }

  // abrir/fechar
  if(btnOpen.dataset.bound !== "1"){
    btnOpen.dataset.bound = "1";
    btnOpen.addEventListener("click", open);
  }

  // fecha no backdrop e no X (data-close-addons)
  modal.addEventListener("click", (e)=>{
    if(e.target && e.target.closest("[data-close-addons]")) close();
  });

  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && modal.classList.contains("is-open")) close();
  });

  // + / -
  modal.addEventListener("click", (e)=>{
    const add = e.target.closest("[data-add]");
    const dec = e.target.closest("[data-dec]");

    if(add){
      const id = add.getAttribute("data-add");
      if(!id) return;
      window.Cart?.add?.(id);
      window.Cart?.renderAll?.();
      document.dispatchEvent(new CustomEvent("lp:cart-change"));
      render();
      return;
    }

    if(dec){
      const id = dec.getAttribute("data-dec");
      if(!id) return;
      window.Cart?.dec?.(id);
      window.Cart?.renderAll?.();
      document.dispatchEvent(new CustomEvent("lp:cart-change"));
      render();
      return;
    }
  });

  // re-render quando carrinho muda por fora (sem setInterval)
  document.addEventListener("lp:cart-change", ()=>{
    if(modal.classList.contains("is-open")) render();
  });
})();
