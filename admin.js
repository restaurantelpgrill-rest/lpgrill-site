const SECRET = "lpgrill2026"; // mude para o que você quiser

function requireSecret(){
  const url = new URL(location.href);
  const key = url.searchParams.get("k");
  if(key !== SECRET){
    document.body.innerHTML = "<h2 style='font-family:Arial;padding:24px'>404</h2>";
    throw new Error("Blocked");
  }
}
requireSecret();
(() => {
  const PASS_KEY    = "LPGRILL_ADMIN_PASS_V1";
  const SESSION_KEY = "LPGRILL_ADMIN_UNLOCKED_V1";

  const $ = (s, p=document) => p.querySelector(s);

  async function hashText(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  function show(msg){
    // usa alert pra não depender de #toast
    // (se quiser, você pode estilizar depois)
    alert(msg);
  }

  function unlockUI(){
    const box = $("#lockBox");
    const app = $("#adminApp");
    if(box) box.style.display = "none";
    if(app) app.style.display = "block";

    // >>> CHAMA SEU ADMIN (o script dentro do admin.html)
    window.startAdminApp?.();
  }

  async function ensureLock(){
    const box = $("#lockBox");
    const app = $("#adminApp");
    if(!box || !app){
      // se faltar algo, não trava
      window.startAdminApp?.();
      return;
    }

    // se já está liberado nesta sessão
    if(localStorage.getItem(SESSION_KEY) === "1"){
      unlockUI();
      return;
    }

    // trava app
    box.style.display = "grid";
    app.style.display = "none";

    const hasPass = !!localStorage.getItem(PASS_KEY);

    $("#lockTitle").textContent = hasPass ? "Área restrita" : "Criar senha do Admin";
    $("#lockHint").textContent  = hasPass
      ? "Digite a senha para entrar."
      : "Defina uma senha agora (mínimo 4 caracteres).";

    $("#btnUnlock").onclick = async () => {
      const pass = ($("#lockPass").value || "").trim();
      if(pass.length < 4) return show("Senha muito curta (mínimo 4).");

      // primeira vez: cria senha
      if(!localStorage.getItem(PASS_KEY)){
        localStorage.setItem(PASS_KEY, await hashText(pass));
        localStorage.setItem(SESSION_KEY, "1");
        show("Senha criada ✅");
        unlockUI();
        return;
      }

      // valida senha
      const h = await hashText(pass);
      if(h !== localStorage.getItem(PASS_KEY)) return show("Senha incorreta ❌");

      localStorage.setItem(SESSION_KEY, "1");
      show("Bem-vindo ✅");
      unlockUI();
    };

    $("#btnResetPass").onclick = async () => {
      if(!localStorage.getItem(PASS_KEY)) return show("Ainda não existe senha definida.");

      const current = ($("#lockPass").value || "").trim();
      if(current.length < 4) return show("Digite a senha atual no campo para trocar.");

      const h = await hashText(current);
      if(h !== localStorage.getItem(PASS_KEY)) return show("Senha atual incorreta ❌");

      const newPass = prompt("Nova senha (mínimo 4 caracteres):");
      if(!newPass || newPass.trim().length < 4) return show("Senha inválida.");

      localStorage.setItem(PASS_KEY, await hashText(newPass.trim()));
      show("Senha alterada ✅");
    };

    $("#btnLogout").onclick = () => {
      localStorage.removeItem(SESSION_KEY);
      location.reload();
    };
  }

  window.addEventListener("DOMContentLoaded", ensureLock);
})();
