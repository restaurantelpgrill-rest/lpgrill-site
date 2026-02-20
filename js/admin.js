/* ================================
   LP GRILL — ADMIN LOCK (Premium)
   - Proteção por chave (?k= ou #k=)
   - Senha com hash SHA-256
   - Sessão via sessionStorage (expira ao fechar)
   - À prova de erro (não fica tela branca)
================================ */

(() => {
  // ====== CONFIG ======
  const SECRET_KEY = "22550126";                 // chave do link
  const SECRET_PARAM = "k";                      // nome do param
  const PASS_HASH_KEY = "LPGRILL_ADMIN_PASS_HASH_V1";
  const SESSION_KEY   = "LPGRILL_ADMIN_UNLOCKED_V1";
  const SECRET_SAVE_KEY = "LPGRILL_ADMIN_SECRET_OK_V1";
  const SALT = "lpgrill@lock:v2";                // sal do hash

  // ====== HELPERS ======
  const $ = (s, p=document) => p.querySelector(s);

  function setBody(msgHtml){
    document.body.innerHTML = msgHtml;
  }

  function denyScreen(){
    setBody(`
      <div style="min-height:100vh;display:grid;place-items:center;background:#fff;font-family:system-ui,Arial;">
        <div style="text-align:center;padding:24px">
          <div style="font-size:44px;font-weight:800;letter-spacing:.5px;">404</div>
          <div style="margin-top:6px;color:rgba(0,0,0,.65)">Página não encontrada</div>
        </div>
      </div>
    `);
  }

  function getKeyFromUrl(){
    try{
      const url = new URL(window.location.href);
      const q = url.searchParams.get(SECRET_PARAM);
      if(q) return q.trim();

      // também aceita hash: #k=123
      const hash = (url.hash || "").replace(/^#/, "");
      const m = hash.match(new RegExp(`(?:^|&)${SECRET_PARAM}=([^&]+)`));
      if(m && m[1]) return decodeURIComponent(m[1]).trim();
    }catch(e){}
    return "";
  }

  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  // ====== 1) PROTEÇÃO POR CHAVE ======
  // Aceita:
  // - ?k=22550126
  // - #k=22550126
  // - já salvo no navegador (pra não digitar sempre)
  (function requireSecret(){
    const key = getKeyFromUrl();
    const savedOk = localStorage.getItem(SECRET_SAVE_KEY) === "1";

    if(savedOk) return;

    if(key !== SECRET_KEY){
      denyScreen();
      // não joga erro (pra não sujar console e não quebrar mais coisas)
      return;
    }

    // marcou como ok pra não precisar repetir sempre
    localStorage.setItem(SECRET_SAVE_KEY, "1");
  })();

  // Se não passou na chave, já foi pra denyScreen e parou.
  // Checa se a página ainda tem os elementos do admin:
  const lockBox  = $("#lockBox");
  const adminApp = $("#adminApp");

  // Se a chave falhou, o body virou 404 e não tem lockBox/adminApp
  if(!lockBox && !adminApp) return;

  // ====== 2) LOCK POR SENHA ======
  async function ensurePassHashExists(){
    let h = localStorage.getItem(PASS_HASH_KEY);
    if(!h){
      // primeira vez: não define senha automaticamente
      // vai pedir pro usuário criar na interface
      return "";
    }
    return h;
  }

  function showLockUI({title, hint}){
    // garante que aparece algo
    lockBox.style.display = "grid";
    adminApp.style.display = "none";

    const t = $("#lockTitle");
    const h = $("#lockHint");
    const inp = $("#lockPass");

    if(t) t.textContent = title;
    if(h) h.textContent = hint;

    if(inp){
      inp.value = "";
      setTimeout(()=> inp.focus(), 50);
    }
  }

  function showAppUI(){
    lockBox.style.display = "none";
    adminApp.style.display = "block";

    // chama o app admin (definido no admin.html)
    try{
      if(typeof window.startAdminApp === "function") window.startAdminApp();
    }catch(e){
      alert("O Admin abriu, mas ocorreu erro ao iniciar o app. Verifique o script do admin dentro do admin.html.");
      console.error(e);
    }
  }

  async function unlockWithPassword(pass){
    const stored = localStorage.getItem(PASS_HASH_KEY);
    if(!stored) return false;
    const h = await sha256(SALT + pass);
    return h === stored;
  }

  async function setPassword(pass){
    const h = await sha256(SALT + pass);
    localStorage.setItem(PASS_HASH_KEY, h);
  }

  function bindEvents(){
    const btnUnlock   = $("#btnUnlock");
    const btnResetPass= $("#btnResetPass");
    const btnLogout   = $("#btnLogout");
    const inp         = $("#lockPass");

    if(btnUnlock){
      btnUnlock.onclick = async () => {
        const pass = (inp?.value || "").trim();
        if(pass.length < 4) return alert("Senha muito curta (mínimo 4).");

        const hasHash = !!localStorage.getItem(PASS_HASH_KEY);

        // primeira vez: cria senha
        if(!hasHash){
          await setPassword(pass);
          sessionStorage.setItem(SESSION_KEY, "1");
          alert("Senha criada ✅");
          showAppUI();
          return;
        }

        // valida senha
        const ok = await unlockWithPassword(pass);
        if(!ok) return alert("Senha incorreta ❌");

        sessionStorage.setItem(SESSION_KEY, "1");
        alert("Bem-vindo ✅");
        showAppUI();
      };
    }

    if(inp){
      inp.addEventListener("keydown", (e)=> {
        if(e.key === "Enter") btnUnlock?.click();
      });
    }

    if(btnResetPass){
      btnResetPass.onclick = async () => {
        const hasHash = !!localStorage.getItem(PASS_HASH_KEY);
        if(!hasHash) return alert("Ainda não existe senha definida.");

        const current = (inp?.value || "").trim();
        if(current.length < 4) return alert("Digite a senha atual no campo para trocar.");

        const ok = await unlockWithPassword(current);
        if(!ok) return alert("Senha atual incorreta ❌");

        const newPass = prompt("Nova senha (mínimo 4 caracteres):");
        if(!newPass || newPass.trim().length < 4) return alert("Senha inválida.");

        await setPassword(newPass.trim());
        alert("Senha alterada ✅");
        if(inp) inp.value = "";
      };
    }

    if(btnLogout){
      btnLogout.onclick = () => {
        sessionStorage.removeItem(SESSION_KEY);
        alert("Sessão encerrada.");
        location.reload();
      };
    }
  }

  async function init(){
    // se faltarem os elementos do lock, não trava:
    if(!lockBox || !adminApp){
      // tenta iniciar direto
      try{ window.startAdminApp?.(); }catch(e){}
      return;
    }

    bindEvents();

    const unlocked = sessionStorage.getItem(SESSION_KEY) === "1";
    const hasHash = !!(await ensurePassHashExists());

    if(unlocked){
      showAppUI();
      return;
    }

    // mostra lock sempre (sem tela branca)
    showLockUI({
      title: hasHash ? "Área restrita" : "Criar senha do Admin",
      hint: hasHash
        ? "Digite a senha para entrar."
        : "Defina uma senha agora (mínimo 4 caracteres)."
    });
  }

  // garante init mesmo se o script rodar antes do DOM
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();
