(() => {

  const CART_KEY = window.LPGRILL_CART_KEY || "LP_CART";
  const STORE_CUSTOMER = "LPGRILL_CUSTOMER";
  const WHATSAPP_LOJA = "5531998064556";

  const money = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const $ = s => document.querySelector(s);

  function loadCart(){
    try{
      return JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    }catch{
      return {};
    }
  }

  function loadCustomer(){
    try{
      return JSON.parse(localStorage.getItem(STORE_CUSTOMER) || "{}");
    }catch{
      return {};
    }
  }

  function saveCustomer(d){
    localStorage.setItem(STORE_CUSTOMER, JSON.stringify(d));
  }

  function findProductById(id){
    const data = window.DATA || {};
    const all = [
      ...(data.marmitas||[]),
      ...(data.porcoes||[]),
      ...(data.bebidas||[]),
      ...(data.sobremesas||[])
    ];
    return all.find(p => p.id === id);
  }

  function buildItemsText(cart){
    let subtotal = 0;
    const lines = [];

    Object.keys(cart).forEach(id => {
      const qty = cart[id];
      const prod = findProductById(id);
      if(!prod) return;

      const price = prod.promo && prod.promoPrice ? prod.promoPrice : prod.price;
      subtotal += qty * price;

      lines.push(`• ${qty}x ${prod.title} — ${money(price)}`);
    });

    return {
      text: lines.join("\n"),
      subtotal
    };
  }

  function validate({name, phone, address}){
    if(!name || name.length < 2) return "Digite seu nome";
    if(!phone || phone.replace(/\D/g,"").length < 10) return "WhatsApp inválido";
    if(!address || address.length < 5) return "Digite o endereço";
    return null;
  }

  function init(){

    const c = loadCustomer();
    $("#cName").value = c.name || "";
    $("#cPhone").value = c.phone || "";
    $("#cAddress").value = c.address || "";
    $("#cObs").value = c.obs || "";

    $("#btnSendOrder").onclick = () => {

      const customer = {
        name: $("#cName").value.trim(),
        phone: $("#cPhone").value.trim(),
        address: $("#cAddress").value.trim(),
        obs: $("#cObs").value.trim()
      };

      const error = validate(customer);
      if(error){
        $("#checkoutMsg").textContent = "❌ " + error;
        return;
      }

      saveCustomer(customer);

      const cart = loadCart();
      if(Object.keys(cart).length === 0){
        $("#checkoutMsg").textContent = "Carrinho vazio.";
        return;
      }

      const {text, subtotal} = buildItemsText(cart);

      const msg = encodeURIComponent(
`Olá! Quero fazer um pedido 👋

Nome: ${customer.name}
WhatsApp: ${customer.phone}
Endereço: ${customer.address}

Pedido:
${text}

Subtotal: ${money(subtotal)}

Obs: ${customer.obs || "—"}`
      );

      window.open(`https://wa.me/${WHATSAPP_LOJA}?text=${msg}`, "_blank");
    };

  }

  window.addEventListener("DOMContentLoaded", init);

})();
