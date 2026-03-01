// js/render-fix.js — patch de compatibilidade (Massas/Combos/Bebidas/Marmitas)
// Não depende de alterar seu render.js original. Só garante que renderCategory funcione.

(() => {
  const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  // pega dados em qualquer formato
  function getBase(){
    return window.LP_DATA || window.DATA || window.MENU || {};
  }

  // normaliza lista por chave
  function getList(key){
    const base = getBase();
    const cats = base.categories || base.categorias || null;

    // tenta em categories primeiro
    if (cats && Array.isArray(cats[key])) return cats[key];

    // tenta direto no root
    if (Array.isArray(base[key])) return base[key];

    return [];
  }

  // aliases
  function resolveKey(key){
    key = String(key || "").toLowerCase();

    // Massas era Sobremesas
    if (key === "massas") {
      const a = getList("massas");
      if (a.length) return "massas";
      const b = getList("sobremesas");
      if (b.length) return "sobremesas";
      return "massas";
    }

    // Combo vs Combos
    if (key === "combo" || key === "combos") {
      const a = getList("combos");
      if (a.length) return "combos";
      const b = getList("combo");
      if (b.length) return "combo";
      return "combos";
    }

    return key;
  }

  // acha o container certo (se o id passado não existir)
  function resolveTarget(targetId, key){
    const wanted = document.getElementById(targetId);
    if (wanted) return wanted;

    // fallbacks comuns no seu projeto
    const fallbackIds = [
      "gridMassas","gridSobremesas",
      "listMarmitas",
      "gridBebidas",
      "list","grid",
      "listCombos","gridCombos"
    ];
    for (const id of fallbackIds) {
      const el = document.getElementById(id);
      if (el) return el;
    }

    // última tentativa: primeiro .product-grid ou .grid
    return document.querySelector(".product-grid") || document.querySelector(".grid");
  }

  // cria um card simples sem quebrar seu css (usa classes genéricas)
  function cardHTML(it){
    const img = it.img || "img/mockup.png";
    const title = it.title || it.nome || "Item";
    const desc = it.desc || it.descricao || "";
    const price = Number(it.price || it.preco || 0);

    return `
      <article class="lp-card">
        <img class="lp-card__img" src="${escapeHtml(img)}" alt="">
        <div class="lp-card__body">
          <div class="lp-card__title">${escapeHtml(title)}</div>
          <div class="lp-card__desc">${escapeHtml(desc)}</div>
          <div class="lp-card__foot">
            <strong class="lp-card__price">${money(price)}</strong>
            <button class="lp-card__btn" type="button" data-add="${escapeHtml(it.id)}">Adicionar</button>
          </div>
        </div>
      </article>
    `;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  // injeta css mínimo (não muda seu tema, só garante imagem fora do texto)
  function injectCSS(){
    if (document.getElementById("lp-render-fix-css")) return;
    const st = document.createElement("style");
    st.id = "lp-render-fix-css";
    st.textContent = `
      .lp-card{display:flex; gap:12px; align-items:flex-start; padding:12px; border:1px solid rgba(0,0,0,.10); border-radius:16px; background:#fff; margin-bottom:10px;}
      .lp-card__img{width:78px; height:78px; border-radius:14px; object-fit:cover; flex:0 0 78px; border:1px solid rgba(0,0,0,.08);}
      .lp-card__body{flex:1; min-width:0;}
      .lp-card__title{font-weight:900; font-size:14px; line-height:1.2;}
      .lp-card__desc{margin-top:4px; font-size:12px; color:rgba(0,0,0,.62);}
      .lp-card__foot{margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;}
      .lp-card__price{font-weight:1000;}
      .lp-card__btn{border:0; padding:10px 12px; border-radius:12px; background:var(--wine,#7f1d1d); color:#fff; font-weight:1000; cursor:pointer;}
    `;
    document.head.appendChild(st);
  }

  // renderCategory público
  window.renderCategory = function(categoryKey, targetId){
    injectCSS();

    const key = resolveKey(categoryKey);
    const el = resolveTarget(targetId, key);
    if (!el) return;

    const items = getList(key).map(it => ({
      id: String(it.id || ""),
      title: it.title || it.nome,
      desc: it.desc || it.descricao,
      price: Number(it.price || it.preco || 0),
      img: it.img || "img/mockup.png"
    })).filter(x => x.id);

    if (!items.length) {
      el.innerHTML = `<div style="padding:12px;color:rgba(0,0,0,.65);font-weight:800;">Sem itens nesta categoria.</div>`;
      return;
    }

    el.innerHTML = items.map(cardHTML).join("");

    // bind add -> carrinho
    el.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-add");
        const item = items.find(x => x.id === id);
        if (!item) return;

        const Cart = window.Cart;
        const addFn =
          (Cart && typeof Cart.add === "function" && Cart.add.bind(Cart)) ||
          (Cart && typeof Cart.addItem === "function" && Cart.addItem.bind(Cart)) ||
          null;

        if (!addFn) {
          alert("Carrinho não carregou (Cart.add).");
          return;
        }

        addFn({
          id: item.id,
          title: item.title,
          desc: item.desc,
          price: item.price,
          img: item.img,
          qty: 1
        });

        document.dispatchEvent(new Event("lp:cart-change"));
      });
    });
  };
})();
