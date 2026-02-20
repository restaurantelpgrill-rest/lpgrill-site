function money(v){
  return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function renderCategory(cat,id){
  const list=document.getElementById(id);
  const data=window.DATA[cat];

  list.innerHTML=data.map(p=>`
  <article class="product">
    <img class="pimg" src="${p.img}">
    <div class="pbody">
      <div class="ptitle">
        <strong>${p.title}</strong>
        <span class="price">${money(p.price)}</span>
      </div>
      <div class="pdesc">${p.desc}</div>

      <div class="pmeta">
        <div class="qty">
          <button class="qbtn" onclick="dec('${p.id}')">-</button>
          <strong id="q-${p.id}">0</strong>
          <button class="qbtn" onclick="inc('${p.id}')">+</button>
        </div>
      </div>
    </div>
  </article>
  `).join("");

  updateUI();
}

function inc(id){ addItem(id); updateUI(); }
function dec(id){ removeItem(id); updateUI(); }

function updateUI(){
  const c=getCart();
  Object.keys(c).forEach(id=>{
    const el=document.getElementById("q-"+id);
    if(el) el.textContent=c[id];
  });
}

function renderCheckout(){
  const wrap=document.getElementById("items");
  const cart=getCart();
  let total=0;

  wrap.innerHTML="";

  for(let id in cart){
    const p=Object.values(DATA).flat().find(x=>x.id==id);
    const q=cart[id];
    const sub=p.price*q;
    total+=sub;

    wrap.innerHTML+=`
      <div class="itemline">
        <strong>${p.title}</strong>
        <span>${q} x ${money(p.price)}</span>
        <strong>${money(sub)}</strong>
      </div>
    `;
  }

  document.getElementById("total").textContent=money(total);
}

function sendOrder(){
  const cart=getCart();
  let msg="Pedido LP Grill:%0A";

  for(let id in cart){
    const p=Object.values(DATA).flat().find(x=>x.id==id);
    msg+=`${cart[id]}x ${p.title}%0A`;
  }

  msg+=`Total: ${document.getElementById("total").textContent}`;

  window.open(`https://wa.me/5531999999999?text=${msg}`);
}
