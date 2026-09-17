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
// テスト画面ログイン用の共通パスワード（全員共通・個人ごとの設定は無し）
export const TEST_LOGIN_PW = 'orinavi.au';

// カテゴリ・部分知識ごとの色分け（関連用語スレッド表示などで使用）
export const CATEGORY_COLORS = {
  '商材・プラン': '#D85A30',
  '契約種別': '#1D9E75',
  '用語': '#7F77DD',
  'ステークホルダー': '#BA7517',
  'キャッチ編': '#378ADD',
  'クローズ編': '#378ADD',
  'アライアンス編': '#378ADD',
  '販路編': '#378ADD',
  'ディレクション編': '#378ADD',
};

// 文字列を2文字ずつ（bigram）に分割する。日本語は分かち書きが無いため簡易的な類似度判定に使う
function bigrams(s) {
  const str = s || '';
  const out = [];
  for (let i = 0; i < str.length - 1; i++) out.push(str.substr(i, 2));
  return out;
}

// 2つの文字列がどれくらい似ているか（共通するbigramの数）を返す
function overlapScore(a, b) {
  const bb = new Set(bigrams(b));
  return bigrams(a).filter((g) => bb.has(g)).length;
}

// 用語登録・編集時に、入力中の説明文・選択中のカテゴリから関連用語の候補を即時に抽出する
// APIは使わず、説明文の文字の重なり具合＋カテゴリ一致だけで判定するシンプルな方式
export function suggestRelatedTerms({ allTerms, excludeId, name, category, section, description, alreadySelected = [], limit = 6 }) {
  const scored = Object.entries(allTerms || {})
    .filter(([id]) => id !== excludeId && !alreadySelected.includes(id))
    .map(([id, t]) => {
      let score = overlapScore(description || '', t.description || '') * 1;
      score += overlapScore(name || '', t.name || '') * 2;
      if (category && t.category === category) score += 3;
      if (section && t.section === section) score += 3;
      return { id, term: t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}
