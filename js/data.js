// js/data.js — LP Grill (fonte única de dados + fallback + admin/localStorage)
// ✅ garante img, price numérico e categorias sempre presentes
// ✅ compat: Combo aparece mesmo se o render usar "combo" ou "combos"
// ✅ compat: Massas funciona e "sobremesas" vira alias (pra não quebrar páginas antigas)
// ✅ addons sempre em window.DATA.addons
(() => {
  const STORE_KEY = "LPGRILL_DATA_ADMIN_V1";

  // ========== Fallback (site funciona mesmo sem admin) ==========
  const fallback = {
marmitas: [
  // ===== PRATOS DO DIA (aparecem só no dia) =====
  { id:"mseg", title:"🔥 Frango Mineiro com Quiabo & Angu Cremoso", desc:"Frango caipira cozido lentamente com quiabo fresco, temperado no estilo mineiro. Acompanha arroz branco soltinho, feijão caseiro, couve refogada e angu cremoso.", tag:"Segunda", price:21.90, img:"img/frango-mineiro-quiabo-angu.jpg", days:[1] },
  { id:"mter", title:"🥘 Carne de Panela com Mandioca da Roça", desc:"Carne macia cozida lentamente com mandioca, bem temperada e suculenta. Acompanha arroz, feijão, farofa artesanal, couve refogada e beterraba fresca.", tag:"Terça", price:21.90, img:"img/carne-panela-mandioca.jpg", days:[2] },
  { id:"mqua", title:"🍖 Costelinha ao Molho da Casa com Batata Rústica", desc:"Costelinha suína macia envolvida em molho especial da casa. Servida com arroz, feijão, Purê de batata cremoso, farofa rica e salada fresca de alface e tomate.", tag:"Quarta", price:21.90, img:"img/costelinha-molho-batata.jpg", days:[3] },
  { id:"mqui", title:"🌽 Tropeiro Raiz Completo", desc:"Feijão tropeiro bem temperado com linguiça, ovo e farofa crocante. Acompanha arroz branco e couve refogada no alho.", tag:"Quinta", price:21.90, img:"img/tropeiro-raiz.jpg", days:[4] },
  { id:"msex", title:"🍲 Feijoada da Casa Completa", desc:"Feijoada tradicional preparada com carnes selecionadas e tempero especial. Servida com arroz, couve refogada, farofa crocante e laranja.", tag:"Sexta", price:21.90, img:"img/feijoada-completa.jpg", days:[5] },

  // ===== FIXOS (segunda a sábado) =====
  { id:"mfixexecboi", title:"🍛 Prato Executivo da Casa (Bife de boi)", desc:"Arroz, feijão, macarrão alho e óleo, batata frita e salada fresca de alface e tomate.", tag:"Fixo", price:20.90, img:"img/prato-bife-boi.jpg", days:[1,2,3,4,5,6] },
  { id:"mfixexecfrango", title:"🍛 Prato Executivo da Casa (Bife de frango)", desc:"Arroz, feijão, macarrão alho e óleo, batata frita e salada fresca de alface e tomate.", tag:"Fixo", price:20.90, img:"img/prato-bife-frango.jpg", days:[1,2,3,4,5,6] },
  { id:"mfixexecporco", title:"🍛 Prato Executivo da Casa (Bife de porco)", desc:"Arroz, feijão, macarrão alho e óleo, batata frita e salada fresca de alface e tomate.", tag:"Fixo", price:20.90, img:"img/prato-bife-porco.jpg", days:[1,2,3,4,5,6] }
],

porcoes: [
  { id:"p1", title:"Porção de Batata Frita (P)", desc:"Crocante • perfeita pra compartilhar.", tag:"Clássica 200 G", price:10.00, img:"img/batata-frita-p.png" },
  { id:"p2", title:"Batata Frita e musserarela (G)", desc:"Grande • serve bem 2- pessoas.", tag:"Compartilhar 400G", price:20.00, img:"img/batata-frita-mussarela-g.png" },
  { id:"p5", title:"Torresmo Crocante+batata frita", desc:"Sequinho • pururuca perfeita.", tag:"Crocante 400G", price:29.90, img:"img/torresmo-calabresa.png" }
 ],

bebidas: [
  { id:"b1", title:"Coca-Cola Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/coca-lata.jpg" },
   
  { id:"b5", title:"Coca-Cola 1L", desc:"Perfeita pra compartilhar.", tag:"1L", price:12.00, img:"coca-cola-1l.jpg" },
  { id:"b6", title:"Guaraná 1L", desc:"Bem gelada.", tag:"1L", price:12.00, img:"guarana-1l.jpg" },

  { id:"b7", title:"Água 500ml", desc:"Sem gás.", tag:"500ml", price:4.00, img:"img/agua-500.jpg" },
  { id:"b8", title:"Guarana antartica 200ML", desc:"200MLgelada.", tag:"200ml", price:4.00, img:"guarana-200ml.jpg" },

  { id:"b10", title:"Coca cola 200ML", desc:"200 ml gelada.", tag:"200ML", price:4.00, img:"coca-cola-200ml.jpg" }
],

// ✅ MASSAS (mantive suas 2 e adicionei as 2 novas — sem mexer nas existentes)
massas: [
  { id:"ms1", title:"Macarrão à Bolonhesa", desc:"Molho caseiro • queijo • bacon", price:25.90, img:"img/macarrao-bolonhesa-queijo-bacon.jpg" },
  { id:"ms2", title:"Lasanha da Casa", desc:"Bem cremosa • porção generosa", price:29.90, img:"img/lasanha-bolonhesa.jpg" },

  // ✅ NOVAS (as que você pediu)
  { id:"ms3", title:"Lasanha de frango com catupiry", desc:"Acompanhada de arroz, salada, alface, tomate e manga.", price:29.90, img:"img/lasanha-frango-catupiry.jpg" },
  { id:"ms4", title:"Macacrraõ a o molho branco da casa com queijo e bacon !!", desc:"Molho branco da casa • queijo • bacon. Bem cremosa e bem servida.", price:26.90, img:"img/macarrao-molho-branco-queijo-bacon.jpg" }
],

// ✅ COMBOS (mantive o seu c1 e adicionei mais 3)
combos: [
  { id:"c1", title:"Combo Marmita + Refri", desc:"Marmita + Coca 350ml", price:25.00, img:"img/combo-marmita-refri.jpg" },
  { id:"c2", title:"Combo 1 Massa + 1 Bolonhesa + 2 Refri", desc:"Massa + Refri 200ml", price:42.00, img:"img/combo-massa-refri.jpg" },
  { id:"c3", title:"Combo Casal", desc:"2 pratos do dia + 2 refris 200ML", price:47.00, img:"img/combo-casal.jpg" },
  { id:"c4", title:"Combo Família", desc:"4 pratos + 1 refri 1L", price:95.00, img:"img/combo-familia.jpg" }
],

// ✅ ADICIONAIS (marmitas e massas)
    addons: [
      { id:"a1", title:"🍟 Batata frita", desc:"Adicional", tag:"+", price:4.00, img:"img/batata-frita-addon.jpg", applies:["marmitas","massas","sobremesas"] },
      { id:"a2", title:"🥩 Carne bovina", desc:"Adicional", tag:"+", price:5.00, img:"img/carne-bovina-addon.jpg", applies:["marmitas","massas","sobremesas"] },
      { id:"a3", title:"🐷 Carne suína", desc:"Adicional", tag:"+", price:4.00, img:"img/carne-suina-addon.jpg", applies:["marmitas","massas","sobremesas"] },
      { id:"a4", title:"🍅 Molho à bolonhesa", desc:"Adicional", tag:"+", price:3.00, img:"img/molho-bolonhesa-addon.jpg", applies:["marmitas","massas","sobremesas"] }
    ]
};
  // ==============================
  // ✅ ALIASES LEGADO (sem quebrar páginas antigas)
  // ==============================
  // combos
  fallback.combo  = Array.isArray(fallback.combo)  ? fallback.combo  : [];
  fallback.combos = Array.isArray(fallback.combos) ? fallback.combos : [];
  if (!fallback.combo.length && fallback.combos.length) fallback.combo = fallback.combos;
  if (!fallback.combos.length && fallback.combo.length) fallback.combos = fallback.combo;

  // massas <-> sobremesas
  fallback.massas = Array.isArray(fallback.massas) ? fallback.massas : [];
  fallback.sobremesas = Array.isArray(fallback.sobremesas) ? fallback.sobremesas : [];
  if (!fallback.massas.length && fallback.sobremesas.length) fallback.massas = fallback.sobremesas;
  if (!fallback.sobremesas.length && fallback.massas.length) fallback.sobremesas = fallback.massas;

  // ==============================
  // ✅ Blindagem do fallback
  // ==============================
  for (const k of Object.keys(fallback)) {
    if (!Array.isArray(fallback[k])) continue;
    fallback[k] = fallback[k].map((it) => ({
      ...it,
      price: Number(it?.price || 0),
      img: (it?.img && String(it.img).trim()) ? String(it.img).trim() : "img/mockup.png"
    }));
  }

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
    const image = (o.img && String(o.img).trim()) ? String(o.img).trim() : "img/mockup.png";

    // preserva extras
    const extra = {};
    if (Array.isArray(o.days)) extra.days = o.days;
    if (Array.isArray(o.applies)) extra.applies = o.applies;
    if (o.promo != null) extra.promo = o.promo;
    if (o.promoPrice != null) extra.promoPrice = o.promoPrice;
    if (o.soldOut != null) extra.soldOut = o.soldOut;

    return { id, title, desc, tag, price: num(o.price), img: image, ...extra };
  }

  function normalizeData(d){
    const out = {
      marmitas: [], porcoes: [], bebidas: [],
      massas: [], sobremesas: [],
      combo: [], combos: [],
      addons: []
    };

    const src = isObj(d) ? d : {};
    const pickArr = (key) => Array.isArray(src[key]) ? src[key] : [];

    out.marmitas = pickArr("marmitas").map((it,i)=> normalizeItem(it,i,"m"));
    out.porcoes  = pickArr("porcoes").map((it,i)=> normalizeItem(it,i,"p"));
    out.bebidas  = pickArr("bebidas").map((it,i)=> normalizeItem(it,i,"b"));

    // massas: aceita massas ou sobremesas (legado)
    const massasSrc = pickArr("massas").length ? pickArr("massas") : pickArr("sobremesas");
    out.massas = massasSrc.map((it,i)=> normalizeItem(it,i,"ms"));
    out.sobremesas = out.massas; // alias

    // combos: aceita combo ou combos
    const comboSrc = pickArr("combo").length ? pickArr("combo") : pickArr("combos");
    out.combo  = comboSrc.map((it,i)=> normalizeItem(it,i,"c"));
    out.combos = out.combo; // alias

    // addons
    out.addons = pickArr("addons").map((it,i)=> normalizeItem(it,i,"a"));

    return out;
  }

  function mergePreferAdmin(admin, base){
    const A = normalizeData(admin);
    const B = normalizeData(base);

    const merged = {
      marmitas: A.marmitas.length ? A.marmitas : B.marmitas,
      porcoes:  A.porcoes.length  ? A.porcoes  : B.porcoes,
      bebidas:  A.bebidas.length  ? A.bebidas  : B.bebidas,
      massas:   A.massas.length   ? A.massas   : B.massas,
      combo:    A.combo.length    ? A.combo    : B.combo,
      addons:   A.addons.length   ? A.addons   : B.addons
    };

    merged.sobremesas = merged.massas; // alias
    merged.combos = merged.combo;      // alias
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
  let finalData = admin ? mergePreferAdmin(admin, fallback) : normalizeData(fallback);

  // ✅ garantias finais (nunca fica vazio/undefined)
  const fb = normalizeData(fallback);

  if (!Array.isArray(finalData.combo) || !finalData.combo.length) finalData.combo = fb.combo;
  finalData.combos = finalData.combo;

  if (!Array.isArray(finalData.massas) || !finalData.massas.length) finalData.massas = fb.massas;
  finalData.sobremesas = finalData.massas;

  if (!Array.isArray(finalData.addons)) finalData.addons = fb.addons;

  window.DATA = finalData;

  // compat extra (se algum script antigo usa MENU)
  window.MENU = window.MENU || {};
  window.MENU.catalog = window.DATA;
  window.MENU.items = window.DATA;
})();
