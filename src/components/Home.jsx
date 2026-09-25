import React, { useMemo, useState } from 'react';
import { CATEGORIES_BASE, CATEGORY_ICONS, CATEGORY_COLORS } from '../utils.js';

// ホーム画面：検索 → 主要アクション → カテゴリ → 学習状況 → 新着 の順で、
// 「開いてすぐ調べる／テストに行ける」ことを優先した構成
export default function Home({ terms, results, testUser, onOpenFiltered, onGoTest, onAdminLogin }) {
  const entries = useMemo(() => Object.values(terms || {}), [terms]);
  const [q, setQ] = useState('');

  const catCounts = useMemo(() => {
    const c = {};
    entries.forEach((t) => { c[t.category] = (c[t.category] || 0) + 1; });
    return c;
  }, [entries]);

  const recent = useMemo(
    () => entries.filter((t) => t.createdAt).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [entries]
  );

  // 自分のテスト成績（ログイン中のユーザーのみ）
  const myStats = useMemo(() => {
    if (!testUser) return null;
    const mine = Object.values(results || {})
      .filter((r) => r.userId === testUser.id)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!mine.length) return { count: 0 };
    return {
      count: mine.length,
      latest: mine[0].pct,
      best: Math.max(...mine.map((r) => r.pct || 0)),
    };
  }, [results, testUser]);

  const search = () => onOpenFiltered({ q: q.trim() });

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
        {/* ヒーロー：あいさつ＋検索 */}
        <section className="hm-hero">
          <div className="hm-hero-greet">{testUser?.name ? `${testUser.name}さん、おつかれさま👋` : 'おつかれさま👋'}</div>
          <div className="hm-hero-title">今日はなにを調べる？</div>
          <div className="hm-search">
            <span className="hm-search-ico">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
              placeholder={`${entries.length}件の用語から検索`}
              enterKeyHint="search"
              autoComplete="off"
            />
            <button className="hm-search-btn" onClick={search}>検索</button>
          </div>
        </section>

        {/* 主要アクション */}
        <section className="hm-actions">
          <button className="hm-action" onClick={() => onOpenFiltered({})}>
            <span className="hm-action-ico">📚</span>
            <span className="hm-action-name">用語一覧</span>
            <span className="hm-action-sub">全{entries.length}件</span>
          </button>
          <button className="hm-action hm-action-accent" onClick={onGoTest}>
            <span className="hm-action-ico">📝</span>
            <span className="hm-action-name">テスト</span>
            <span className="hm-action-sub">練習・本番</span>
          </button>
        </section>

        {/* カテゴリ */}
        <div className="hm-label">カテゴリから探す</div>
        <section className="hm-cats">
          {CATEGORIES_BASE.map((c) => (
            <button
              key={c}
              className="hm-cat"
              style={{ '--cc': CATEGORY_COLORS[c] || 'var(--primary)' }}
              onClick={() => onOpenFiltered({ category: c })}
            >
              <span className="hm-cat-ico">{CATEGORY_ICONS[c] || '📁'}</span>
              <span className="hm-cat-name">{c}</span>
              <span className="hm-cat-count">{catCounts[c] || 0}</span>
            </button>
          ))}
        </section>

        {/* 学習状況 */}
        {myStats && (
          <>
            <div className="hm-label">あなたの学習</div>
            {myStats.count ? (
              <section className="hm-stats">
                <div className="hm-stat"><div className="hm-stat-num">{myStats.count}<small>回</small></div><div className="hm-stat-lbl">受験回数</div></div>
                <div className="hm-stat"><div className="hm-stat-num">{myStats.latest ?? '-'}<small>%</small></div><div className="hm-stat-lbl">前回の正答率</div></div>
                <div className="hm-stat"><div className="hm-stat-num">{myStats.best}<small>%</small></div><div className="hm-stat-lbl">最高正答率</div></div>
              </section>
            ) : (
              <button className="hm-empty" onClick={onGoTest}>まだテストの記録がありません。まずは練習モードからやってみよう →</button>
            )}
          </>
        )}

        {/* 新着 */}
        {recent.length > 0 && (
          <>
            <div className="hm-label">新しく追加された用語</div>
            <section className="hm-recent">
              {recent.map((t, i) => (
                <button key={i} className="hm-recent-row" onClick={() => onOpenFiltered({ q: t.name })}>
                  <span className="hm-recent-dot" style={{ background: CATEGORY_COLORS[t.category] || 'var(--primary)' }} />
                  <span className="hm-recent-name">{t.name}</span>
                  <span className="hm-recent-cat">{t.category}</span>
                  <span className="hm-recent-arrow">›</span>
                </button>
              ))}
            </section>
          </>
        )}

        <button className="hm-admin" onClick={onAdminLogin}>🔐 管理者ログイン</button>
      </div>
    </div>
  );
}
