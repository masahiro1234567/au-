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
// タッチパッドの横スワイプは「横スクロール」として届くので、ここでまとめて受け取る。
//   左から右（deltaX がマイナス）＝ 戻る ／ 右から左 ＝ 進む
// ・しっかり真横に動かしたときだけ（縦の動きの2.5倍以上・横に SWIPE_DIST 以上）
// ・上下にスクロールした直後（0.3秒）は無視
// ・しきい値を越えた瞬間に切り替え、そのあと0.65秒は指を離したあとの惰性を無視
// 開いている画面が onAppSwipe で受け取り口を登録していれば、そちらを優先（オレタブのタブ切り替えなど）
const swipes = [];
export function onAppSwipe(fn) {
  swipes.push(fn);
  return () => { const i = swipes.lastIndexOf(fn); if (i >= 0) swipes.splice(i, 1); };
}
// スワイプ中の進み具合（-1〜1。プラス＝戻る、マイナス＝進む）を、矢印の表示に知らせる
const progressSubs = new Set();
export function onSwipeProgress(fn) { progressSubs.add(fn); return () => progressSubs.delete(fn); }
const emit = (p, done) => progressSubs.forEach((fn) => { try { fn(p, done); } catch (e) { /* 無視 */ } });

// 横にスクロールできる場所（表・タブの帯など）の上では、スワイプとして扱わない
function canScrollX(el, dir) {
  for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
    const st = getComputedStyle(n);
    if ((st.overflowX === 'auto' || st.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) {
      if (dir === 'back' ? n.scrollLeft > 0 : n.scrollLeft + n.clientWidth < n.scrollWidth - 1) return true;
    }
  }
  return false;
}
export const SWIPE_DIST = 220;
export function installTrackpadSwipe({ onBack, onForward, canBack = () => true, canForward = () => true }) {
  let acc = 0, lastV = 0, lock = 0, timer = null, target = null, blocked = false;
  const end = () => { acc = 0; target = null; blocked = false; emit(0, false); };
  const onWheel = (e) => {
    if (e.ctrlKey) return; // ピンチでの拡大は対象外
    const now = Date.now();
    if (now < lock) return;
    const ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
    if (ay > ax) { lastV = now; if (acc) { clearTimeout(timer); end(); } return; }
    if (now - lastV < 300 || ax < ay * 2.5 || !ax) return;
    if (!target) {
      target = e.target;
      blocked = canScrollX(target, e.deltaX < 0 ? 'back' : 'fwd');
    }
    clearTimeout(timer);
    timer = setTimeout(end, 140);
    if (blocked) return;
    acc -= e.deltaX;
    let p = acc / SWIPE_DIST;
    const dir = p > 0 ? 'back' : 'fwd';
    const can = dir === 'back' ? canBack() : canForward();
    if (p >= 1 || p <= -1) {
      // 画面の中の受け取り口（オレタブのタブなど）を先に聞く
      for (let i = swipes.length - 1; i >= 0; i--) {
        try { if (swipes[i](dir === 'back' ? 'right' : 'left') === true) { lock = now + 650; clearTimeout(timer); end(); return; } } catch (er) { /* 次へ */ }
      }
      if (can) {
        lock = now + 650; clearTimeout(timer); acc = 0; target = null;
        emit(0, dir);
        if (dir === 'back') onBack(); else onForward();
        return;
      }
    }
    if (!can) p = Math.max(-0.25, Math.min(0.25, p));
    emit(Math.max(-1.15, Math.min(1.15, p)), false);
  };
  window.addEventListener('wheel', onWheel, { passive: true });
  return () => window.removeEventListener('wheel', onWheel);
}
