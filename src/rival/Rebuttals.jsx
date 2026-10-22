import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbPush, dbRemove, dbUpdateMany } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { AutoTA } from '../components/EvalEditors.jsx';
import { RB_KINDS, RB_WHO, WHO_MAP, RB_AI_BY, RB_SEED } from './rebuttalData.js';

// ===== 切り返し集（他社比較の中のタブ） =====
// 保存場所（au-data-base）
//   rival_rebuttals/{id} = { kind, who, head, say, memo, by, uid, at, editedAt?, ai?, good: { uid: true } }
//   rival_config/rebuttalSeeded = AI生成の例を入れたら true
// 見た目は用語集と同じ（検索 → カード → 下から出る詳細）。左で種類・会社・商材をしぼる。
// だれでも書ける。書いた本人と管理者が編集・削除できる。

const KIND_NAME = Object.fromEntries(RB_KINDS);

async function seedOnce() {
  const up = { 'rival_config/rebuttalSeeded': true };
  const at = Date.now();
  RB_SEED.forEach(([who, head, say, memo], i) => {
    up[`rival_rebuttals/seed${i}`] = { kind: WHO_MAP[who].kind, who, head, say, memo, by: RB_AI_BY, uid: '', at: at - i, ai: true };
  });
  await dbUpdateMany(up);
}

const EMPTY = { kind: 'rival', who: 'ahamo', head: '', say: '', memo: '' };

export function useRebuttals(config, cfgLoaded) {
  const [all] = useDbCollection('rival_rebuttals');
  useEffect(() => { if (cfgLoaded && !config.rebuttalSeeded) seedOnce().catch(() => {}); }, [cfgLoaded, config.rebuttalSeeded]);
  return useMemo(() => Object.entries(all || {}).filter(([, v]) => v && v.head).map(([id, v]) => ({ id, ...v, n: Object.keys(v.good || {}).length })), [all]);
}

// 左の一覧（種類 → 会社・商材）
export function RebuttalSide({ items, filter, setFilter }) {
  const count = (fn) => items.filter(fn).length;
  return (
    <nav className="rv-side" aria-label="種類・会社をえらぶ">
      <button className={`rv-co rv-all ${filter.kind === 'all' ? 'on' : ''}`} onClick={() => setFilter({ kind: 'all', who: 'all' })}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        <b>すべて</b><small>{items.length}件</small>
      </button>
      {RB_KINDS.map(([k, name]) => (
        <div key={k} className="rv-group">
          <button className={`rv-gname rb-kind ${filter.kind === k && filter.who === 'all' ? 'on' : ''}`} onClick={() => setFilter({ kind: k, who: 'all' })}>{name}<small>{count((t) => t.kind === k)}</small></button>
          {RB_WHO.filter((w) => w[1] === k).map(([id, , wname, color]) => {
            const n = count((t) => t.who === id);
            if (id === 'other' && !n) return null;
            return (
              <button key={id} className={`rv-co ${filter.who === id ? 'on' : ''}`} onClick={() => setFilter({ kind: k, who: id })}>
                <span className="rb-dot" style={{ background: color }} /><b>{wname}</b>{n > 0 && <small>{n}件</small>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function RebuttalMain({ items, filter, setFilter, user, isAdmin }) {
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState('');
  const [form, setForm] = useState(null); // { id?, ...値 }
  const uid = (user && user.uid) || '';

  const shown = items
    .filter((t) => (filter.kind === 'all' || t.kind === filter.kind) && (filter.who === 'all' || t.who === filter.who))
    .filter((t) => !q || [t.head, t.say, t.memo, (WHO_MAP[t.who] || {}).name].join(' ').includes(q))
    .sort((a, b) => b.n - a.n || (b.at || 0) - (a.at || 0));
  const cur = items.find((t) => t.id === openId);
  const canEdit = (t) => isAdmin || (!t.ai && t.uid && t.uid === uid);

  const toggleGood = async (t) => {
    if (!uid) return showToast('ログインすると押せます');
    const on = !!(t.good && t.good[uid]);
    await dbUpdateMany({ [`rival_rebuttals/${t.id}/good/${uid}`]: on ? null : true });
    showToast(on ? '「使えた」を取り消しました' : '「使えた」を記録しました');
  };
  const del = async (t) => {
    if (!window.confirm('この切り返しを削除します。よろしいですか？')) return;
    await dbRemove(`rival_rebuttals/${t.id}`);
    setOpenId(''); showToast('削除しました');
  };

  const chips = [];
  if (filter.kind !== 'all') chips.push([KIND_NAME[filter.kind], () => setFilter({ kind: 'all', who: 'all' })]);
  if (filter.who !== 'all') chips.push([(WHO_MAP[filter.who] || {}).name, () => setFilter({ ...filter, who: 'all' })]);

  return (
    <main className="rv-main rb">
      <div className="rv-title"><h2>切り返し集</h2><span className="rv-pill">お客様の一言から探す</span><span className="rv-grow" />
        <button className="ev-btn p" onClick={() => { const w = filter.who !== 'all' ? filter.who : filter.kind !== 'all' ? RB_WHO.find((x) => x[1] === filter.kind)[0] : 'ahamo'; setForm({ ...EMPTY, kind: WHO_MAP[w].kind, who: w }); }}>＋ 追加</button>
      </div>
      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="#9a6e57" strokeWidth="2.4" /><path d="M20 20l-3.5-3.5" stroke="#9a6e57" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <input type="search" placeholder="お客様の一言や会社名で検索..." value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" aria-label="切り返しを検索" />
        {q && <button className="search-clear show" onClick={() => setQ('')} aria-label="検索を消す">✕</button>}
      </div>
      {chips.length > 0 && <div className="active-filters">{chips.map(([label, clear]) => <span key={label} className="filter-chip fc-cat" onClick={clear}>{label} ✕</span>)}</div>}
      <div className="terms-count">{shown.length}件</div>
      {!shown.length ? (
        <div className="empty-state"><p>該当する切り返しがありません</p></div>
      ) : (
        <div className="terms-grid">
          {shown.map((t) => {
            const w = WHO_MAP[t.who] || WHO_MAP.other;
            return (
              <div key={t.id} className="term-card rb-card" onClick={() => setOpenId(t.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpenId(t.id)}>
                <div className="term-stripe" style={{ background: w.color }} />
                <div className="term-body">
                  <div className="term-top">
                    <div className="term-name">「{t.head}」</div>
                    <div className="term-badges"><span className="badge" style={{ background: `${w.color}18`, color: w.color }}>{w.name}</span></div>
                  </div>
                  <p className="term-desc">{t.say}</p>
                  <div className="rb-foot">使えた {t.n}人・{t.ai ? <b className="ai">{t.by}</b> : t.by}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="rv-ai-note">「{RB_AI_BY}」の切り返しは、AIが2026年10月時点の公開情報をもとに書いた例です。数字や条件は、お客様に案内する前に公式で確認してください。メンバーはだれでも追加でき、書いた本人と管理者が編集・削除できます。</div>

      {cur && (() => {
        const w = WHO_MAP[cur.who] || WHO_MAP.other;
        const mine = !!(cur.good && cur.good[uid]);
        return (
          <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && setOpenId('')}>
            <div className="modal" role="dialog" aria-label={cur.head}>
              <div className="modal-handle" />
              <div className="modal-hdr"><h3>「{cur.head}」</h3><button className="btn-close" onClick={() => setOpenId('')} aria-label="閉じる">✕</button></div>
              <div className="modal-body">
                <div className="detail-rank-bar" style={{ background: w.color }} />
                <div className="detail-badges"><span className="badge" style={{ background: `${w.color}18`, color: w.color }}>{w.name}</span><span className="badge badge-cat">{KIND_NAME[cur.kind]}</span></div>
                <div className="detail-sec"><span className="lbl">切り返し</span><p className="rb-say">{cur.say}</p></div>
                {cur.memo && <div className="detail-sec"><span className="lbl">根拠・数字</span><p>{cur.memo}</p></div>}
                <div className="rb-by">記入：<b className={cur.ai ? 'ai' : ''}>{cur.by}</b>{cur.editedAt ? '（編集あり）' : ''}</div>
              </div>
              <div className="modal-footer">
                {canEdit(cur) && <button className="mbtn mbtn-danger" onClick={() => del(cur)}>削除</button>}
                {canEdit(cur) && <button className="mbtn mbtn-cancel" onClick={() => { setForm({ id: cur.id, kind: cur.kind, who: cur.who, head: cur.head, say: cur.say, memo: cur.memo || '' }); setOpenId(''); }}>編集</button>}
                <button className={`mbtn ${mine ? 'mbtn-cancel' : 'mbtn-primary'}`} onClick={() => toggleGood(cur)}>{mine ? `使えた済み（${cur.n}人）` : `使えた（${cur.n}人）`}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {form && <RebuttalForm initial={form} user={user} onClose={() => setForm(null)} />}
    </main>
  );
}

// 切り返しを書く・直す（切り返し集と獲得例蓄積の両方から使う）
// initial：{ id?, kind, who, head, say, memo }。id があれば編集
export function RebuttalForm({ initial, user, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const save = async () => {
    const f = form;
    if (!f.head.trim() || !f.say.trim()) return showToast('お客様の一言と切り返しを入れてください');
    const val = { kind: WHO_MAP[f.who].kind, who: f.who, head: f.head.trim(), say: f.say.trim(), memo: (f.memo || '').trim() };
    if (f.id) {
      const up = {};
      Object.entries(val).forEach(([k, v]) => { up[`rival_rebuttals/${f.id}/${k}`] = v; });
      up[`rival_rebuttals/${f.id}/editedAt`] = Date.now();
      await dbUpdateMany(up);
      showToast('保存しました');
    } else {
      await dbPush('rival_rebuttals', { ...val, by: (user && user.name) || '名前なし', uid: (user && user.uid) || '', at: Date.now() });
      showToast('切り返し集に追加しました');
    }
    if (onSaved) onSaved();
    onClose();
  };
  return (
    <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal" role="dialog" aria-label="切り返しを書く">
        <div className="modal-handle" />
        <div className="modal-hdr"><h3>{form.id ? '切り返しを編集' : '切り返し集に追加'}</h3><button className="btn-close" onClick={onClose} aria-label="閉じる">✕</button></div>
        <div className="modal-body">
          <div className="form-group rb-row2">
            <label>種類<select value={form.kind} onChange={(e) => { const k = e.target.value; setForm({ ...form, kind: k, who: RB_WHO.find((x) => x[1] === k)[0] }); }}>{RB_KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label>会社・商材<select value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })}>{RB_WHO.filter((w) => w[1] === form.kind).map(([id, , n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          </div>
          <div className="form-group"><label>お客様の一言 ＊</label><input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} placeholder="例：ahamo の方が安いでしょ" /></div>
          <div className="form-group"><label>切り返し ＊</label><AutoTA rows={4} value={form.say} onChange={(e) => setForm({ ...form, say: e.target.value })} placeholder="例：ahamo はシンプルでいいですよね。ひとつだけ…" /></div>
          <div className="form-group"><label>根拠・数字</label><AutoTA rows={2} value={form.memo || ''} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="例：UQ トクトクプラン2 は割引後 2,728円（2026/10時点）" /></div>
          <div className="ev-note">切り返し集（他社比較の中）に、記入者の名前つきで出ます。メンバー全員が見られます。</div>
        </div>
        <div className="modal-footer"><button className="mbtn mbtn-cancel" onClick={onClose}>やめる</button><button className="mbtn mbtn-primary" onClick={save}>保存</button></div>
      </div>
    </div>
  );
}

// 文章から会社・商材を当てる（獲得例の「今のキャリア」などから）
export function guessWho(text) {
  const t = String(text || '');
  const hit = [['ahamo', /ahamo/i], ['linemo', /LINEMO/i], ['povo', /povo/i], ['ym', /ワイモバ|Y!?mobile/i], ['docomo', /ドコモ|docomo/i], ['sb', /ソフトバンク|softbank/i], ['rakuten', /楽天/], ['mvno', /格安|mineo|IIJ|イオン|NURO|日本通信/i]].find(([, re]) => re.test(t));
  return hit ? hit[0] : 'docomo';
}
