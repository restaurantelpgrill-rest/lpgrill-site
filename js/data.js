// js/data.js — LP Grill (fonte única de dados + fallback + admin/localStorage)
// ✅ garante img, price numérico e categorias sempre presentes
// ✅ compat: Combo aparece mesmo se o render usar "combo" ou "combos"
(() => {
  const STORE_KEY = "LPGRILL_DATA_ADMIN_V1";

  // ========== Fallback (site funciona mesmo sem admin) ==========
  const fallback = {
     marmitas: [
  // ===== PRATOS DO DIA (aparecem só no dia) =====
  { id:"mseg", title:"🔥 Frango Mineiro com Quiabo & Angu Cremoso", desc:"Frango caipira cozido lentamente com quiabo fresco, temperado no estilo mineiro. Acompanha arroz branco soltinho, feijão caseiro, couve refogada e angu cremoso.", tag:"Segunda", price:0, img:"img/mockup.png", days:[1] },

  { id:"mter", title:"🥘 Carne de Panela com Mandioca da Roça", desc:"Carne macia cozida lentamente com mandioca, bem temperada e suculenta. Acompanha arroz, feijão, farofa artesanal, couve refogada e beterraba fresca.", tag:"Terça", price:0, img:"img/mockup.png", days:[2] },

  { id:"mqua", title:"🍖 Costelinha ao Molho da Casa com Batata Rústica", desc:"Costelinha suína macia envolvida em molho especial da casa. Servida com arroz, feijão, batata rústica dourada, farofa rica e salada fresca de alface e tomate.", tag:"Quarta", price:0, img:"img/mockup.png", days:[3] },

  { id:"mqui", title:"🌽 Tropeiro Raiz Completo", desc:"Feijão tropeiro bem temperado com linguiça, ovo e farofa crocante. Acompanha arroz branco e couve refogada no alho.", tag:"Quinta", price:0, img:"img/mockup.png", days:[4] },

  { id:"msex", title:"🍲 Feijoada da Casa Completa", desc:"Feijoada tradicional preparada com carnes selecionadas e tempero especial. Servida com arroz, couve refogada, farofa crocante e laranja.", tag:"Sexta", price:0, img:"img/mockup.png", days:[5] },

  // ===== FIXOS (segunda a sábado) =====
  { id:"mfixexecboi", title:"🍛 Prato Executivo da Casa (Bife de boi)", desc:"Arroz, feijão, macarrão alho e óleo, batata frita e salada fresca de alface e tomate.", tag:"Fixo", price:0, img:"img/mockup.png", days:[1,2,3,4,5,6] },

  { id:"mfixexecfrango", title:"🍛 Prato Executivo da Casa (Bife de frango)", desc:"Arroz, feijão, macarrão alho e óleo, batata frita e salada fresca de alface e tomate.", tag:"Fixo", price:0, img:"img/mockup.png", days:[1,2,3,4,5,6] },

  { id:"mfixexecporco", title:"🍛 Prato Executivo da Casa (Bife de porco)", desc:"Arroz, feijão, macarrão alho e óleo, batata frita e salada fresca de alface e tomate.", tag:"Fixo", price:0, img:"img/mockup.png", days:[1,2,3,4,5,6] }
],
    porcoes: [
      { id:"p1", title:"Porção de Batata Frita (P)", desc:"Crocante • perfeita pra compartilhar.", tag:"Clássica", price:17.90, img:"img/mockup.png" },
      { id:"p2", title:"Batata Frita (G)", desc:"Grande • serve bem 2–3 pessoas.", tag:"Compartilhar", price:27.90, img:"img/mockup.png" },
      { id:"p3", title:"Frango a Passarinho", desc:"Dourado • suculento • tempero da casa.", tag:"Top", price:34.90, img:"img/frango_grelhado.jpg" },
      { id:"p4", title:"Calabresa Acebolada", desc:"Calabresa na chapa + cebola.", tag:"Chapa", price:32.90, img:"img/mockup.png" },
      { id:"p5", title:"Torresmo Crocante", desc:"Sequinho • pururuca perfeita.", tag:"Crocante", price:29.90, img:"img/mockup.png" },
      { id:"p6", title:"Isca de Carne", desc:"Tirinhas na chapa • bem temperadas.", tag:"Premium", price:39.90, img:"img/mockup.png" }
    ],

    bebidas: [
      { id:"b1", title:"Coca-Cola Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/coca_lata.jpg" },
      { id:"b2", title:"Guaraná Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/guarana_lata.jpg" },
      { id:"b3", title:"Fanta Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/mockup.png" },
      { id:"b4", title:"Sprite Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/mockup.png" },

      { id:"b5", title:"Coca-Cola 2L", desc:"Perfeita pra compartilhar.", tag:"2L", price:12.00, img:"img/mockup.png" },
      { id:"b6", title:"Guaraná 2L", desc:"Bem gelada.", tag:"2L", price:12.00, img:"img/mockup.png" },

      { id:"b7", title:"Água 500ml", desc:"Sem gás.", tag:"500ml", price:4.00, img:"img/agua_500.jpg" },
      { id:"b8", title:"Água com gás", desc:"500ml gelada.", tag:"500ml", price:5.00, img:"img/agua_500.jpg" },

      { id:"b9", title:"Suco Natural", desc:"300ml • sabor do dia.", tag:"300ml", price:8.00, img:"img/mockup.png" },
      { id:"b10", title:"H2O", desc:"500ml gelada.", tag:"500ml", price:7.50, img:"img/mockup.png" }
    ],

    sobremesas: [
  { id:"ms1", title:"🧀 Macarrão à Bolonhesa com Queijo & Bacon", desc:"Macarrão envolvido em molho bolonhesa caseiro, finalizado com queijo e bacon crocante.", tag:"Fixo", price:0, img:"img/mockup.png", days:[1,2,3,4,5,6] },

  { id:"ms2", title:"🔥 Lasanha Artesanal Assada na Hora (Bolonhesa)", desc:"Lasanha artesanal com molho caseiro, assada na hora em vasilha de alumínio. Acompanha arroz e salada (alface e tomate).", tag:"Premium", price:0, img:"img/mockup.png", days:[1,2,3,4,5,6] },

  { id:"ms3", title:"🔥 Lasanha Artesanal Assada na Hora (Frango c/ Catupiry)", desc:"Lasanha artesanal com molho caseiro, assada na hora em vasilha de alumínio. Acompanha arroz e salada (alface e tomate).", tag:"Premium", price:0, img:"img/mockup.png", days:[1,2,3,4,5,6] }
],
    ],

    // ✅ COMBO (dados)
    combo: [
      { id:"c1", title:"Combo Econômico", desc:"Marmita Tradicional + Coca Lata", tag:"Economize", price:22.90, img:"img/cat-finalizar.jpg" },
      { id:"c2", title:"Combo Executivo", desc:"Marmita Carne + Guaraná", tag:"Mais pedido", price:27.90, img:"img/cat-finalizar.jpg" },
      { id:"c3", title:"Combo Família", desc:"2 Marmitas + Refrigerante 2L", tag:"Vale a pena", price:49.90, img:"img/cat-finalizar.jpg" }
    ]
      
    fallback.addons = [
  { id:"a1", title:"🍟 Batata frita", price:4.00, applies:["marmitas","sobremesas"], img:"img/mockup.png" },
  { id:"a2", title:"🥩 Carne bovina", price:5.00, applies:["marmitas","sobremesas"], img:"img/mockup.png" },
  { id:"a3", title:"🐷 Carne suína", price:4.00, applies:["marmitas","sobremesas"], img:"img/mockup.png" },
  { id:"a4", title:"🍅 Molho à bolonhesa", price:3.00, applies:["marmitas","sobremesas"], img:"img/mockup.png" }
  };

  // ========== Helpers ==========
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

  function num(v){
    const n = Number(String(v ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeItem(it, idx, prefix){
    const o = isObj(it) ? it : {};
    const id = String(o.id || `${prefix}${idx+1}`).trim();

    const title = String(o.title || "Item").trim();
    const desc  = String(o.desc  || "").trim();
    const tag   = String(o.tag   || "").trim();
    const image = String(o.img || "img/mockup.png").trim();

    return { id, title, desc, tag, price: num(o.price), img: image };
  }
function addonsBlockHtml(categoryKey){
  // só marmitas e sobremesas (massas)
  if(categoryKey !== "marmitas" && categoryKey !== "sobremesas") return "";

  const d = normalizeData();
  const addons = Array.isArray(d.addons) ? d.addons : [];
  if(!addons.length) return "";

  // filtra por applies (se você estiver usando)
  const list = addons.filter(a=>{
    const applies = Array.isArray(a.applies) ? a.applies : null;
    if(!applies) return true; // se não existir, mostra mesmo assim
    return applies.includes(categoryKey);
  });

  if(!list.length) return "";

  return `
    <section class="lp-addons-box">
      <h3 class="lp-addons-title">➕ Adicionais</h3>
      <div class="lp-addons-grid">
        ${list.map(cardHtml).join("")}
      </div>
    </section>
  `;
}
  function normalizeData(d){
    // ✅ inclui combo e também combos (compat)
    const out = { marmitas: [], porcoes: [], bebidas: [], sobremesas: [], combo: [], combos: [] };
    const src = isObj(d) ? d : {};

    out.marmitas    = (Array.isArray(src.marmitas) ? src.marmitas : []).map((it,i)=> normalizeItem(it,i,"m"));
    out.porcoes     = (Array.isArray(src.porcoes) ? src.porcoes : []).map((it,i)=> normalizeItem(it,i,"p"));
    out.bebidas     = (Array.isArray(src.bebidas) ? src.bebidas : []).map((it,i)=> normalizeItem(it,i,"b"));
    out.sobremesas  = (Array.isArray(src.sobremesas) ? src.sobremesas : []).map((it,i)=> normalizeItem(it,i,"s"));

    // ✅ aceita tanto src.combo quanto src.combos
    const comboSrc = Array.isArray(src.combo) ? src.combo : (Array.isArray(src.combos) ? src.combos : []);
    out.combo      = comboSrc.map((it,i)=> normalizeItem(it,i,"c"));
    out.combos     = out.combo; // alias

    return out;
  }

  function mergePreferAdmin(admin, base){
    const A = normalizeData(admin);
    const B = normalizeData(base);

    const merged = {
      marmitas:   A.marmitas.length   ? A.marmitas   : B.marmitas,
      porcoes:    A.porcoes.length    ? A.porcoes    : B.porcoes,
      bebidas:    A.bebidas.length    ? A.bebidas    : B.bebidas,
      sobremesas: A.sobremesas.length ? A.sobremesas : B.sobremesas,
      combo:      A.combo.length      ? A.combo      : B.combo
    };

    // ✅ alias compat
    merged.combos = merged.combo;
    return merged;
  }

  function loadAdmin(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      if(!raw) return null;
      const d = JSON.parse(raw);
      return isObj(d) ? d : null;
    }catch{
      return null;
    }
  }

  // ========== Build final DATA ==========
  const admin = loadAdmin();
  const finalData = admin ? mergePreferAdmin(admin, fallback) : normalizeData(fallback);

  // ✅ GARANTE combo mesmo se admin vier quebrado
  if (!Array.isArray(finalData.combo) || !finalData.combo.length){
    finalData.combo = normalizeData(fallback).combo;
  }
  finalData.combos = finalData.combo; // alias final

  window.DATA = finalData;

  window.MENU = window.MENU || {};
  window.MENU.catalog = window.DATA;
  window.MENU.items = window.DATA;
})();
