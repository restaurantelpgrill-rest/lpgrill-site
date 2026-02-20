// js/data.js — LP Grill (produtos)
window.DATA = window.DATA || {};

// ========= MARMITAS (4) =========
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
  }
];

// ========= PORÇÕES (2) =========
// (Você não tem foto de porção ainda — usei pf-do-dia e mockup como placeholder)
window.DATA.porcoes = [
  {
    id: "porcao_batata",
    title: "Porção de Batata",
    desc: "Crocante e bem servida.",
    price: 19.90,
    img: "img/pf-do-dia.jpg",
    tag: "Compartilhar"
  },
  {
    id: "porcao_frango",
    title: "Porção de Frango",
    desc: "Frango em pedaços + molho.",
    price: 24.90,
    img: "img/mockup.png",
    tag: "Top"
  }
];

// ========= BEBIDAS (4) =========
// (Você tem 3 imagens de bebida; a 4ª vou repetir a água como “Água com gás”)
window.DATA.bebidas = [
  { id:"coca_lata", title:"Coca-Cola Lata", desc:"350ml gelada.", price:6.00, img:"img/coca_lata.jpg", tag:"350ml" },
  { id:"guarana_lata", title:"Guaraná Lata", desc:"350ml gelada.", price:6.00, img:"img/guarana_lata.jpg", tag:"350ml" },
  { id:"agua_500", title:"Água 500ml", desc:"Sem gás.", price:4.00, img:"img/agua_500.jpg", tag:"500ml" },
  { id:"agua_gas", title:"Água com gás", desc:"500ml gelada.", price:5.00, img:"img/agua_500.jpg", tag:"500ml" }
];

// ========= SOBREMESAS (1) =========
// (sem foto doce no /img — usei mockup.png)
window.DATA.sobremesas = [
  { id:"pudim", title:"Pudim", desc:"Caseiro, bem cremoso.", price:8.90, img:"img/mockup.png", tag:"Doce" }
];
