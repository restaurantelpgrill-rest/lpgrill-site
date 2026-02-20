(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const esc = (str="") => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

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
      const list = cats.filter(c => !t || c.title.toLowerCase().includes(t) || (c.desc||"").toLowerCase().includes(t));
      catsEl.innerHTML = list.map(c => `
        <a class="card" href="./cardapio.html?cat=${encodeURIComponent(c.id)}">
          <div class="card__ico">${esc(c.icon)}</div>
          <div class="card__txt">
            <h3>${esc(c.title)}</h3>
            <p class="muted">${esc(c.desc || "")}</p>
          </div>
          <div class="card__arrow">›</div>
        </a>
      `).join("");
    };

    render();
    q?.addEventListener("input", e => render(e.target.value));

    // reviews
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
    $("#moreReviews")?.addEventListener("click", () => alert("Depois você pode ligar isso ao Google Reviews 😉"));

    // botão whatsapp flutuante
    const wa = $("#waFloat");
    if(wa){
      wa.href = CART.waLink();
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

    const catExists = cats.some(c => c.id === activeCat);
    if(!catExists) activeCat = cats[0]?.id || "";

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
      const list = itemsAll.filter(it => it.cat === activeCat)
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

    // Carrinho UI
    const drawer = $("#drawer");
    const openCart = () => { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden","false"); };
    const closeCart = () => { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden","true"); };

    $("#openCart")?.addEventListener("click", openCart);
    $("#closeCart")?.addEventListener("click", closeCart);
    $("#closeCart2")?.addEventListener("click", closeCart);
    $("#bbOpen")?.addEventListener("click", openCart);

    $("#clearBtn")?.addEventListener("click", () => {
      if(confirm("Limpar carrinho?")) CART.clear();
    });

    $("#finishBtn")?.addEventListener("click", () => {
      const link = CART.waLink();
      window.open(link, "_blank");
    });

    CART.onChange(({count,total,lines}) => {
      // drawer list
      const listEl = $("#cartList");
      if(listEl){
        if(!lines.length){
          listEl.innerHTML = `<p class="muted">Seu carrinho está vazio.</p>`;
        }else{
          listEl.innerHTML = lines.map(l => `
            <div class="cartRow">
              <div class="cartRow__main">
                <b>${esc(l.item.name)}</b>
                <span class="muted">${CART.money(l.item.price)} • x${l.qty}</span>
              </div>
              <div class="cartRow__act">
                <button class="qtyBtn" data-csub="${esc(l.id)}">−</button>
                <button class="qtyBtn" data-cadd="${esc(l.id)}">+</button>
              </div>
            </div>
          `).join("");
          $$("[data-cadd]").forEach(b => b.addEventListener("click", ()=> CART.add(b.dataset.cadd, 1)));
          $$("[data-csub]").forEach(b => b.addEventListener("click", ()=> CART.sub(b.dataset.csub, 1)));
        }
      }

      const taxa = Number(window.SITE?.meta?.taxa || 0);
      $("#cartTotal").textContent = CART.money(total + taxa);

      // bottom bar
      const bb = $("#bottomBar");
      if(bb){
        bb.hidden = (count === 0);
        $("#bbTotal").textContent = CART.money(total + taxa);
        $("#bbCount").textContent = `${count} item${count===1?"":"s"}`;
      }
    });

    setTitle();
    renderChips();
    renderItems();

    q?.addEventListener("input", e => renderItems(e.target.value));
  }

  function renderChips(){
    const el = $("#chips");
    if(!el) return;
    const m = window.SITE?.meta || {};
    el.innerHTML = `
      <span class="chip">🚚 Taxa: <b>${CART.money(m.taxa || 0)}</b></span>
      <span class="chip">⏱️ Tempo: <b>${esc(m.tempo || "")}</b></span>
      <span class="chip">🕒 ${esc(m.horario || "")}</span>
    `;
  }

  // Boot
  window.addEventListener("DOMContentLoaded", () => {
    if(isHome()) buildHome();
    if(isMenu()) buildMenu();
  });
})();
