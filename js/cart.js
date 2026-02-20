(() => {
  const KEY = "LPGRILL_CART_V1";
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  };
  const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

  const findItem = (id) => (window.SITE?.items || []).find(x => x.id === id);

  function add(id, qty=1){
    const item = findItem(id);
    if(!item) return;

    const cart = read();
    const i = cart.findIndex(x => x.id === id);
    if(i >= 0) cart[i].qty += qty;
    else cart.push({ id, qty: qty });

    write(cart);
    notify();
  }

  function sub(id, qty=1){
    const cart = read();
    const i = cart.findIndex(x => x.id === id);
    if(i < 0) return;

    cart[i].qty -= qty;
    if(cart[i].qty <= 0) cart.splice(i, 1);
    write(cart);
    notify();
  }

  function clear(){
    write([]);
    notify();
  }

  function summary(){
    const cart = read();
    let count = 0;
    let total = 0;

    const lines = cart.map(row => {
      const item = findItem(row.id);
      if(!item) return null;
      count += row.qty;
      total += item.price * row.qty;
      return { ...row, item, lineTotal: item.price * row.qty };
    }).filter(Boolean);

    // taxa opcional (se quiser somar no total final, mude aqui)
    return { count, total, lines };
  }

  function waMessage(){
    const { lines, total } = summary();
    const taxa = Number(window.SITE?.meta?.taxa || 0);
    const brand = window.SITE?.brand || "Pedido";
    const tempo = window.SITE?.meta?.tempo || "";
    const horario = window.SITE?.meta?.horario || "";

    const txtLines = lines.map(l => `• ${l.qty}x ${l.item.name} — ${money(l.item.price)} = ${money(l.lineTotal)}`);
    const msg =
`*${brand} — Pedido*
${txtLines.join("\n")}

Subtotal: *${money(total)}*
Taxa: *${money(taxa)}*
Total: *${money(total + taxa)}*

Tempo estimado: ${tempo}
Horário: ${horario}

*Nome:*
*Endereço:*
*Forma de pagamento:*`;

    return msg;
  }

  function waLink(){
    const w = window.SITE?.contact?.whatsapp || "";
    const msg = encodeURIComponent(waMessage());
    return `https://wa.me/${w}?text=${msg}`;
  }

  const listeners = new Set();
  function onChange(fn){ listeners.add(fn); fn(summary()); return () => listeners.delete(fn); }
  function notify(){ listeners.forEach(fn => fn(summary())); }

  window.CART = { add, sub, clear, summary, onChange, waLink, money };
})();
