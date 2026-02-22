// js/render.js — LP Grill (Cards com foto + seleção (qty) + carrinho compatível com cart.js V3)
(() => {
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function normalizeData(){
    const d = window.DATA || {}; quero as fotos , e o botão adicionar igual o botão voltar ao menu  
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
    const c = window.Cart?.readCart?.() || {};
    return Number(c[id] || 0);
  }

  function badgeHtml(p){
    const promoOn = p?.promo && p?.promoPrice != null && Number(p.promoPrice) > 0;
    const parts = [];
    if (p.soldOut) parts.push(`Esgotado`);
    if (!p.soldOut && promoOn) parts.push(`Promo`);
    if (!p.soldOut && p.tag) parts.push(`${esc(p.tag)}`);
    if(!parts.length) return "";
    return `<div class="lp-badges">${parts.map(x=>`<span class="lp-badge">${x}</span>`).join("")}</div>`;
  }

  function priceHtml(p){
    const promoOn = p?.promo && p?.promoPrice != null && Number(p.promoPrice) > 0;
    const finalPrice = getFinalPrice(p);
    if(promoOn){
      return `
        <div class="lp-price">
          <span class="lp-old">${money(p.price)}</span>
          <span class="lp-now">${money(finalPrice)}</span>
        </div>
      `;
    }
    return `<div class="lp-price"><span class="lp-now">${money(finalPrice)}</span></div>`;
  }

  function controlsHtml(p){
    const q = qtyInCart(p.id);
    const disabled = !!p.soldOut;
    if(disabled){
      return `<button class="lp-btn disabled" type="button" disabled>Indisponível</button>`;
    }
    if(q > 0){
      return `
        <div class="lp-qty">
          <button type="button" class="lp-qtybtn" data-dec="${esc(p.id)}">−</button>
          <div class="lp-qnum">${q}</div>
          <button type="button" class="lp-qtybtn" data-add="${esc(p.id)}">+</button>
        </div>
      `;
    }
    return `<button class="lp-btn" type="button" data-add="${esc(p.id)}">Adicionar</button>`;
  }

  function cardHtml(p){
    const img = (p.img && String(p.img).trim()) ? p.img : "img/mockup.png";
    return `
      <article class="lp-card" data-id="${esc(p.id)}">
        <div class="lp-cardimg" style="background-image:url('${esc(img)}')"></div>
        <div class="lp-cardbody">
          ${badgeHtml(p)}
          <h3 class="lp-title">${esc(p.title)}</h3>
          ${priceHtml(p)}
          ${p.desc ? `<p class="lp-desc">${esc(p.desc)}</p>` : ``}
          <div class="lp-actions">${controlsHtml(p)}</div>
        </div>
      </article>
    `;
  }

  function allProducts(){
    const d = normalizeData();
    return [...d.marmitas, ...d.porcoes, ...d.bebidas, ...d.sobremesas];
  }

  function refreshCard(container, id){
    const card = container.querySelector(`.lp-card[data-id="${CSS.escape(id)}"]`);
    if(!card) return;
    const p = allProducts().find(x => x.id === id);
    if(!p) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = cardHtml(p).trim();
    const next = tmp.firstElementChild;
    if(next) card.replaceWith(next);
  }

  function bindCardActions(container){
    if(!container) return;
    container.addEventListener("click", (e)=>{
      const addBtn = e.target.closest("[data-add]");
      const decBtn = e.target.closest("[data-dec]");

      if(addBtn){
        const id = addBtn.getAttribute("data-add");
        window.Cart?.add?.(id);
        refreshCard(container, id);
        window.Cart?.renderAll?.();
        return;
      }

      if(decBtn){
        const id = decBtn.getAttribute("data-dec");
        window.Cart?.dec?.(id);
        refreshCard(container, id);
        window.Cart?.renderAll?.();
        return;
      }
    });
  }

  // usado pelo cart.js
  window.renderCardsQty = function(){
    document.querySelectorAll(".product-grid").forEach((grid)=>{
      grid.querySelectorAll(".lp-card[data-id]").forEach((card)=>{
        const id = card.getAttribute("data-id");
        if(!id) return;
        refreshCard(grid, id);
      });
    });
  };

  window.renderCategory = function(categoryKey, containerId){
    const el = document.getElementById(containerId);
    if(!el) return;
    const d = normalizeData();
    const items = Array.isArray(d[categoryKey]) ? d[categoryKey] : [];
    if(!items.length){
      el.innerHTML = `<div class="lp-empty">Sem itens nesta categoria.</div>`;
      window.Cart?.renderAll?.();
      return;
    }
    el.innerHTML = items.map(cardHtml).join("");
    bindCardActions(el);
    window.Cart?.renderAll?.();
  };

  window.renderHighlights = function(categoryKey, containerId, limit=4){
    const el = document.getElementById(containerId);
    if(!el) return;
    const d = normalizeData();
    const items = Array.isArray(d[categoryKey]) ? d[categoryKey] : [];
    if(!items.length){
      el.innerHTML = `<div class="lp-empty">Sem itens.</div>`;
      window.Cart?.renderAll?.();
      return;
    }
    el.innerHTML = items.slice(0, limit).map(cardHtml).join("");
    bindCardActions(el);
    window.Cart?.renderAll?.();
  };
})();
