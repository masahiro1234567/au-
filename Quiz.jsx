import React, { useMemo, useState } from 'react';
import AdminTermsTab from './AdminTermsTab.jsx';
import { showToast } from '../utils.js';
import { dbSet } from '../useFirebase.js';

function SummaryTab({ results }) {
  const entries = useMemo(() => {
    const users = {};
    Object.values(results || {}).forEach((r) => {
      if (!users[r.userId]) {
        users[r.userId] = {
          name: r.userName, email: r.userEmail || '', pos: r.userPos || '', cr: r.userCloserRank || '',
          off: { ts: 0, tq: 0, tc: 0 }, pra: { ts: 0, tq: 0, tc: 0 }, mistakes: {},
        };
      }
      const u = users[r.userId];
      const m = r.mode === 'official' ? u.off : u.pra;
      m.tc++; m.ts += r.score; m.tq += r.total;
      (r.detail || []).forEach((d) => { if (!d.correct) u.mistakes[d.name] = (u.mistakes[d.name] || 0) + 1; });
    });
    return Object.values(users);
  }, [results]);

  if (!entries.length) return <div className="tc ts" style={{ padding: 40 }}>データなし</div>;

  return (
    <div>
      <div className="section-title">メンバー別成績サマリー</div>
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
                <div className="admin-mc-meta">{u.email} / {u.pos || '−'} / クローザー:{u.cr || '−'}</div>
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

  return (
    <div>
      <div className="section-title">プロフィール管理</div>
      {!list.length ? (
        <div className="tc ts" style={{ padding: 40 }}>プロフィールデータなし</div>
      ) : (
        list.map(([uid, p]) => (
          <div className="admin-mc" key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="admin-mc-name">{p.name}</div>
              <div className="admin-mc-meta">{p.email || ''} / {p.pos || '−'} / クローザー:{p.closerRank || '−'}</div>
            </div>
            <button
              onClick={() => setEditUid(uid)}
              style={{ background: 'var(--pl)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--pd)', fontFamily: 'inherit' }}
            >
              変更
            </button>
          </div>
        ))
      )}
      {editUid && (
        <ProfileEditModal uid={editUid} profile={profiles[editUid]} onClose={() => setEditUid(null)} onSaved={() => setEditUid(null)} />
      )}
    </div>
  );
}

export default function Admin({ terms, results, profiles, onBack, onLogout }) {
  const [tab, setTab] = useState('summary');

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>管理者画面</h1></div>
        <div className="hdr-right">
          <button className="btn-ghost" onClick={onLogout}>ログアウト</button>
          <button className="btn-back" onClick={onBack}>← 用語集</button>
        </div>
      </div>
      <div className="t-body">
        <div className="tab-bar">
          <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>サマリー</button>
          <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>テストログ</button>
          <button className={`tab ${tab === 'terms' ? 'active' : ''}`} onClick={() => setTab('terms')}>用語管理</button>
          <button className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>プロフィール管理</button>
        </div>
        {tab === 'summary' && <SummaryTab results={results} />}
        {tab === 'log' && <LogTab results={results} />}
        {tab === 'terms' && <AdminTermsTab terms={terms} />}
        {tab === 'profile' && <ProfileTab profiles={profiles} />}
      </div>
    </div>
  );
}
