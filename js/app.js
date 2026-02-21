(() => {
  "use strict";

  // ===== helpers =====
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ===== elements =====
  const overlay = $("#checkoutOverlay");
  const sheet   = overlay ? $(".ck-sheet", overlay) : null;

  // botões dentro do overlay
  const ckClose  = $("#ckClose");
  const ckCancel = $("#ckCancel");

  // ===== state =====
  const LOCK_CLASS = "modal-open";

  function lockScroll(lock){
    if(lock){
      document.documentElement.classList.add(LOCK_CLASS);
      document.body.classList.add(LOCK_CLASS);
    }else{
      document.documentElement.classList.remove(LOCK_CLASS);
      document.body.classList.remove(LOCK_CLASS);
    }
  }

  function openCheckout(){
    if(!overlay) return;

    // abre "quadrado preto"
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    lockScroll(true);

    // se o carrinho estiver aberto, fecha (para não ficar 2 coisas abertas)
    if(window.Cart?.closeDrawer) window.Cart.closeDrawer();

    // garante que começa na etapa PAY sempre que abrir
    showStep("pay");
  }

  function closeCheckout(){
    if(!overlay) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    lockScroll(false);
  }

  function showStep(step){
    if(!overlay) return;
    $$(".ck-step", overlay).forEach(sec => {
      const is = sec.getAttribute("data-step") === step;
      sec.hidden = !is;
    });
  }

  // ===== interceptar qualquer link/botão que iria pra checkout.html =====
  function bindCheckoutOpeners(){
    // 1) Tiles e links com checkout.html
    $$('a[href="checkout.html"], a[href="./checkout.html"]').forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout();
      });
    });

    // 2) Sticky CTA "Finalizar" (se existir)
    const stickyFinal = $("#stickyCTA a.cta.primary");
    if(stickyFinal){
      stickyFinal.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout();
      });
    }

    // 3) Botão "Finalizar" do carrinho (drawer)
    //    Seu HTML tem: .drawer-actions a.btn.primary href="checkout.html"
    $$('#cartDrawer a[href="checkout.html"]').forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout();
      });
    });
  }

  // ===== fechar overlay =====
  function bindCheckoutClosers(){
    if(!overlay) return;

    // clique no X / Cancelar
    if(ckClose)  ckClose.addEventListener("click", closeCheckout);
    if(ckCancel) ckCancel.addEventListener("click", closeCheckout);

    // clique no fundo preto (fora do sheet) fecha
    overlay.addEventListener("click", (e) => {
      if(e.target === overlay) closeCheckout();
    });

    // ESC fecha
    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && overlay.classList.contains("is-open")) closeCheckout();
    });
  }

  // ===== ligar seleção de pagamento (apenas navega etapas) =====
  function bindPayButtons(){
    if(!overlay) return;

    $$(".ck-paybtn", overlay).forEach(btn => {
      btn.addEventListener("click", () => {
        const pay = btn.getAttribute("data-pay");
        if(pay === "pix")   showStep("pix");
        if(pay === "credit" || pay === "debit") showStep("addr");
      });
    });

    // voltar do pix/addr se você tiver esses botões no HTML
    const backPix  = $("#ckBackFromPix");
    const backAddr = $("#ckBackFromAddr");
    if(backPix)  backPix.addEventListener("click", () => showStep("pay"));
    if(backAddr) backAddr.addEventListener("click", () => showStep("pay"));
  }

  // ===== init =====
  function init(){
    // (1) manter seu carrinho funcionando: não mexo aqui.
    //     O cart.js deve cuidar de:
    //     - abrir/fechar drawer
    //     - atualizar totais
    //     - sticky CTA etc.

    bindCheckoutOpeners();
    bindCheckoutClosers();
    bindPayButtons();

    // se o overlay existe, inicia oculto corretamente
    if(overlay){
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      showStep("pay");
    }
  }

  window.addEventListener("DOMContentLoaded", init);

  // expõe (se você quiser chamar manualmente em outros scripts)
  window.LPCheckout = { open: openCheckout, close: closeCheckout, step: showStep };
})();
