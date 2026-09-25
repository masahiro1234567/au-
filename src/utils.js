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
// 知識区分のデフォルト。各ノードは children を持てて、その children もさらに children を持てる（何段でも深くできる）
export const DEFAULT_KNOWLEDGE_TYPES = [
  { name: '自社知識', children: [{ name: 'モバイル', children: [] }, { name: 'ネット', children: [] }] },
  { name: '他社知識', children: [{ name: 'モバイル', children: [] }, { name: 'ネット', children: [] }] },
  { name: '端末知識', children: [{ name: 'iPhone', children: [] }, { name: 'Android', children: [] }] },
];

// Firebaseの入れ子構造（{name, children: {childId: {name, children: {...}}}}）を再帰的に
// [{id, name, children:[...]}] へ変換する（何段ネストしても対応する）
function parseKnowledgeNode(id, raw) {
  return {
    id,
    name: raw.name,
    children: Object.entries(raw.children || {}).map(([cid, c]) => parseKnowledgeNode(cid, c)),
  };
}
function parseDefaultNode(t) {
  return { id: null, name: t.name, children: (t.children || []).map(parseDefaultNode) };
}

// Firebaseの knowledge_types コレクションをツリー配列に変換する。
// デフォルト値は常に含めるが、同名のものがFirebaseに実体化済みならそちらを優先する（重複表示を防ぐ）。
// Firebaseにしか無い名前（ユーザーが新規追加したもの）は、デフォルトの後ろに連結する。
export function resolveKnowledgeTypes(knowledgeTypesDb) {
  const custom = Object.entries(knowledgeTypesDb || {}).map(([id, t]) => parseKnowledgeNode(id, t));
  const customByName = new Map(custom.map((c) => [c.name, c]));
  const defaults = DEFAULT_KNOWLEDGE_TYPES.map(parseDefaultNode);
  const merged = defaults.map((d) => customByName.get(d.name) || d);
  const defaultNames = new Set(defaults.map((d) => d.name));
  const extra = custom.filter((c) => !defaultNames.has(c.name));
  return [...merged, ...extra];
}

// 用語に保存されている知識区分の「パス」（[レベル1, レベル2, レベル3, ...]）を取得する。
// 新しい knowledgePath フィールドがあればそれを使い、無ければ旧フィールド(knowledgeType/knowledgeSubType)から組み立てる。
export function getTermPath(term) {
  if (Array.isArray(term.knowledgePath) && term.knowledgePath.length) return term.knowledgePath;
  return [term.knowledgeType, term.knowledgeSubType].filter(Boolean);
}

// 用語のパスが、指定したパス（またはその先）に当たるかどうかを判定する（指定パスを先頭に含んでいればOK）
export function termMatchesPath(term, path) {
  if (!path || !path.length) return true;
  const tp = getTermPath(term);
  if (tp.length < path.length) return false;
  return path.every((p, i) => tp[i] === p);
}

// 後方互換用（旧: グローバル共有の区分リスト）。今は使わないが、まだ参照している箇所があれば安全のため残す。
export const KNOWLEDGE_TYPES = DEFAULT_KNOWLEDGE_TYPES.map((t) => t.name);
export const KNOWLEDGE_SUBTYPES = ['モバイル', 'ネット'];
// 既存の絞り込みカテゴリ
export const CATEGORIES_BASE = ['商材・プラン', '契約種別', '用語', 'ステークホルダー'];
export const CATEGORIES = CATEGORIES_BASE;
export const CATEGORY_ICONS = {
  '商材・プラン': '📦',
  '契約種別': '📋',
  '用語': '📖',
  'ステークホルダー': '👥',
};
export const RANK_COLORS = { 秀: 'var(--shu)', 優: 'var(--yu)', 良: 'var(--ryo)', 可: 'var(--ka)' };
export const ADMIN_PW = 'au2024admin';
// テスト画面ログイン用の共通パスワード（全員共通・個人ごとの設定は無し）
export const TEST_LOGIN_PW = 'orinavi.au';

// カテゴリごとの色分け（関連用語スレッド表示などで使用）
export const CATEGORY_COLORS = {
  '商材・プラン': '#D85A30',
  '契約種別': '#1D9E75',
  '用語': '#7F77DD',
  'ステークホルダー': '#BA7517',
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
export function suggestRelatedTerms({ allTerms, excludeId, name, category, description, alreadySelected = [], limit = 6 }) {
  const scored = Object.entries(allTerms || {})
    .filter(([id]) => id !== excludeId && !alreadySelected.includes(id))
    .map(([id, t]) => {
      let score = overlapScore(description || '', t.description || '') * 1;
      score += overlapScore(name || '', t.name || '') * 2;
      if (category && t.category === category) score += 3;
      return { id, term: t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}
