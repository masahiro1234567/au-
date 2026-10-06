import AdminManualTab from '../manual/AdminManualTab.jsx';
import AdminRTest from '../rtest/AdminRTest.jsx';
import AdminTermRequests from '../bravepost/AdminTermRequests.jsx';
import { useDbCollection } from '../useFirebase.js';
import { ManualButton } from '../manual/Manual.jsx';
import AdminDevicesTab from './AdminDevicesTab.jsx';
import AdminOreTabTab from './AdminOreTabTab.jsx';
import MemberAdmin from './MemberAdmin.jsx';
import EvalPage from './EvalPage.jsx';
import React, { useMemo, useState } from 'react';
import AdminTermsTab from './AdminTermsTab.jsx';
import AdminKnowledgeTab from './AdminKnowledgeTab.jsx';
import { showToast } from '../utils.js';
import { dbSet, dbRemove } from '../useFirebase.js';
import { ConfirmButton } from './ConfirmButton.jsx';
// 日報管理（日報アプリの管理画面）は開いたときだけ読み込む
const NippouAdmin = React.lazy(() => import('../nippou/NippouApp.jsx').then((m) => ({ default: m.NippouAdmin })));

function SummaryTab({ results }) {
  const entries = useMemo(() => {
    const users = {};
    Object.values(results || {}).forEach((r) => {
      const uk = String(r.userName || r.userId || '').normalize('NFKC').replace(/[\s　]/g, '');
      if (!users[uk]) {
        users[uk] = {
          name: r.userName, email: r.userEmail || '', pos: r.userPos || '', cr: r.userCloserRank || '',
          off: { ts: 0, tq: 0, tc: 0 }, pra: { ts: 0, tq: 0, tc: 0 }, mistakes: {},
        };
      }
      const u = users[uk];
      const m = r.mode === 'official' ? u.off : u.pra;
      m.tc++; m.ts += r.score; m.tq += r.total;
      (r.detail || []).forEach((d) => { if (!d.correct) u.mistakes[d.name] = (u.mistakes[d.name] || 0) + 1; });
    });
    return Object.values(users);
  }, [results]);

  const resetAll = async () => {
    if (!window.confirm('テストの記録をすべて消して、今日から記録し直します。\nサマリー・テストログ・メンバー進捗・ランキングの「テスト」「進捗」がすべて0から始まります。よろしいですか？')) return;
    if (!window.confirm('この操作は戻せません。本当にリセットしますか？')) return;
    await dbRemove('test_results');
    await dbSet('admin_flags/testResetAt', Date.now());
    showToast('テストの記録をリセットしました');
  };
  const resetBtn = <button className="btn-ghost" style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={resetAll}>テストの記録をすべてリセット</button>;
  if (!entries.length) return <div className="tc ts" style={{ padding: 40 }}>データなし（テストの記録はまだありません）</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><div className="section-title" style={{ flex: 1, margin: 0 }}>メンバー別成績サマリー</div>{resetBtn}</div>
      {entries.map((u, i) => {
        const opct = u.off.tq > 0 ? Math.round((u.off.ts / u.off.tq) * 100) : null;
        const ppct = u.pra.tq > 0 ? Math.round((u.pra.ts / u.pra.tq) * 100) : null;
        const cls = opct !== null ? (opct >= 80 ? 'score-high' : opct >= 60 ? 'score-mid' : 'score-low') : '';
        const topM = Object.entries(u.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 3);
        return (
          <div className="admin-mc" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div className="admin-mc-name">{u.name}</div>
                <div className="admin-mc-meta">{u.email ? `${u.email} / ` : ''}{u.pos || '−'} / クローザー:{u.cr || '−'}</div>
              </div>
              {opct !== null && <span className={`score-chip ${cls}`}>{opct}%</span>}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--sub)', marginBottom: 5 }}>
              本番:{u.off.tc}回{ppct !== null ? ` (${ppct}%)` : ''} / 練習:{u.pra.tc}回
            </div>
            {topM.length > 0 && (
              <>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--sub)', marginBottom: 4 }}>苦手な問題</div>
                <div className="wrong-pills">
                  {topM.map(([n, cnt]) => <span className="wrong-pill" key={n}>{n} {cnt}回</span>)}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LogTab({ results }) {
  const rows = useMemo(() =>
    Object.values(results || {}).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100), [results]);

  if (!rows.length) {
    return (
      <div>
        <div className="section-title">テストログ（練習・本番すべて）</div>
        <div className="tc ts" style={{ padding: 14 }}>データなし</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">テストログ（練習・本番すべて）</div>
      <div className="tbl-wrap">
        <table className="admin-table">
          <thead><tr><th>日時</th><th>名前</th><th>モード</th><th>種別</th><th>スコア</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const dt = new Date(r.createdAt);
              const ds = `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
              const tp = r.qtype === 'rank' ? `ランク${r.rank}` : '全体';
              const pct = Math.round((r.score / r.total) * 100);
              const cls = pct >= 80 ? 'score-high' : pct >= 60 ? 'score-mid' : 'score-low';
              return (
                <tr key={i}>
                  <td>{ds}</td>
                  <td>{r.userName}</td>
                  <td>
                    {r.mode === 'practice'
                      ? <span style={{ background: '#d1fae5', color: '#059669', padding: '1px 5px', borderRadius: 9, fontSize: '.62rem', fontWeight: 700 }}>練習</span>
                      : <span style={{ background: '#fff2ea', color: '#cc4f00', padding: '1px 5px', borderRadius: 9, fontSize: '.62rem', fontWeight: 700 }}>本番</span>}
                  </td>
                  <td>{tp}</td>
                  <td><span className={`score-chip ${cls}`}>{r.score}/{r.total}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const POSITIONS = ['NV', 'IN', 'SAM', 'MQ'];
const RANKS = ['秀', '優', '良', '可'];

function ProfileEditModal({ uid, profile, onClose, onSaved }) {
  const [pos, setPos] = useState(profile?.pos || '');
  const [closerRank, setCloserRank] = useState(profile?.closerRank || '');

  const save = async () => {
    if (!pos || !closerRank) return showToast('役職とランクを選択してください');
    try {
      await dbSet('user_profiles/' + uid, { ...profile, pos, closerRank, updatedAt: Date.now() });
      showToast('✅ プロフィールを更新しました');
      onSaved?.();
    } catch (e) { showToast('エラー:' + e.message); }
  };

  return (
    <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-hdr"><h3>プロフィール変更</h3><button className="btn-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ fontSize: '.83rem', fontWeight: 700, marginBottom: 11 }}>{profile?.name}</div>
          <div className="form-group">
            <label>役職</label>
            <div className="pos-select-row">
              {POSITIONS.map((p) => (
                <div className="pos-opt" key={p}>
                  <input type="radio" id={`pe-${p}`} checked={pos === p} onChange={() => setPos(p)} />
                  <label htmlFor={`pe-${p}`}>{p}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>クローザーランク</label>
            <div className="rank-select-row">
              {RANKS.map((r) => (
                <div className="rank-opt" data-rank={r} key={r}>
                  <input type="radio" id={`pe-r${r}`} checked={closerRank === r} onChange={() => setCloserRank(r)} />
                  <label htmlFor={`pe-r${r}`}>{r}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="mbtn mbtn-cancel" onClick={onClose}>キャンセル</button>
          <button className="mbtn mbtn-primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profiles }) {
  const [editUid, setEditUid] = useState(null);
  const list = Object.entries(profiles || {});

  const del = async (uid) => {
    try {
      await dbRemove('user_profiles/' + uid);
      showToast('🗑 削除しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  return (
    <div>
      <div className="section-title">プロフィール管理</div>
      {!list.length ? (
        <div className="tc ts" style={{ padding: 40 }}>プロフィールデータなし</div>
      ) : (
        list.map(([uid, p]) => (
          <div className="admin-mc" key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div className="admin-mc-name">{p.name}</div>
              <div className="admin-mc-meta">{p.email ? `${p.email} / ` : ''}{p.pos || '−'} / クローザー:{p.closerRank || '−'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => setEditUid(uid)}
                style={{ background: 'var(--pl)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--pd)', fontFamily: 'inherit' }}
              >
                変更
              </button>
              <ConfirmButton
                label="削除"
                message={`「${p.name}」を削除しますか？（テスト結果のログは残ります）`}
                onConfirm={() => del(uid)}
                style={{ background: '#fee2e2', border: '1.5px solid #fecaca', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: '#dc2626', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        ))
      )}
      {editUid && (
        <ProfileEditModal uid={editUid} profile={profiles[editUid]} onClose={() => setEditUid(null)} onSaved={() => setEditUid(null)} />
      )}
    </div>
  );
}

export default function Admin({ terms, ghostIds, results, profiles, knowledgeTypes, devices, payConfig, user, flags, onBack, onLogout, onOpenEval }) {
  const flagCount = Object.entries(flags || {}).filter(([id, f]) => f && f.active && terms[id]).length;
  const [tab, setTab] = useState('summary');
  // 日報管理（日報アプリの管理画面）と用語集管理を切り替える。最初は日報管理
  const [area, setArea] = useState('nippou');
  // Brave X から届いた、用語集への追加の申請（確認待ちの件数をタブに出す）
  const [termReqs] = useDbCollection('bp_term_requests');
  const reqCount = Object.values(termReqs || {}).filter((r) => r && r.name && (r.status || 'pending') === 'pending').length;

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>管理者画面</h1></div>
        <div className="hdr-right">
          <button className="btn-ghost" onClick={onLogout}>ログアウト</button>
          <button className="btn-back" onClick={onBack}>← ホーム</button>
          <ManualButton screen={`admin_${area === 'member' ? 'member' : area}`} />
        </div>
      </div>
      <div className="t-body">
        {flagCount > 0 && (
          <button className="tn-admin-alert" onClick={() => { setArea('glossary'); setTab('knowledge'); }}>
            <span className="tn-dot red" style={{ margin: 0 }} />変更が必要と報告された用語が{flagCount}件あります<span style={{ marginLeft: 'auto' }}>確認する ›</span>
          </button>
        )}
        <div className="tab-bar adm-top">
          <button className={`tab ${area === 'nippou' ? 'active' : ''}`} onClick={() => setArea('nippou')}>日報管理</button>
          <button className={`tab ${area === 'glossary' ? 'active' : ''}`} onClick={() => setArea('glossary')}>用語集管理{flagCount + reqCount > 0 && <span className="tn-badge red">{flagCount + reqCount}</span>}</button>
          <button className={`tab ${area === 'member' ? 'active' : ''}`} onClick={() => setArea('member')}>メンバー管理</button>
          <button className={`tab ${area === 'eval' ? 'active' : ''}`} onClick={() => setArea('eval')}>評価一覧</button>
          <button className={`tab ${area === 'rtest' ? 'active' : ''}`} onClick={() => setArea('rtest')}>定期テスト</button>
          <button className={`tab ${area === 'manual' ? 'active' : ''}`} onClick={() => setArea('manual')}>マニュアル</button>
        </div>
        {area === 'manual' && <AdminManualTab user={user} />}
        {area === 'rtest' && <AdminRTest user={user} />}
        {area === 'member' && <MemberAdmin profiles={profiles} results={results} terms={terms} />}
        {area === 'eval' && <EvalPage embedded isAdmin user={user} />}
        {area === 'nippou' && <React.Suspense fallback={<div className="loading"><div className="spinner" /></div>}><NippouAdmin user={user} /></React.Suspense>}
        {area === 'glossary' && <>
        <div className="tab-bar">
          <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>サマリー</button>
          <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>テストログ</button>
          <button className={`tab ${tab === 'terms' ? 'active' : ''}`} onClick={() => setTab('terms')}>用語追加</button>
          <button className={`tab ${tab === 'knowledge' ? 'active' : ''}`} onClick={() => setTab('knowledge')}>用語管理{flagCount > 0 && <span className="tn-badge red">{flagCount}</span>}</button>
          <button className={`tab ${tab === 'devices' ? 'active' : ''}`} onClick={() => setTab('devices')}>機種比較</button>
          <button className={`tab ${tab === 'oretab' ? 'active' : ''}`} onClick={() => setTab('oretab')}>オレタブ設定</button>
          <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>用語の申請{reqCount > 0 && <span className="tn-badge red">{reqCount}</span>}</button>
        </div>
        {tab === 'summary' && <SummaryTab results={results} />}
        {tab === 'log' && <LogTab results={results} />}
        {tab === 'terms' && <AdminTermsTab terms={terms} ghostIds={ghostIds} knowledgeTypes={knowledgeTypes} />}
        {tab === 'knowledge' && <AdminKnowledgeTab terms={terms} knowledgeTypes={knowledgeTypes} flags={flags} />}
        {tab === 'devices' && <AdminDevicesTab devices={devices} />}
        {tab === 'oretab' && <AdminOreTabTab payConfig={payConfig} />}
        {tab === 'requests' && <AdminTermRequests terms={terms} knowledgeTypes={knowledgeTypes} user={user} />}
        </>}
      </div>
    </div>
  );
}
