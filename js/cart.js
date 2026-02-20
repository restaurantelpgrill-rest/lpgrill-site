// ===== Utils =====
window.money = window.money || function(v){
  return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
};

// ===== Carrinho simples (localStorage) =====
const Cart = window.Cart || {};
window.Cart = Cart;

Cart.key = "LPGRILL_CART";

Cart.read = function(){
  try{ return JSON.parse(localStorage.getItem(Cart.key) || "[]"); }
  catch(e){ return []; }
};

Cart.write = function(items){
  localStorage.setItem(Cart.key, JSON.stringify(items));
  Cart.syncUI();
};

Cart.add = function(id){
  const items = Cart.read();
  const found = items.find(x => x.id === id);
  if(found) found.qty += 1;
  else items.push({id, qty:1});
  Cart.write(items);
};

Cart.count = function(){
  return Cart.read().reduce((a,b)=> a + (b.qty||0), 0);
};

Cart.total = function(){
  const items = Cart.read();
  const all = [];
  for(const k in window.DATA){
    if(Array.isArray(window.DATA[k])) all.push(...window.DATA[k]);
  }
  return items.reduce((sum, it)=>{
    const p = all.find(x=>x.id===it.id);
    return sum + (p ? (p.price*it.qty) : 0);
  },0);
};

Cart.syncUI = function(){
  const badge = document.getElementById("cartBadge");
  const total = document.getElementById("ctaTotal");
  if(badge) badge.textContent = String(Cart.count());
  if(total) total.textContent = money(Cart.total());
};

// auto-sync
document.addEventListener("DOMContentLoaded", Cart.syncUI);
