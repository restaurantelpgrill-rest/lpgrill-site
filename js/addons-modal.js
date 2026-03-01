// js/addons-modal.js — Modal de Adicionais (marmitas e massas)
// Requer: js/data.js + js/cart.js carregados antes
// ✅ compat: DATA / MENU.catalog / MENU.items / LP_DATA
// ✅ robusto: não quebra se faltar addonsCount/addonsTotal
// ✅ filtra applies por página (marmitas/massas) e também aceita "sobremesas" como alias das massas

(() => {
  const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  const modal   = document.getElementById("addonsModal");
  const btnOpen = document.getElementById("openAddons");
  const listEl  = document.getElementById("addonsList");
  const countEl = document.getElementById("addonsCount");
  const totalEl = document.getElementById("addonsTotal");
  const btnAdd  = document.getElementById("addonsAddBtn");

  // Se sua página não tem modal/botão, não faz nada (sem erro)
  if (!modal || !btnOpen || !listEl || !btnAdd) return;

  // Só ativa em marmitas e massas
  const pageRaw = String(window.PAGE || "").toLowerCase().trim();
  const allowed = (pageRaw === "marmitas" || pageRaw === "massas");
  if (!allowed) {
    btnOpen.style.display = "none";
    return;
  }

  const closeBtns = modal.querySelectorAll("[data-close-addons]");
  closeBtns.forEach(b => b.addEventListener("click", close));

  // fecha no ESC e no clique fora (se você usar overlay)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close(); // se modal for o overlay
  });

  let selected = new Map(); // id -> qty
  let addons = [];

  // =========================
  // DATA HELPERS (robusto)
  // =========================
  function getCatalog(){
    // Preferência: DATA (do seu data.js)
    if (window.DATA && typeof window.DATA === "object") return window.DATA;

    // Compat: MENU.catalog / MENU.items
    if (window.MENU && typeof window.MENU === "object") {
      if (window.MENU.catalog && typeof window.MENU.catalog === "object") return window.MENU.catalog;
      if (window.MENU.items && typeof window.MENU.items === "object") return window.MENU.items;
    }

    // Compat: LP_DATA (se alguém usar isso)
    if (window.LP_DATA && typeof window.LP_DATA === "object") return window.LP_DATA;

    return {};
  }

  function pickAddonsFromCatalog(cat){
    // tenta achar addons em vários formatos
    // 1) cat.addons
    if (Array.isArray(cat.addons)) return cat.addons;

    // 2) cat.adicionais
    if (Array.isArray(cat.adicionais)) return cat.adicionais;

    // 3) cat.categories.addons / cat.categories.adicionais
    const c = cat.categories || cat.categorias;
    if (c && typeof c === "object") {
      if (Array.isArray(c.addons)) return c.addons;
      if (Array.isArray(c.adicionais)) return c.adicionais;
    }

    return [];
  }

  function getAddonsForPage(){
    const catalog = getCatalog();
    const arr = pickAddonsFromCatalog(catalog);

    // chave “oficial” da página
    const pageKey = (pageRaw === "massas") ? "massas" : "marmitas";

    // para compat: se alguém ainda usa "sobremesas" como massas
    const aliasOk = (pageKey === "massas") ? ["massas", "sobremesas"] : ["marmitas"];

    return (Array.isArray(arr) ? arr : [])
      .filter(a => {
        if (!a) return false;

        const applies = a.applies || a.aplica || a.aplicavel || null;
        if (!applies) return true; // sem applies = aparece em tudo

        if (!Array.isArray(applies)) return true;

        const low = applies.map(x => String(x).toLowerCase().trim());
        return aliasOk.some(k => low.includes(k));
      })
      .map(a => ({
        id: String(a.id || a.code || "").trim(),
        title: String(a.title || a.nome || "Adicional").trim(),
        desc: String(a.desc || a.descricao || "").trim(),
        price: Number(a.price ?? a.preco ?? 0) || 0,
        img: String(a.img || a.image || "img/mockup.png").trim()
      }))
      .filter(a => a.id);
  }

  // =========================
  // MODAL
  // =========================
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
      listEl.innerHTML = `
        <div style="padding:10px 2px;color:rgba(0,0,0,.65);font-weight:700">
          Sem adicionais configurados para esta categoria.
        </div>`;
      updateSum();
      return;
    }

    listEl.innerHTML = addons.map(a => {
      const qty = selected.get(a.id) || 0;
      return `
        <div class="addon-row" data-id="${escapeHtml(a.id)}">
          <img class="addon-img" src="${escapeHtml(a.img)}" alt="">
          <div class="addon-info">
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
      const id = String(row.getAttribute("data-id") || "");
      const qEl = row.querySelector("[data-qty]");

      row.querySelector("[data-inc]")?.addEventListener("click", () => {
        const q = (selected.get(id) || 0) + 1;
        selected.set(id, q);
        if (qEl) qEl.textContent = String(q);
        updateSum();
      });

      row.querySelector("[data-dec]")?.addEventListener("click", () => {
        const q0 = (selected.get(id) || 0);
        const q = Math.max(0, q0 - 1);
        if (q === 0) selected.delete(id);
        else selected.set(id, q);
        if (qEl) qEl.textContent = String(q);
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

    if (countEl) countEl.textContent = String(c);
    if (totalEl) totalEl.textContent = money(t);

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

    // Tenta várias APIs comuns do carrinho
    const addFn =
      (typeof Cart.add === "function" && Cart.add.bind(Cart)) ||
      (typeof Cart.addItem === "function" && Cart.addItem.bind(Cart)) ||
      (typeof Cart.push === "function" && Cart.push.bind(Cart)) ||
      null;

    if (!addFn) {
      alert("Não achei a função de adicionar no carrinho.");
      return;
    }

    for (const [id, qty] of selected.entries()) {
      const a = addons.find(x => x.id === id);
      if (!a) continue;

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
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
})();
