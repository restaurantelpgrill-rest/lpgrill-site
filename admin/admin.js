(() => {
  const STORE_KEY = "LPGRILL_DATA_ADMIN_V1";
  const PASS_KEY  = "LPGRILL_ADMIN_PASS_V1"; // armazena um hash simples
  const SESSION_KEY = "LPGRILL_ADMIN_UNLOCKED_V1";

  // ========= util =========
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const nowISO = () => new Date().toISOString();
  const money = (v)=> Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function safeParse(raw){
    try { return JSON.parse(raw); } catch { return null; }
  }

  // hash simples (não criptografia real, mas suficiente pro "não mexer sem querer")
  async function hashText(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  function normalizeData(d){
    d ||= {};
    d.marmitas ||= [];
    d.porcoes ||= [];
    d.bebidas ||= [];
    d.sobremesas ||= [];
    // normaliza itens
    for(const cat of ["marmitas","porcoes","bebidas","sobremesas"]){
      d[cat] = d[cat].map(it => ({
        id: it.id || crypto.randomUUID(),
        title: it.title || "Novo item",
        desc: it.desc || "",
        tag: it.tag || "",
        price: Number(it.price ?? 0),
        img: it.img || "img/mockup.png",
        promo: Boolean(it.promo),
        promoPrice: it.promoPrice === "" || it.promoPrice == null ? null : Number(it.promoPrice),
        soldOut: Boolean(it.soldOut),
        updatedAt: it.updatedAt || nowISO()
      }));
    }
    return d;
  }

  function loadData(){
    const raw = localStorage.getItem(STORE_KEY);
    const d = normalizeData(safeParse(raw) || {});
    return d;
  }

  function saveData(d){
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
    toast("Salvo ✅");
  }

  // ========= UI =========
  function toast(msg){
    const t = $("#toast");
    if(!t) return alert(msg);
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 1800);
  }

  function categoryLabel(cat){
    return ({
      marmitas:"Marmitas",
      porcoes:"Porções",
      bebidas:"Bebidas",
      sobremesas:"Sobremesas"
    })[cat] || cat;
  }

  function itemCard(it, cat){
    const promoOn = it.promo && (it.promoPrice != null) && (Number(it.promoPrice) > 0);
    const finalPrice = promoOn ? Number(it.promoPrice) : Number(it.price);

    return `
      <div class="adm-card" data-cat="${cat}" data-id="${it.id}">
        <div class="adm-img">
          <img src="${it.img}" alt="">
          ${it.soldOut ? `<span class="badge soldout">ESGOTADO</span>` : ``}
          ${promoOn ? `<span class="badge promo">PROMO</span>` : ``}
        </div>

        <div class="adm-fields">
          <label>Título
            <input type="text" class="f-title" value="${escapeHtml(it.title)}">
          </label>

          <label>Descrição
            <textarea class="f-desc" rows="2">${escapeHtml(it.desc)}</textarea>
          </label>

          <div class="row2">
            <label>Tag
              <input type="text" class="f-tag" value="${escapeHtml(it.tag)}">
            </label>

            <label>Preço
              <input type="number" step="0.01" class="f-price" value="${Number(it.price).toFixed(2)}">
            </label>
          </div>

          <div class="row2">
            <label class="inline">
              <input type="checkbox" class="f-soldout" ${it.soldOut ? "checked":""}>
              Marcar como esgotado
            </label>

            <label class="inline">
              <input type="checkbox" class="f-promo" ${it.promo ? "checked":""}>
              Ativar promoção
            </label>
          </div>

          <div class="row2">
            <label>Preço promo
              <input type="number" step="0.01" class="f-promoprice" value="${it.promoPrice==null?"":Number(it.promoPrice).toFixed(2)}" placeholder="ex: 19.90">
            </label>

            <label>Imagem (URL)
              <input type="text" class="f-img" value="${escapeHtml(it.img)}" placeholder="img/arquivo.jpg ou https://...">
            </label>
          </div>

          <div class="row2">
            <label>Upload de imagem
              <input type="file" class="f-upload" accept="image/*">
              <small>Salva no navegador (base64). Ideal para fotos leves.</small>
            </label>

            <div class="preview">
              <div><strong>Preço exibido:</strong> ${money(finalPrice)}</div>
              <div class="muted"><strong>Atualizado:</strong> ${new Date(it.updatedAt).toLocaleString("pt-BR")}</div>
            </div>
          </div>

          <div class="actions">
            <button class="btn danger js-remove">Remover</button>
            <button class="btn js-save-one">Salvar item</button>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function render(){
    const d = loadData();

    for(const cat of ["marmitas","porcoes","bebidas","sobremesas"]){
      const box = $(`[data-list="${cat}"]`);
      if(!box) continue;

      const list = d[cat];
      box.innerHTML = list.length
        ? list.map(it => itemCard(it, cat)).join("")
        : `<div class="empty">Sem itens em ${categoryLabel(cat)}. Clique em <b>Adicionar</b>.</div>`;
    }

    $("#countAll").textContent = countAll(d);
  }

  function countAll(d){
    return ["marmitas","porcoes","bebidas","sobremesas"].reduce((acc,cat)=> acc + (d[cat]?.length||0), 0);
  }

  function addItem(cat){
    const d = loadData();
    d[cat].unshift({
      id: crypto.randomUUID(),
      title: `Novo ${categoryLabel(cat).slice(0,-1)}`,
      desc: "",
      tag: "",
      price: 0,
      img: "img/mockup.png",
      promo: false,
      promoPrice: null,
      soldOut: false,
      updatedAt: nowISO()
    });
    saveData(d);
    render();
    toast("Item adicionado ✅");
  }

  function readCard(el){
    const title = $(".f-title", el).value.trim();
    const desc = $(".f-desc", el).value.trim();
    const tag  = $(".f-tag", el).value.trim();
    const price = Number($(".f-price", el).value || 0);

    const soldOut = $(".f-soldout", el).checked;
    const promo   = $(".f-promo", el).checked;
    const promoPriceRaw = $(".f-promoprice", el).value;
    const promoPrice = promoPriceRaw === "" ? null : Number(promoPriceRaw);

    const img = $(".f-img", el).value.trim() || "img/mockup.png";

    return { title, desc, tag, price, soldOut, promo, promoPrice, img, updatedAt: nowISO() };
  }

  async function uploadToBase64(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ========= backup =========
  function downloadFile(filename, text){
    const blob = new Blob([text], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportBackup(){
    const d = loadData();
    const payload = {
      exportedAt: nowISO(),
      storeKey: STORE_KEY,
      data: d
    };
    downloadFile(`lpgrill-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload, null, 2));
    toast("Backup exportado ✅");
  }

  async function importBackup(file){
    const text = await file.text();
    const obj = safeParse(text);
    if(!obj || !obj.data) throw new Error("Backup inválido");
    const d = normalizeData(obj.data);
    saveData(d);
    render();
    toast("Backup restaurado ✅");
  }

  // ========= senha =========
  async function ensurePasswordSetup(){
    const hasPass = !!localStorage.getItem(PASS_KEY);
    const box = $("#lockBox");
    const app = $("#adminApp");

    if(localStorage.getItem(SESSION_KEY) === "1"){
      box.style.display = "none";
      app.style.display = "block";
      return;
    }

    box.style.display = "block";
    app.style.display = "none";

    $("#lockTitle").textContent = hasPass ? "Área restrita" : "Criar senha do Admin";
    $("#lockHint").textContent  = hasPass
      ? "Digite a senha para entrar."
      : "Defina uma senha agora. (Você pode trocar depois em Configurações).";

    $("#btnUnlock").onclick = async () => {
      const pass = $("#lockPass").value.trim();
      if(pass.length < 4) return toast("Senha muito curta.");
      if(!hasPass){
        const h = await hashText(pass);
        localStorage.setItem(PASS_KEY, h);
        localStorage.setItem(SESSION_KEY, "1");
        toast("Senha criada ✅");
        box.style.display = "none";
        app.style.display = "block";
        render();
        return;
      }
      const h = await hashText(pass);
      const saved = localStorage.getItem(PASS_KEY);
      if(h !== saved) return toast("Senha incorreta.");
      localStorage.setItem(SESSION_KEY, "1");
      box.style.display = "none";
      app.style.display = "block";
      render();
      toast("Bem-vindo ✅");
    };

    $("#btnResetPass").onclick = async () => {
      const current = $("#lockPass").value.trim();
      if(!hasPass){
        toast("Ainda não há senha definida.");
        return;
      }
      const h = await hashText(current);
      if(h !== localStorage.getItem(PASS_KEY)) return toast("Digite a senha atual correta para redefinir.");
      const newPass = prompt("Nova senha (mínimo 4 caracteres):");
      if(!newPass || newPass.trim().length < 4) return toast("Senha inválida.");
      const nh = await hashText(newPass.trim());
      localStorage.setItem(PASS_KEY, nh);
      toast("Senha alterada ✅");
    };

    $("#btnLogout").onclick = () => {
      localStorage.removeItem(SESSION_KEY);
      location.reload();
    };
  }

  // ========= eventos =========
  function bindEvents(){
    // botões adicionar
    $$(".js-add").forEach(btn=>{
      btn.addEventListener("click", ()=> addItem(btn.dataset.cat));
    });

    // salvar tudo
    $("#btnSaveAll")?.addEventListener("click", ()=>{
      // aqui só re-salva o que já está salvo (caso você queira).
      // Mantive um botão para "forçar salvar" caso você adicione ajustes depois.
      const d = loadData();
      saveData(d);
      toast("Tudo salvo ✅");
    });

    // export/import backup
    $("#btnExport")?.addEventListener("click", exportBackup);
    $("#fileImport")?.addEventListener("change", async (e)=>{
      const f = e.target.files?.[0];
      if(!f) return;
      try{
        await importBackup(f);
      }catch(err){
        console.error(err);
        toast("Backup inválido ❌");
      }finally{
        e.target.value = "";
      }
    });

    // delegação: salvar/remover/upload por item
    document.addEventListener("click", (e)=>{
      const card = e.target.closest?.(".adm-card");
      if(!card) return;

      const cat = card.dataset.cat;
      const id  = card.dataset.id;

      if(e.target.classList.contains("js-remove")){
        if(!confirm("Remover este item?")) return;
        const d = loadData();
        d[cat] = d[cat].filter(it => it.id !== id);
        saveData(d);
        render();
        return;
      }

      if(e.target.classList.contains("js-save-one")){
        const d = loadData();
        const idx = d[cat].findIndex(it=>it.id===id);
        if(idx < 0) return;
        d[cat][idx] = { ...d[cat][idx], ...readCard(card) };
        saveData(d);
        render();
        return;
      }
    });

    document.addEventListener("change", async (e)=>{
      const card = e.target.closest?.(".adm-card");
      if(!card) return;
      if(!e.target.classList.contains("f-upload")) return;

      const file = e.target.files?.[0];
      if(!file) return;

      // dica: limite pra evitar storage gigante
      const maxMB = 1.5;
      if(file.size > maxMB * 1024 * 1024){
        toast(`Imagem grande (${(file.size/1024/1024).toFixed(1)}MB). Tente até ${maxMB}MB.`);
        e.target.value = "";
        return;
      }

      const cat = card.dataset.cat;
      const id  = card.dataset.id;

      try{
        const dataUrl = await uploadToBase64(file);
        $(".f-img", card).value = dataUrl; // coloca no campo imagem
        // salva
        const d = loadData();
        const idx = d[cat].findIndex(it=>it.id===id);
        if(idx >= 0){
          d[cat][idx] = { ...d[cat][idx], ...readCard(card), img: dataUrl };
          saveData(d);
          render();
          toast("Imagem enviada ✅");
        }
      }catch(err){
        console.error(err);
        toast("Falha no upload ❌");
      }finally{
        e.target.value = "";
      }
    });
  }

  // ========= init =========
  window.addEventListener("DOMContentLoaded", async ()=>{
    await ensurePasswordSetup();
    bindEvents();
    // render só depois de liberar
    if(localStorage.getItem(SESSION_KEY) === "1") render();
  });
})();
