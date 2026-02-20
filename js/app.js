(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  const esc = (str="") => String(str).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));

  function isHome(){ return !!$("#cats"); }
  function isMenu(){ return !!$("#items"); }

  function buildChips(){
    const chips = $("#chips");
    if(!chips) return;
    const m = window.SITE?.meta || {};
    chips.innerHTML = `
      <span class="chip">🚚 Taxa: <b>${CART.money(m.taxa || 0)}</b></span>
      <span class="chip">⏱️ Tempo: <b>${esc(m.tempo || "")}</b></span>
      <span class="chip">🕒 ${esc(m.horario || "")}</span>
    `;
  }

  function buildHome(){
    $("#brandName").textContent = window.SITE?.brand || "Restaurante";
    $("#brandTag").textContent = window.SITE?.tagline || "Pedidos no WhatsApp";
    buildChips();

    const catsEl = $("#cats");
    const q = $("#q");
    const cats = window.SITE?.categories || [];

    const render = (term="") => {
      const t = term.trim().toLowerCase();
      const list = cats.filter(c =>
        !t || c.title.toLowerCase().includes(t) || (c.desc||"").toLowerCase().includes(t)
      );

      catsEl.innerHTML = list.map(c => `
        <a class="catCard" href="./cardapio.html?cat=${encodeURIComponent(c.id)}">
          <div class="catCard__img">
            ${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.title)}" onerror="this.style.display='none'">` : ``}
          </div>
          <div class="catCard__body">
            <div class="catCard__left">
              <h3>${esc(c.title)}</h3>
              <p>${esc(c.desc || "")}</p>
            </div>
            <div class="catCard__badge" title="${esc(c.title)}">${esc(c.icon || "🍽️")}</div>
          </div>
        </a>
      `).join("");
    };

    render();
    q?.addEventListener("input", e => render(e.target.value));

    const rv = window.SITE?.reviews || [];
    $("#reviews").innerHTML = rv.map(r => `
      <div class="review">
        <div class="review__top">
          <b>${esc(r.name)}</b>
          <span class="muted">• ${esc(r.when)}</span>
        </div>
        <p>${esc(r.text)}</p>
      </div>
    `).join("");

    $("#rateVal").textContent = "4.9";

    const wa = $("#waFloat");
    if(wa){
      wa.href = `https://wa.me/${window.SITE?.contact?.whatsapp || ""}`;
      wa.textContent = "WhatsApp";
    }
  }

  function getCatFromURL(){
    const p = new URLSearchParams(location.search);
    return p.get("cat") || (window.SITE?.categories?.[0]?.id || "");
  }

  function buildMenu(){
    const cats = window.SITE?.categories || [];
    const itemsAll = window.SITE?.items || [];

    const catChips = $("#catChips");
    const itemsEl = $("#items");
    const q = $("#qItems");

    let activeCat = getCatFromURL();
    if(!cats.some(c => c.id === activeCat)) activeCat = cats[0]?.id || "";

    const setTitle = () => {
      const c = cats.find(x => x.id === activeCat);
      $("#pageTitle").textContent = c ? c.title : "Cardápio";
      $("#pageSub").textContent = window.SITE?.meta?.cidade || "Selecione seus itens";
      document.title = `${window.SITE?.brand || "Restaurante"} — ${c?.title || "Cardápio"}`;
    };

    const renderChips = () => {
      catChips.innerHTML = cats.map(c => `
        <button class="chipBtn ${c.id===activeCat ? "is-on":""}" data-cat="${esc(c.id)}">
          ${esc(c.icon)} ${esc(c.title)}
        </button>
      `).join("");

      $$(".chipBtn", catChips).forEach(btn => {
        btn.addEventListener("click", () => {
          activeCat = btn.dataset.cat;
          history.replaceState(null, "", `./cardapio.html?cat=${encodeURIComponent(activeCat)}`);
          setTitle();
          renderItems(q?.value || "");
        });
      });
    };

    const renderItems = (term="") => {
      const t = term.trim().toLowerCase();
      const list = itemsAll
        .filter(it => it.cat === activeCat)
        .filter(it => !t || it.name.toLowerCase().includes(t) || (it.desc||"").toLowerCase().includes(t));

      itemsEl.innerHTML = list.map(it => `
        <article class="item">
          <div class="item__img">
            <img src="${esc(it.img || "")}" alt="${esc(it.name)}" onerror="this.style.display='none'">
          </div>
          <div class="item__mid">
            <h3>${esc(it.name)}</h3>
            <p class="muted">${esc(it.desc || "")}</p>
            <div class="item__price">${CART.money(it.price)}</div>
          </div>
          <div class="item__act">
            <button class="qtyBtn" data-sub="${esc(it.id)}">−</button>
            <button class="addBtn" data-add="${esc(it.id)}">Adicionar</button>
            <button class="qtyBtn" data-add="${esc(it.id)}">+</button>
          </div>
        </article>
      `).join("");

      $$("[data-add]").forEach(b => b.addEventListener("click", ()=> CART.add(b.dataset.add, 1)));
      $$("[data-sub]").forEach(b => b.addEventListener("click", ()=> CART.sub(b.dataset.sub, 1)));
    };

    // Drawer carrinho (abre/fecha)
    const drawer = $("#drawer");
    const openCart = () => { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden","false"); };
    const closeCart = () => { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden","true"); };

    $("#openCart")?.addEventListener("click", openCart);
    $("#closeCart")?.addEventListener("click", closeCart);
    $("#closeCart2")?.addEventListener("click", closeCart);
    $("#bbOpen")?.addEventListener("click", openCart);

    // bottom bar + total (compatível com seu cart.js premium)
    CART.onChange(({count,total}) => {
      const taxa = Number(window.SITE?.meta?.taxa || 0);
      const bb = $("#bottomBar");
      if(bb){
        bb.hidden = (count === 0);
        $("#bbTotal").textContent = CART.money(total + taxa);
        $("#bbCount").textContent = `${count} item${count===1?"":"s"}`;
      }
      const ct = $("#cartTotal");
      if(ct) ct.textContent = CART.money(total + taxa);
    });

    buildChips();
    setTitle();
    renderChips();
    renderItems();
    q?.addEventListener("input", e => renderItems(e.target.value));
  }

  window.addEventListener("DOMContentLoaded", () => {
    if(isHome()) buildHome();
    if(isMenu()) buildMenu();
  });
})();
