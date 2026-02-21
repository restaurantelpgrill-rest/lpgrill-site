// js/data.js — LP Grill (fonte única de dados + fallback + admin/localStorage)
// ✅ garante img, price numérico e categorias sempre presentes
(() => {
  const STORE_KEY = "LPGRILL_DATA_ADMIN_V1";

  // ========== Fallback (site funciona mesmo sem admin) ==========
  const fallback = {
    marmitas: [
      { id:"m1", title:"Marmita Tradicional", desc:"Arroz, feijão, carne e salada.", tag:"Bem servida", price:18.90, img:"img/marmita_tradicional.jpg" },
      { id:"m2", title:"Marmita Frango Grelhado", desc:"Frango grelhado + acompanhamentos.", tag:"Leve", price:21.90, img:"img/marmita_frango.jpg" },
      { id:"m3", title:"Marmita Carne", desc:"Carne acebolada + acompanhamentos.", tag:"Top", price:23.90, img:"img/marmita_carne.jpg" },
      { id:"m4", title:"Marmita do Chef", desc:"Especial do dia • bem montada.", tag:"Especial", price:24.90, img:"img/mockup.png" },
      { id:"m5", title:"Marmita Feijoada", desc:"Feijoada caprichada + acompanhamentos.", tag:"Sábado", price:26.90, img:"img/mockup.png" },
      { id:"m6", title:"Marmita Strogonoff", desc:"Strogonoff + arroz + batata palha.", tag:"Queridinha", price:25.90, img:"img/mockup.png" }
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
      { id:"s1", title:"Sobremesa da Casa", desc:"Finalize com chave de ouro.", tag:"Doce", price:9.90, img:"img/mockup.png" },
      { id:"s2", title:"Pudim", desc:"Caseiro • cremoso.", tag:"Clássico", price:10.90, img:"img/mockup.png" },
      { id:"s3", title:"Mousse de Maracujá", desc:"Geladinho • leve.", tag:"Gelado", price:9.90, img:"img/mockup.png" },
      { id:"s4", title:"Brigadeiro Gourmet", desc:"Unidade.", tag:"Un", price:4.50, img:"img/mockup.png" }
    ]
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

    // ✅ Mantém a estrutura original (title/desc/tag/price/img)
    // ✅ Só garante que nunca vem vazio ou inválido
    const title = String(o.title || "Item").trim();
    const desc  = String(o.desc  || "").trim();
    const tag   = String(o.tag   || "").trim();

    // img sempre existe (placeholder premium)
    const image = String(o.img || "img/mockup.png").trim();

    return { id, title, desc, tag, price: num(o.price), img: image };
  }

  function normalizeData(d){
    const out = { marmitas: [], porcoes: [], bebidas: [], sobremesas: [] };
    const src = isObj(d) ? d : {};

    out.marmitas    = (Array.isArray(src.marmitas) ? src.marmitas : []).map((it,i)=> normalizeItem(it,i,"m"));
    out.porcoes     = (Array.isArray(src.porcoes) ? src.porcoes : []).map((it,i)=> normalizeItem(it,i,"p"));
    out.bebidas     = (Array.isArray(src.bebidas) ? src.bebidas : []).map((it,i)=> normalizeItem(it,i,"b"));
    out.sobremesas  = (Array.isArray(src.sobremesas) ? src.sobremesas : []).map((it,i)=> normalizeItem(it,i,"s"));

    return out;
  }

  function mergePreferAdmin(admin, base){
    // Regra: se admin tiver categoria com itens, usa admin; senão fallback.
    const A = normalizeData(admin);
    const B = normalizeData(base);

    return {
      marmitas:   A.marmitas.length   ? A.marmitas   : B.marmitas,
      porcoes:    A.porcoes.length    ? A.porcoes    : B.porcoes,
      bebidas:    A.bebidas.length    ? A.bebidas    : B.bebidas,
      sobremesas: A.sobremesas.length ? A.sobremesas : B.sobremesas
    };
  }

  function loadAdmin(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      if(!raw) return null;
      const d = JSON.parse(raw);
      return isObj(d) ? d : null;
    }catch(e){
      return null;
    }
  }

  // ========== Build final DATA ==========
  const admin = loadAdmin();
  const finalData = admin ? mergePreferAdmin(admin, fallback) : normalizeData(fallback);

  // ✅ Exponha no global (mantém como está funcionando)
  window.DATA = finalData;

  // ✅ Compat extra (sem mudar sua estrutura):
  // Se algum arquivo antigo estiver lendo MENU.catalog, ele vai achar também.
  window.MENU = window.MENU || {};
  window.MENU.catalog = window.DATA;
  window.MENU.items = window.DATA;

  // Debug opcional
  // console.log("DATA loaded:", window.DATA);
})();
