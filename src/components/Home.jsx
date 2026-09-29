import React from 'react';

function Arrow() {
  return (
    <svg className="hm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ホーム画面：用語一覧・テスト・機種比較・管理者ログイン。
// スマホは縦積み、PC（900px以上）は左にタイトル、右にメニューの2カラム。
export default function Home({ terms, testUser, onOpenFiltered, onGoTest, onGoDevices, onGoOreTab, onGoNippou, onGoKpi, onLogout, onAdminLogin }) {
  const count = Object.keys(terms || {}).length;
  const card = (title, desc, onClick) => (
    <button className="hm-card" onClick={onClick}>
      <div className="hm-card-text">
        <div className="hm-card-title">{title}</div>
        <div className="hm-card-desc">{desc}</div>
      </div>
      <Arrow />
    </button>
  );

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo">
          <div className="logo-mark">au</div>
          <h1>au navi</h1>
        </div>
        <div className="hdr-right">
          {testUser?.name && <div className="user-chip">{testUser.name}</div>}
          {onLogout && <button className="btn-ghost" onClick={onLogout}>ログアウト</button>}
        </div>
      </header>

      <div className="t-body hm">
        <div className="hm-wrap">
          <section className="hm-hero">
            <div className="hm-hero-eyebrow">au事業部</div>
            <div className="hm-hero-title">au navi</div>
            <div className="hm-hero-count">
              <span className="hm-hero-num">{count}</span>
              <span className="hm-hero-unit">件の用語を収録</span>
            </div>
            {testUser?.name && <div className="hm-hero-greet">{testUser.name}さん、おつかれさまです</div>}
          </section>

          <section className="hm-menu">
            {card('用語一覧', '検索・カテゴリ・ランクで絞り込んで調べる', () => onOpenFiltered({}))}
            {card('機種比較', 'iPhone・Androidのできる／できないを一覧表で比べる', onGoDevices)}
            {card('オレタブ', '本番前にオレタブの操作を練習する（横画面）', onGoOreTab)}
            {card('KPI', '現場全体の目標と、メンバーごとの実績', onGoKpi)}
            {card('日報', '日報の登録・確認、実績確認・店舗特徴・個人実績', onGoNippou)}
            {card('テスト', '練習モード・本番モードで理解度をチェック', onGoTest)}
            <button className="hm-admin" onClick={onAdminLogin}>管理者ログイン</button>
          </section>
        </div>
      </div>
    </div>
  );
}
