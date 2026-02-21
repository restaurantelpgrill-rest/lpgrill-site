(() => {
  const STORE_KEY = "LPGRILL_DATA_ADMIN_V1";

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

  function loadAdmin(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      if(!raw) return null;
      const d = JSON.parse(raw);
      d.marmitas ||= []; d.porcoes ||= []; d.bebidas ||= []; d.sobremesas ||= [];
      return d;
    }catch(e){ return null; }
  }
// js/data.js
window.DATA = {
  marmitas: [
    { id:"m1", title:"Marmita P", desc:"Arroz, feijão e carne", price: 18.00 },
    { id:"m2", title:"Marmita M", desc:"Bem servida", price: 22.00 }
  ],
  porcoes: [
    { id:"p1", title:"Batata Frita", desc:"Crocante", price: 20.00 }
  ],
  bebidas: [
    { id:"b1", title:"Refrigerante Lata", desc:"350ml", price: 6.00 }
  ],
  sobremesas: [
    { id:"s1", title:"Pudim", desc:"Caseiro", price: 8.00 }
  ]
};
  window.DATA = loadAdmin() || fallback;
})();
