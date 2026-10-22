// ===== 開閉しても、押したところが画面の同じ位置に残るようにする =====
// 使い方：onClick={(e) => keepPlace(e.currentTarget, () => setOpen(!open))}
// 上のほうの中身が閉じて短くなっても、押した見出しが動かない（名簿全体が上に飛ばない）
export function scrollParent(el) {
  let p = el && el.parentElement;
  while (p) {
    const st = getComputedStyle(p);
    if (/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}
export function keepPlace(el, change) {
  if (!el || typeof window === 'undefined') { change(); return; }
  const box = scrollParent(el);
  const before = el.getBoundingClientRect().top;
  change();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const diff = el.getBoundingClientRect().top - before;
    if (Math.abs(diff) > 1) box.scrollTop += diff;
  }));
}
// 指定した時間をかけて、なめらかに要素の位置までスクロール（KPIの未入力から移動するとき）
export function smoothScrollTo(el, ms = 600, offset = 12) {
  if (!el) return;
  const box = scrollParent(el);
  const isDoc = box === document.scrollingElement || box === document.documentElement;
  const boxTop = isDoc ? 0 : box.getBoundingClientRect().top;
  const from = box.scrollTop;
  const to = from + el.getBoundingClientRect().top - boxTop - offset;
  const t0 = performance.now();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const step = (now) => { const x = Math.min((now - t0) / ms, 1); box.scrollTop = from + (to - from) * ease(x); if (x < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
