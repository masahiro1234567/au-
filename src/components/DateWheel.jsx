import React, { useEffect, useRef, useState } from 'react';

// ===== 日付の選択（iPhoneのようなホイール式）=====
// 押すと下から「年・月・日」のホイールが出る。何も選んでいなければ今日が選ばれた状態で開く
// 使い方は <input type="date"> と同じ：value は 'YYYY-MM-DD'、onChange には { target: { value } } が渡る
const DOWS = ['日', '月', '火', '水', '木', '金', '土'];
const pad = (n) => String(n).padStart(2, '0');
const toStr = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const today = () => { const t = new Date(); return toStr(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const parse = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').replace(/\//g, '-')); return m ? [+m[1], +m[2], +m[3]] : null; };
const daysIn = (y, m) => new Date(y, m, 0).getDate();
const label = (s) => { const p = parse(s); if (!p) return ''; const d = new Date(p[0], p[1] - 1, p[2]); return `${p[0]}/${p[1]}/${p[2]}（${DOWS[d.getDay()]}）`; };
const ITEM = 40;

function Wheel({ items, value, onChange, unit, ariaLabel }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const idx = Math.max(items.indexOf(value), 0);
  useEffect(() => { if (ref.current) ref.current.scrollTop = idx * ITEM; }, [items.length]);
  useEffect(() => { const el = ref.current; if (el && Math.round(el.scrollTop / ITEM) !== idx) el.scrollTo({ top: idx * ITEM, behavior: 'smooth' }); }, [idx]);
  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current; if (!el) return;
      const i = Math.min(Math.max(Math.round(el.scrollTop / ITEM), 0), items.length - 1);
      if (items[i] !== value) onChange(items[i]);
    }, 90);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="dw-col">
      <div className="dw-list" ref={ref} onScroll={onScroll} role="listbox" aria-label={ariaLabel}>
        {items.map((v) => (
          <button type="button" key={v} role="option" aria-selected={v === value} className={`dw-item ${v === value ? 'on' : ''}`} onClick={() => onChange(v)}>{v}{unit}</button>
        ))}
      </div>
    </div>
  );
}

export default function DateWheel({ value, onChange, min, style, className, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const [tmp, setTmp] = useState(null); // [年, 月, 日]
  const start = () => { setTmp(parse(value) || parse(today())); setOpen(true); };
  const set = (i, v) => setTmp((t) => { const n = [...t]; n[i] = v; n[2] = Math.min(n[2], daysIn(n[0], n[1])); return n; });
  const pick = (s) => { if (min && s < min) s = min; onChange && onChange({ target: { value: s } }); setOpen(false); };
  const quick = (add, sat) => {
    const t = new Date();
    if (sat) t.setDate(t.getDate() + ((6 - t.getDay() + 7) % 7));
    else t.setDate(t.getDate() + add);
    const p = [t.getFullYear(), t.getMonth() + 1, t.getDate()];
    setTmp(p);
  };
  const y0 = new Date().getFullYear();
  const years = []; for (let y = y0 - 2; y <= y0 + 3; y++) years.push(y);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = tmp ? Array.from({ length: daysIn(tmp[0], tmp[1]) }, (_, i) => i + 1) : [];
  const tmpStr = tmp ? toStr(...tmp) : '';
  const tooEarly = min && tmpStr && tmpStr < min;
  return (
    <>
      <button type="button" className={`dw-btn ${className || ''}`} style={style} disabled={disabled} onClick={start} aria-label={`日付を選ぶ（${label(value) || '未選択'}）`}>
        <span className="dw-btn-text">{label(value) || placeholder || '日付を選ぶ'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4 10h16M9 3v4M15 3v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {open && tmp && (
        <div className="dw-ov" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="dw-sheet" role="dialog" aria-label="日付を選ぶ">
            <div className="dw-head">
              <button type="button" className="dw-link" onClick={() => setOpen(false)}>キャンセル</button>
              <b>{label(tmpStr)}</b>
              <button type="button" className="dw-link strong" disabled={tooEarly} onClick={() => pick(tmpStr)}>決定</button>
            </div>
            <div className="dw-quick">
              <button type="button" onClick={() => quick(0)}>今日</button>
              <button type="button" onClick={() => quick(1)}>明日</button>
              <button type="button" onClick={() => quick(0, true)}>次の土曜</button>
            </div>
            <div className="dw-wheels">
              <div className="dw-band" aria-hidden="true" />
              <Wheel items={years} value={tmp[0]} onChange={(v) => set(0, v)} unit="年" ariaLabel="年" />
              <Wheel items={months} value={tmp[1]} onChange={(v) => set(1, v)} unit="月" ariaLabel="月" />
              <Wheel key={`${tmp[0]}-${tmp[1]}`} items={days} value={tmp[2]} onChange={(v) => set(2, v)} unit="日" ariaLabel="日" />
            </div>
            {tooEarly && <div className="dw-note">開始日より前の日は選べません</div>}
          </div>
        </div>
      )}
    </>
  );
}
