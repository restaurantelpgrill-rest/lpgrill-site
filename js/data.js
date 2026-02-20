// js/data.js  (LP Grill) — Dados do cardápio
window.DATA = window.DATA || {};

// =====================
// MARMITAS (com suas fotos)
// =====================
window.DATA.marmitas = [
  {
    id: "marmita_tradicional",
    title: "Marmita Tradicional",
    desc: "Arroz, feijão, carne e salada.",
    price: 18.90,
    img: "img/marmita-tradicional.jpg",
    tag: "Mais pedida"
  },
  {
    id: "marmita_frango",
    title: "Marmita Frango",
    desc: "Frango + acompanhamentos.",
    price: 21.90,
    img: "img/marmita-frango.jpg",
    tag: "Leve"
  },
  {
    id: "marmita_carne",
    title: "Marmita Carne",
    desc: "Carne acebolada + acompanhamentos.",
    price: 23.90,
    img: "img/marmita-carne.jpg",
    tag: "Top"
  },
  {
    id: "frango_grelhado",
    title: "Frango Grelhado",
    desc: "Opção grelhada com acompanhamentos.",
    price: 21.90,
    img: "img/frango_grelhado.jpg",
    tag: "Grelhado"
  },
  {
    id: "pf_do_dia",
    title: "PF do Dia",
    desc: "Prato feito (varia conforme o dia).",
    price: 17.90,
    img: "img/pf-do-dia.jpg",
    tag: "Promo"
  }
];

// =====================
// BEBIDAS (com suas fotos)
// =====================
window.DATA.bebidas = [
  { id:"coca_lata", title:"Coca-Cola Lata", desc:"350ml gelada.", price:6.00, img:"img/coca_lata.jpg", tag:"350ml" },
  { id:"guarana_lata", title:"Guaraná Lata", desc:"350ml gelada.", price:6.00, img:"img/guarana_lata.jpg", tag:"350ml" },
  { id:"agua_500", title:"Água 500ml", desc:"Sem gás.", price:4.00, img:"img/agua_500.jpg", tag:"500ml" }
];

// Você pode ir criando as outras categorias depois:
// window.DATA.churrasco = [...]
// window.DATA.porcoes = [...]
// window.DATA.lanches = [...]
// window.DATA.sobremesas = [...]
