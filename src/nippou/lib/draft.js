// ===== 書きかけの日報（下書き）=====
// 入力するたびに、その端末（ブラウザ）に自動で保存する。別のアプリを開いてアプリが再読み込みされても消えない
// 保存に成功したら消す。1台の端末に1つだけ持つ
const KEY = 'aunavi_np_draft';
export function loadDraft(userName) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || !d.frame) return null;
    if (userName && d.user && d.user !== userName) return null; // 別の人の下書きは出さない
    return d;
  } catch { return null; }
}
export function saveDraft(d) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() })); } catch { /* 容量オーバーなどは無視 */ }
}
export function clearDraft() { try { localStorage.removeItem(KEY); } catch { /* 無視 */ } }
// 下書きを開くための画面の場所
export const draftPath = (d) => (d.frameId ? `/report/frame/${d.frameId}?draft=1` : '/report/new?draft=1');
export const draftLabel = (d) => {
  const f = d.frame || {};
  const days = f.days || [];
  const t = new Date(d.savedAt || Date.now());
  const when = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  const period = days.length ? `${days[0].date.slice(5).replace('-', '/')}〜${days[days.length - 1].date.slice(5).replace('-', '/')}` : '';
  return `${f.store || '店舗名未入力'}　${period}（${when} まで入力）`;
};
