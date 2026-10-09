import React, { useEffect, useState } from 'react';
import { onSwipeProgress } from './backStack.js';

// ===== タッチパッドで戻る・進むときの矢印 =====
// 左→右（戻る）：左はしから「← 戻る」、右→左（進む）：右はしから「進む →」。
// しきい値まで動かすとオレンジになり、その瞬間に切り替わる。画面の中身も少しだけ指についてくる
export default function SwipeIndicator() {
  const [st, setSt] = useState({ p: 0, done: '' });
  useEffect(() => onSwipeProgress((p, done) => {
    setSt({ p, done: done || '' });
    if (window.scrollX) window.scrollTo(0, window.scrollY); // 画面全体が横にずれていたら戻す
    const w = document.querySelector('.nav-wrap');
    if (!w) return;
    if (p && !done) { w.style.transition = 'none'; w.style.transform = `translateX(${Math.round(p * 46)}px)`; }
    else if (done) { w.style.transition = 'none'; w.style.transform = ''; }
    else if (w.style.transform) {
      w.style.transition = 'transform .2s ease-out'; w.style.transform = 'translateX(0)';
      setTimeout(() => { if (w.style.transform === 'translateX(0)') { w.style.transform = ''; w.style.transition = ''; } }, 220);
    }
  }), []);
  useEffect(() => { if (!st.done) return undefined; const t = setTimeout(() => setSt({ p: 0, done: '' }), 320); return () => clearTimeout(t); }, [st.done]);
  const back = st.done === 'back' ? 1 : Math.max(0, st.p);
  const fwd = st.done === 'fwd' ? 1 : Math.max(0, -st.p);
  const bubble = (side, v, label, path, popping) => (
    <div className={`sw-bubble ${side} ${v >= 1 ? 'on' : ''} ${popping ? 'pop' : ''} ${st.done && !popping ? 'fade' : ''}`}
      style={{ [side]: Math.round(-70 + Math.min(v, 1) * 96), opacity: Math.min(1, v * 1.6) }} aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
      <span>{label}</span>
    </div>
  );
  if (!back && !fwd) return null;
  return (
    <>
      {back > 0 && bubble('left', back, '戻る', 'M15 5l-7 7 7 7', st.done === 'back')}
      {fwd > 0 && bubble('right', fwd, '進む', 'M9 5l7 7-7 7', st.done === 'fwd')}
    </>
  );
}
