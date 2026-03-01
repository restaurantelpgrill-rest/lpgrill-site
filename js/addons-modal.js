// js/addons-modal.js — Modal de Adicionais (usa window.DATA.addons + cart.js)
// ✅ abre em marmitas e massas
// ✅ filtra por applies (marmitas / massas / sobremesas)
// ✅ + / - atualiza carrinho e contadores em tempo real
(() => {
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const modal = document.getElementById("addonsModal");
  const btnOpen = document.getElementById("openAddons");
  const listEl = document.getElementById("addonsList");
  const sumEl = document.getElementById("addonsSum");
  const subEl = document.getElementById("addonsSub");
  const btnClose = document.getElementById("addonsAddBtn");

  if(!modal || !btnOpen || !listEl) return;

  function qtyInCart(id){
    const c = window.Cart?.readCart?.();
    if (c && typeof c === "object") return Number(c[id] || 0);
    return 0;
  }

  function currentCategory(){
    // tenta inferir pela página (marmitas.html / massas.html)
    const p = (location.pathname || "").toLowerCase();
    if(p.includes("massas")) return "massas";
    if(p.includes("marmitas")) return "marmitas";

    // fallback: se tiver body com classe (se você quiser usar depois)
    const b = document.body?.className?.toLowerCase() || "";
    if(b.includes("massas")) return "massas";
    if(b.includes("marmitas")) return "marmitas";

    // padrão
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

  function render(){
    const cat = currentCategory();
    const addons = getAddonsFor(cat);

    // texto do topo
    subEl && (subEl.textContent = cat === "massas"
      ? "Adicionais para Massas"
      : "Adicionais para Marmitas"
    );

    if(!addons.length){
      listEl.innerHTML = `<div class="lp-empty">Sem adicionais disponíveis.</div>`;
      sumEl && (sumEl.textContent = "");
      return;
    }

    listEl.innerHTML = addons.map(addonRow).join("");

    // resumo
    let totalItens = 0;
    let totalValor = 0;
    for(const a of addons){
      const q = qtyInCart(a.id);
      totalItens += q;
      totalValor += q * Number(a.price || 0);
    }
    if(sumEl){
      sumEl.innerHTML = totalItens
        ? `Selecionados: <strong>${totalItens}</strong> • Total: <strong>${money(totalValor)}</strong>`
        : `Nenhum adicional selecionado.`;
    }
  }

  function open(){
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    render();
  }

  function close(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
  }

  // abrir/fechar
  btnOpen.addEventListener("click", open);
  btnClose && btnClose.addEventListener("click", close);
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
      render();
      window.Cart?.renderAll?.();
      return;
    }
    if(dec){
      const id = dec.getAttribute("data-dec");
      if(!id) return;
      window.Cart?.dec?.(id);
      render();
      window.Cart?.renderAll?.();
      return;
    }
  });

  // re-render quando o carrinho muda por fora (opcional)
  // (se o usuário mexer no carrinho aberto enquanto modal está aberto)
  setInterval(()=>{
    if(modal.classList.contains("is-open")) render();
  }, 600);
})();
