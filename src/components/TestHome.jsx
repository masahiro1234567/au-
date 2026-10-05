import { ManualButton } from '../manual/Manual.jsx';
import React, { useMemo, useState } from 'react';
import { RANK_COLORS, RANKS, esc } from '../utils.js';
import { buildPeople, progressOf, weeklyRanking, weekRange, normName } from '../testStats.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { keepPlace } from '../keepPlace.js';

// 進捗の円グラフ：円全体＝全用語。正解できた用語をランクごとの色で順に並べ、残りは薄いグレー
export function ProgressDonut({ prog, size = 110 }) {
  const C = 2 * Math.PI * 34;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r="34" fill="none" stroke="#f1ebe5" strokeWidth="10" />
      {RANKS.map((r) => {
        const len = prog.total ? (C * prog.byRank[r].done) / prog.total : 0;
        const el = <circle key={r} cx="42" cy="42" r="34" fill="none" stroke={RANK_COLORS[r]} strokeWidth="10" strokeDasharray={`${len} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 42 42)" />;
        acc += len;
        return el;
      })}
      <text x="42" y="46" textAnchor="middle" fontSize="16" fontWeight="900" fill="#1a0f08">{prog.pct}%</text>
      <text x="42" y="58" textAnchor="middle" fontSize="7" fill="#8a5d45">進捗</text>
    </svg>
  );
}
function Legend({ prog }) {
  return (
    <div className="tq-legend">
      {RANKS.map((r) => (
        <div key={r}><i style={{ background: RANK_COLORS[r] }} /><b style={{ color: RANK_COLORS[r] }}>{r}</b><span>{prog.byRank[r].done}語（全{prog.byRank[r].total}語）</span></div>
      ))}
      <div className="rest"><i />まだ正解していない {prog.total - prog.done}語</div>
    </div>
  );
}

// メンバー進捗：名簿が並び、名前を押すとその下に円グラフが開く
const POS_GROUPS = [['責任者', '管理者'], ['MQ', 'MQ'], ['SAM', 'SAM'], ['IN', 'IN'], ['NV', 'NV'], ['', '役職未設定']];
function ProgressTab({ people, terms }) {
  // 役職はメンバー管理（日報の名簿）のものを使う。名簿に無い人は用語集のプロフィールの役職
  const { data: fpUsers } = useFirebaseList('fp_users');
  const posOf = useMemo(() => {
    const m = {};
    Object.values(fpUsers || {}).forEach((u) => { if (u && u.name && u.permission !== 'pending') m[normName(u.name)] = u.position || ''; });
    return m;
  }, [fpUsers]);
  const [open, setOpen] = useState(null);
  const all = { ...people };
  Object.values(fpUsers || {}).forEach((u) => {
    if (!u || !u.name || u.permission === 'pending' || u.permission === 'disabled') return;
    const k = normName(u.name);
    if (!all[k]) all[k] = { key: k, name: u.name, pos: u.position || '', tests: [], firstCorrect: {} };
  });
  const list = Object.values(all).map((u) => ({ ...u, position: posOf[u.key] !== undefined ? posOf[u.key] : u.pos || '' }));
  if (!list.length) return <div className="tc ts" style={{ padding: 40 }}>まだメンバーがいません</div>;
  const known = POS_GROUPS.map(([k]) => k);
  const groups = POS_GROUPS.map(([k, label]) => ({ k, label, list: list.filter((u) => (known.includes(u.position) ? u.position : '') === k).sort((a, b) => a.name.localeCompare(b.name, 'ja')) })).filter((g) => g.list.length);
  return (
    <div className="tq-stack" style={{ gap: 8 }}>
      <div className="tq-note" style={{ marginTop: 0 }}>名前を押すと、その人の進捗が開きます</div>
      {groups.map((g) => (
        <React.Fragment key={g.k || 'none'}>
          <div className="mb-group"><span>{g.label}</span><i />{g.list.length}人</div>
          {g.list.map((u) => {
            const on = open === u.key;
            const prog = progressOf(u, terms);
            return (
              <div key={u.key} className="tq-memwrap">
                <button className={`tq-mem ${on ? 'on' : ''}`} onClick={(e) => keepPlace(e.currentTarget, () => setOpen(on ? null : u.key))} aria-expanded={on}>
                  <span className="tq-av">{(u.name || '?').slice(0, 1)}</span>
                  <span className="tq-grow"><b>{u.name}</b></span>
                  <span className="tq-sub" style={{ fontWeight: 800, color: 'var(--pd)' }}>{prog.pct}%</span>
                  <span className="tq-sub">{on ? '▲' : '▼'}</span>
                </button>
                {on && (
                  <div className="tq-card">
                    <div className="tq-donut-row"><ProgressDonut prog={prog} size={120} /><Legend prog={prog} /></div>
                    <div className="tq-sub" style={{ marginTop: 10 }}>正解できた用語 {prog.done} / {prog.total}語・テスト {u.tests.length}回</div>
                  </div>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ランキング：今週／先週（月〜日）×「ログイン」「テスト」「進捗」
const AXES = [['login', 'ログイン', '日', 'au naviを開いた日数（1日1回まで）'], ['test', 'テスト', '回', 'テストを最後まで解いた回数'], ['prog', '進捗', '語', 'その週に新しく正解できた用語の数']];
function RankingTab({ people, activity, user }) {
  const [week, setWeek] = useState(0);
  const [axis, setAxis] = useState('login');
  const rows = useMemo(() => weeklyRanking(people, activity, week), [people, activity, week]);
  const ax = AXES.find((a) => a[0] === axis);
  const sorted = [...rows].filter((r) => r[axis] > 0).sort((a, b) => b[axis] - a[axis] || a.name.localeCompare(b.name, 'ja'));
  const meKey = normName(user?.name);
  const meIdx = sorted.findIndex((r) => r.key === meKey);
  const me = rows.find((r) => r.key === meKey);
  // 同じ数なら同じ順位
  let lastVal = null, lastNo = 0;
  const ranked = sorted.map((r, i) => { const no = r[axis] === lastVal ? lastNo : i + 1; lastVal = r[axis]; lastNo = no; return { ...r, no }; });
  return (
    <div className="tq-stack">
      <div className="tq-seg">
        <button className={week === 0 ? 'on' : ''} onClick={() => setWeek(0)}>今週</button>
        <button className={week === -1 ? 'on' : ''} onClick={() => setWeek(-1)}>先週</button>
      </div>
      <div className="tq-sub" style={{ textAlign: 'center', marginTop: -4 }}>{weekRange(week).label}</div>
      <div className="tq-seg three">
        {AXES.map(([k, l]) => <button key={k} className={axis === k ? 'on' : ''} onClick={() => setAxis(k)}>{l}</button>)}
      </div>
      <div className="tq-note" style={{ marginTop: -4 }}>{ax[3]}</div>
      <div className="tq-card" style={{ padding: '4px 14px' }}>
        {!ranked.length && <div className="tq-sub" style={{ textAlign: 'center', padding: 20 }}>この週のデータはまだありません</div>}
        {ranked.map((r) => (
          <div key={r.key} className={`tq-row tq-rank-row ${r.key === meKey ? 'me' : ''}`}>
            <b className="tq-no">{r.no}</b><span className="tq-grow">{r.name}</span><b>{r[axis]}</b><span className="tq-sub" style={{ width: 22 }}>{ax[2]}</span>
          </div>
        ))}
      </div>
      {user && (
        <div className="tq-card tq-me">
          <span className="tq-pill">あなた</span>
          <span className="tq-grow">{meIdx >= 0 ? `${ranked[meIdx].no}位` : 'まだランク外'}</span>
          <b>{me ? me[axis] : 0}{ax[2]}</b>
        </div>
      )}
    </div>
  );
}

export default function TestHome({ user, terms, results, profiles, activity, onBack, onStartQuiz }) {
  const [tab, setTab] = useState('test');
  const [qtype, setQtype] = useState('rank'); // rank / all / notyet
  const [selRank, setSelRank] = useState('秀');
  const people = useMemo(() => buildPeople(results, profiles), [results, profiles]);
  const mePerson = people[normName(user?.name)] || null;
  const myProg = useMemo(() => progressOf(mePerson, terms), [mePerson, terms]);
  const rankCounts = useMemo(() => {
    const c = {};
    RANKS.forEach((r) => { c[r] = Object.values(terms || {}).filter((t) => t.rank === r).length; });
    return c;
  }, [terms]);
  const rank = qtype !== 'notyet' && selRank === 'すべて' ? '秀' : selRank;
  const left = (r) => (r === 'すべて' ? myProg.total - myProg.done : myProg.byRank[r].total - myProg.byRank[r].done);
  const mastered = useMemo(() => new Set(Object.keys((mePerson && mePerson.firstCorrect) || {})), [mePerson]);
  const handleStart = () => onStartQuiz({ mode: 'official', qtype, selRank: rank, mastered });
  const last = mePerson && mePerson.tests.length ? mePerson.tests[mePerson.tests.length - 1] : null;
  const fmt = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const rankOpts = qtype === 'notyet' ? [...RANKS, 'すべて'] : RANKS;

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>テスト</h1></div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← ホーム</button><ManualButton screen="test" /></div>
      </div>
      <div className="tq-tabs">
        {[['test', 'テスト'], ['progress', 'メンバー進捗'], ['ranking', 'ランキング']].map(([k, l]) => (
          <button key={k} className={`tq-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="t-body tq-body">
        {tab === 'test' && (
          <div className="tq-stack">
            <div className="tq-card tq-donut-row">
              <ProgressDonut prog={myProg} size={96} />
              <div className="tq-grow">
                <div className="tq-lbl" style={{ marginBottom: 4 }}>自分の進捗</div>
                <div style={{ fontSize: '.84rem' }}>全{myProg.total}語のうち <b style={{ color: 'var(--pd)' }}>{myProg.done}語</b> に正解</div>
                <div className="tq-chips">{RANKS.map((r) => <span key={r}><i style={{ background: RANK_COLORS[r] }} />{r} {myProg.byRank[r].done}</span>)}</div>
              </div>
            </div>
            <div className="tq-card">
              <div className="tq-lbl">出題範囲</div>
              <div className="tq-seg three">
                <button className={qtype === 'rank' ? 'on' : ''} onClick={() => setQtype('rank')}>ランク別</button>
                <button className={qtype === 'all' ? 'on' : ''} onClick={() => setQtype('all')}>全範囲</button>
                <button className={qtype === 'notyet' ? 'on' : ''} onClick={() => setQtype('notyet')}>未出題</button>
              </div>
              {qtype !== 'all' && (
                <div className={`tq-ranks ${qtype === 'notyet' ? 'five' : ''}`}>
                  {rankOpts.map((r) => (
                    <button key={r} className={`tq-rank ${rank === r ? 'on' : ''}`} onClick={() => setSelRank(r)} aria-pressed={rank === r}>
                      <b style={{ color: RANK_COLORS[r] || 'var(--pd)', fontSize: r === 'すべて' ? '.86rem' : undefined }}>{r}</b>
                      <small>{qtype === 'notyet' ? `残り${left(r)}語` : `${rankCounts[r]}語`}</small>
                    </button>
                  ))}
                </div>
              )}
              <div className="tq-note">
                {qtype === 'rank' && `${rank}ランクの用語から5問。説明を読んで用語を選ぶ問題が中心です。`}
                {qtype === 'all' && 'すべての用語から10問出題します。'}
                {qtype === 'notyet' && `${rank === 'すべて' ? 'すべてのランク' : rank + 'ランク'}の、まだ正解していない用語（残り${left(rank)}語）から5問。正解すると進捗が進みます。`}
              </div>
            </div>
            <button className="tq-go" onClick={handleStart} disabled={qtype === 'notyet' && left(rank) === 0}>
              {qtype === 'notyet' && left(rank) === 0 ? 'このランクはすべて正解済みです' : 'テストをはじめる'}
            </button>
            {last && (
              <div className="tq-card" style={{ padding: '12px 14px' }}>
                <div className="tq-lbl" style={{ marginBottom: 4 }}>前回のテスト</div>
                <div className="tq-last"><span className="tq-pill">{last.rank === 'all' ? '全範囲' : last.rank}</span><span className="tq-grow tq-sub">{fmt(last.createdAt)}</span><b>{last.score} / {last.total}</b></div>
              </div>
            )}
          </div>
        )}
        {tab === 'progress' && <ProgressTab people={people} terms={terms} />}
        {tab === 'ranking' && <RankingTab people={people} activity={activity} user={user} />}
      </div>
    </div>
  );
}
