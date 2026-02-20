:root{
  --bg:#0f1115;
  --bg2:#0b0d12;

  --card: rgba(20,22,28,.78);
  --card2: rgba(18,20,26,.72);
  --cardSolid:#151a22;

  --text:#ffffff;
  --text2: rgba(255,255,255,.86);
  --muted: rgba(255,255,255,.68);

  --line: rgba(255,255,255,.08);

  --accent:#22c55e;
  --accent2:#16a34a;
  --warn:#f59e0b;
  --danger:#ef4444;

  --shadow: 0 20px 60px rgba(0,0,0,.55);
  --shadow2: 0 12px 28px rgba(0,0,0,.45);
  --radius: 18px;

  --focus: 0 0 0 4px rgba(34,197,94,.18);
}

*{box-sizing:border-box}
html,body{height:100%}
html{ font-size: 106%; }

body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  color:var(--text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;

  background:
    radial-gradient(1200px 700px at 10% -10%, rgba(34,197,94,.14), transparent 55%),
    radial-gradient(900px 600px at 110% 10%, rgba(255,255,255,.06), transparent 55%),
    linear-gradient(180deg, rgba(10,12,16,.90), rgba(15,17,21,.98)),
    url("../mockup.png") center/cover no-repeat fixed; /* ✅ CORRIGIDO */
}

a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:18px 16px 110px}

.topbar{
  position:sticky; top:0; z-index:20;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: linear-gradient(to bottom, rgba(15,17,21,.82), rgba(15,17,21,.55));
  border-bottom: 1px solid var(--line);
}
.topbar .inner{
  max-width:1120px;margin:0 auto;padding:14px 16px;
  display:flex;gap:12px;align-items:center;justify-content:space-between
}

.brand{display:flex;gap:12px;align-items:center}
.logo{
  width:44px;height:44px;border-radius:14px;
  display:grid;place-items:center;
  background:
    radial-gradient(120px 60px at 30% 20%, rgba(34,197,94,.22), transparent 60%),
    rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  box-shadow: var(--shadow2);
  overflow:hidden;
}
.logo img{width:100%;height:100%;object-fit:cover;display:none}
.brand h1{margin:0;font-size:16px;line-height:1.1;letter-spacing:.3px}
.brand p{margin:2px 0 0;font-size:12px;color:var(--muted)}

.pill{
  display:inline-flex;align-items:center;gap:8px;
  padding:8px 10px;border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color:var(--muted);
  font-size:12px;
  white-space:nowrap;
}
.dot{width:8px;height:8px;border-radius:99px;background:var(--warn)}
.dot.open{background:var(--accent)}

.actions{display:flex;gap:10px;align-items:center}

.btn{
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:var(--text);
  padding:10px 12px;border-radius:14px;
  font-weight:700;
  cursor:pointer;
  transition:.15s ease;
  display:inline-flex;align-items:center;gap:10px;
  box-shadow: 0 8px 20px rgba(0,0,0,.20);
}
.btn:hover{transform: translateY(-1px); border-color: rgba(255,255,255,.20)}
.btn:focus{outline:none; box-shadow: var(--shadow2), var(--focus)}

.btn.primary{
  background: linear-gradient(135deg, rgba(34,197,94,1), rgba(22,163,74,.90));
  border-color: rgba(34,197,94,.45);
  box-shadow: 0 16px 34px rgba(34,197,94,.22);
  color:#07130b;
  font-weight:900;
}
.btn.ghost{background:transparent; box-shadow:none}

.badge{
  min-width:20px;height:20px;padding:0 6px;border-radius:999px;
  background: rgba(255,255,255,.10);
  display:inline-grid;place-items:center;
  font-size:12px;font-weight:900;
  color: var(--text);
  border: 1px solid rgba(255,255,255,.10);
}

.hero{padding:18px 0 8px;display:grid;gap:14px}

.heroCard{
  background: rgba(15,17,21,.62);
  border:1px solid rgba(255,255,255,.10);
  border-radius: var(--radius);
  padding:16px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display:grid;gap:12px;
}

.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between}

.search{
  flex:1;
  min-width:220px;
  display:flex;gap:10px;align-items:center;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  padding:10px 12px;border-radius:16px;
}
.search input{
  width:100%;border:0;outline:0;background:transparent;color:var(--text);
  font-size:14px;
}
.search input::placeholder{color:rgba(255,255,255,.55);opacity:1}

.mini{font-size:12px;color:var(--muted)}

.tabs{display:flex;gap:10px;flex-wrap:wrap}
.tab{
  padding:10px 12px;border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:rgba(255,255,255,.78);
  font-weight:800;font-size:13px;
  cursor:pointer;
  user-select:none;
  transition:.15s ease;
}
.tab:hover{transform:translateY(-1px); border-color: rgba(255,255,255,.20)}
.tab.active{
  color:#06130a;
  border-color: rgba(34,197,94,.55);
  background: rgba(34,197,94,.95);
  box-shadow: 0 16px 34px rgba(34,197,94,.18);
}

.grid{display:grid;grid-template-columns: 1.2fr .8fr;gap:16px;margin-top:12px}
@media (max-width: 980px){ .grid{grid-template-columns:1fr} .cartPanel{position:relative;top:0} }

.list{display:grid;gap:12px}

.card{
  background: rgba(15,17,21,.72);
  border:1px solid rgba(255,255,255,.10);
  border-radius: var(--radius);
  padding:14px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.item{
  display:grid;
  grid-template-columns: 86px 1fr auto;
  gap:12px;
  align-items:center;
  padding:12px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  transition:.15s ease;
}
.item:hover{
  transform: translateY(-1px);
  border-color: rgba(255,255,255,.16);
  background: rgba(255,255,255,.06);
}
@media (max-width: 520px){
  .item{grid-template-columns: 78px 1fr; grid-template-areas:
    "img info"
    "ctrl ctrl";
  }
  .item .thumb{grid-area:img}
  .item .info{grid-area:info}
  .item .right{grid-area:ctrl; justify-items:stretch}
}

.thumb{
  width:86px;height:86px;border-radius:16px; overflow:hidden;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  display:grid;place-items:center;
}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb .ph{font-size:22px;opacity:.85}

.item h3{margin:0;font-size:15px;color:var(--text);font-weight:900;letter-spacing:.2px}
.item p{margin:6px 0 0;color:var(--muted);font-size:12.6px;line-height:1.35}

.price{font-weight:1000;color: rgba(255,255,255,.95);letter-spacing:.2px}
.item .right{display:grid;gap:10px;justify-items:end}

.qty{
  display:inline-flex;align-items:center;gap:10px;
  padding:8px 10px;border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  justify-content:flex-end;
}
.qty button{
  width:28px;height:28px;border-radius:10px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:var(--text);
  cursor:pointer;
  font-weight:1000;
  transition:.12s ease;
}
.qty button:hover{
  transform: translateY(-1px);
  border-color: rgba(255,255,255,.20);
  background: rgba(255,255,255,.10);
}
.qty span{min-width:18px;text-align:center;font-weight:1000;color:var(--text)}

.cartPanel{position:sticky;top:78px;height:fit-content}
.cartHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cartHeader h2{margin:0;font-size:15px;font-weight:1000;letter-spacing:.2px}

.cartEmpty{color:var(--muted);font-size:13px;margin:10px 0 0}
.cartList{display:grid;gap:10px;margin-top:10px}

.cartRow{
  display:grid;grid-template-columns: 1fr auto;gap:10px;align-items:center;
  padding:10px 12px;border-radius:16px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  transition:.15s ease;
}
.cartRow:hover{
  border-color: rgba(255,255,255,.16);
  background: rgba(255,255,255,.06);
  transform: translateY(-1px);
}
.cartRow .name{font-weight:900;font-size:13px;color:var(--text)}
.cartRow .meta{color:var(--muted);font-size:12px;margin-top:2px}

.cartRow .rm{
  width:34px;height:34px;border-radius:12px;
  border:1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.10);
  color: rgba(255,255,255,.95);
  cursor:pointer;
  font-weight:1000;
  display:grid;place-items:center;
  transition:.12s ease;
}
.cartRow .rm:hover{transform: translateY(-1px); background: rgba(239,68,68,.14); border-color: rgba(239,68,68,.40);}

.totals{margin-top:12px;border-top:1px solid rgba(255,255,255,.10);padding-top:12px;display:grid;gap:8px}
.line{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:13px}
.line strong{color:var(--text);font-weight:1000}
.divider{height:1px;background:rgba(255,255,255,.10);margin:12px 0}

.form{display:grid;gap:10px;margin-top:12px}
.field{display:grid;gap:6px}
.field label{font-size:12px;color:var(--muted);font-weight:900}

.field input, .field textarea, .field select{
  border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color:var(--text);
  padding:10px 12px;
  outline: none;
  font-size:14px;
  transition:.12s ease;
}
.field input:focus, .field textarea:focus, .field select:focus{
  border-color: rgba(34,197,94,.35);
  box-shadow: var(--focus);
}
textarea{min-height:64px;resize:vertical}
.two{display:grid;grid-template-columns: 1fr 1fr;gap:10px}
@media (max-width:560px){.two{grid-template-columns:1fr}}

.notice{
  padding:10px 12px;border-radius:16px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(245,158,11,.12);
  color: var(--text2);
  font-size:13px;
  display:flex;gap:10px;align-items:flex-start;
}
.notice.ok{background: rgba(34,197,94,.12)}
.notice small{color:var(--muted)}

.footer{
  margin-top:16px;color:var(--muted);font-size:12px;
  display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap
}

.stickyOrder{
  position:fixed; left:12px; right:12px; bottom:12px;
  z-index:50; display:none;
}
.stickyOrder .bar{
  max-width:1120px; margin:0 auto;
  border-radius: 18px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(15,17,21,.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow);
  display:flex; gap:10px; align-items:center; justify-content:space-between;
  padding:10px;
}
.stickyOrder .left{display:grid; gap:2px; min-width:0;}
.stickyOrder .left b{font-size:13px;color:var(--text);font-weight:1000}
.stickyOrder .left span{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52vw}
@media (max-width: 980px){ .stickyOrder{display:block;} }

.waFloat{
  position:fixed; right:16px; bottom:16px;
  z-index:999; display:flex;
}
.waFloat a{
  width:58px;height:58px;border-radius:18px;
  display:grid;place-items:center;
  background: linear-gradient(135deg,#25D366,#16a34a);
  color:#06130a;
  border:1px solid rgba(255,255,255,.12);
  box-shadow: var(--shadow);
  text-decoration:none;
  font-size:24px;
  font-weight:1000;
  transition:.12s ease;
}
.waFloat a:hover{transform: translateY(-2px)}
.waFloat a:active{transform: scale(.98)}

@media (prefers-reduced-motion: reduce){
  *{transition:none !important; scroll-behavior:auto !important;}
}
