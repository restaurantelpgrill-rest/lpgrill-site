(() => {
  const STORE_CUSTOMER = "LPGRILL_CUSTOMER_V1";
  const WHATSAPP_LOJA = "5531998064556"; // LP Grill

  const $ = (s)=> document.querySelector(s);

  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function loadCustomer(){
    try{
      const raw = localStorage.getItem(STORE_CUSTOMER);
      return raw ? JSON.parse(raw) : { name:"", phone:"", address:"", obs:"" };
    }catch{
      return { name:"", phone:"", address:"", obs:"" };
    }
  }

  function saveCustomer(d){
    localStorage.setItem(STORE_CUSTOMER, JSON.stringify(d));
  }

  // adapte se seu cart.js usa outra chave/estrutura
  function loadCart(){
  try{
    const key = window.LPGRILL_CART_KEY || "LPGRILL_CART_V1"; // fallback
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { items: [], mode: "entrega", fee: 0 };
  }catch{
    return { items: [], mode: "entrega", fee: 0 };
  }
}

  function cartToText(cart){
    const items = cart.items || [];
    if(items.length === 0) return "Carrinho vazio.";

    let subtotal = 0;
    const lines = items.map((it)=>{
      const q = Number(it.qty || 1);
      const p = Number(it.price || 0);
      subtotal += q * p;
      return `• ${q}x ${it.title} — ${money(p)}${it.note ? ` (${it.note})` : ""}`;
    });

    const fee = Number(cart.fee || 0);
    const total = subtotal + fee;

    return [
      `*Itens:*`,
      ...lines,
      ``,
      `*Subtotal:* ${money(subtotal)}`,
      `*Taxa:* ${money(fee)}`,
      `*Total:* ${money(total)}`
    ].join("\n");
  }

  function onlyDigits(s){ return String(s||"").replace(/\D+/g,""); }

  function validate({name, phone, address}, cart){
    if(!name || name.length < 2) return "Preencha seu nome.";
    const digits = onlyDigits(phone);
    if(digits.length < 10) return "Preencha seu WhatsApp corretamente.";

    // se modo entrega, endereço obrigatório
    const mode = (cart.mode || "entrega");
    if(mode === "entrega"){
      if(!address || address.length < 8) return "Preencha o endereço completo para entrega.";
    }
    return null;
  }

  function buildMsg(c, cart){
    const mode = (cart.mode || "entrega");
    const header = [
      `Olá! Segue meu pedido no LP Grill 👋`,
      ``,
      `*Nome:* ${c.name}`,
      `*WhatsApp:* ${c.phone}`,
      `*Modo:* ${mode === "retirar" ? "Retirar" : "Entrega"}`,
      mode === "entrega" ? `*Endereço:* ${c.address}` : null,
      c.obs ? `*Obs:* ${c.obs}` : null,
      ``,
      cartToText(cart)
    ].filter(Boolean);

    return encodeURIComponent(header.join("\n"));
  }

  function init(){
    const c = loadCustomer();
    $("#cName").value = c.name || "";
    $("#cPhone").value = c.phone || "";
    $("#cAddress").value = c.address || "";
    $("#cObs").value = c.obs || "";

    // salvar automaticamente enquanto digita
    ["cName","cPhone","cAddress","cObs"].forEach(id=>{
      $("#"+id).addEventListener("input", ()=>{
        saveCustomer({
          name: $("#cName").value.trim(),
          phone: $("#cPhone").value.trim(),
          address: $("#cAddress").value.trim(),
          obs: $("#cObs").value.trim()
        });
      });
    });

    $("#btnSendOrder").addEventListener("click", ()=>{
      const customer = {
        name: $("#cName").value.trim(),
        phone: $("#cPhone").value.trim(),
        address: $("#cAddress").value.trim(),
        obs: $("#cObs").value.trim()
      };
      const cart = loadCart();

      const err = validate(customer, cart);
      const msgEl = $("#checkoutMsg");
      if(err){
        msgEl.textContent = "❌ " + err;
        return;
      }

      saveCustomer(customer);

      const text = buildMsg(customer, cart);
      window.open(`https://wa.me/${WHATSAPP_LOJA}?text=${text}`, "_blank", "noopener");
      msgEl.textContent = "✅ Abrindo WhatsApp...";
    });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
