// js/render.js — LP Grill (Cards com foto + stepper iFood-like)
// ✅ Foto maior e MAIS visível ao lado do "Adicionar" em TODAS as categorias
// ✅ Dias (days) travam adicionar fora do dia
// ✅ Adicionais aparecem só em marmitas e sobremesas (Massas Caseiras)
// compatível com cart.js V3
(() => {
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  // ===== Dias =====
  function lpToday(){ return new Date().getDay(); } // 0 dom..6 sáb
  function lpDayLabel(d){ return ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d] || ""; }
  function lpIsAvailable(p){
    if(!p || !Array.isArray(p.days) || p.days.length === 0) return true;
    return p.days.includes(lpToday());
  }
  function lpAvailabilityText(p){
    if(!p || !Array.isArray(p.days) || p.days.length === 0) return "";
    if(p.days.length === 1) return `Disponível: ${lpDayLabel(p.days[0])}`;
    return `Disponível: ${p.days.map(lpDayLabel).join(", ")}`;
  }

  // ✅ Lê dados tanto de window.DATA (flat) quanto de window.LP_DATA/categories
  function normalizeData(){
    const base = window.DATA || window.LP_DATA || window.MENU || {};
    const cats = base.categories || base.categorias || null;

    const pick = (key)=>{
      if (cats && Array.isArray(cats[key])) return cats[key];
      if (Array.isArray(base[key])) return base[key];
      return [];
    };

    return {
      marmitas:   pick("marmitas"),
      porcoes:    pick("porcoes"),
      bebidas:    pick("bebidas"),
      sobremesas: pick("sobremesas"),
      ons:     pick("addons"),
    };
  }

  function getFinalPrice(p){
    const promoOn = p?.promo && p?.promoPrice != null && Number(p.promoPrice) > 0;
    return promoOn ? Number(p.promoPrice) : Number(p?.price || 0);
  }

  function qtyInCart(id){
    const c = window.Cart?.readCart?.();
    if (c && typeof c === "object") return Number(c[id] || 0);
    return 0;
  }

  function getImg(p){
    const raw = (p?.img && String(p.img).trim())
      ? String(p.img).trim()
      : ((p?.foto && String(p.foto).trim()) ? String(p.foto).trim() : "");
    return raw || "img/mockup.png";
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
    const soldOut = !!p.soldOut;
    const okDay = lpIsAvailable(p);

    if(soldOut){
      return `<button class="lp-btn disabled" type="button" disabled>Indisponível</button>`;
    }

    const canDec = q > 0;
    const img = getImg(p);
    const title = p.title || p.name || "";
    const note = (!okDay ? `<div class="lp-daynote">${esc(lpAvailabilityText(p))}</div>` : ``);

    return `
      <div class="lp-step lp-step--thumb ${okDay ? "" : "is-locked"}" role="group" aria-label="Quantidade">
        <button type="button"
          class="lp-step-btn ${canDec ? "" : "disabled"}"
          ${canDec ? "" : "disabled"}
          data-dec="${esc(p.id)}">−</button>

        <button type="button"
          class="lp-step-mid"
          ${okDay ? `data-add="${esc(p.id)}"` : "disabled"}
          aria-label="Adicionar">
          <span class="lp-step-text">${okDay ? "Adicionar" : "Somente no dia"}</span>
          <span class="lp-step-qty">${q}</span>
        </button>

        <button type="button"
          class="lp-step-photo"
          ${okDay ? `data-add="${esc(p.id)}"` : "disabled"}
          aria-label="Adicionar">
          <img class="lp-step-thumb" src="${esc(img)}" alt="${esc(title)}"
            loading="lazy"
            onerror="this.onerror=null; this.src='img/mockup.png';">
        </button>

        <button type="button"
          class="lp-step-btn"
          ${okDay ? `data-add="${esc(p.id)}"` : "disabled"}>+</button>

        ${note}
      </div>
    `;
  }

  function cardHtml(p){
    const img = getImg(p);
    const title = p.title || p.name || "";
    return `
      <article class="lp-card" data-id="${esc(p.id)}">
        <div class="lp-cardrow">
          <div class="lp-cardbody">
            ${badgeHtml(p)}
            <h3 class="lp-title">${esc(title)}</h3>
            ${priceHtml(p)}
            ${p.desc ? `<p class="lp-desc">${esc(p.desc)}</p>` : ``}
            <div class="lp-actions">${controlsHtml(p)}</div>
          </div>

          <div class="lp-media">
            <img class="lp-img"
              src="${esc(img)}"
              alt="${esc(title)}"
              loading="lazy"
              onerror="this.onerror=null; this.src='img/mockup.png';">
          </div>
        </div>
      </article>
    `;
  }

  function allProducts(){
    const d = normalizeData();
    const addons = Array.isArray(d.addons) ? d.addons : [];
    return [...d.marmitas, ...d.porcoes, ...d.bebidas, ...d.sobremesas, ...addons];
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
        if(!id) return;

        const p = allProducts().find(x => x.id === id);
        if(p && !lpIsAvailable(p) && qtyInCart(id) === 0) return;

        window.Cart?.add?.(id);
        refreshCard(container, id);
        window.Cart?.renderAll?.();
        return;
      }

      if(decBtn){
        const id = decBtn.getAttribute("data-dec");
        if(!id) return;
        window.Cart?.dec?.(id);
        refreshCard(container, id);
        window.Cart?.renderAll?.();
        return;
      }
    });
  }

function addonsBlockHtml(categoryKey){
  if(categoryKey !== "marmitas" && categoryKey !== "sobremesas") return "";

  const d = normalizeData();
  const addons = Array.isArray(d.addons) ? d.addons : [];
  if(!addons.length) return "";

  const list = addons.filter(a=>{
    const applies = Array.isArray(a.applies) ? a.applies : null;
    if(!applies) return true;
    return applies.includes(categoryKey);
  });

  if(!list.length) return "";

  const addonRow = (a)=>{
    const q = qtyInCart(a.id);
    const canDec = q > 0;

    return `
      <div class="lp-addon-card" data-id="${esc(a.id)}">
        <div class="lp-addon-left">
          <div class="lp-addon-name">${esc(a.title || a.name || "Adicional")}</div>
          <div class="lp-addon-price">${money(a.price)}</div>
        </div>

        <div class="lp-addon-step">
          <button type="button" class="lp-addon-btn" ${canDec ? `data-dec="${esc(a.id)}"` : "disabled"}>−</button>

          <button type="button" class="lp-addon-mid" data-add="${esc(a.id)}">
            <span>Adicionar</span>
            <span>${q}</span>
          </button>

          <button type="button" class="lp-addon-btn" data-add="${esc(a.id)}">+</button>
        </div>
      </div>
    `;
  };

  return `
    <section class="lp-addons-box">
      <h3 class="lp-addons-title">➕ Adicionais</h3>
      <div class="lp-addons-grid">
        ${list.map(addonRow).join("")}
      </div>
    </section>
  `;
}
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

    el.innerHTML = items.map(cardHtml).join("") + addonsBlockHtml(categoryKey);
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
