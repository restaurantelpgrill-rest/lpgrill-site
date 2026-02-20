const CART_KEY="LP_CART";

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY)||"{}");
}
function saveCart(c){
  localStorage.setItem(CART_KEY,JSON.stringify(c));
}
function addItem(id){
  let c=getCart();
  c[id]=(c[id]||0)+1;
  saveCart(c);
}
function removeItem(id){
  let c=getCart();
  if(!c[id]) return;
  c[id]--;
  if(c[id]<=0) delete c[id];
  saveCart(c);
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
}// js/cart.js — mantido apenas para compatibilidade (carrinho está no app.js)
