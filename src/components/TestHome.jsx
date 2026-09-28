import React, { useMemo, useState } from 'react';
import { RANK_COLORS, RANKS, esc } from '../utils.js';

function useMemberStats(results) {
  return useMemo(() => {
    const list = Object.values(results || {}).filter((r) => r.mode === 'official');
    const users = {};
    list.forEach((r) => {
      if (!users[r.userId]) {
        users[r.userId] = {
          name: r.userName, pos: r.userPos || '', cr: r.userCloserRank || '',
          tests: 0, ts: 0, tq: 0,
          byRank: { 秀: { s: 0, t: 0 }, 優: { s: 0, t: 0 }, 良: { s: 0, t: 0 }, 可: { s: 0, t: 0 } },
          mistakes: {},
        };
      }
      const u = users[r.userId];
      u.tests++; u.ts += r.score; u.tq += r.total;
      const rk = r.rank || 'all';
      if (u.byRank[rk]) { u.byRank[rk].s += r.score; u.byRank[rk].t += r.total; }
      (r.detail || []).forEach((d) => { if (!d.correct) u.mistakes[d.name] = (u.mistakes[d.name] || 0) + 1; });
    });
    return Object.values(users);
  }, [results]);
}

function ProgressTab({ results }) {
  const entries = useMemberStats(results);
  if (!entries.length) return <div className="tc ts" style={{ padding: 40 }}>まだ本番モードの結果がありません</div>;
  return (
    <div>
      {entries.map((u, i) => {
        const ov = u.tq > 0 ? Math.round((u.ts / u.tq) * 100) : 0;
        const topM = Object.entries(u.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxM = topM.length ? topM[0][1] : 1;
        return (
          <div className="member-card" key={i}>
            <div className="member-top">
              <div>
                <div className="member-name">{u.name}</div>
                <div className="member-meta">{u.pos}{u.cr ? ' / ' + u.cr : ''} ・ 本番{u.tests}回</div>
              </div>
              <div className="overall-acc">{ov}%</div>
            </div>
            <div className="rank-bars">
              {RANKS.map((r) => {
                const d = u.byRank[r];
                if (!d || d.t === 0) return null;
                const p = Math.round((d.s / d.t) * 100);
                return (
                  <div className="rank-bar-row" key={r}>
                    <div className="rank-bar-label" style={{ color: RANK_COLORS[r] }}>{r}</div>
                    <div className="rank-bar-track"><div className="rank-bar-fill" style={{ width: `${p}%`, background: RANK_COLORS[r] }} /></div>
                    <div className="rank-bar-score">{p}%</div>
                  </div>
                );
              })}
            </div>
            {topM.length > 0 && (
              <div className="mistake-section">
                <div className="mistake-title">❌ よく間違える問題</div>
                <div className="mistake-list">
                  {topM.map(([n, cnt]) => (
                    <div className="mistake-item" key={n}>
                      <div className="mistake-name">{n}</div>
                      <div className="mistake-bar-wrap"><div className="mistake-bar-fill" style={{ width: `${Math.round((cnt / maxM) * 100)}%` }} /></div>
                      <div className="mistake-cnt">{cnt}回</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RankingTab({ results }) {
  const sorted = useMemo(() => {
    const list = Object.values(results || {}).filter((r) => r.mode === 'official');
    const users = {};
    list.forEach((r) => {
      if (!users[r.userId]) users[r.userId] = { name: r.userName, pos: r.userPos || '', cr: r.userCloserRank || '', ts: 0, tq: 0, tests: 0 };
      users[r.userId].ts += r.score; users[r.userId].tq += r.total; users[r.userId].tests++;
    });
    return Object.values(users).filter((u) => u.tq > 0).sort((a, b) => {
      const pa = Math.round((a.ts / a.tq) * 100), pb = Math.round((b.ts / b.tq) * 100);
      return pb - pa || b.tq - a.tq;
    });
  }, [results]);

  if (!sorted.length) return <div className="tc ts" style={{ padding: 40 }}>まだデータがありません</div>;
  const medals = ['🥇', '🥈', '🥉'], rClass = ['gold', 'silver', 'bronze'];
  return (
    <div>
      <div className="section-title">🏆 正答率ランキング（本番モード）</div>
      <div className="ranking-list">
        {sorted.map((u, i) => {
          const pct = Math.round((u.ts / u.tq) * 100);
          return (
            <div className="ranking-item" key={i}>
              <div className={`ranking-no ${rClass[i] || ''}`}>{medals[i] || i + 1}</div>
              <div className="ranking-info">
                <div className="ranking-name">{u.name}</div>
                <div className="ranking-sub">{u.pos}{u.cr ? ' / ' + u.cr : ''} ・ {u.tq}問回答</div>
              </div>
              <div className="ranking-score">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TestHome({ user, terms, results, onBack, onStartQuiz }) {
  const [tab, setTab] = useState('test');
  const [mode, setMode] = useState('practice');
  const [qtype, setQtype] = useState('rank');
  const [selRank, setSelRank] = useState('秀');

  const rankCounts = useMemo(() => {
    const c = { 秀: 0, 優: 0, 良: 0, 可: 0 };
    Object.values(terms).forEach((t) => { if (c[t.rank] !== undefined) c[t.rank]++; });
    return c;
  }, [terms]);

  const handleStart = () => onStartQuiz({ mode, qtype, selRank });

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>用語テスト</h1></div>
        <div className="hdr-right">
          <div className="user-chip">{user?.name || '---'}</div>
          <button className="btn-back" onClick={onBack}>← 用語集</button>
        </div>
      </div>
      <div className="t-body">
        <div className="tab-bar">
          <button className={`tab ${tab === 'test' ? 'active' : ''}`} onClick={() => setTab('test')}>テスト</button>
          <button className={`tab ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')}>メンバー進捗</button>
          <button className={`tab ${tab === 'ranking' ? 'active' : ''}`} onClick={() => setTab('ranking')}>ランキング</button>
        </div>

        {tab === 'test' && (
          <div>
            <div className="t-card">
              <div className="t-card-title">モード選択</div>
              <div className="mode-grid">
                <div className={`mode-card practice ${mode === 'practice' ? 'selected' : ''}`} onClick={() => setMode('practice')}>
                  <div className="mc-icon">🌱</div><div className="mc-title">練習モード</div><div className="mc-desc">結果は保存されません</div>
                </div>
                <div className={`mode-card official ${mode === 'official' ? 'selected' : ''}`} onClick={() => setMode('official')}>
                  <div className="mc-icon">🏆</div><div className="mc-title">本番モード</div><div className="mc-desc">結果を保存・共有します</div>
                </div>
              </div>
            </div>
            <div className="t-card">
              <div className="t-card-title">出題方法</div>
              <div className="mode-grid" style={{ marginBottom: 0 }}>
                <div className={`mode-card qtype-card ${qtype === 'rank' ? 'selected' : ''}`} onClick={() => setQtype('rank')}>
                  <div className="mc-icon">🎯</div><div className="mc-title">ランク別 5問</div><div className="mc-desc">ランクを選んで出題</div>
                </div>
                <div className={`mode-card ${qtype === 'all' ? 'selected' : ''}`} onClick={() => setQtype('all')}>
                  <div className="mc-icon">🎲</div><div className="mc-title">全体 10問</div><div className="mc-desc">全ランクからランダム</div>
                </div>
              </div>
            </div>
            {qtype === 'rank' && (
              <div className="t-card">
                <div className="t-card-title">ランク選択</div>
                <div className="rank-grid">
                  {RANKS.map((r) => (
                    <div key={r} className={`rank-card ${selRank === r ? 'sel' : ''}`} data-rank={r} onClick={() => setSelRank(r)}>
                      <div className="rk-label">{r === '秀' ? '🏆' : r === '優' ? '⭐' : r === '良' ? '✅' : '📌'} {r}</div>
                      <div className="rk-cnt">{rankCounts[r]}問</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="tbtn tbtn-primary" onClick={handleStart}>テストを開始する ▶</button>
          </div>
        )}
        {tab === 'progress' && <ProgressTab results={results} />}
        {tab === 'ranking' && <RankingTab results={results} />}
      </div>
    </div>
  );
}
