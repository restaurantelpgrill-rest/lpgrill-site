const promoOn = item.promo && item.promoPrice != null && Number(item.promoPrice) > 0;
const finalPrice = promoOn ? Number(item.promoPrice) : Number(item.price);

const priceHtml = promoOn
  ? `<div class="price">
       <span class="old">${money(item.price)}</span>
       <span class="new">${money(finalPrice)}</span>
     </div>`
  : `<div class="price"><span class="new">${money(finalPrice)}</span></div>`;

const soldHtml = item.soldOut
  ? `<span class="pill sold">Esgotado</span>`
  : (promoOn ? `<span class="pill promo">Promo</span>` : ``);
