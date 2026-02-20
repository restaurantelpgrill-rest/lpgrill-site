window.SITE = {
  brand: "LP Grill",
  tagline: "Pedidos rápidos • WhatsApp",
  meta: {
    taxa: 5.00,
    tempo: "30–60 min",
    horario: "segunda a sábado até 00:00",
    cidade: "Atendimento em Belo Horizonte",
  },
  contact: {
    whatsapp: "5531999999999", // <-- TROQUE (só números +55)
  },

  categories: [
    { id:"marmitas", title:"Marmitas", icon:"🍱", desc:"Prontas e bem servidas" },
    { id:"churrasco", title:"Churrasco", icon:"🔥", desc:"Carnes na brasa" },
    { id:"porcoes", title:"Porções", icon:"🍟", desc:"Para compartilhar" },
    { id:"lanches", title:"Lanches", icon:"🍔", desc:"Artesanais" },
    { id:"bebidas", title:"Bebidas", icon:"🥤", desc:"Geladas" },
    { id:"sobremesas", title:"Sobremesas", icon:"🍰", desc:"Doces" },
  ],

  items: [
    // MARMITAS
    { id:"m1", cat:"marmitas", name:"Marmita Tradicional", desc:"Arroz, feijão, carne e salada.", price: 18.90, img:"./img/marmita-tradicional.jpg" },
    { id:"m2", cat:"marmitas", name:"Marmita Frango Grelhado", desc:"Frango grelhado + acompanhamentos.", price: 21.90, img:"./img/marmita-frango.jpg" },
    { id:"m3", cat:"marmitas", name:"Marmita Carne", desc:"Carne acebolada + acompanhamentos.", price: 23.90, img:"./img/marmita-carne.jpg" },

    // CHURRASCO
    { id:"c1", cat:"churrasco", name:"Frango Grelhado", desc:"Porção individual.", price: 24.90, img:"./img/frango-grelhado.jpg" },
    { id:"c2", cat:"churrasco", name:"Picanha (200g)", desc:"Acompanha farofa e vinagrete.", price: 39.90, img:"./img/pf-do-dia.jpg" },

    // PORÇÕES
    { id:"p1", cat:"porcoes", name:"Batata Frita", desc:"Crocante e sequinha.", price: 19.90, img:"./img/batata.jpg" },
    { id:"p2", cat:"porcoes", name:"Calabresa Acebolada", desc:"Porção completa.", price: 24.90, img:"./img/calabresa.jpg" },

    // LANCHES
    { id:"l1", cat:"lanches", name:"Burger LP", desc:"Hambúrguer + queijo + molho especial.", price: 27.90, img:"./img/burger.jpg" },

    // BEBIDAS
    { id:"b1", cat:"bebidas", name:"Coca-Cola lata", desc:"350ml", price: 6.00, img:"./img/coca-lata.jpg" },
    { id:"b2", cat:"bebidas", name:"Guaraná lata", desc:"350ml", price: 6.00, img:"./img/guarana-lata.jpg" },

    // SOBREMESAS
    { id:"s1", cat:"sobremesas", name:"Pudim", desc:"Fatia generosa.", price: 9.90, img:"./img/pudim.jpg" },
  ],

  reviews: [
    { name:"Mariana S.", when:"hoje", text:"Chegou rápido e bem embalado. Marmita top!" },
    { name:"João P.", when:"ontem", text:"Carne no ponto certo. Vou pedir sempre." },
    { name:"Aline R.", when:"esta semana", text:"Porções bem servidas. Atendimento excelente." },
  ]
};
