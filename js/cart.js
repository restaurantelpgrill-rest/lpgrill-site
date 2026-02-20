// js/cart.js — Carrinho completo (LP Grill)
(function(){
  const KEY = "LPGRILL_CART_V1";

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  };

  const write = (obj) => {
    localStorage.setItem(KEY, JSON.stringify(obj));
  };

  function allProducts(){
    const list = [];
    if(window.DATA){
      for(const k in window.DATA){
        if(Array.isArray(window.DATA[k])) list.push(...window.DATA[k]);
      }
    }
    return list;
  }

  function findProduct(id){
    return allProducts().find(p => p.id === id);
  }

  const Cart = window.Cart || {};
  window.Cart = Cart;

  Cart.getMap = () => read();

  Cart.count = () => {
    const m = read();
    return Object.values(m).reduce((a,b)=>a + (b||0), 0);
  };

  Cart.qty = (id) => {
    const m = read();
    return Number(m[id] || 0);
  };

  Cart.add = (id, n=1) => {
    const m = read();
    m[id] = Number(m[id] || 0) + Number(n||1);
    if(m[id] <= 0) delete m[id];
    write(m);
    Cart.syncUI();
  };

  Cart.dec = (id, n=1) => {
    Cart.add(id, -Number(n||1));
  };

  Cart.remove = (id) => {
    const m = read();
    delete m[id];
    write(m);
    Cart.syncUI();
  };

  Cart.clear = () => {
    write({});
    Cart.syncUI();
  };

  Cart.subtotal = () => {
    const m = read();
    let sum = 0;
    for(const [id, qty] of Object.entries(m)){
      const p = findProduct(id);
      if(p) sum += (p.price * qty);
    }
    return sum;
  };

  Cart.itemsDetailed = () => {
    const m = read();
    return Object.entries(m).map(([id, qty]) => {
      const p = findProduct(id);
      return { id, qty, product: p };
    }).filter(x => x.product);
  };

  Cart.syncUI = () => {
    const badge = document.getElementById("cartBadge");
    const total = document.getElementById("ctaTotal");
    if(badge) badge.textContent = String(Cart.count());
    if(total) total.textContent = money(Cart.subtotal());
    // atualiza controles de quantidade em todas as páginas
    document.querySelectorAll("[data-qty-for]").forEach(el=>{
      const id = el.getAttribute("data-qty-for");
      el.textContent = String(Cart.qty(id));
    });
  };

})();
