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
