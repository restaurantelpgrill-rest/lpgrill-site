(() => {
  // ===== CONFIG =====
  const WHATSAPP = (window.SITE && window.SITE.whatsapp) ? window.SITE.whatsapp : "5531999999999";
  // se você não usa window.SITE, pode colocar aqui direto: const WHATSAPP = "5531999999999";

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function $(s, p=document){ return p.querySelector(s); }

  function pickData(){
    // DATA vem do seu data.js (admin ou fallback)
    if(window.DATA) return window.DATA;
    // fallback mínimo
    return { marmitas:[], porcoes:[], bebidas:[], sobremesas:[] };
  }

  function normalize(d){
    d ||= {};
    d.marmitas ||= [];
    d.porcoes ||= [];
    d.bebidas ||= [];
    d.sobremesas ||= [];
    return d;
  }

  function getFinalPrice(item){
    const promoOn = item && item.promo && item.promoPrice != null && Number(item.promoPrice) > 0;
    return promoOn ? Number(item.promoPrice) : Number(item.price || 0);
  }

  function buildWhatsMsg(item, categoria){
    const promoOn = item.promo && item.promoPrice != null && Number(item.promoPrice) > 0;
    const finalPrice = getFinalPrice(item);

    const lines = [
      `Olá! Quero fazer um pedido no LP Grill 👋`,
      ``,
      `*Produto:* ${item.title}`,
      categoria ? `*Categoria:* ${categoria}` : null,
      item.tag ? `*Tag:* ${item.tag}` : null,
      item.soldOut ? `*Status:* INDISPONÍVEL (esgotado)` : null,
      promoOn ? `*Promo:* ${money(finalPrice)} (de ${money(item.price)})` : `*Preço:* ${money(finalPrice)}`,
      item.desc ? `` : null,
      item.desc ? item.desc : null
    ].filter(Boolean);

    return encodeURIComponent(lines.join("\n"));
  }

  function cardHtml(item, categoriaLabel){
    const promoOn = item.promo && item.promoPrice != null && Number(item.promoPrice) > 0;
    const finalPrice = getFinalPrice(item);

    const priceHtml = promoOn
      ? `<div class="lp-price">
           <span class="lp-old">${money(item.price)}</span>
           <span class="lp-new">${money(finalPrice)}</span>
         </div>`
      : `<div class="lp-price"><span class="lp-new">${money(finalPrice)}</span></div>`;

    const badges = `
      <div class="lp-badges">
        ${item.soldOut ? `<span class="lp-pill lp-sold">Esgotado</span>` : ``}
        ${(!item.soldOut && promoOn) ? `<span class="lp-pill lp-promo">Promo</span>` : ``}
        ${(!item.soldOut && item.tag) ? `<span class="lp-pill">${escapeHtml(item.tag)}</span>` : ``}
      </div>
    `;

    const btn = item.soldOut
      ? `<button class="lp-btn lp-btn-disabled" disabled>Indisponível</button>`
      : `<a class="lp-btn" target="_blank" rel="noopener"
            href="https://wa.me/${WHATSAPP}?text=${buildWhatsMsg(item, categoriaLabel)}">
            Pedir no WhatsApp
          </a>`;

    const img = item.img || "img/mockup.png";

    return `
      <article class="lp-card">
        <div class="lp-cover">
          <img src="${img}" alt="${escapeHtml(item.title)}" loading="lazy">
          ${badges}
        </div>

        <div class="lp-body">
          <h3 class="lp-title">${escapeHtml(item.title)}</h3>
          <p class="lp-desc">${escapeHtml(item.desc || "")}</p>
          <div class="lp-row">
            ${priceHtml}
            ${btn}
          </div>
        </div>
      </article>
    `;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function renderList(list, targetId, label){
    const el = document.getElementById(targetId);
    if(!el) return;

    if(!Array.isArray(list) || list.length === 0){
      el.innerHTML = `<div class="lp-empty">Sem itens nesta categoria.</div>`;
      return;
    }

    el.innerHTML = list.map(item => cardHtml(item, label)).join("");
  }

  function init(){
    const d = normalize(pickData());

    // IDs esperados no HTML:
    // <div id="marmitas"></div>
    // <div id="porcoes"></div>
    // <div id="bebidas"></div>
    // <div id="sobremesas"></div>

    renderList(d.marmitas, "marmitas", "Marmitas");
    renderList(d.porcoes, "porcoes", "Porções");
    renderList(d.bebidas, "bebidas", "Bebidas");
    renderList(d.sobremesas, "sobremesas", "Sobremesas");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
