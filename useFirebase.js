*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
:root{
  --bg:#fef6f0;--card:#fff;--border:#ffd9c0;--text:#1a0f08;--sub:#9a6e57;
  --primary:#ff6600;--pl:#fff2ea;--pd:#cc4f00;
  --grad:linear-gradient(135deg,#ff8c00,#ff6600);
  --shu:#c0392b;--yu:#d97706;--ryo:#059669;--ka:#2563eb;
  --sh-sm:0 1px 6px rgba(255,102,0,.10);--sh:0 3px 16px rgba(255,102,0,.13);--r:14px;
}
html,body,#root{height:100%;}
body{font-family:'Noto Sans JP',sans-serif;background:var(--bg);color:var(--text);}
.page{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg);}
.hdr{background:#fff;border-bottom:2px solid var(--primary);height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;box-shadow:0 2px 10px rgba(255,102,0,.12);position:relative;z-index:50;}
.logo{display:flex;align-items:center;gap:8px;}
.logo-mark{width:32px;height:32px;background:var(--grad);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:.82rem;flex-shrink:0;}
.logo h1{font-size:.9rem;font-weight:800;color:var(--text);white-space:nowrap;}
.hdr-right{display:flex;align-items:center;gap:5px;}
.btn-toggle{width:36px;height:36px;background:var(--pl);border:1.5px solid var(--border);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0;}
.btn-toggle.active{background:var(--primary);border-color:var(--primary);}
.btn-toggle span{display:block;width:15px;height:2px;background:var(--primary);border-radius:2px;}
.btn-toggle.active span{background:#fff;}
.btn-back{background:var(--pl);border:1.5px solid var(--border);border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;color:var(--pd);}
.btn-ghost{background:transparent;border:1.5px solid var(--border);border-radius:7px;padding:5px 9px;font-size:.7rem;font-weight:700;cursor:pointer;font-family:inherit;color:var(--sub);}
.user-chip{background:var(--pl);border:1.5px solid var(--border);border-radius:20px;padding:4px 9px;font-size:.7rem;font-weight:700;color:var(--pd);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.app-body{flex:1;display:flex;overflow:hidden;position:relative;}
.main{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:13px;}
.t-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 13px;}
.search-wrap{margin-bottom:11px;}
.search-box{background:#fff;border:2px solid var(--border);border-radius:999px;display:flex;align-items:center;gap:8px;padding:0 15px;height:46px;box-shadow:var(--sh);transition:border-color .2s;}
.search-box:focus-within{border-color:var(--primary);}
.search-box input{flex:1;border:none;outline:none;font-size:.9rem;font-family:inherit;background:transparent;}
.search-box input::placeholder{color:#cbb09e;}
.search-clear{background:none;border:none;cursor:pointer;color:var(--sub);font-size:.95rem;padding:3px;display:none;}
.search-clear.show{display:block;}
.active-filters{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px;}
.filter-chip{padding:3px 8px;border-radius:20px;font-size:.7rem;font-weight:700;cursor:pointer;}
.fc-秀{background:#fde8e8;color:var(--shu);}
.fc-優{background:#fef3c7;color:var(--yu);}
.fc-良{background:#d1fae5;color:var(--ryo);}
.fc-可{background:#dbeafe;color:var(--ka);}
.fc-cat{background:var(--pl);color:var(--pd);}
.terms-count{font-size:.74rem;color:var(--sub);font-weight:600;margin-bottom:7px;}
.terms-grid{display:flex;flex-direction:column;gap:8px;}
@media (min-width:700px){.terms-grid{display:grid;grid-template-columns:repeat(2,1fr);align-items:start;}}
@media (min-width:1100px){.terms-grid{grid-template-columns:repeat(3,1fr);}}
.term-card{background:var(--card);border-radius:var(--r);box-shadow:var(--sh-sm);overflow:hidden;border:1.5px solid var(--border);cursor:pointer;transition:transform .13s;}
.term-card:active{transform:scale(.98);}
.term-stripe{height:3px;}
.term-card[data-rank="秀"] .term-stripe{background:var(--shu);}
.term-card[data-rank="優"] .term-stripe{background:var(--yu);}
.term-card[data-rank="良"] .term-stripe{background:var(--ryo);}
.term-card[data-rank="可"] .term-stripe{background:var(--ka);}
.term-body{padding:10px 12px 12px;}
.term-top{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;margin-bottom:5px;}
.term-name{font-size:.93rem;font-weight:800;line-height:1.4;flex:1;}
.term-badges{display:flex;gap:3px;flex-shrink:0;}
.badge{padding:2px 6px;border-radius:20px;font-size:.64rem;font-weight:700;white-space:nowrap;}
.badge-cat{background:var(--pl);color:var(--pd);}
.badge-rank-秀{background:#fde8e8;color:var(--shu);}
.badge-rank-優{background:#fef3c7;color:var(--yu);}
.badge-rank-良{background:#d1fae5;color:var(--ryo);}
.badge-rank-可{background:#dbeafe;color:var(--ka);}
.term-desc{font-size:.79rem;color:var(--sub);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.empty-state{text-align:center;padding:50px 20px;color:var(--sub);}
.hl{background:#fff3c0;border-radius:2px;}
.sb-overlay{display:none;position:fixed;inset:0;background:rgba(26,15,8,.35);z-index:90;}
.sb-overlay.show{display:block;}
.sidebar{position:fixed;top:56px;right:0;bottom:0;width:245px;background:#fff;border-left:2px solid var(--border);z-index:100;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);overflow-y:auto;}
.sidebar.open{transform:translateX(0);}
.sb-sec{padding:13px;border-bottom:1px solid var(--border);}
.sb-lbl{font-size:.67rem;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;}
.rank-btns{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
.rank-btn{padding:8px 3px;border-radius:8px;border:2px solid var(--border);background:#fff;font-size:.82rem;font-weight:800;cursor:pointer;font-family:inherit;text-align:center;color:var(--sub);}
.rank-btn .rcnt{display:block;font-size:.6rem;margin-top:2px;color:var(--sub);}
.rank-btn[data-rank="all"].active{background:var(--pl);border-color:var(--primary);color:var(--primary);}
.rank-btn[data-rank="秀"].active{background:#fde8e8;border-color:var(--shu);color:var(--shu);}
.rank-btn[data-rank="優"].active{background:#fef3c7;border-color:var(--yu);color:var(--yu);}
.rank-btn[data-rank="良"].active{background:#d1fae5;border-color:var(--ryo);color:var(--ryo);}
.rank-btn[data-rank="可"].active{background:#dbeafe;border-color:var(--ka);color:var(--ka);}
.cat-btns{display:flex;flex-direction:column;gap:4px;}
.cat-btn{padding:8px 11px;border-radius:8px;border:1.5px solid var(--border);background:#fff;font-size:.8rem;font-weight:600;cursor:pointer;text-align:left;font-family:inherit;color:var(--sub);display:flex;align-items:center;justify-content:space-between;}
.cat-btn .ccnt{font-size:.66rem;font-weight:700;background:var(--bg);padding:2px 5px;border-radius:20px;}
.cat-btn.active{background:var(--pl);border-color:var(--primary);color:var(--pd);}
.cat-btn.active .ccnt{background:var(--primary);color:#fff;}
.btn-reset{width:100%;padding:8px;border-radius:7px;border:1.5px solid var(--border);background:#fff;font-size:.76rem;font-weight:600;cursor:pointer;font-family:inherit;color:var(--sub);margin-top:6px;}
.btn-test{width:100%;padding:12px;border-radius:10px;border:2px dashed var(--border);background:var(--bg);font-size:.86rem;font-weight:700;cursor:pointer;font-family:inherit;color:var(--sub);display:flex;align-items:center;justify-content:center;gap:6px;}
.btn-test:active{background:var(--pl);border-color:var(--primary);color:var(--primary);}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(26,15,8,.5);z-index:200;align-items:flex-end;justify-content:center;}
.modal-overlay.open{display:flex;}
.modal{background:var(--card);border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.modal-handle{width:34px;height:4px;background:var(--border);border-radius:2px;margin:11px auto 0;}
.modal-hdr{padding:12px 17px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-hdr h3{font-size:.92rem;font-weight:800;}
.btn-close{background:var(--bg);border:none;width:26px;height:26px;border-radius:50%;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--sub);}
.modal-body{padding:13px 17px;}
.modal-footer{padding:10px 17px 24px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border);}
.form-group{margin-bottom:12px;}
.form-group label{display:block;font-size:.74rem;font-weight:700;margin-bottom:4px;}
.req{color:var(--primary);}
.form-group input,.form-group select,.form-group textarea{width:100%;border:1.5px solid var(--border);border-radius:9px;padding:10px 12px;font-size:.88rem;font-family:inherit;background:#fff;color:var(--text);-webkit-appearance:none;}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--primary);}
.form-group textarea{resize:vertical;min-height:72px;}
.rank-select-row{display:flex;gap:6px;}
.rank-opt{flex:1;position:relative;}
.rank-opt input[type="radio"]{position:absolute;opacity:0;width:0;height:0;}
.rank-opt label{display:block;text-align:center;padding:9px 3px;border-radius:8px;border:2px solid var(--border);cursor:pointer;font-size:.92rem;font-weight:800;color:var(--sub);margin:0;}
.rank-opt[data-rank="秀"] input:checked+label{background:#fde8e8;border-color:var(--shu);color:var(--shu);}
.rank-opt[data-rank="優"] input:checked+label{background:#fef3c7;border-color:var(--yu);color:var(--yu);}
.rank-opt[data-rank="良"] input:checked+label{background:#d1fae5;border-color:var(--ryo);color:var(--ryo);}
.rank-opt[data-rank="可"] input:checked+label{background:#dbeafe;border-color:var(--ka);color:var(--ka);}
.mbtn{padding:10px 18px;border-radius:9px;border:none;font-size:.83rem;font-weight:700;cursor:pointer;font-family:inherit;}
.mbtn-cancel{background:var(--bg);color:var(--sub);}
.mbtn-primary{background:var(--grad);color:#fff;}
.mbtn-danger{background:#fde8e8;color:var(--shu);margin-right:auto;}
.detail-rank-bar{height:4px;border-radius:2px;margin-bottom:11px;}
.detail-rank-bar.rank-秀{background:var(--shu);}
.detail-rank-bar.rank-優{background:var(--yu);}
.detail-rank-bar.rank-良{background:var(--ryo);}
.detail-rank-bar.rank-可{background:var(--ka);}
.detail-badges{display:flex;gap:5px;margin-bottom:11px;}
.detail-sec{margin-bottom:11px;}
.detail-sec .lbl{font-size:.66rem;color:var(--sub);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px;display:block;}
.detail-sec p{font-size:.88rem;line-height:1.75;}
.t-card{background:var(--card);border-radius:var(--r);box-shadow:var(--sh);border:1.5px solid var(--border);padding:16px;margin-bottom:12px;}
.t-card-title{font-size:.66rem;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}
.tbtn{width:100%;padding:12px;border-radius:10px;border:none;font-size:.9rem;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s,transform .1s;}
.tbtn:active{transform:scale(.98);}
.tbtn-primary{background:var(--grad);color:#fff;box-shadow:0 3px 10px rgba(255,102,0,.3);}
.tbtn-outline{background:transparent;border:2px solid var(--primary);color:var(--primary);}
.tbtn+.tbtn{margin-top:8px;}
.mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.mode-card{background:var(--card);border:2px solid var(--border);border-radius:10px;padding:13px 9px;text-align:center;cursor:pointer;transition:all .15s;}
.mc-icon{font-size:1.5rem;margin-bottom:4px;}
.mc-title{font-size:.8rem;font-weight:800;margin-bottom:3px;}
.mc-desc{font-size:.66rem;color:var(--sub);line-height:1.4;}
.mode-card.practice .mc-title{color:var(--ryo);}
.mode-card.official .mc-title{color:var(--primary);}
.mode-card.selected.practice{border-color:var(--ryo);background:#e6f9ef;}
.mode-card.selected.official{border-color:var(--primary);background:var(--pl);}
.qtype-card.selected{border-color:var(--primary);background:var(--pl);}
.qtype-card .mc-title{color:var(--primary);}
.rank-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}
.rank-card{border:2px solid var(--border);border-radius:9px;padding:10px;text-align:center;cursor:pointer;background:#fff;}
.rank-card .rk-label{font-size:.95rem;font-weight:900;}
.rank-card .rk-cnt{font-size:.62rem;color:var(--sub);margin-top:2px;}
.rank-card[data-rank="秀"].sel{border-color:var(--shu);background:#fde8e8;color:var(--shu);}
.rank-card[data-rank="優"].sel{border-color:var(--yu);background:#fef3c7;color:var(--yu);}
.rank-card[data-rank="良"].sel{border-color:var(--ryo);background:#d1fae5;color:var(--ryo);}
.rank-card[data-rank="可"].sel{border-color:var(--ka);background:#dbeafe;color:var(--ka);}
.quiz-prog-bar{height:4px;background:var(--border);border-radius:2px;margin-bottom:16px;overflow:hidden;}
.quiz-prog-fill{height:100%;background:var(--grad);border-radius:2px;transition:width .3s;}
.quiz-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;}
.quiz-no{font-size:.76rem;font-weight:700;color:var(--sub);}
.quiz-rbadge{padding:2px 8px;border-radius:20px;font-size:.68rem;font-weight:700;}
.quiz-q{font-size:.97rem;font-weight:800;line-height:1.6;margin-bottom:5px;}
.quiz-hint{font-size:.74rem;color:var(--sub);margin-bottom:14px;}
.quiz-choices{display:flex;flex-direction:column;gap:8px;}
.choice-btn{background:#fff;border:2px solid var(--border);border-radius:10px;padding:12px 14px;text-align:left;font-size:.83rem;font-family:inherit;cursor:pointer;line-height:1.5;width:100%;color:var(--text);}
.choice-btn:active{transform:scale(.98);}
.choice-btn.correct{border-color:var(--ryo);background:#d1fae5;color:#065f46;}
.choice-btn.wrong{border-color:var(--shu);background:#fde8e8;color:#991b1b;}
.choice-btn.reveal{border-color:var(--ryo);background:#d1fae5;color:#065f46;opacity:.6;}
.choice-btn:disabled{cursor:default;}
.score-circle{width:86px;height:86px;border-radius:50%;background:var(--grad);display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 4px 20px rgba(255,102,0,.3);}
.score-num{font-size:1.7rem;font-weight:900;color:#fff;line-height:1;}
.score-denom{font-size:.68rem;color:rgba(255,255,255,.85);}
.result-list{display:flex;flex-direction:column;gap:6px;}
.result-item{background:#fff;border-radius:8px;border:1.5px solid var(--border);padding:10px 12px;}
.result-item.ok{border-left:4px solid var(--ryo);}
.result-item.ng{border-left:4px solid var(--shu);}
.ri-top{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:3px;}
.ri-name{font-size:.83rem;font-weight:700;}
.ri-desc{font-size:.74rem;color:var(--sub);line-height:1.5;}
.tab-bar{display:flex;border-bottom:2px solid var(--border);margin-bottom:13px;overflow-x:auto;scrollbar-width:none;}
.tab-bar::-webkit-scrollbar{display:none;}
.tab{flex-shrink:0;padding:8px 12px;border:none;background:transparent;font-family:inherit;font-size:.78rem;font-weight:700;color:var(--sub);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;}
.tab.active{color:var(--primary);border-bottom-color:var(--primary);}
.section-title{font-size:.92rem;font-weight:800;margin-bottom:12px;}
.mode-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.66rem;font-weight:700;}
.mode-practice{background:#d1fae5;color:var(--ryo);}
.mode-official{background:var(--pl);color:var(--pd);}
.member-card{background:#fff;border-radius:11px;border:1.5px solid var(--border);padding:13px;margin-bottom:9px;}
.member-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px;}
.member-name{font-size:.88rem;font-weight:800;}
.member-meta{font-size:.68rem;color:var(--sub);margin-top:2px;}
.overall-acc{font-size:1.05rem;font-weight:900;color:var(--primary);}
.rank-bars{display:flex;flex-direction:column;gap:4px;margin-bottom:9px;}
.rank-bar-row{display:flex;align-items:center;gap:6px;}
.rank-bar-label{font-size:.64rem;font-weight:700;width:13px;text-align:center;}
.rank-bar-track{flex:1;height:7px;background:var(--bg);border-radius:3px;overflow:hidden;}
.rank-bar-fill{height:100%;border-radius:3px;transition:width .5s;}
.rank-bar-score{font-size:.64rem;color:var(--sub);width:28px;text-align:right;}
.mistake-section{border-top:1px solid var(--border);padding-top:9px;margin-top:2px;}
.mistake-title{font-size:.68rem;font-weight:700;color:var(--sub);margin-bottom:6px;}
.mistake-list{display:flex;flex-direction:column;gap:4px;}
.mistake-item{display:flex;align-items:center;gap:7px;background:var(--bg);border-radius:7px;padding:6px 9px;}
.mistake-name{font-size:.76rem;font-weight:700;flex:1;}
.mistake-cnt{font-size:.7rem;font-weight:800;color:var(--shu);background:#fde8e8;padding:2px 7px;border-radius:20px;white-space:nowrap;}
.mistake-bar-wrap{flex:2;height:5px;background:#ffe0c8;border-radius:3px;overflow:hidden;}
.mistake-bar-fill{height:100%;background:var(--shu);border-radius:3px;}
.ranking-list{display:flex;flex-direction:column;gap:7px;}
.ranking-item{background:#fff;border-radius:10px;border:1.5px solid var(--border);padding:11px 13px;display:flex;align-items:center;gap:11px;}
.ranking-no{font-size:1rem;font-weight:900;width:24px;text-align:center;flex-shrink:0;}
.ranking-no.gold{color:#f59e0b;}
.ranking-no.silver{color:#9ca3af;}
.ranking-no.bronze{color:#cd7c2f;}
.ranking-info{flex:1;}
.ranking-name{font-size:.86rem;font-weight:800;}
.ranking-sub{font-size:.68rem;color:var(--sub);margin-top:2px;}
.ranking-score{font-size:1.05rem;font-weight:900;color:var(--primary);}
.admin-table{width:100%;border-collapse:collapse;font-size:.76rem;}
.admin-table th{background:var(--pl);color:var(--pd);padding:6px 8px;text-align:left;font-weight:700;border-bottom:2px solid var(--border);}
.admin-table td{padding:6px 8px;border-bottom:1px solid var(--border);vertical-align:top;}
.tbl-wrap{overflow-x:auto;}
.score-chip{display:inline-block;padding:2px 6px;border-radius:20px;font-size:.66rem;font-weight:700;}
.score-high{background:#d1fae5;color:var(--ryo);}
.score-mid{background:#fef3c7;color:var(--yu);}
.score-low{background:#fde8e8;color:var(--shu);}
.admin-mc{background:#fff;border-radius:10px;border:1.5px solid var(--border);padding:13px;margin-bottom:9px;}
.admin-mc-name{font-size:.86rem;font-weight:800;}
.admin-mc-meta{font-size:.67rem;color:var(--sub);margin-top:2px;}
.wrong-pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;}
.wrong-pill{background:#fde8e8;color:var(--shu);border-radius:20px;padding:2px 8px;font-size:.68rem;font-weight:700;}
.pos-select-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.pos-opt{position:relative;}
.pos-opt input[type="radio"]{position:absolute;opacity:0;width:0;height:0;}
.pos-opt label{display:block;text-align:center;padding:9px 3px;border-radius:8px;border:2px solid var(--border);cursor:pointer;font-size:.86rem;font-weight:800;color:var(--sub);margin:0;}
.pos-opt input:checked+label{background:var(--pl);border-color:var(--primary);color:var(--pd);}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(80px);background:#1a0f08;color:#fff;padding:9px 18px;border-radius:9px;font-size:.8rem;font-weight:600;z-index:9999;transition:transform .28s;white-space:nowrap;}
#toast.show{transform:translateX(-50%) translateY(0);}
.divider{height:1px;background:var(--border);margin:13px 0;}
.tc{text-align:center;}
.ts{color:var(--sub);font-size:.78rem;}
.mt8{margin-top:8px;}
.mt13{margin-top:13px;}
.fw8{font-weight:800;}
#loading{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:999;}
.loading-logo{font-size:1.3rem;font-weight:900;color:var(--primary);}
.spinner{width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}

/* 用語管理：複数列（PC）/1列（スマホ） */
.admin-term-item{background:#fff;border:1.5px solid var(--border);border-radius:10px;margin-bottom:0;overflow:hidden;align-self:start;}
.admin-terms-list{display:grid;grid-template-columns:1fr;gap:8px;align-items:start;}
@media (min-width:700px){.admin-terms-list{grid-template-columns:repeat(2,1fr);}}
@media (min-width:1100px){.admin-terms-list{grid-template-columns:repeat(3,1fr);}}
.admin-term-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;cursor:pointer;gap:8px;}
.admin-term-name{font-size:.88rem;font-weight:800;flex:1;}
.admin-term-badges{display:flex;gap:4px;flex-shrink:0;}
.admin-term-body{padding:0 13px 13px;border-top:1px solid var(--border);}
.admin-term-body.collapsed{display:none;}
.admin-edit-group{margin-bottom:9px;}
.admin-edit-group label{display:block;font-size:.68rem;font-weight:700;color:var(--sub);margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em;}
.admin-edit-input{width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:.83rem;font-family:inherit;background:#fff;color:var(--text);-webkit-appearance:none;}
.admin-edit-input:focus{outline:none;border-color:var(--primary);}
.admin-edit-textarea{width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:.82rem;font-family:inherit;resize:vertical;min-height:62px;background:#fff;color:var(--text);}
.admin-edit-textarea:focus{outline:none;border-color:var(--primary);}
.admin-rank-row{display:flex;gap:5px;margin-bottom:9px;}
.admin-rank-opt{flex:1;position:relative;}
.admin-rank-opt input[type="radio"]{position:absolute;opacity:0;width:0;height:0;}
.admin-rank-opt label{display:block;text-align:center;padding:7px 2px;border-radius:7px;border:2px solid var(--border);cursor:pointer;font-size:.85rem;font-weight:800;color:var(--sub);margin:0;}
.admin-rank-opt[data-rank="秀"] input:checked+label{background:#fde8e8;border-color:var(--shu);color:var(--shu);}
.admin-rank-opt[data-rank="優"] input:checked+label{background:#fef3c7;border-color:var(--yu);color:var(--yu);}
.admin-rank-opt[data-rank="良"] input:checked+label{background:#d1fae5;border-color:var(--ryo);color:var(--ryo);}
.admin-rank-opt[data-rank="可"] input:checked+label{background:#dbeafe;border-color:var(--ka);color:var(--ka);}
.admin-cat-sel{width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:.83rem;font-family:inherit;-webkit-appearance:none;background:#fff;}
.admin-cat-sel:focus{outline:none;border-color:var(--primary);}
.admin-action-row{display:flex;gap:7px;margin-top:10px;}
.btn-save-term{flex:1;padding:9px;border-radius:8px;border:none;background:var(--grad);color:#fff;font-size:.82rem;font-weight:700;cursor:pointer;font-family:inherit;}
.btn-del-term{padding:9px 14px;border-radius:8px;border:none;background:#fde8e8;color:var(--shu);font-size:.82rem;font-weight:700;cursor:pointer;font-family:inherit;}
.collapse-btn{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg);font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;color:var(--sub);}
.bulk-row{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);}
.bulk-row-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.bulk-row-fields{display:flex;gap:6px;margin-bottom:6px;}
.bulk-name{flex:2;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:.82rem;font-family:inherit;}
.bulk-cat{flex:1;border:1.5px solid var(--border);border-radius:7px;padding:8px 6px;font-size:.75rem;font-family:inherit;-webkit-appearance:none;}
.bulk-rank-row{display:flex;gap:5px;margin-bottom:6px;}
.bulk-rank-row label{flex:1;font-size:.78rem;font-weight:700;}
.bulk-desc,.bulk-note{width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:.82rem;font-family:inherit;resize:vertical;}
.bulk-note{margin-top:5px;font-size:.78rem;padding:7px 10px;}
.btn-row-del{background:#fde8e8;border:none;border-radius:6px;padding:3px 8px;font-size:.72rem;font-weight:700;cursor:pointer;color:var(--shu);font-family:inherit;}
