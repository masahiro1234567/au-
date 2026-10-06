// ===== ブラウザの「戻る」を、画面の中の「戻る」として受け取るしくみ =====
// 開いている画面（日報の中・Brave X・マニュアルなど）が onAppBack で受け取り口を登録する。
// 「戻る」が来たら、あとから登録したもの（いちばん手前の画面）から順に聞いて、true を返したところで止める
const stack = [];
export function onAppBack(fn) {
  stack.push(fn);
  return () => { const i = stack.lastIndexOf(fn); if (i >= 0) stack.splice(i, 1); };
}
export function runAppBack() {
  for (let i = stack.length - 1; i >= 0; i--) {
    try { if (stack[i]() === true) return true; } catch (e) { /* 次へ */ }
  }
  return false;
}

// ===== PCのタッチパッドの2本指スワイプ（横） =====
// タッチパッドの横スワイプは「指で触る操作」ではなく「横スクロール」として届くので、ここでまとめて受け取る。
// 開いている画面が onAppSwipe で受け取り口を登録していれば、そちらを優先（Brave X のサイドバー・オレタブのタブ切り替えなど）。
// どこも受け取らなかった「右から左」は「戻る」、「左から右」は「進む（さっき開いていた画面）」として扱う
const swipes = [];
export function onAppSwipe(fn) {
  swipes.push(fn);
  return () => { const i = swipes.lastIndexOf(fn); if (i >= 0) swipes.splice(i, 1); };
}
// 横にスクロールできる場所（表・タブの帯など）の上では、スワイプとして扱わない
function canScrollX(el, dir) {
  for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
    const st = getComputedStyle(n);
    if ((st.overflowX === 'auto' || st.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) {
      if (dir === 'right' ? n.scrollLeft > 0 : n.scrollLeft + n.clientWidth < n.scrollWidth - 1) return true;
    }
  }
  return false;
}
export function installTrackpadSwipe(onBack, onForward, onHandled) {
  let sx = 0, sy = 0, timer = null, fired = false, target = null;
  const reset = () => { sx = 0; sy = 0; fired = false; target = null; };
  const onWheel = (e) => {
    if (e.ctrlKey) return; // ピンチでの拡大は対象外
    clearTimeout(timer);
    timer = setTimeout(reset, 260); // 指を離して少したったら、次のスワイプとして数え直す
    if (!target) target = e.target;
    sx += e.deltaX; sy += e.deltaY;
    if (fired || Math.abs(sx) < 110 || Math.abs(sx) < Math.abs(sy) * 1.8) return;
    const dir = sx < 0 ? 'right' : 'left'; // 指を左から右へ動かすと deltaX はマイナス
    if (canScrollX(target, dir)) { fired = true; return; }
    fired = true;
    for (let i = swipes.length - 1; i >= 0; i--) {
      try { if (swipes[i](dir) === true) { if (onHandled) onHandled(); return; } } catch (er) { /* 次へ */ }
    }
    if (dir === 'left') onBack(); else onForward();
  };
  window.addEventListener('wheel', onWheel, { passive: true });
  return () => window.removeEventListener('wheel', onWheel);
}
