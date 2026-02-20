(() => {
  const WHATSAPP = "5531998064556"; // LP Grill

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function pickData(){ return window.DATA || {marmitas:[],porcoes:[],bebidas:[],sobremesas:[]}; }
  function normalize(d){
    d ||= {};
    d.marmitas ||= [];
    d.porcoes ||= [];
    d.bebidas ||= [];
    d.sobremesas ||= [];
    return d;
  }

  const esc = (s)=> String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function getFinalPrice(item){
    const promoOn = item?.promo && item?.promoPrice != null && Number(item.promoPrice) > 0;
    return promoOn ? Number(item.promoPrice) : Number(item?.price || 0);
  }

  function waText(item, categoria){
    const promoOn = item.promo && item.promoPrice != null && Number(item.promoPrice) > 0;
    const finalPrice = getFinalPrice(item);
    const lines = [
      `Olá! Quero fazer um pedido no LP Grill 👋`,
      ``,
      `*Produto:* ${item.title}`,
      categoria ? `*Categoria:* ${categoria}` : null,
      item.tag ? `*Tag:* ${item.tag}` : null,
      promoOn ? `*Promo:* ${money(finalPrice)} (de ${money(item.price)})` : `*Preço:* ${money(finalPrice)}`,
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
        ${(!item.soldOut && item.tag) ? `<span class="lp-pill">${esc(item.tag)}</span>` : ``}
      </div>
    `;

    const btn = item.soldOut
      ? `<button class="lp-btn lp-btn-disabled" disabled>Indisponível</button>`
      : `<a class="lp-btn" target="_blank" rel="noopener"
            href="https://wa.me/${WHATSAPP}?text=${waText(item, categoriaLabel)}">
            Pedir no WhatsApp
          </a>`;

    const img = item.img || "img/mockup.png";

    return `
      <article class="lp-card">
        <div class="lp-cover">
          <img src="${img}" alt="${esc(item.title)}" loading="lazy">
          ${badges}
        </div>
        <div class="lp-body">
          <h3 class="lp-title">${esc(item.title)}</h3>
          <p class="lp-desc">${esc(item.desc || "")}</p>
          <div class="lp-row">
            ${priceHtml}
            ${btn}
          </div>
        </div>
      </article>
    `;
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
    // aqui eu renderizo só alguns “destaques” (se quiser todos, tira o slice)
    renderList(d.marmitas.slice(0,4), "marmitas", "Marmitas");
    renderList(d.porcoes.slice(0,4), "porcoes", "Porções");
    renderList(d.bebidas.slice(0,4), "bebidas", "Bebidas");
    renderList(d.sobremesas.slice(0,4), "sobremesas", "Sobremesas");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
