import React from 'react';

function Arrow() {
  return (
    <svg className="hm-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ホーム画面：用語一覧・テスト・管理者ログインのみ。
// スマホは縦積み、PC（900px以上）は左にタイトル、右にメニューの2カラム。
export default function Home({ terms, testUser, onOpenFiltered, onGoTest, onAdminLogin }) {
  const count = Object.keys(terms || {}).length;

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo">
          <div className="logo-mark">au</div>
          <h1>au事業部 用語集</h1>
        </div>
        {testUser?.name && <div className="user-chip">{testUser.name}</div>}
      </header>

      <div className="t-body hm">
        <div className="hm-wrap">
          <section className="hm-hero">
            <div className="hm-hero-eyebrow">au事業部</div>
            <div className="hm-hero-title">用語集</div>
            <div className="hm-hero-count">
              <span className="hm-hero-num">{count}</span>
              <span className="hm-hero-unit">件の用語を収録</span>
            </div>
            {testUser?.name && <div className="hm-hero-greet">{testUser.name}さん、おつかれさまです</div>}
          </section>

          <section className="hm-menu">
            <button className="hm-card" onClick={() => onOpenFiltered({})}>
              <div className="hm-card-text">
                <div className="hm-card-title">用語一覧</div>
                <div className="hm-card-desc">検索・カテゴリ・ランクで絞り込んで調べる</div>
              </div>
              <Arrow />
            </button>
            <button className="hm-card" onClick={onGoTest}>
              <div className="hm-card-text">
                <div className="hm-card-title">テスト</div>
                <div className="hm-card-desc">練習モード・本番モードで理解度をチェック</div>
              </div>
              <Arrow />
            </button>
            <button className="hm-admin" onClick={onAdminLogin}>管理者ログイン</button>
          </section>
        </div>
      </div>
    </div>
  );
}
