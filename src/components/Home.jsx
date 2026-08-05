import React, { useMemo } from 'react';
import { CATEGORIES, CATEGORY_ICONS } from '../utils.js';

export default function Home({ terms, onOpenCategory, onViewAll, onGoTest, onAdminLogin }) {
  const entries = useMemo(() => Object.values(terms), [terms]);

  const catCounts = useMemo(() => {
    const c = {};
    entries.forEach((t) => { c[t.category] = (c[t.category] || 0) + 1; });
    return c;
  }, [entries]);

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo">
          <div className="logo-mark">au</div>
          <h1>au事業部 用語集</h1>
        </div>
      </header>
      <div className="t-body">
        <div className="home-hero">
          <div className="home-hero-title">今日も学んでいこう 🔥</div>
          <div className="home-hero-sub">全{entries.length}件の用語を収録</div>
        </div>

        <div className="section-title" style={{ marginTop: 4 }}>編ごとに見る</div>
        <div className="home-grid">
          {CATEGORIES.map((c) => (
            <div className="home-tile" key={c} onClick={() => onOpenCategory(c)}>
              <div className="home-tile-icon">{CATEGORY_ICONS[c] || '📚'}</div>
              <div className="home-tile-name">{c}</div>
              <div className="home-tile-count">{catCounts[c] || 0}件</div>
            </div>
          ))}
        </div>

        <button className="home-viewall" onClick={onViewAll}>📚 すべての用語を見る</button>

        <div className="home-actions">
          <button className="tbtn tbtn-outline" onClick={onGoTest}>📝 テストを受ける</button>
          <button className="tbtn tbtn-outline" onClick={onAdminLogin}>🔐 管理者ログイン</button>
        </div>
      </div>
    </div>
  );
}
