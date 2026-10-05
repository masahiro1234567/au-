import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDbCollection } from '../useFirebase.js';
import { DEFAULT_MANUALS, SCREENS } from './defaults.js';

// ===== 操作マニュアル =====
// 各画面の右上の〔？〕ボタン（ManualButton）で開く。文章は管理画面「マニュアル」で直せる（manuals/{キー}）

// ---- 文章の中に入れられる絵（〔名前〕で入る） ----
const B = { fill: 'none', stroke: '#cc4f00', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
const W = { ...B, stroke: '#fff' };
const ORE_DOTS = [[42, 48], [57, 46], [50, 58], [63, 58], [38, 62], [46, 70], [60, 71]];
export const MANUAL_ICONS = {
  メニュー: <span className="mn-ico"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" {...B} /></svg></span>,
  マニュアル: <span className="mn-ico"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" {...B} strokeWidth="2.2" /><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 2-2.5 2-2.5 4M12 17.3v.2" {...B} /></svg></span>,
  '戻る×': <span className="mn-ico dark round"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" {...W} strokeWidth="2.6" /></svg></span>,
  Orangeポータル: (
    <span className="mn-app"><svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#FF6A00" /><circle cx="50" cy="57" r="29" fill="#fff" />
      <path d="M50 30c0-6 2-10 5-13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><path d="M55 22c6-8 16-9 22-6-4 7-13 11-22 6z" fill="#fff" />
      {ORE_DOTS.map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="2.2" fill="#FF6A00" />)}
    </svg></span>
  ),
  ブラウザ: (
    <span className="mn-app"><svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#1E74C2" /><circle cx="50" cy="50" r="34" fill="#EAF2FB" stroke="#fff" strokeWidth="6" />
      <circle cx="50" cy="32" r="6.5" fill="#1E74C2" /><path d="M42 43h13v24h5v6H40v-6h5V49h-3z" fill="#1E74C2" />
    </svg></span>
  ),
};
export const ICON_NAMES = Object.keys(MANUAL_ICONS);
const ICON_LABEL = { メニュー: 'メニューのボタン', マニュアル: 'マニュアルのボタン', '戻る×': 'au naviに戻るボタン', Orangeポータル: 'Orangeポータルのアイコン', ブラウザ: 'ブラウザのアイコン' };

// 〔名前〕→絵、【文字】→オレンジの枠
export function RichText({ text }) {
  const out = [];
  const re = /〔(.+?)〕|【(.+?)】/g;
  let last = 0, m, i = 0;
  const t = String(text || '');
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    if (m[1]) out.push(MANUAL_ICONS[m[1]] ? <span key={i++} role="img" aria-label={ICON_LABEL[m[1]]} style={{ display: 'inline-flex' }}>{MANUAL_ICONS[m[1]]}</span> : <span key={i++} className="mn-kbd">{m[1]}</span>);
    else out.push(<span key={i++} className="mn-kbd">{m[2]}</span>);
    last = re.lastIndex;
  }
  if (last < t.length) out.push(t.slice(last));
  return <>{out}</>;
}

// 1つの画面のマニュアルの中身（画面でもプレビューでも同じものを使う）
export function ManualContent({ manual }) {
  const secs = (manual && manual.sections) || [];
  return (
    <div className="mn-body">
      {secs.map((s, si) => {
        const items = (s.items || []).filter((x) => String(x || '').trim());
        if (s.kind === 'tip') return items.map((x, i) => <div key={si + '-' + i} className="mn-tip"><RichText text={x} /></div>);
        return (
          <div className="mn-sec" key={si}>
            {s.heading && <h3>{s.heading}<i /></h3>}
            {s.kind === 'steps' ? (
              <ol className="mn-steps">{items.map((x, i) => <li key={i}><em>{i + 1}</em><span><RichText text={x} /></span></li>)}</ol>
            ) : s.kind === 'table' ? (
              <table className="mn-map"><tbody>{items.map((x, i) => { const [a, ...b] = String(x).split('｜'); return <tr key={i}><td><RichText text={a} /></td><td><RichText text={b.join('｜')} /></td></tr>; })}</tbody></table>
            ) : (
              <ul className="mn-can">{items.map((x, i) => <li key={i}><span /><RichText text={x} /></li>)}</ul>
            )}
          </div>
        );
      })}
      {!secs.length && <div className="mn-tip">この画面のマニュアルはまだありません。</div>}
    </div>
  );
}

// 保存された文章があればそれ、無ければ初期の文章
// （Firebaseは空の配列を保存しないので、項目が無いまとまり・まとまりが無いマニュアルも読めるようにそろえる）
export const pickManual = (saved, key) => {
  const s = saved && saved[key];
  if (s && typeof s === 'object') {
    const secs = Array.isArray(s.sections) ? s.sections : Object.values(s.sections || {});
    return { ...s, title: s.title || '', sections: secs.filter(Boolean).map((x) => ({ kind: x.kind || 'can', heading: x.heading || '', items: (Array.isArray(x.items) ? x.items : Object.values(x.items || {})).map((t) => String(t ?? '')) })) };
  }
  return DEFAULT_MANUALS[key] || null;
};
// オレタブのタブ（初期の4つ＋管理画面で足したもの）
export const oretabKeys = (saved) => {
  const base = SCREENS.find((g) => g.oretab).keys;
  const extra = Object.entries(saved || {}).filter(([k, v]) => k.startsWith('oretab_x_') && v).sort((a, b) => (a[1].order || 0) - (b[1].order || 0)).map(([k]) => k);
  return [...base, ...extra];
};

// ---- マニュアルの画面（スマホは下から、PCは右に開く） ----
function ManualSheet({ screen, onClose, rotate }) {
  const [saved] = useDbCollection('manuals');
  const isOre = screen === 'oretab';
  const tabs = isOre ? oretabKeys(saved) : [screen];
  const [tab, setTab] = useState(isOre ? 'oretab_login' : screen);
  const m = pickManual(saved, tabs.includes(tab) ? tab : tabs[0]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const panel = (
    <div className={`mn-overlay ${rotate || isOre ? 'side' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mn-panel" role="dialog" aria-label={`${isOre ? 'オレタブ' : (m && m.title) || ''}のマニュアル`}>
        <div className="mn-head">
          <div><small>{isOre ? 'オレタブのマニュアル' : 'この画面のマニュアル'}</small><b>{isOre ? 'オレタブの使い方' : (m && m.title) || 'マニュアル'}</b></div>
          <button className="mn-x" onClick={onClose} aria-label="マニュアルを閉じる"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#4a3528" strokeWidth="2.4" strokeLinecap="round" /></svg></button>
        </div>
        {isOre && (
          <div className="mn-tabs">
            {tabs.map((k) => { const t = pickManual(saved, k); return t && <button key={k} className={`mn-tab ${k === tab ? 'on' : ''}`} onClick={() => setTab(k)}>{t.title}</button>; })}
          </div>
        )}
        <div className="mn-scroll"><ManualContent manual={m} /></div>
      </div>
    </div>
  );
  return createPortal(rotate ? <div className="mn-rot">{panel}</div> : panel, document.body);
}

// ---- 右上の〔？〕ボタン ----
export function ManualButton({ screen, className = '', rotate, dark }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`mn-btn ${dark ? 'dark' : ''} ${open ? 'on' : ''} ${className}`} onClick={() => setOpen(true)} aria-label="この画面のマニュアル" title="マニュアル">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 2-2.5 2-2.5 4M12 17.3v.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
      {open && <ManualSheet screen={screen} rotate={rotate} onClose={() => setOpen(false)} />}
    </>
  );
}

// 日報（react-router）の今のページからマニュアルのキーを決める
export function nippouManualKey(pathname, title) {
  if (title === 'プレビュー') return 'nippou_preview';
  if (pathname.startsWith('/report/new')) return 'nippou_new';
  if (pathname.startsWith('/report/pick')) return 'nippou_pick';
  if (pathname.startsWith('/report/frame')) return 'nippou_form';
  if (pathname.startsWith('/reports')) return 'nippou_list';
  if (pathname.startsWith('/frames')) return 'nippou_detail';
  if (pathname.startsWith('/results')) return 'nippou_results';
  if (pathname.startsWith('/stats')) return 'nippou_stats';
  if (pathname.startsWith('/stores')) return 'nippou_stores';
  if (pathname.startsWith('/kpi')) return 'kpi';
  if (pathname.startsWith('/personal')) return 'personal';
  return 'nippou_home';
}
