// js/addons-modal.js — Modal de Adicionais (marmitas e massas)
// Requer: js/data.js + js/cart.js carregados antes

(() => {
  const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  const modal = document.getElementById("addonsModal");
  const btnOpen = document.getElementById("openAddons");
  const listEl = document.getElementById("addonsList");
  const countEl = document.getElementById("addonsCount");
  const totalEl = document.getElementById("addonsTotal");
  const btnAdd = document.getElementById("addonsAddBtn");

  if (!modal || !btnOpen || !listEl || !btnAdd) return;

  // Só ativa em marmitas e massas
  const page = (window.PAGE || "").toLowerCase();
  const allowed = (page === "marmitas" || page === "massas");
  if (!allowed) {
    btnOpen.style.display = "none";
    return;
  }

  const closeBtns = modal.querySelectorAll("[data-close-addons]");
  closeBtns.forEach(b => b.addEventListener("click", close));

  let selected = new Map(); // id -> qty
  let addons = [];

  function getDataBase(){
    return window.LP_DATA || window.DATA || window.MENU || {};
  }

  function getAddonsForPage(){
    const base = getDataBase();
    // tenta achar addons em vários formatos
    const arr = base.addons || base.adicionais || (base.categories && base.categories.addons) || [];
    const pageKey = (page === "massas") ? "massas" : "marmitas";

    // filtra por applies (se existir); senão mostra tudo
    return (Array.isArray(arr) ? arr : []).filter(a => {
      if (!a) return false;
      const applies = a.applies || a.aplica || null;
      if (!applies) return true;
      return Array.isArray(applies) && applies.map(x => String(x).toLowerCase()).includes(pageKey);
    }).map(a => ({
      id: String(a.id || ""),
      title: String(a.title || a.nome || "Adicional"),
      desc: String(a.desc || a.descricao || ""),
      price: Number(a.price || a.preco || 0),
      img: String(a.img || "img/mockup.png")
    })).filter(a => a.id);
  }

  function open(){
    addons = getAddonsForPage();
    selected = new Map();
    render();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function render(){
    if (!addons.length) {
      listEl.innerHTML = `<div style="padding:10px 2px;color:rgba(0,0,0,.65);font-weight:700">
        Sem adicionais configurados para esta categoria.
      </div>`;
      updateSum();
      return;
    }

    listEl.innerHTML = addons.map(a => {
      const qty = selected.get(a.id) || 0;
      return `
        <div class="addon-row" data-id="${a.id}">
          <img class="addon-img" src="${a.img}" alt="">
          <div>
            <div class="addon-title">${escapeHtml(a.title)}</div>
            <div class="addon-desc">${escapeHtml(a.desc)}</div>
            <div class="addon-price">${money(a.price)}</div>
          </div>
          <div class="addon-qty">
            <button type="button" data-dec aria-label="Diminuir">−</button>
            <span data-qty>${qty}</span>
            <button type="button" data-inc aria-label="Aumentar">+</button>
          </div>
        </div>
      `;
    }).join("");

    // listeners
    listEl.querySelectorAll(".addon-row").forEach(row => {
      const id = row.getAttribute("data-id");
      const qEl = row.querySelector("[data-qty]");
      row.querySelector("[data-inc]")?.addEventListener("click", () => {
        const q = (selected.get(id) || 0) + 1;
        selected.set(id, q);
        qEl.textContent = q;
        updateSum();
      });
      row.querySelector("[data-dec]")?.addEventListener("click", () => {
        const q0 = (selected.get(id) || 0);
        const q = Math.max(0, q0 - 1);
        if (q === 0) selected.delete(id); else selected.set(id, q);
        qEl.textContent = q;
        updateSum();
      });
    });

    updateSum();
  }

  function updateSum(){
    let c = 0, t = 0;
    for (const [id, qty] of selected.entries()) {
      const a = addons.find(x => x.id === id);
      if (!a) continue;
      c += qty;
      t += (a.price * qty);
    }
    countEl.textContent = String(c);
    totalEl.textContent = money(t);
    btnAdd.disabled = (c === 0);
    btnAdd.style.opacity = (c === 0) ? ".6" : "1";
  }

  // Adiciona selecionados ao carrinho
  btnAdd.addEventListener("click", () => {
    const Cart = window.Cart;
    if (!Cart) {
      alert("Carrinho não carregou (Cart.js).");
      return;
    }

    // Tenta várias APIs comuns do seu carrinho
    const addFn =
      (typeof Cart.add === "function" && Cart.add.bind(Cart)) ||
      (typeof Cart.addItem === "function" && Cart.addItem.bind(Cart)) ||
      null;

    if (!addFn) {
      alert("Não achei a função de adicionar no carrinho.");
      return;
    }

    for (const [id, qty] of selected.entries()) {
      const a = addons.find(x => x.id === id);
      if (!a) continue;

      // adiciona qty vezes (mais compatível)
      for (let i = 0; i < qty; i++) {
        addFn({
          id: a.id,
          title: a.title,
          desc: a.desc,
          price: a.price,
          img: a.img,
          tag: "Adicional"
        });
      }
    }

    close();

    // abre carrinho se existir seu botão padrão
    document.querySelector("[data-open-cart]")?.click?.();
  });

  btnOpen.addEventListener("click", open);

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
})();
