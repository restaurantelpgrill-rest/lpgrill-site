// js/qr-fix.js — gera imagem QR a partir do texto (compat com qrcode@1.5.3)
(() => {
  async function renderQR(targetEl, text){
    if (!targetEl) return;
    const code = String(text || "").trim();
    if (!code) {
      targetEl.textContent = "QR indisponível";
      return;
    }

    // limpa
    targetEl.innerHTML = "";

    try{
      // Lib "qrcode" (cdnjs/jsdelivr) normalmente expõe window.QRCode com toDataURL/toCanvas
      if (window.QRCode && typeof window.QRCode.toDataURL === "function") {
        const url = await window.QRCode.toDataURL(code, { margin: 1, width: 220 });
        const img = new Image();
        img.alt = "QR Code";
        img.src = url;
        img.style.width = "220px";
        img.style.height = "220px";
        img.style.display = "block";
        img.style.margin = "0 auto";
        targetEl.appendChild(img);
        return;
      }

      // fallback: tenta toCanvas
      if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
        const canvas = document.createElement("canvas");
        await window.QRCode.toCanvas(canvas, code, { margin: 1, width: 220 });
        canvas.style.display = "block";
        canvas.style.margin = "0 auto";
        targetEl.appendChild(canvas);
        return;
      }

      // se nenhuma API existir:
      targetEl.textContent = "Biblioteca QR não carregou.";
    }catch(e){
      console.error("QR render error:", e);
      targetEl.textContent = "Erro ao gerar QR.";
    }
  }

  // expõe pra checkout.js chamar
  window.lpRenderQR = renderQR;
})();
