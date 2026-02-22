// js/checkout-modal.js
(function () {
  const MODAL_ID = "checkoutModalGlobal";

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;

    const wrap = document.createElement("div");
    wrap.id = MODAL_ID;
    wrap.innerHTML = `
      <div class="checkoutModalOverlay" data-close="1"></div>
      <div class="checkoutModalCard" role="dialog" aria-modal="true" aria-label="Finalizar pedido">
        <button class="checkoutModalClose" type="button" data-close="1" aria-label="Fechar">×</button>

        <!-- ✅ Aqui é o MESMO conteúdo do modal do INDEX -->
        <div id="checkoutModalContentSlot"></div>
      </div>
    `;

    document.body.appendChild(wrap);

    // fechar
    wrap.addEventListener("click", (e) => {
      if (e.target && e.target.getAttribute("data-close") === "1") closeCheckoutModal();
    });

    // ESC fecha
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCheckoutModal();
    });
  }

  function injectContentFromIndex() {
    // Se o seu index já tem um modal pronto com conteúdo,
    // você pode deixar um template reaproveitável com id="checkoutModalTemplate"
    // e clonar aqui.
    const tpl = document.getElementById("checkoutModalTemplate");
    const slot = document.getElementById("checkoutModalContentSlot");
    if (!slot) return;

    if (tpl && tpl.content) {
      slot.innerHTML = "";
      slot.appendChild(tpl.content.cloneNode(true));
      return;
    }

    // Fallback: se você preferir, cole aqui o HTML do modal do index (conteúdo interno).
    // slot.innerHTML = `...SEU HTML...`;
  }

  function openCheckoutModal() {
    ensureModal();
    injectContentFromIndex();

    const root = document.getElementById(MODAL_ID);
    root.classList.add("is-open");
    document.documentElement.classList.add("modal-lock");
    document.body.classList.add("modal-lock");

    // se você tiver função de atualizar total/itens do carrinho no modal, chame aqui:
    if (window.renderCheckoutModal) {
      window.renderCheckoutModal();
    }
  }

  function closeCheckoutModal() {
    const root = document.getElementById(MODAL_ID);
    if (!root) return;
    root.classList.remove("is-open");
    document.documentElement.classList.remove("modal-lock");
    document.body.classList.remove("modal-lock");
  }

  function bindFinalizeButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-finalizar='1'], .js-finalizar");
      if (!btn) return;

      e.preventDefault(); // 🔥 impede abrir checkout.html
      openCheckoutModal();
    });
  }

  window.openCheckoutModal = openCheckoutModal;
  window.closeCheckoutModal = closeCheckoutModal;

  document.addEventListener("DOMContentLoaded", () => {
    bindFinalizeButtons();
  });
})();
