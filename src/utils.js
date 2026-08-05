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
// 既存の絞り込みカテゴリ
export const CATEGORIES_BASE = ['商材・プラン', '契約種別', '用語', 'ステークホルダー'];
// 「編」区分（部分知識）。役割・工程ごとの学習単位で、既存カテゴリとは別グループとして扱う
export const CATEGORIES_SECTIONS = ['キャッチ編', 'クローズ編', 'アライアンス編', '販路編', 'ディレクション編'];
// 用語登録・サイドバー絞り込みでは両方をまとめて1つのリストとして使う
export const CATEGORIES = [...CATEGORIES_BASE, ...CATEGORIES_SECTIONS];
export const CATEGORY_ICONS = {
  '商材・プラン': '📦',
  '契約種別': '📋',
  '用語': '📖',
  'ステークホルダー': '👥',
  'キャッチ編': '🎣',
  'クローズ編': '🤝',
  'アライアンス編': '🔗',
  '販路編': '🏬',
  'ディレクション編': '🎯',
};
export const RANK_COLORS = { 秀: 'var(--shu)', 優: 'var(--yu)', 良: 'var(--ryo)', 可: 'var(--ka)' };
export const ADMIN_PW = 'au2024admin';
