import React, { useEffect, useMemo, useState } from 'react';
import { ref, set, update, push } from 'firebase/database';
import { db as npDb } from '../nippou/lib/firebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { dbGet, dbSet, dbUpdateMany } from '../useFirebase.js';
import { RANKS, showToast } from '../utils.js';
import { normName, buildPeople, progressOf } from '../testStats.js';
import { ProgressDonut } from './TestHome.jsx';
import { RANK_COLORS } from '../utils.js';

// ===== メンバー管理（用語集と日報のユーザーをまとめて管理）=====
// 1人＝名前（スペース・全角半角の違いは無視）でまとめる
//   日報側：fp_users（ログインの名簿。権限・役職・等級・パスワード）
//   用語集側：user_profiles（テスト結果の記録用。役職・クローザーランク）
// 既存の重複は、この画面を初めて開いたときに「最新のもの」に自動で統合する（1回だけ）
const POSITIONS = ['責任者', 'MQ', 'SAM', 'IN', 'NV'];
const GRADES = ['S', 'A', 'B', 'C', 'R'];
const PERM = { edit: '編集・登録可', readonly: '閲覧のみ', disabled: 'ログイン不可', pending: '申請中' };
const PERM_CLS = { edit: 'ok', readonly: 'ro', disabled: 'ng', pending: 'pend' };
const ts = (u) => Math.max(u.lastLogin || 0, u.createdAt || 0, u.updatedAt || 0);
const fmt = (t) => { if (!t) return '－'; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// 重複を「最新のもの」に統合する更新内容を作る
function planMerge(fpUsers, profiles) {
  const npUp = {}, auUp = {};
  let pairs = 0;
  const groups = {};
  Object.entries(fpUsers || {}).forEach(([id, u]) => { if (u && u.name && !u.notDup) (groups[normName(u.name)] = groups[normName(u.name)] || []).push([id, u]); });
  Object.values(groups).filter((g) => g.length > 1).forEach((g) => {
    g.sort((a, b) => ts(b[1]) - ts(a[1]));
    const [keepId, keep] = g[0];
    const olds = g.slice(1).map((x) => x[1]);
    const approved = [keep, ...olds].find((u) => u.permission && u.permission !== 'pending');
    const pick = (k) => keep[k] || (olds.find((u) => u[k]) || {})[k];
    if (keep.permission === 'pending' && approved) npUp[`fp_users/${keepId}/permission`] = approved.permission;
    ['position', 'grade', 'email'].forEach((k) => { if (!keep[k] && pick(k)) npUp[`fp_users/${keepId}/${k}`] = pick(k); });
    // パスワードは「元のID:パスワード」で作っているので、引き継ぐときは元のID（pwSalt）も一緒に
    if (!keep.pwHash) { const src = g.slice(1).find(([, u]) => u.pwHash); if (src) { npUp[`fp_users/${keepId}/pwHash`] = src[1].pwHash; npUp[`fp_users/${keepId}/pwSalt`] = src[1].pwSalt || src[0]; } }
    g.slice(1).forEach(([id]) => { npUp[`fp_users/${id}`] = null; });
    pairs += g.length - 1;
  });
  const pg = {};
  Object.entries(profiles || {}).forEach(([id, p]) => { if (p && p.name) (pg[normName(p.name)] = pg[normName(p.name)] || []).push([id, p]); });
  Object.values(pg).filter((g) => g.length > 1).forEach((g) => {
    g.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
    const [keepId, keep] = g[0];
    const olds = g.slice(1).map((x) => x[1]);
    ['pos', 'closerRank'].forEach((k) => { if (!keep[k]) { const v = (olds.find((p) => p[k]) || {})[k]; if (v) auUp[`user_profiles/${keepId}/${k}`] = v; } });
    g.slice(1).forEach(([id]) => { auUp[`user_profiles/${id}`] = null; });
    pairs += g.length - 1;
  });
  return { npUp, auUp, pairs };
}

export default function MemberAdmin({ profiles, results, terms }) {
  const { data: fpUsers, loading } = useFirebaseList('fp_users');
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [posF, setPosF] = useState('');
  const [gradeF, setGradeF] = useState('');
  const [mergeMsg, setMergeMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [newU, setNewU] = useState({ name: '', position: 'NV', grade: 'R' });

  // 初めて開いたときに1回だけ、既存の重複を最新のものに統合
  useEffect(() => {
    if (loading || !profiles) return;
    let alive = true;
    (async () => {
      const done = await dbGet('admin_flags/memberMergeAt');
      if (done || !alive) return;
      const { npUp, auUp, pairs } = planMerge(fpUsers, profiles);
      if (Object.keys(npUp).length) await update(ref(npDb), npUp);
      if (Object.keys(auUp).length) await dbUpdateMany(auUp);
      await dbSet('admin_flags/memberMergeAt', Date.now());
      if (alive) setMergeMsg(pairs ? `重複していた${pairs}件のアカウントを、最新のものに統合しました` : '');
    })();
    return () => { alive = false; };
  }, [loading, !!profiles]);

  // 1人分にまとめた一覧
  const people = useMemo(() => buildPeople(results, profiles), [results, profiles]);
  const members = useMemo(() => {
    const map = {};
    const put = (name) => { const k = normName(name); if (!k) return null; if (!map[k]) map[k] = { key: k, name, fp: [], prof: [] }; return map[k]; };
    Object.entries(fpUsers || {}).forEach(([id, u]) => { const m = u && put(u.name); if (m) { m.fp.push([id, u]); m.name = u.name; } });
    Object.entries(profiles || {}).forEach(([id, p]) => { const m = p && put(p.name); if (m) m.prof.push([id, p]); });
    return Object.values(map).map((m) => {
      m.fp.sort((a, b) => ts(b[1]) - ts(a[1]));
      m.prof.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
      const u = m.fp[0] ? m.fp[0][1] : null;
      const p = m.prof[0] ? m.prof[0][1] : null;
      return { ...m, u, uid: m.fp[0] && m.fp[0][0], p, pid: m.prof[0] && m.prof[0][0], perm: u ? u.permission || 'edit' : 'none', dup: m.fp.length > 1 };
    }).sort((a, b) => (a.perm === 'pending' ? -1 : 0) - (b.perm === 'pending' ? -1 : 0) || a.name.localeCompare(b.name, 'ja'));
  }, [fpUsers, profiles]);
  const pairs = members.filter((m) => m.dup);
  const shown = members.filter((m) => (!q || normName(m.name).includes(normName(q))) && (!filter || m.perm === filter)
    && (!posF || (m.u?.position || '') === posF) && (!gradeF || (m.u?.grade || '') === gradeF));
  // 役職ごとに並べる：申請中 → 管理者（責任者）→ MQ → SAM → IN → NV → 未設定。同じ役職の中は等級→名前の順
  const GROUPS = [['__pending', '申請中'], ['責任者', '管理者'], ['MQ', 'MQ'], ['SAM', 'SAM'], ['IN', 'IN'], ['NV', 'NV'], ['', '役職未設定']];
  const groupOf = (m) => (m.perm === 'pending' ? '__pending' : POSITIONS.includes(m.u?.position) ? m.u.position : '');
  const gOrder = (g) => { const i = GRADES.indexOf(g); return i < 0 ? 99 : i; };
  const grouped = GROUPS.map(([k, label]) => ({ k, label, list: shown.filter((m) => groupOf(m) === k)
    .sort((a, b) => gOrder(a.u?.grade) - gOrder(b.u?.grade) || a.name.localeCompare(b.name, 'ja')) })).filter((g) => g.list.length);
  const cur = members.find((m) => m.key === sel) || null;

  // ---- 操作 ----
  const saveFp = async (patch) => {
    if (!cur || !cur.uid) return;
    const up = {};
    Object.entries(patch).forEach(([k, v]) => { up[`fp_users/${cur.uid}/${k}`] = v; });
    await update(ref(npDb), up);
    showToast('更新しました');
  };
  const saveProf = async (patch) => {
    if (!cur) return;
    const pid = cur.pid || btoa(unescape(encodeURIComponent(cur.name.trim()))).replace(/=/g, '');
    await dbUpdateMany(Object.fromEntries(Object.entries({ name: cur.name, ...patch, updatedAt: Date.now() }).map(([k, v]) => [`user_profiles/${pid}/${k}`, v])));
    showToast('更新しました');
  };
  const mergePair = async (m) => {
    const { npUp, auUp } = planMerge(Object.fromEntries(m.fp), Object.fromEntries(m.prof));
    if (Object.keys(npUp).length) await update(ref(npDb), npUp);
    if (Object.keys(auUp).length) await dbUpdateMany(auUp);
    showToast(`「${m.name}」を統合しました`);
  };
  const separate = async (m) => {
    const up = {};
    m.fp.forEach(([id]) => { up[`fp_users/${id}/notDup`] = true; });
    await update(ref(npDb), up);
    showToast('別アカウントとして残しました');
  };
  const removeMember = async () => {
    if (!cur || !window.confirm(`「${cur.name}」を名簿から削除します。ログインできなくなります（テスト結果・日報の記録は残ります）。よろしいですか？`)) return;
    const up = {};
    cur.fp.forEach(([id]) => { up[`fp_users/${id}`] = null; });
    if (Object.keys(up).length) await update(ref(npDb), up);
    const au = {};
    cur.prof.forEach(([id]) => { au[`user_profiles/${id}`] = null; });
    if (Object.keys(au).length) await dbUpdateMany(au);
    setSel(null);
    showToast('削除しました');
  };
  const addMember = async () => {
    const nm = newU.name.trim();
    if (!nm) return showToast('名前を入力してください');
    if (members.some((m) => m.key === normName(nm))) return showToast('同じ名前のメンバーがすでにいます');
    await set(push(ref(npDb, 'fp_users')), { name: nm, position: newU.position, grade: newU.grade, permission: 'edit', createdAt: Date.now() });
    setNewU({ name: '', position: 'NV', grade: 'R' }); setAdding(false);
    showToast('名簿に追加しました（初回は初回用パスワードでログインします）');
  };

  const prog = cur ? progressOf(people[cur.key], terms) : null;
  const tests = cur && people[cur.key] ? people[cur.key].tests.length : 0;

  return (
    <div className="mb">
      {mergeMsg && <div className="mb-msg">{mergeMsg}</div>}
      {pairs.length > 0 && (
        <div className="mb-dup">
          <div className="mb-dup-h"><b>重複の可能性があるユーザー</b><span className="mb-bd pend">{pairs.length}件</span></div>
          <div className="mb-note">名前が同じ（スペースや全角・半角の違いを無視）ユーザーです。「統合」で、最新のアカウントに役職・等級などを引き継いで1人分にまとめます。</div>
          {pairs.map((m) => (
            <div className="mb-dup-row" key={m.key}>
              <div><span className="mb-bd old">既存ユーザー</span> <b>{m.fp[m.fp.length - 1][1].name}</b><div className="mb-note">最終ログイン {fmt(m.fp[m.fp.length - 1][1].lastLogin)}</div></div>
              <span className="mb-arrow">→</span>
              <div><span className="mb-bd pend">重複の可能性があるユーザー</span> <b>{m.fp[0][1].name}</b><div className="mb-note">{m.fp[0][1].permission === 'pending' ? '申請中' : `最終ログイン ${fmt(m.fp[0][1].lastLogin)}`}</div></div>
              <div className="mb-dup-btns"><button className="mb-btn g" onClick={() => mergePair(m)}>統合</button><button className="mb-btn" onClick={() => separate(m)}>別アカウント</button></div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-grid">
        <div className="mb-list">
          <input className="mb-inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前で検索" aria-label="名前で検索" />
          <div className="mb-tools">
            <select className="mb-inp" value={posF} onChange={(e) => setPosF(e.target.value)} aria-label="役職で絞り込み">
              <option value="">役職：すべて</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p === '責任者' ? '管理者（責任者）' : p}</option>)}
            </select>
            <select className="mb-inp" value={gradeF} onChange={(e) => setGradeF(e.target.value)} aria-label="等級で絞り込み">
              <option value="">等級：すべて</option>
              {GRADES.map((g) => <option key={g} value={g}>等級{g}</option>)}
            </select>
            <select className="mb-inp" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="権限で絞り込み">
              <option value="">権限：すべて</option>
              {Object.entries(PERM).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <button className="mb-btn" style={{ width: '100%' }} onClick={() => setAdding(!adding)}>＋ メンバーを名簿に追加</button>
          {adding && (
            <div className="mb-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="mb-inp" value={newU.name} onChange={(e) => setNewU({ ...newU, name: e.target.value })} placeholder="名前" aria-label="名前" />
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="mb-inp" value={newU.position} onChange={(e) => setNewU({ ...newU, position: e.target.value })} aria-label="役職">{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select>
                <select className="mb-inp" value={newU.grade} onChange={(e) => setNewU({ ...newU, grade: e.target.value })} aria-label="等級">{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
              </div>
              <button className="mb-btn g" onClick={addMember}>追加する</button>
            </div>
          )}
          {loading && <div className="mb-note" style={{ padding: 20, textAlign: 'center' }}>読み込み中…</div>}
          {!loading && !grouped.length && <div className="mb-note" style={{ padding: 20, textAlign: 'center' }}>当てはまるメンバーがいません</div>}
          {grouped.map((g) => (
            <React.Fragment key={g.k || 'none'}>
              <div className="mb-group"><span>{g.label}</span><i />{g.list.length}人</div>
              {g.list.map((m) => (
            <button key={m.key} className={`mb-row ${sel === m.key ? 'on' : ''} ${m.perm === 'pending' ? 'pending' : ''}`} onClick={() => setSel(m.key)}>
              <span className="mb-av">{m.name.slice(0, 1)}</span>
              <span className="mb-row-main"><b>{m.name}</b>
                <span className="mb-badges">
                  {m.u?.position && <span className="mb-bd pos">{m.u.position}</span>}
                  {m.u?.grade && <span className="mb-bd gr">等級{m.u.grade}</span>}
                  {m.perm === 'none' ? <span className="mb-bd old">名簿に未登録</span> : <span className={`mb-bd ${PERM_CLS[m.perm] || 'ok'}`}>{PERM[m.perm] || PERM.edit}</span>}
                </span>
              </span>
              <span className="mb-sub">›</span>
            </button>
              ))}
            </React.Fragment>
          ))}
        </div>

        <div className="mb-card mb-detail">
          {!cur && <div className="mb-note" style={{ textAlign: 'center', padding: '60px 0' }}>左の名簿から名前を選ぶと、ここに詳細が出ます</div>}
          {cur && (<>
            <div className="mb-d-head">
              <span className="mb-av big">{cur.name.slice(0, 1)}</span>
              <div className="mb-grow"><b style={{ fontSize: '1.1rem' }}>{cur.name}</b><div className="mb-note">最終ログイン {fmt(cur.u?.lastLogin)}</div></div>
              <button className="mb-btn mb-close" onClick={() => setSel(null)} aria-label="閉じる">×</button>
            </div>
            <div className="mb-lbl">用語集テストの進捗</div>
            <div className="mb-d-prog">
              <ProgressDonut prog={prog} size={120} />
              <div className="mb-legend">
                {RANKS.map((r) => <div key={r}><i style={{ background: RANK_COLORS[r] }} /><b style={{ color: RANK_COLORS[r] }}>{r}</b><span>{prog.byRank[r].done}語（全{prog.byRank[r].total}語）</span></div>)}
                <div className="mb-note">テスト {tests}回・正解できた用語 {prog.done} / {prog.total}語</div>
              </div>
            </div>
            <div className="mb-sep" />
            {cur.perm === 'none' ? (
              <div className="mb-note">このメンバーは日報の名簿（ログインの名簿）に登録されていません。テストの記録だけが残っています。</div>
            ) : (<>
              <div className="mb-fields">
                <label>役職<select className="mb-inp" value={cur.u?.position || ''} onChange={(e) => { saveFp({ position: e.target.value }); saveProf({ pos: e.target.value }); }}><option value="">－</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
                <label>等級<select className="mb-inp" value={cur.u?.grade || ''} onChange={(e) => saveFp({ grade: e.target.value })}><option value="">－</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select></label>
                <label>クローザーランク<select className="mb-inp" value={cur.p?.closerRank || ''} onChange={(e) => saveProf({ closerRank: e.target.value })}><option value="">－</option>{RANKS.map((r) => <option key={r}>{r}</option>)}</select></label>
              </div>
              {cur.perm === 'pending' ? (
                <div className="mb-btns">
                  <button className="mb-btn g" onClick={() => saveFp({ permission: 'edit', approvedAt: Date.now() })}>承認して登録</button>
                  <button className="mb-btn ng" onClick={() => saveFp({ permission: 'disabled' })}>拒否</button>
                </div>
              ) : (
                <div className="mb-btns">
                  <button className={`mb-btn ${cur.perm === 'edit' ? 'on' : ''}`} onClick={() => saveFp({ permission: 'edit' })}>編集可</button>
                  <button className={`mb-btn ${cur.perm === 'readonly' ? 'on' : ''}`} onClick={() => saveFp({ permission: 'readonly' })}>閲覧のみ</button>
                  <button className={`mb-btn ng ${cur.perm === 'disabled' ? 'on' : ''}`} onClick={() => saveFp({ permission: 'disabled' })}>ログイン不可</button>
                  <button className="mb-btn" onClick={() => saveFp({ pwHash: null, pwSalt: null })}>{cur.u?.pwHash ? 'パスワードを初期化' : '初期パスワードのまま'}</button>
                </div>
              )}
            </>)}
            <div className="mb-sep" />
            <button className="mb-btn ng" onClick={removeMember}>このメンバーを削除</button>
          </>)}
        </div>
      </div>
    </div>
  );
}
