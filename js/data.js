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
      { id:"m4", title:"Marmita do Chef", desc:"Especial do dia • bem montada.", tag:"Especial", price:24.90, img:"img/mockup.png" }
    ],
    porcoes: [
      { id:"p1", title:"Porção de Batata Frita", desc:"Crocante • perfeita pra compartilhar.", tag:"Clássica", price:17.90, img:"img/mockup.png" },
      { id:"p2", title:"Porção de Frango", desc:"Frango dourado • suculento.", tag:"Caprichada", price:24.90, img:"img/frango_grelhado.jpg" }
    ],
    bebidas: [
      { id:"b1", title:"Coca-Cola Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/coca_lata.jpg" },
      { id:"b2", title:"Guaraná Lata", desc:"350ml gelada.", tag:"350ml", price:6.00, img:"img/guarana_lata.jpg" },
      { id:"b3", title:"Água 500ml", desc:"Sem gás.", tag:"500ml", price:4.00, img:"img/agua_500.jpg" },
      { id:"b4", title:"Água com gás", desc:"500ml gelada.", tag:"500ml", price:5.00, img:"img/agua_500.jpg" }
    ],
    sobremesas: [
      { id:"s1", title:"Sobremesa da Casa", desc:"Finalize com chave de ouro.", tag:"Doce", price:9.90, img:"img/mockup.png" }
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

    return {
      id,
      title: String(o.title || "Item").trim(),
      desc: String(o.desc || "").trim(),
      tag: String(o.tag || "").trim(),
      price: num(o.price),
      img: String(o.img || "img/mockup.png").trim()
    };
  }

  function normalizeData(d){
    const out = {
      marmitas: [],
      porcoes: [],
      bebidas: [],
      sobremesas: []
    };

    const src = isObj(d) ? d : {};

    out.marmitas = (Array.isArray(src.marmitas) ? src.marmitas : []).map((it,i)=> normalizeItem(it,i,"m"));
    out.porcoes  = (Array.isArray(src.porcoes)  ? src.porcoes  : []).map((it,i)=> normalizeItem(it,i,"p"));
    out.bebidas  = (Array.isArray(src.bebidas)  ? src.bebidas  : []).map((it,i)=> normalizeItem(it,i,"b"));
    out.sobremesas = (Array.isArray(src.sobremesas) ? src.sobremesas : []).map((it,i)=> normalizeItem(it,i,"s"));

    return out;
  }

  function mergePreferAdmin(admin, base){
    // Regra simples: se admin tiver categoria com itens, usa admin;
    // se não tiver, usa fallback.
    const A = normalizeData(admin);
    const B = normalizeData(base);

    return {
      marmitas: A.marmitas.length ? A.marmitas : B.marmitas,
      porcoes:  A.porcoes.length  ? A.porcoes  : B.porcoes,
      bebidas:  A.bebidas.length  ? A.bebidas  : B.bebidas,
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

  // Exponha no global:
  window.DATA = finalData;

  // Debug opcional (se quiser ver no console)
  // console.log("DATA loaded:", window.DATA);
})();
