// js/render.js — LP Grill (Cards com foto + seleção (qty) + adicionar no carrinho)
// ✅ UM único render (remove duplicações)
(() => {
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function normalizeData(){
    const d = window.DATA || {};
    return {
      marmitas: Array.isArray(d.marmitas) ? d.marmitas : [],
      porcoes: Array.isArray(d.porcoes) ? d.porcoes : [],
      bebidas: Array.isArray(d.bebidas) ? d.bebidas : [],
      sobremesas: Array.isArray(d.sobremesas) ? d.sobremesas : []
    };
  }

  function getFinalPrice(p){
    const promoOn = p?.promo && p?.promoPrice != null && Number(p.promoPrice) > 0;
    return promoOn ? Number(p.promoPrice) : Number(p?.price || 0);
  }

  function qtyInCart(id){
    const items = window.Cart?.read?.() || [];
    const hit = items.find(x => x.id === id);
    return hit ? Number(hit.qty||0) : 0;
  }

  function badgeHtml(p){
    const promoOn = p?.promo && p?.promoPrice != null && Number(p.promoPrice) > 0;

    const parts = [];
    if (p.soldOut) parts.push(`<span class="lp-pill lp-sold">Esgotado</span>`);
    if (!p.soldOut && promoOn) parts.push(`<span class="lp-pill lp-promo">Promo</span>`);
    if (!p.soldOut && p.tag) parts.push(`<span class="lp-pill">${esc(p.tag)}</span>`);

    if(!parts.length) return "";
    return `<div class="lp-badges">${parts.join("")}</div>`;
  }

  function priceHtml(p){
    const promoOn = p?.promo && p?.promoPrice != null && Number(p.promoPrice) > 0;
    const finalPrice = getFinalPrice(p);

    if(promoOn){
      return `
        <div class="lp-price">
          <span class="lp-old">${money(p.price)}</span>
          <span class="lp-new">${money(finalPrice)}</span>
        </div>
      `;
    }
    return `<div class="lp-price"><span class="lp-new">${money(finalPrice)}</span></div>`;
  }

  // Card padrão (foto + info + seleção qty)
  function cardHtml(p){
    const img = (p.img && String(p.img).trim()) ? p.img : "img/mockup.png";
    const q = qtyInCart(p.id);

    const disabled = !!p.soldOut;
    const controls = disabled
      ? `<button class="btn light" disabled style="opacity:.6; cursor:not-allowed">Indisponível</button>`
      : (q > 0 ? `
          <div class="lp-qty">
            <button class="lp-qbtn" type="button" data-dec="${esc(p.id)}">−</button>
            <strong class="lp-q">${q}</strong>
            <button class="lp-qbtn" type="button" data-add="${esc(p.id)}">+</button>
          </div>
        ` : `
          <button class="btn primary" type="button" data-add="${esc(p.id)}">Adicionar</button>
        `);

    return `
      <article class="lp-card card" data-id="${esc(p.id)}">
        <div class="lp-cover">
          <img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy">
          ${badgeHtml(p)}
        </div>

        <div class="lp-body">
          <div class="lp-top">
            <h3 class="lp-title">${esc(p.title)}</h3>
            ${priceHtml(p)}
          </div>
          ${p.desc ? `<p class="lp-desc muted">${esc(p.desc)}</p>` : ``}

          <div class="lp-actions">
            ${controls}
          </div>
        </div>
      </article>
    `;
  }

  function bindCardActions(container){
    if(!container) return;

    container.addEventListener("click", (e)=>{
      const addBtn = e.target.closest("[data-add]");
      const decBtn = e.target.closest("[data-dec]");

      if(addBtn){
        const id = addBtn.getAttribute("data-add");
        window.Cart?.add?.(id);
        // re-render mínimo: atualiza o card
        refreshCard(container, id);
        window.Cart?.syncUI?.();
        return;
      }

      if(decBtn){
        const id = decBtn.getAttribute("data-dec");
        window.Cart?.dec?.(id);
        refreshCard(container, id);
        window.Cart?.syncUI?.();
        return;
      }
    });
  }

  function refreshCard(container, id){
    const card = container.querySelector(`.lp-card[data-id="${CSS.escape(id)}"]`);
    if(!card) return;

    // acha o produto na DATA
    const d = normalizeData();
    const all = [...d.marmitas, ...d.porcoes, ...d.bebidas, ...d.sobremesas];
    const p = all.find(x => x.id === id);
    if(!p) return;

    // substitui o HTML do card inteiro (seguro)
    const tmp = document.createElement("div");
    tmp.innerHTML = cardHtml(p).trim();
    const next = tmp.firstElementChild;
    if(next) card.replaceWith(next);
  }

  // ========== Render de categoria (página marmitas/porções/etc) ==========
  window.renderCategory = function(categoryKey, containerId){
    const el = document.getElementById(containerId);
    if(!el) return;

    const d = normalizeData();
    const items = Array.isArray(d[categoryKey]) ? d[categoryKey] : [];

    if(!items.length){
      el.innerHTML = `<div class="muted" style="padding:10px 2px">Sem itens nesta categoria.</div>`;
      return;
    }

    el.innerHTML = items.map(cardHtml).join("");
    bindCardActions(el);

    window.Cart?.syncUI?.();
  };

  // ========== (Opcional) Destaques no index ==========
  // Use: renderHighlights("marmitas", "marmitas", 4)
  window.renderHighlights = function(categoryKey, containerId, limit=4){
    const el = document.getElementById(containerId);
    if(!el) return;

    const d = normalizeData();
    const items = Array.isArray(d[categoryKey]) ? d[categoryKey] : [];

    if(!items.length){
      el.innerHTML = `<div class="muted" style="padding:10px 2px">Sem itens.</div>`;
      return;
    }

    el.innerHTML = items.slice(0, limit).map(cardHtml).join("");
    bindCardActions(el);

    window.Cart?.syncUI?.();
  };

})();
