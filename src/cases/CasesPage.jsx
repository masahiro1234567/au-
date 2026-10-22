import React, { useMemo, useState } from 'react';
import { useDbCollection, dbPush, dbSet, dbRemove } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { ManualButton } from '../manual/Manual.jsx';
import { AutoTA } from '../components/EvalEditors.jsx';

// ===== 獲得例蓄積（SAM・管理者だけが見る・書く）=====
// 保存場所（au-data-base）：case_examples/{id} = { ...項目, by, uid, at, editedAt }
// 項目は FORM の並び。key：保存名、label：表示、area：複数行、req：必須
export const FORM = [
  ['基本', [
    { key: 'title', label: 'タイトル', req: true, ph: '例：家族に相談すると言われたけど、その場で決まった' },
    { key: 'week', label: '日付・週', ph: '例：10月第1週' },
    { key: 'channel', label: '販路', ph: '例：家電量販店／ショップ／イベント' },
    { key: 'role', label: '自分の役割', ph: 'クローズ／キャッチ／ディレクター' },
  ]],
  ['お客様の設定', [
    { key: 'age', label: '年代・性別', ph: '例：40代・女性' },
    { key: 'family', label: '家族構成', ph: '例：夫婦＋子ども2人' },
    { key: 'carrier', label: '今のキャリア・プラン', ph: '例：ドコモ 4回線' },
    { key: 'home', label: '家のネット・でんき', ph: '例：ソフトバンク光／関西電力' },
    { key: 'trigger', label: '来店のきっかけ', ph: '例：子どものスマホが古い' },
    { key: 'type', label: 'お客様のタイプ', ph: '例：慎重×数字' },
  ]],
  ['商談の中身', [
    { key: 'hard', label: 'むずかしかった所', req: true, area: true, ph: 'どこで止まりそうになったか' },
    { key: 'needs', label: '引き出した本音・ニーズ', area: true, ph: 'どんな質問で聞けたか' },
    { key: 'proposal', label: '提案した内容', area: true, ph: 'プラン・端末・光・でんき・施策の組み合わせ' },
    { key: 'objection', label: '断り文句と切り返し', area: true, ph: '言われたこと → 返した一言' },
    { key: 'decider', label: '決め手', area: true, ph: 'お客様が決めた理由（お客様の言葉で）' },
  ]],
  ['結果と学び', [
    { key: 'result', label: '結果', req: true, choice: ['獲得', '見込み', '失注'] },
    { key: 'got', label: '獲得した内容', ph: '例：MNP 4回線・光・でんき' },
    { key: 'next', label: '次に活かすポイント', area: true, ph: '同じ場面でまずやること' },
    { key: 'rpnote', label: 'ロープレで使うときのメモ', area: true, ph: 'お客様役だけが知る本音など' },
    { key: 'tags', label: 'タグ', ph: '例：ソフトバンク光、家族に相談、シニア（読点で区切る）' },
  ]],
];
const ALL = FORM.flatMap(([, f]) => f);
const RES_CLASS = { 獲得: 'got', 見込み: 'maybe', 失注: 'lost' };
const fmt = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const tagsOf = (c) => String(c.tags || '').split(/[、,，\s]+/).map((x) => x.trim()).filter(Boolean);

export default function CasesPage({ user, isAdmin, onBack }) {
  const [raw] = useDbCollection('case_examples');
  const [sel, setSel] = useState('');
  const [mode, setMode] = useState('view'); // view ／ write
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState('');
  const [q, setQ] = useState('');
  const [res, setRes] = useState('');
  const list = useMemo(() => Object.entries(raw || {}).filter(([, v]) => v).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.at || 0) - (a.at || 0)), [raw]);
  const shown = list.filter((c) => (!res || c.result === res) && (!q.trim() || ALL.some((f) => String(c[f.key] || '').includes(q.trim())) || String(c.by || '').includes(q.trim())));
  const cur = list.find((c) => c.id === sel) || shown[0];
  const canEdit = (c) => isAdmin || (c && user && c.uid === user.uid);

  const startNew = () => { setForm({}); setEditId(''); setMode('write'); };
  const startEdit = (c) => { const f = {}; ALL.forEach((x) => { f[x.key] = c[x.key] || ''; }); setForm(f); setEditId(c.id); setMode('write'); };
  const save = async () => {
    const miss = ALL.filter((f) => f.req && !String(form[f.key] || '').trim());
    if (miss.length) return showToast(`${miss.map((f) => f.label).join('・')}を入れてください`);
    const data = {}; ALL.forEach((f) => { data[f.key] = String(form[f.key] || '').trim(); });
    if (editId) {
      const old = list.find((c) => c.id === editId) || {};
      await dbSet(`case_examples/${editId}`, { ...data, by: old.by || '', uid: old.uid || '', at: old.at || Date.now(), editedAt: Date.now() });
      setSel(editId);
    } else {
      const r = await dbPush('case_examples', { ...data, by: (user && user.name) || '管理者', uid: (user && user.uid) || '', at: Date.now() });
      setSel(r.key);
    }
    setMode('view'); showToast('保存しました');
  };
  const del = async (c) => {
    if (!window.confirm('この獲得例を削除します。よろしいですか？')) return;
    await dbRemove(`case_examples/${c.id}`); setSel(''); showToast('削除しました');
  };
  // ロープレ用：お客様の設定と本音をまとめた文章をコピー
  const copyRp = async (c) => {
    const lines = ['【お客様の設定】', ...FORM[1][1].filter((f) => c[f.key]).map((f) => `${f.label}：${c[f.key]}`)];
    if (c.needs) lines.push('', `【本音・ニーズ】${c.needs}`);
    if (c.objection) lines.push(`【断り文句】${c.objection.split(/→|⇒/)[0].trim()}`);
    if (c.rpnote) lines.push(`【お客様役メモ】${c.rpnote}`);
    try { await navigator.clipboard.writeText(lines.join('\n')); showToast('ロープレ用の設定をコピーしました'); } catch { showToast('コピーできませんでした'); }
  };

  return (
    <div className="page cx">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>獲得例蓄積</h1></div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← ホーム</button><ManualButton screen="cases" /></div>
      </header>
      <div className="cx-bar">
        <span className="cx-lead">むずかしかった商談を集めて、ロープレの設定や現場の動き方に使う（見る・書くのは SAM と管理者だけ）</span>
        <button className="ev-btn p" onClick={startNew}>＋ 獲得例を書く</button>
      </div>
      <div className="cx-body">
        <aside className="cx-side">
          <input className="ev-inp" placeholder="キーワードでさがす（例：家族に相談）" value={q} onChange={(e) => setQ(e.target.value)} aria-label="キーワードでさがす" />
          <div className="cx-chips">
            {['', '獲得', '見込み', '失注'].map((r) => <button key={r || 'all'} className={`cx-chip ${res === r ? 'on' : ''}`} onClick={() => setRes(r)}>{r || 'すべて'}</button>)}
          </div>
          <div className="cx-list">
            {shown.map((c) => (
              <button key={c.id} className={`cx-item ${mode === 'view' && cur && cur.id === c.id ? 'on' : ''}`} onClick={() => { setSel(c.id); setMode('view'); }}>
                <span className="cx-item-h"><span className={`cx-res ${RES_CLASS[c.result] || ''}`}>{c.result || '－'}</span><small>{c.week || fmt(c.at)}・{c.by}</small></span>
                <b>{c.title}</b>
                <small>{[c.age, c.family, c.carrier].filter(Boolean).join('・')}</small>
              </button>
            ))}
            {!shown.length && <div className="ev-note">{list.length ? '条件に合う獲得例がありません' : 'まだ獲得例はありません。右上の【＋ 獲得例を書く】から書けます'}</div>}
          </div>
        </aside>

        <main className="cx-main">
          {mode === 'write' ? (
            <div className="cx-form">
              <div className="cx-title"><h2>{editId ? '獲得例を直す' : '獲得例を書く'}</h2><span className="rv-grow" /><button className="ev-btn" onClick={() => setMode('view')}>やめる</button><button className="ev-btn p" onClick={save}>保存</button></div>
              <div className="ev-note">＊は必須。それ以外は分かる所だけでOK。お客様の名前など、個人が分かることは書かないでください。</div>
              {FORM.map(([g, fields]) => (
                <section key={g} className="rv-card">
                  <b className="cx-gh">{g}</b>
                  <div className="cx-grid">
                    {fields.map((f) => (
                      <label key={f.key} className={`cx-fld ${f.area ? 'wide' : ''}`}>
                        <span>{f.label}{f.req ? '＊' : ''}</span>
                        {f.choice ? (
                          <div className="cx-chips">{f.choice.map((o) => <button type="button" key={o} className={`cx-chip ${form[f.key] === o ? 'on' : ''}`} onClick={() => setForm({ ...form, [f.key]: o })}>{o}</button>)}</div>
                        ) : f.area ? (
                          <AutoTA className="ev-inp ev-ta" rows={2} value={form[f.key] || ''} placeholder={f.ph} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                        ) : (
                          <input className="ev-inp" value={form[f.key] || ''} placeholder={f.ph} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                        )}
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : cur ? (
            <div className="cx-view">
              <div className="cx-title"><span className={`cx-res ${RES_CLASS[cur.result] || ''}`}>{cur.result}</span><h2>{cur.title}</h2></div>
              <div className="cx-meta">{[cur.week, cur.channel, cur.role].filter(Boolean).join('・')}{(cur.week || cur.channel || cur.role) ? '　' : ''}記入：<b>{cur.by}</b>（{fmt(cur.at)}{cur.editedAt ? `・編集 ${fmt(cur.editedAt)}` : ''}）</div>
              <div className="cx-actions">
                <button className="ev-btn" onClick={() => copyRp(cur)}>お客様の設定をコピー（ロープレ用）</button>
                {canEdit(cur) && <><button className="ev-btn" onClick={() => startEdit(cur)}>編集</button><button className="ev-btn" style={{ color: '#b91c1c' }} onClick={() => del(cur)}>削除</button></>}
              </div>
              {tagsOf(cur).length > 0 && <div className="cx-chips">{tagsOf(cur).map((t) => <button key={t} className="cx-chip" onClick={() => setQ(t)}>#{t}</button>)}</div>}
              {FORM.slice(1).map(([g, fields]) => {
                const rows = fields.filter((f) => f.key !== 'tags' && f.key !== 'result' && cur[f.key]);
                if (!rows.length) return null;
                return (
                  <section key={g} className="rv-card">
                    <b className="cx-gh">{g}</b>
                    {rows.map((f) => <div key={f.key} className="cx-row"><span>{f.label}</span><div>{cur[f.key]}</div></div>)}
                  </section>
                );
              })}
            </div>
          ) : <div className="ev-note">左の一覧から選ぶか、【＋ 獲得例を書く】から書いてください</div>}
        </main>
      </div>
    </div>
  );
}
