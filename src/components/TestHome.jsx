import React, { useMemo, useState } from 'react';
import { RANK_COLORS, RANKS, esc } from '../utils.js';
import { MarkNg } from './TestMarks.jsx';

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
    <div className="tq-stack">
      {entries.map((u, i) => {
        const ov = u.tq > 0 ? Math.round((u.ts / u.tq) * 100) : 0;
        const topM = Object.entries(u.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return (
          <div className="tq-card" key={i}>
            <div className="tq-mem-top"><b>{u.name}</b><strong>{ov}%</strong></div>
            <div className="tq-mem-meta">{u.pos}{u.cr ? '・' + u.cr : ''}{(u.pos || u.cr) ? '・' : ''}本番{u.tests}回</div>
            <div className="tq-rankbars">
              {RANKS.map((r) => {
                const d = u.byRank[r];
                if (!d || d.t === 0) return null;
                const p = Math.round((d.s / d.t) * 100);
                return (
                  <div className="tq-rankbar" key={r}>
                    <b style={{ color: RANK_COLORS[r] }}>{r}</b>
                    <div className="tq-bar"><i style={{ width: `${p}%` }} /></div>
                    <span>{p}%</span>
                  </div>
                );
              })}
            </div>
            {topM.length > 0 && (<>
              <div className="tq-lbl" style={{ margin: '12px 0 2px' }}>よく間違える用語</div>
              {topM.map(([n, cnt]) => (
                <div className="tq-row" key={n}><MarkNg size={18} /><span className="tq-grow">{n}</span><span className="tq-sub">{cnt}回</span></div>
              ))}
            </>)}
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
  return (
    <div className="tq-card">
      <div className="tq-lbl" style={{ marginBottom: 0 }}>ランキング（本番の正答率）</div>
      {sorted.map((u, i) => (
        <div className="tq-row" key={i}>
          <b className="tq-no">{i + 1}</b>
          <span className="tq-grow"><b style={{ fontWeight: 700 }}>{u.name}</b><span className="tq-sub" style={{ display: 'block' }}>{u.pos}{u.cr ? '・' + u.cr : ''}{(u.pos || u.cr) ? '・' : ''}{u.tq}問回答</span></span>
          <b>{Math.round((u.ts / u.tq) * 100)}%</b>
        </div>
      ))}
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
  // 前回の本番の結果
  const last = useMemo(() => Object.values(results || {}).filter((r) => r && r.mode === 'official' && user && r.userId === user.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0], [results, user]);
  const fmt = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>テスト</h1></div>
        <div className="hdr-right">
          <button className="btn-back" onClick={onBack}>← ホーム</button>
        </div>
      </div>
      <div className="tq-tabs">
        {[['test', 'テスト'], ['progress', 'メンバー進捗'], ['ranking', 'ランキング']].map(([k, l]) => (
          <button key={k} className={`tq-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="t-body tq-body">
        {tab === 'test' && (
          <div className="tq-stack">
            <div className="tq-card">
              <div className="tq-lbl">モード</div>
              <div className="tq-seg">
                <button className={mode === 'practice' ? 'on' : ''} onClick={() => setMode('practice')}>練習</button>
                <button className={mode === 'official' ? 'on' : ''} onClick={() => setMode('official')}>本番</button>
              </div>
              <div className="tq-note">{mode === 'practice' ? '結果は保存されません。何度でも練習できます。' : '結果を保存して、メンバー進捗とランキングに反映します。'}</div>
            </div>
            <div className="tq-card">
              <div className="tq-lbl">出題範囲</div>
              <div className="tq-seg">
                <button className={qtype === 'rank' ? 'on' : ''} onClick={() => setQtype('rank')}>ランク別（5問）</button>
                <button className={qtype === 'all' ? 'on' : ''} onClick={() => setQtype('all')}>全範囲（10問）</button>
              </div>
              {qtype === 'rank' && (
                <div className="tq-ranks">
                  {RANKS.map((r) => (
                    <button key={r} className={`tq-rank ${selRank === r ? 'on' : ''}`} onClick={() => setSelRank(r)} aria-pressed={selRank === r}>
                      <b style={{ color: RANK_COLORS[r] }}>{r}</b><small>{rankCounts[r]}語</small>
                    </button>
                  ))}
                </div>
              )}
              <div className="tq-note">{qtype === 'rank' ? `${selRank}ランクの用語から5問。説明を読んで用語を選ぶ問題が中心です。` : 'すべての用語から10問出題します。'}</div>
            </div>
            <button className="tq-go" onClick={handleStart}>テストをはじめる</button>
            {last && (
              <div className="tq-card" style={{ padding: '12px 14px' }}>
                <div className="tq-lbl" style={{ marginBottom: 4 }}>前回の本番</div>
                <div className="tq-last"><span className="tq-pill">{last.rank === 'all' ? '全範囲' : last.rank}</span><span className="tq-grow tq-sub">{fmt(last.createdAt)}</span><b>{last.score} / {last.total}</b></div>
              </div>
            )}
          </div>
        )}
        {tab === 'progress' && <ProgressTab results={results} />}
        {tab === 'ranking' && <RankingTab results={results} />}
      </div>
    </div>
  );
}
