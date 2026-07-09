export function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

export const RANKS = ['秀', '優', '良', '可'];
export const CATEGORIES = ['商材・プラン', '契約種別', '用語', 'ステークホルダー'];
export const RANK_COLORS = { 秀: 'var(--shu)', 優: 'var(--yu)', 良: 'var(--ryo)', 可: 'var(--ka)' };
export const ADMIN_PW = 'au2024admin';
