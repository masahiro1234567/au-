import React from 'react';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ICONS = {
  book: <path d="M4 5h6a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v12a2 2 0 012-2h6z" {...S} />,
  phones: <><rect x="3" y="6" width="7" height="13" rx="1.5" {...S} /><rect x="12" y="3" width="9" height="17" rx="1.5" {...S} /></>,
  tab: <><rect x="3" y="5" width="18" height="13" rx="2" {...S} /><path d="M9 21h6" {...S} /></>,
  target: <><circle cx="12" cy="12" r="8" {...S} /><circle cx="12" cy="12" r="4" {...S} /><circle cx="12" cy="12" r="1" {...S} /></>,
  pen: <><path d="M5 4h10l4 4v12H5z" {...S} /><path d="M9 12h6M9 16h4" {...S} /></>,
  check: <path d="M4 12l5 5L20 6" {...S} />,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...S} /></>,
  user: <><circle cx="12" cy="8" r="4" {...S} /><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7" {...S} /></>,
  search: <><circle cx="11" cy="11" r="6.5" {...S} /><path d="M16 16l4 4" {...S} /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" {...S} /><path d="M8 11V8a4 4 0 018 0v3" {...S} /></>,
  out: <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 16l-4-4 4-4M6 12h10" {...S} />,
  x: <path d="M6 6l12 12M18 6L6 18" {...S} />,
};
const Icon = ({ k, size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{ICONS[k]}</svg>;

// ホーム画面（案C）：中央に「au navi」と用語検索、その下にメニューのタイル
// PC（900px以上）は3列×2段のタイル、スマホは1列のカード。右上のボタンで右側からメニューが開く（最初は閉じている）
export default function Home({ terms, testUser, onOpenFiltered, onGoTest, onGoDevices, onGoOreTab, onGoNippou, onGoKpi, onLogout, onAdminLogin, draft, draftText, onResumeDraft, unreadCount = 0, streak, onGoEval, onGoMyPage }) {
  const count = Object.keys(terms || {}).length;
  const [q, setQ] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const MENU = [
    ['用語一覧', '検索・カテゴリ・ランクで絞り込んで調べる', 'book', () => onOpenFiltered({})],
    ['機種比較', 'iPhone・Androidのできる／できないを一覧表で比べる', 'phones', onGoDevices],
    ['オレタブ', '本番前にオレタブの操作を練習する（横画面）', 'tab', onGoOreTab],
    ['KPI', '現場全体の目標と、メンバーごとの実績', 'target', onGoKpi],
    ['日報', '日報の登録・確認、実績確認・店舗特徴・個人実績', 'pen', onGoNippou],
    ['テスト', 'ランク別・全範囲・未出題で理解度をチェック', 'check', onGoTest],
    ['評価一覧', 'メンバーの評価・育成計画・月次KPIを見る', 'chart', onGoEval],
  ];
  const search = (e) => { e.preventDefault(); onOpenFiltered({ q: q.trim() }); };
  const go = (fn) => () => { setMenuOpen(false); fn && fn(); };

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>au navi</h1></div>
        <div className="hdr-right">
          {testUser?.name && (onGoMyPage ? <button className="user-chip" style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onClick={onGoMyPage} aria-label="マイページを開く">{testUser.name}</button> : <div className="user-chip">{testUser.name}</div>)}
          <button className={`btn-toggle ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="メニュー" aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
        </div>
      </header>

      <div className="t-body hm2">
        <section className="hm2-hero">
          <div className="hm2-eyebrow">au事業部</div>
          <div className="hm2-title">au navi</div>
          {testUser?.name && <div className="hm2-greet">{testUser.name}さん、おつかれさまです</div>}
        </section>

        {streak && streak.streak > 0 && (
          <div className="hm2-streak">
            <div className="hm2-streak-num"><b>{streak.streak}</b><span>日連続</span></div>
            <div className="hm2-streak-text">
              <b>連続ログイン {streak.streak}日</b>
              <span>これまでの最長 {streak.best}日</span>
            </div>
            <div className="hm2-streak-week" aria-label="今週ログインした日">
              {streak.week.map((w) => <span key={w.label} className={w.on ? 'on' : ''}><i />{w.label}</span>)}
            </div>
          </div>
        )}
        {draft && (
          <button className="hm2-draft" onClick={() => onResumeDraft(draft)}>
            <span className="hm2-ico"><Icon k="pen" size={24} /></span>
            <span className="hm2-tile-text"><span className="hm2-tile-title">書きかけの日報があります</span><span className="hm2-tile-desc">{draftText}　タップで続きから</span></span>
          </button>
        )}
        <form className="hm2-search" onSubmit={search} role="search">
          <Icon k="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`用語をさがす（${count}件）`} aria-label="用語をさがす" />
          {q && <button type="submit" className="hm2-search-go">検索</button>}
        </form>

        <section className="hm2-tiles">
          {MENU.map(([title, desc, icon, fn]) => (
            <button key={title} className="hm2-tile" onClick={fn}>
              <span className="hm2-ico"><Icon k={icon} size={28} />{title === '用語一覧' && unreadCount > 0 && <span className="tn-badge" aria-label={`更新された用語 ${unreadCount}件`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}</span>
              <span className="hm2-tile-text"><span className="hm2-tile-title">{title}</span><span className="hm2-tile-desc">{desc}</span></span>
              <Arrow />
            </button>
          ))}
        </section>

        <div className="hm2-foot"><button className="hm-admin" onClick={onAdminLogin}>管理者ログイン</button></div>
      </div>

      {/* 右側から開くメニュー */}
      {menuOpen && <div className="hm2-ov" onClick={() => setMenuOpen(false)} />}
      <nav className={`hm2-drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen} aria-label="メニュー">
        <div className="hm2-drawer-head">
          <div>
            <div className="hm2-drawer-name">{testUser?.name || ''}</div>
            <div className="hm2-drawer-sub">au navi</div>
          </div>
          <button className="hm2-drawer-x" onClick={() => setMenuOpen(false)} aria-label="メニューを閉じる"><Icon k="x" size={20} /></button>
        </div>
        {MENU.map(([title, , icon, fn]) => (
          <button key={title} className="hm2-drawer-item" onClick={go(fn)} tabIndex={menuOpen ? 0 : -1}><Icon k={icon} size={20} />{title}</button>
        ))}
        <div className="hm2-drawer-sep" />
        {onGoMyPage && <button className="hm2-drawer-item" onClick={go(onGoMyPage)} tabIndex={menuOpen ? 0 : -1}><Icon k="user" size={20} />マイページ</button>}
        <button className="hm2-drawer-item" onClick={go(onAdminLogin)} tabIndex={menuOpen ? 0 : -1}><Icon k="lock" size={20} />管理者ログイン</button>
        {onLogout && <button className="hm2-drawer-item" onClick={go(onLogout)} tabIndex={menuOpen ? 0 : -1}><Icon k="out" size={20} />ログアウト</button>}
      </nav>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="hm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

