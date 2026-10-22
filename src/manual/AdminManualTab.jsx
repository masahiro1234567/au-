import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbSet, dbRemove } from '../useFirebase.js';
import { AutoTA } from '../components/EvalEditors.jsx';
import { showToast } from '../utils.js';
import { DEFAULT_MANUALS, SCREENS } from './defaults.js';
import { ManualContent, MANUAL_ICONS, ICON_NAMES, pickManual, oretabKeys } from './Manual.jsx';

// ===== 管理画面「マニュアル」：各画面のマニュアルを追加・編集・削除。右（スマホは下）にプレビュー =====
const KINDS = [['can', 'できること（点の箇条書き）'], ['steps', '操作方法（番号付きの手順）'], ['tip', 'ヒント（囲みの文章）'], ['table', '表（「左｜右」で書く）']];
const copy = (m) => JSON.parse(JSON.stringify(m || { title: '', sections: [] }));

export default function AdminManualTab({ user }) {
  const [saved, loaded] = useDbCollection('manuals');
  const [key, setKey] = useState('home');
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [focus, setFocus] = useState({ si: 0, ii: 0, pos: null });
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => SCREENS.map((g) => ({ ...g, keys: g.oretab ? oretabKeys(saved) : g.keys })), [saved]);
  const current = pickManual(saved, key);
  // 画面を選び直したとき・保存されたものが読み込まれたときに、編集中の下書きを作り直す
  useEffect(() => { if (!dirty) setDraft(copy(current)); }, [key, loaded, saved && JSON.stringify(saved[key])]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (k) => {
    if (k === key) return;
    if (dirty && !window.confirm('保存していない変更があります。破棄して別の画面に移りますか？')) return;
    setDirty(false); setKey(k); setDraft(copy(pickManual(saved, k))); setFocus({ si: 0, ii: 0, pos: null });
  };
  const change = (fn) => { setDraft((d) => { const n = copy(d); fn(n); return n; }); setDirty(true); };
  const isCustom = key.startsWith('oretab_x_');
  const isSaved = !!(saved && saved[key]);

  const insert = (tok) => {
    const { si, ii, pos } = focus;
    if (!draft || !draft.sections[si] || draft.sections[si].items[ii] === undefined) return showToast('先に、絵を入れたい項目を押してください');
    change((d) => {
      const t = d.sections[si].items[ii] || '';
      const p = pos == null ? t.length : Math.min(pos, t.length);
      d.sections[si].items[ii] = t.slice(0, p) + tok + t.slice(p);
    });
    setFocus({ si, ii, pos: (pos == null ? (draft.sections[si].items[ii] || '').length : pos) + tok.length });
  };
  const track = (si, ii) => (e) => setFocus({ si, ii, pos: e.target.selectionStart });

  const save = async () => {
    if (!draft.title.trim()) return showToast('画面の名前を入れてください');
    setBusy(true);
    try {
      const clean = { ...draft, sections: draft.sections.map((s) => ({ ...s, items: s.items.filter((x) => String(x).trim()) })), updatedAt: Date.now(), updatedBy: user?.name || '' };
      if (isCustom) { clean.group = 'oretab'; clean.order = (saved[key] && saved[key].order) || Date.now(); }
      await dbSet(`manuals/${key}`, clean);
      setDirty(false); showToast('保存しました');
    } catch (e) { showToast('保存できませんでした：' + e.message); }
    setBusy(false);
  };
  const resetDefault = async () => {
    if (!window.confirm('初期の文章に戻しますか？ 今の文章は消えます。')) return;
    try { await dbRemove(`manuals/${key}`); setDirty(false); setDraft(copy(DEFAULT_MANUALS[key])); showToast('初期の文章に戻しました'); } catch (e) { showToast('できませんでした：' + e.message); }
  };
  const addOreTab = async () => {
    if (dirty && !window.confirm('保存していない変更があります。破棄してタブを追加しますか？')) return;
    const k = `oretab_x_${Date.now()}`;
    const m = { title: '新しいタブ', sections: [{ kind: 'can', heading: '', items: ['ここに文章を書きます'] }], group: 'oretab', order: Date.now(), updatedAt: Date.now(), updatedBy: user?.name || '' };
    try { await dbSet(`manuals/${k}`, m); setDirty(false); setKey(k); setDraft(copy(m)); showToast('オレタブのマニュアルにタブを追加しました'); } catch (e) { showToast('できませんでした：' + e.message); }
  };
  const removeTab = async () => {
    if (!window.confirm(`「${draft.title}」のタブを削除しますか？`)) return;
    try { await dbRemove(`manuals/${key}`); setDirty(false); setKey('oretab_can'); setDraft(copy(pickManual(saved, 'oretab_can'))); showToast('削除しました'); } catch (e) { showToast('できませんでした：' + e.message); }
  };

  if (!draft) return <div className="loading"><div className="spinner" /></div>;
  const where = draft.sections[focus.si] && draft.sections[focus.si].items[focus.ii] !== undefined
    ? `「${draft.sections[focus.si].heading || 'まとまり' + (focus.si + 1)}」の${focus.ii + 1}番目` : 'まだ選ばれていません';

  return (
    <div className="mna">
      <div className="mna-list">
        <label className="mna-pick">直す画面
          <select value={key} onChange={(e) => choose(e.target.value)}>
            {groups.map((g) => <optgroup key={g.group} label={g.group}>{g.keys.map((k) => { const m = pickManual(saved, k); return <option key={k} value={k}>{m ? m.title : k}{saved && saved[k] ? '（編集済み）' : ''}</option>; })}</optgroup>)}
          </select>
        </label>
        <div className="mna-side">
          {groups.map((g) => (
            <div key={g.group}>
              <small>{g.group}</small>
              {g.keys.map((k) => { const m = pickManual(saved, k); return (
                <button key={k} className={`mna-li ${k === key ? 'on' : ''}`} onClick={() => choose(k)}>
                  <span>{m ? m.title : k}</span>{saved && saved[k] && <em>編集済み</em>}
                </button>
              ); })}
            </div>
          ))}
        </div>
        <button className="mna-btn" onClick={addOreTab}>＋ オレタブのタブを追加</button>
      </div>

      <div className="mna-edit">
        <label className="mna-fld">{key.startsWith('oretab') ? 'タブの名前' : '画面の名前（マニュアルの見出し）'}
          <input className="mna-inp" value={draft.title} onChange={(e) => change((d) => { d.title = e.target.value; })} />
        </label>
        <div className="mna-pal">
          <div className="mna-pal-h">ボタンの絵を入れる<span>（入れる場所：{where}）</span></div>
          <div className="mna-pal-row">
            {ICON_NAMES.map((n) => <button key={n} className="mna-palb" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(`〔${n}〕`)}>{MANUAL_ICONS[n]}{n}</button>)}
            <button className="mna-palb" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('【ボタン名】')}><span className="mn-kbd">ボタン名</span>枠で囲む</button>
          </div>
        </div>
        {draft.sections.map((s, si) => (
          <div className="mna-sec" key={si}>
            <div className="mna-row">
              <label className="mna-fld" style={{ flex: 1, minWidth: 0 }}>まとまりの見出し
                <input className="mna-inp" value={s.heading || ''} placeholder={s.kind === 'tip' ? '（ヒントは見出しなしで表示されます）' : ''} onChange={(e) => change((d) => { d.sections[si].heading = e.target.value; })} />
              </label>
              <label className="mna-fld">形
                <select className="mna-inp" value={s.kind} onChange={(e) => change((d) => { d.sections[si].kind = e.target.value; })}>
                  {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </div>
            {s.items.map((t, ii) => (
              <div className="mna-item" key={ii}>
                <span className="mna-no">{ii + 1}</span>
                <AutoTA className="mna-ta" value={t} aria-label={`${ii + 1}番目の項目`}
                  onChange={(e) => { const v = e.target.value, p = e.target.selectionStart; change((d) => { d.sections[si].items[ii] = v; }); setFocus({ si, ii, pos: p }); }}
                  onFocus={track(si, ii)} onSelect={track(si, ii)} onClick={track(si, ii)} onKeyUp={track(si, ii)} />
                <div className="mna-ops">
                  <button aria-label="上へ" disabled={ii === 0} onClick={() => change((d) => { const a = d.sections[si].items; [a[ii - 1], a[ii]] = [a[ii], a[ii - 1]]; })}>↑</button>
                  <button className="del" onClick={() => change((d) => { d.sections[si].items.splice(ii, 1); })}>削除</button>
                </div>
              </div>
            ))}
            <div className="mna-row" style={{ justifyContent: 'space-between' }}>
              <button className="mna-btn" onClick={() => { change((d) => { d.sections[si].items.push(''); }); setFocus({ si, ii: s.items.length, pos: 0 }); }}>＋ 項目を追加</button>
              <div className="mna-row">
                <button className="mna-btn" disabled={si === 0} onClick={() => change((d) => { const a = d.sections; [a[si - 1], a[si]] = [a[si], a[si - 1]]; })}>上へ</button>
                <button className="mna-btn del" onClick={() => { if (window.confirm('このまとまりを削除しますか？')) change((d) => { d.sections.splice(si, 1); }); }}>このまとまりを削除</button>
              </div>
            </div>
          </div>
        ))}
        <button className="mna-btn" style={{ alignSelf: 'flex-start' }} onClick={() => change((d) => { d.sections.push({ kind: 'can', heading: '新しいまとまり', items: [''] }); })}>＋ まとまりを追加</button>
        <div className="mna-row mna-save">
          <button className="mna-btn p" disabled={busy || !dirty} onClick={save}>{busy ? '保存中…' : dirty ? '保存する' : '保存済み'}</button>
          {dirty && <button className="mna-btn" onClick={() => { setDirty(false); setDraft(copy(current)); }}>変更を取り消す</button>}
          {!isCustom && isSaved && <button className="mna-btn" onClick={resetDefault}>初期の文章に戻す</button>}
          {isCustom && <button className="mna-btn del" onClick={removeTab}>このタブを削除</button>}
        </div>
      </div>

      <div className="mna-pv">
        <div className="mna-pv-h">プレビュー（スマホで開いたときの見え方）</div>
        <div className="mna-pv-box">
          <div className="mn-head"><div><small>{key.startsWith('oretab') ? 'オレタブのマニュアル' : 'この画面のマニュアル'}</small><b>{draft.title || '（名前なし）'}</b></div></div>
          <ManualContent manual={draft} />
        </div>
      </div>
    </div>
  );
}
